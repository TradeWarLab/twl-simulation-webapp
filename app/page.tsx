"use client";
import { useState, useEffect } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [hoverLogin, setHoverLogin] = useState(false);
  const [hoverSignup, setHoverSignup] = useState(false);
  const [focusLogin, setFocusLogin] = useState(false);
  const [focusSignup, setFocusSignup] = useState(false);
  const [focusCta, setFocusCta] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyPref = () => setReducedMotion(mq.matches);
    applyPref();
    if (mq.addEventListener) mq.addEventListener("change", applyPref);
    else mq.addListener(applyPref);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", applyPref);
      else mq.removeListener(applyPref);
    };
  }, []);

  useEffect(() => {
    const delay = reducedMotion ? 0 : 80;
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [reducedMotion]);

  return (
    <div
      className="home-shell"
      style={{
        minHeight: "100vh",
        background: "#fff",
        fontFamily: "'Palatino Linotype', Palatino, 'Times New Roman', serif",
        display: "flex",
        flexDirection: "column",
        color: "#0a0a0a",
      }}>
      {/* Nav — thick border bottom */}
      <nav
        className="home-nav"
        style={{
          borderBottom: "3px solid #0a0a0a",
          padding: "0",
        }}>
        <div
          className="home-nav-inner"
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            minWidth: 0,
          }}>
          <div
            className="home-nav-logo"
            style={{
              padding: "20px 40px",
              borderRight: "3px solid #0a0a0a",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              minWidth: 0,
            }}>
            <span
              style={{
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontSize: "17px",
                fontWeight: "900",
                letterSpacing: "-0.5px",
                overflowWrap: "break-word",
              }}>
              TRADE WAR LAB
            </span>
          </div>
          <div
            className="home-nav-actions"
            style={{
              padding: "20px 40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
              minWidth: 0,
            }}>
            <a
              href="/auth/login"
              onMouseEnter={() => setHoverLogin(true)}
              onMouseLeave={() => setHoverLogin(false)}
              onFocus={() => setFocusLogin(true)}
              onBlur={() => setFocusLogin(false)}
              style={{
                padding: "10px 28px",
                minHeight: "44px",
                fontSize: "12px",
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontWeight: "700",
                letterSpacing: "1px",
                textDecoration: "none",
                textTransform: "uppercase",
                color: hoverLogin ? "#fff" : "#0a0a0a",
                background: hoverLogin ? "#0a0a0a" : "transparent",
                border: "2px solid #0a0a0a",
                transition: "all 0.15s",
                outline: focusLogin ? "3px solid #0a0a0a" : "none",
                outlineOffset: "2px",
              }}>
              Log In
            </a>
            <a
              href="/auth/sign-up"
              onMouseEnter={() => setHoverSignup(true)}
              onMouseLeave={() => setHoverSignup(false)}
              onFocus={() => setFocusSignup(true)}
              onBlur={() => setFocusSignup(false)}
              style={{
                padding: "10px 28px",
                minHeight: "44px",
                fontSize: "12px",
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontWeight: "700",
                letterSpacing: "1px",
                textDecoration: "none",
                textTransform: "uppercase",
                background: "#0a0a0a",
                border: "2px solid #0a0a0a",
                color: "#fff",
                transition: "all 0.15s",
                opacity: hoverSignup ? 0.8 : 1,
                outline: focusSignup ? "3px solid #0a0a0a" : "none",
                outlineOffset: "2px",
              }}>
              Sign Up
            </a>
          </div>
        </div>
      </nav>

      {/* Hero grid */}
      <main
        className="home-main"
        style={{
          flex: 1,
          display: "grid",
          gridTemplateRows: "1fr auto",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "none" : "translateY(12px)",
          transition: reducedMotion ? "none" : "all 0.6s ease",
        }}>
        {/* Top section: centered */}
        <div
          className="home-hero-wrap"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            borderBottom: "3px solid #0a0a0a",
          }}>
          <div
            className="home-hero"
            style={{
              padding: "72px 40px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
              textAlign: "center",
            }}>
            <div
              className="home-hero-inner"
              style={{ maxWidth: "760px", width: "100%" }}>
              {/* Kicker */}
              <div
                className="home-kicker"
                style={{
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "4px",
                  color: "#888",
                  textTransform: "uppercase",
                  marginBottom: "28px",
                }}>
                U.S.–PRC Relations · Policy Simulation Platform
              </div>

              {/* Giant headline */}
              <h1
                style={{
                  fontSize: "clamp(52px, 7vw, 88px)",
                  fontWeight: "400",
                  lineHeight: 0.97,
                  margin: "0 0 40px 0",
                  letterSpacing: "-1.5px",
                  overflowWrap: "break-word",
                  hyphens: "auto",
                }}>
                Modeling
                <br />
                Trump&apos;s First<br></br> <em>Trade War.</em>
              </h1>

              <div
                style={{
                  width: "56px",
                  height: "3px",
                  background: "#0a0a0a",
                  margin: "0 auto 32px auto",
                }}
              />

              <p
                style={{
                  fontSize: "16px",
                  lineHeight: 1.75,
                  color: "#333",
                  maxWidth: "520px",
                  margin: "0 auto",
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  fontWeight: "400",
                  overflowWrap: "break-word",
                  hyphens: "auto",
                }}>
                An interactive simulation environment for researchers, students,
                and policy professionals studying the economic and geopolitical
                dimensions of U.S.–PRC trade conflict.
              </p>
            </div>

            {/* CTA */}
            <div className="home-cta-wrap" style={{ marginTop: "48px" }}>
              <a
                className="home-cta"
                href="/auth/sign-up"
                onFocus={() => setFocusCta(true)}
                onBlur={() => setFocusCta(false)}
                style={{
                  display: "inline-block",
                  background: "#0a0a0a",
                  color: "#fff",
                  padding: "18px 48px",
                  minHeight: "48px",
                  fontSize: "12px",
                  letterSpacing: "3px",
                  fontWeight: "700",
                  textDecoration: "none",
                  textTransform: "uppercase",
                  fontFamily: "'Helvetica Neue', Arial, sans-serif",
                  outline: focusCta ? "3px solid #0a0a0a" : "none",
                  outlineOffset: "3px",
                }}>
                Begin Simulation →
              </a>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @media (max-width: 900px) {
          .home-nav-inner {
            grid-template-columns: 1fr;
            text-align: center;
          }
          .home-nav-logo {
            border-right: none;
            border-bottom: 3px solid #0a0a0a;
            justify-content: center;
          }
          .home-nav-actions {
            justify-content: center;
            flex-wrap: wrap;
            padding: 16px 32px 20px;
          }
        }
        @media (max-width: 640px) {
          .home-nav-logo {
            padding: 18px 24px;
          }
          .home-hero {
            padding: 56px 24px;
          }
          .home-kicker {
            fontsize: 11px;
            letterspacing: 3px;
          }
          .home-cta-wrap {
            width: 100%;
          }
          .home-cta {
            width: 100%;
            text-align: center;
            padding: 16px 24px;
          }
        }
      `}</style>
    </div>
  );
}
