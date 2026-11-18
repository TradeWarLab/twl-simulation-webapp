#!/usr/bin/env node
// Schema drift check for the public schema. Needs no Docker.
//
// Runs scripts/db/fingerprint.sql (read-only) through the Supabase CLI and
// compares the result with supabase/schema-fingerprint.json.
//
// Usage:
//   node scripts/db/check-drift.mjs --ref <project-ref>   hosted project
//   node scripts/db/check-drift.mjs --db-url <postgres-url>  any database URL
//   node scripts/db/check-drift.mjs --local               local stack (supabase start)
//   add --update to write the result to the expected file instead of comparing.
//   add --expected <path> to use a different expected file.
// Env fallback: SUPABASE_PROJECT_REF, then SUPABASE_DB_URL.
// SUPABASE_CLI=<binary> runs that CLI instead of npx supabase@latest.
//
// Exit codes: 0 no drift (or file updated), 1 drift, 2 error.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sqlFile = join(root, "scripts/db/fingerprint.sql");

function fail(msg) {
	console.error(`check-drift: ${msg}`);
	process.exit(2);
}

function parseArgs(argv) {
	const opts = {
		update: false,
		expected: join(root, "supabase/schema-fingerprint.json"),
	};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		const next = () => argv[++i] ?? fail(`${a} needs a value`);
		if (a === "--update") opts.update = true;
		else if (a === "--local") opts.local = true;
		else if (a === "--ref") opts.ref = next();
		else if (a === "--db-url") opts.dbUrl = next();
		else if (a === "--expected") opts.expected = resolve(next());
		else if (a === "--help" || a === "-h") {
			console.log(
				readFileSync(fileURLToPath(import.meta.url), "utf8")
					.split("\n")
					.slice(1, 15)
					.join("\n"),
			);
			process.exit(0);
		} else fail(`unknown argument: ${a}`);
	}
	if (!opts.local && !opts.ref && !opts.dbUrl) {
		opts.ref = process.env.SUPABASE_PROJECT_REF;
		opts.dbUrl = opts.ref ? undefined : process.env.SUPABASE_DB_URL;
	}
	if ([opts.local, opts.ref, opts.dbUrl].filter(Boolean).length !== 1) {
		fail("give exactly one target: --ref <ref>, --db-url <url> or --local");
	}
	return opts;
}

// Runs the fingerprint query. Returns [{ kind, name, def }].
function runFingerprint(opts) {
	const args = [
		"supabase@latest",
		"db",
		"query",
		"--read-only",
		"--agent",
		"no",
		"--output-format",
		"json",
		"-f",
		sqlFile,
	];
	if (opts.ref) args.splice(3, 0, `--remote=${opts.ref}`);
	if (opts.dbUrl) args.splice(3, 0, `--remote=${opts.dbUrl}`);
	// SUPABASE_CLI names a CLI binary to use instead of npx (CI pins a version).
	const cli = process.env.SUPABASE_CLI;
	const cliArgs = cli ? args.slice(1) : args;
	// Windows needs a shell to start npx.cmd. Quote each argument for it.
	const win = process.platform === "win32";
	const res = spawnSync(
		cli ?? (win ? "npx.cmd" : "npx"),
		win ? cliArgs.map((a) => `"${a}"`) : cliArgs,
		{
			cwd: root,
			encoding: "utf8",
			shell: win,
			stdio: ["inherit", "pipe", "inherit"],
			maxBuffer: 64 * 1024 * 1024,
		},
	);
	if (res.error) fail(`could not start the Supabase CLI: ${res.error.message}`);
	let out;
	try {
		out = JSON.parse(res.stdout);
	} catch {
		fail(`CLI output is not JSON (exit ${res.status}):\n${res.stdout}`);
	}
	if (out && out._tag === "Error")
		fail(`query failed: ${out.error?.message ?? JSON.stringify(out)}`);
	const rows = Array.isArray(out) ? out : out?.rows;
	if (!Array.isArray(rows) || rows.length === 0)
		fail(`no rows from the CLI (exit ${res.status})`);
	return rows;
}

