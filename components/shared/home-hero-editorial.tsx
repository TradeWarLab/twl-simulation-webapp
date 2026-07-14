import Link from "next/link";

export function HomeHeroEditorial() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center sm:py-28">
      <div className="mx-auto flex max-w-2xl flex-col items-center">
        <p className="mb-8 font-mono text-[11px] font-bold uppercase tracking-[0.35em] text-muted-foreground">
          U.S.–China Relations · Policy Simulation Platform
        </p>
        <h1 className="font-serif text-[clamp(3rem,7.5vw,5.5rem)] font-normal leading-[1.06] tracking-[-0.02em]">
          Modeling Trump&apos;s First{" "}
          <em className="italic">Trade&nbsp;War.</em>
        </h1>
        <div className="my-8 h-px w-14 bg-foreground" />
        <p className="max-w-md text-base leading-[1.75] text-muted-foreground">
          An interactive simulation environment for researchers, students, and
          policy professionals studying the economic and geopolitical dimensions
          of U.S.–China trade conflict.
        </p>
        <Link
          href="/auth/sign-up"
          className="group mt-12 inline-flex items-center gap-3 border border-foreground px-10 py-4 font-mono text-[12px] font-bold uppercase tracking-[0.25em] text-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background duration-300 ease-linear">
          Begin Simulation
          <span
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
