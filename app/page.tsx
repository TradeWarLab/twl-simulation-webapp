"use client";
import { useState, useEffect } from "react";

// OPTION 6: "THINK TANK"
// Stark black & white. Heavy grid. No-nonsense academic/policy institute aesthetic.
// Inspired by CFR, RAND, Brookings. Serious, institutional, credible.

const STATS = [
  { value: "145%", label: "US Tariffs on Chinese Goods" },
  { value: "$688B", label: "Annual Bilateral Trade Volume" },
  { value: "40+", label: "Affected Industrial Sectors" },
  { value: "2.4B", label: "People Affected Globally" },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [hoverLogin, setHoverLogin] = useState(false);
  const [hoverSignup, setHoverSignup] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fff",
      fontFamily: "'Times New Roman', Times, serif",
      display: "flex", flexDirection: "column",
      color: "#0a0a0a",
    }}>

      {/* Nav — thick border bottom */}
      <nav style={{
        borderBottom: "3px solid #0a0a0a",
        padding: "0 0 0 0",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
      }}>
        <div style={{
          padding: "20px 40px",
          borderRight: "3px solid #0a0a0a",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <span style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: "17px", fontWeight: "900",
            letterSpacing: "-0.5px",
          }}>
            TRADE WAR LAB
          </span>
        </div>
        <div style={{
          padding: "20px 40px",
          display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0px",
        }}>
          <a href="/auth/login"
            onMouseEnter={() => setHoverLogin(true)}
            onMouseLeave={() => setHoverLogin(false)}
            style={{
              padding: "10px 28px",
              fontSize: "12px",
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontWeight: "700", letterSpacing: "1px",
              textDecoration: "none", textTransform: "uppercase",
              color: hoverLogin ? "#fff" : "#0a0a0a",
              background: hoverLogin ? "#0a0a0a" : "transparent",
              border: "2px solid #0a0a0a",
              transition: "all 0.15s",
              marginRight: "12px",
            }}>
            Log In
          </a>
          <a href="/auth/sign-up"
            onMouseEnter={() => setHoverSignup(true)}
            onMouseLeave={() => setHoverSignup(false)}
            style={{
              padding: "10px 28px",
              fontSize: "12px",
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontWeight: "700", letterSpacing: "1px",
              textDecoration: "none", textTransform: "uppercase",
              background: hoverSignup ? "#0a0a0a" : "#0a0a0a",
              border: "2px solid #0a0a0a",
              color: "#fff",
              transition: "all 0.15s",
              opacity: hoverSignup ? 0.8 : 1,
            }}>
            Sign Up
          </a>
        </div>
      </nav>

      {/* Hero grid */}
      <main style={{
        flex: 1,
        display: "grid",
        gridTemplateRows: "1fr auto",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "none" : "translateY(12px)",
        transition: "all 0.6s ease",
      }}>
        {/* Top section: 2 col */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          borderBottom: "3px solid #0a0a0a",
        }}>
          {/* Left: big text */}
          <div style={{
            padding: "64px 40px",
            borderRight: "3px solid #0a0a0a",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div>
              {/* Kicker */}
              <div style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontSize: "10px", fontWeight: "700",
                letterSpacing: "4px", color: "#888",
                textTransform: "uppercase", marginBottom: "28px",
              }}>
                U.S.–China Relations · Policy Simulation Platform
              </div>

              {/* Giant headline */}
              <h1 style={{
                fontSize: "clamp(52px, 7vw, 88px)",
                fontWeight: "400",
                lineHeight: 0.97,
                margin: "0 0 40px 0",
                letterSpacing: "-1.5px",
              }}>
                Modeling<br />
                the New<br />
                <em>Cold Trade<br />War.</em>
              </h1>

              <div style={{
                width: "56px", height: "3px", background: "#0a0a0a",
                marginBottom: "32px",
              }} />

              <p style={{
                fontSize: "16px", lineHeight: 1.75, color: "#333",
                maxWidth: "400px",
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontWeight: "400",
              }}>
                An interactive simulation environment for researchers,
                students, and policy professionals studying the economic
                and geopolitical dimensions of U.S.–China trade conflict.
              </p>
            </div>

            {/* CTA */}
            <div style={{ marginTop: "48px" }}>
              <a href="/auth/sign-up" style={{
                display: "inline-block",
                background: "#0a0a0a", color: "#fff",
                padding: "18px 48px",
                fontSize: "12px", letterSpacing: "3px", fontWeight: "700",
                textDecoration: "none", textTransform: "uppercase",
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
              }}>
                Begin Simulation →
              </a>
            </div>
          </div>

          {/* Right: abstract graphic */}
          <div style={{
            padding: "64px 40px",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
            background: "#fafafa",
          }}>
            {/* Abstract tension diagram */}
            <div>
              <div style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontSize: "10px", fontWeight: "700", letterSpacing: "3px",
                color: "#888", marginBottom: "24px", textTransform: "uppercase",
              }}>
                Strategic Tension Model
              </div>

              {/* US vs China bar */}
              <div style={{ marginBottom: "32px" }}>
                {[
                  { label: "UNITED STATES", pct: 72, note: "Economic output leverage" },
                  { label: "CHINA", pct: 88, note: "Manufacturing concentration" },
                  { label: "INTERDEPENDENCE", pct: 61, note: "Bilateral dependency index" },
                  { label: "ESCALATION RISK", pct: 87, note: "Current tension index" },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: "20px" }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      fontFamily: "'Helvetica Neue', Arial, sans-serif",
                      fontSize: "10px", marginBottom: "6px",
                    }}>
                      <span style={{ fontWeight: "700", letterSpacing: "2px", textTransform: "uppercase" }}>{item.label}</span>
                      <span style={{ color: "#888" }}>{item.pct}%</span>
                    </div>
                    <div style={{ height: "6px", background: "#e5e5e5", position: "relative" }}>
                      <div style={{
                        height: "100%", width: `${item.pct}%`,
                        background: i === 3 ? "#0a0a0a" : "#0a0a0a",
                        opacity: i === 3 ? 1 : 0.7 - i * 0.1,
                      }} />
                    </div>
                    <div style={{
                      fontFamily: "'Helvetica Neue', Arial, sans-serif",
                      fontSize: "9px", color: "#aaa", marginTop: "4px",
                    }}>{item.note}</div>
                  </div>
                ))}
              </div>

              <div style={{
                border: "1px solid #e5e5e5",
                padding: "20px",
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontSize: "11px", color: "#888", lineHeight: 1.6,
              }}>
                Simulate escalation paths, negotiation outcomes, and third-party
                spillover effects across 40+ economic sectors.
              </div>
            </div>
          </div>
        </div>

        {/* Stat row at bottom */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
        }}>
          {STATS.map((s, i) => (
            <div key={i} style={{
              padding: "32px 40px",
              borderRight: i < STATS.length - 1 ? "3px solid #0a0a0a" : "none",
            }}>
              <div style={{
                fontSize: "clamp(24px, 3vw, 36px)",
                fontWeight: "700",
                letterSpacing: "-1px",
                marginBottom: "6px",
              }}>{s.value}</div>
              <div style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontSize: "10px", color: "#888",
                letterSpacing: "1px", textTransform: "uppercase",
                lineHeight: 1.5,
              }}>{s.label}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}