// Key is "<kind> <name>". A value with line breaks is stored as an array of lines.
function toItems(rows) {
	const items = {};
	for (const { kind, name, def } of rows) {
		let key = `${kind} ${name}`;
		for (let n = 2; key in items; n++) key = `${kind} ${name} #${n}`;
		items[key] = def.includes("\n") ? def.split("\n") : def;
	}
	const sorted = {};
	for (const k of Object.keys(items).sort()) sorted[k] = items[k];
	return sorted;
}

const asLines = (v) => (Array.isArray(v) ? v : [v]);

// Small LCS line diff. Returns lines prefixed with "  ", "- " or "+ ".
function lineDiff(a, b) {
	const m = a.length;
	const n = b.length;
	const t = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
	for (let i = m - 1; i >= 0; i--)
		for (let j = n - 1; j >= 0; j--)
			t[i][j] =
				a[i] === b[j]
					? t[i + 1][j + 1] + 1
					: Math.max(t[i + 1][j], t[i][j + 1]);
	const out = [];
	let i = 0;
	let j = 0;
	while (i < m && j < n) {
		if (a[i] === b[j]) {
			out.push(`  ${a[i]}`);
			i++;
			j++;
		} else if (t[i + 1][j] >= t[i][j + 1]) out.push(`- ${a[i++]}`);
		else out.push(`+ ${b[j++]}`);
	}
	while (i < m) out.push(`- ${a[i++]}`);
	while (j < n) out.push(`+ ${b[j++]}`);
	// Show only changed lines with 2 lines of context.
	const keep = out.map((l) => !l.startsWith("  "));
	return out.filter((_, k) =>
		keep.slice(Math.max(0, k - 2), k + 3).some(Boolean),
	);
}

function report(expected, actual) {
	const kinds = new Map();
	const add = (key, text) => {
		const kind = key.split(" ")[0];
		if (!kinds.has(kind)) kinds.set(kind, []);
		kinds.get(kind).push(text);
	};
	for (const key of new Set([
		...Object.keys(expected),
		...Object.keys(actual),
	])) {
		const name = key.slice(key.indexOf(" ") + 1);
		const e = expected[key];
		const a = actual[key];
		if (a === undefined)
			add(key, `  - ${name}\n      only in expected file: ${asLines(e)[0]}`);
		else if (e === undefined)
			add(key, `  + ${name}\n      only in database: ${asLines(a)[0]}`);
		else if (JSON.stringify(e) !== JSON.stringify(a)) {
			if (Array.isArray(e) || Array.isArray(a)) {
				const d = lineDiff(asLines(e), asLines(a)).map((l) => `      ${l}`);
				add(key, `  ~ ${name}  (- expected, + database)\n${d.join("\n")}`);
			} else
				add(key, `  ~ ${name}\n      expected: ${e}\n      database: ${a}`);
		}
	}
	let count = 0;
	for (const [kind, lines] of [...kinds].sort()) {
		console.log(`\n[${kind}] ${lines.length} difference(s)`);
		for (const l of lines) console.log(l);
		count += lines.length;
	}
	return count;
}

const opts = parseArgs(process.argv.slice(2));
const target = opts.ref
	? `project ${opts.ref}`
	: opts.dbUrl
		? "database URL"
		: "local stack";
const actual = toItems(runFingerprint(opts));
const rel = relative(root, opts.expected);

if (opts.update) {
	writeFileSync(opts.expected, `${JSON.stringify(actual, null, "\t")}\n`);
	console.log(
		`Wrote ${Object.keys(actual).length} items from ${target} to ${rel}.`,
	);
	process.exit(0);
}

if (!existsSync(opts.expected))
	fail(`${rel} not found. Run with --update to create it.`);
const expected = JSON.parse(readFileSync(opts.expected, "utf8"));
const diffs = report(expected, actual);
if (diffs === 0) {
	console.log(
		`No drift: ${target} matches ${rel} (${Object.keys(actual).length} items).`,
	);
	process.exit(0);
}
console.log(`\nDrift: ${diffs} difference(s) between ${target} and ${rel}.`);
process.exit(1);
