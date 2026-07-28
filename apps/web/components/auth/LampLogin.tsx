"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import "./lamp-login.css";

type Mode = "in" | "up";
type AuthUser = { email: string; name: string; role?: string };

type Mote = { x: number; y: number; r: number; vy: number; vx: number; a: number; ph: number };

const GOOGLE_CLIENT_ID = process.env["NEXT_PUBLIC_GOOGLE_CLIENT_ID"] ?? "";

function homeFor(user: AuthUser | null | undefined): string {
  return user?.role === "owner" ? "/owner" : "/account";
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function LampLogin() {
  const tier = useTier();
  const router = useRouter();
  const cafe = useRef<HTMLElement>(null);
  const pendant = useRef<HTMLDivElement>(null);
  const beam = useRef<HTMLDivElement>(null);
  const cord = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const [lit, setLit] = useState(true);
  const [mode, setMode] = useState<Mode>("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const litRef = useRef(lit);
  const reduce = tier === "static";

  useEffect(() => {
    litRef.current = lit;
  }, [lit]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void fetch("/backend/v1/me", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) return;
        router.replace(homeFor((await response.json()) as AuthUser));
      });
      if (location.hash.includes("up") || location.hash.includes("signup")) setMode("up");
      if (location.hash.includes("off")) setLit(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [router]);

  useEffect(() => {
    const node = cafe.current;
    if (!node) return;
    node.classList.toggle("is-lit", lit);
    node.classList.toggle("mode-up", mode === "up");
    if (lit && !reduce) {
      node.classList.remove("flicker");
      void node.offsetWidth;
      node.classList.add("flicker");
    }
    if (lit) {
      const focus = window.setTimeout(() => emailRef.current?.focus(), 320);
      return () => window.clearTimeout(focus);
    }
  }, [lit, mode, reduce]);

  useEffect(() => {
    const angle = { a: 0, v: 0 };
    let raf = 0;
    const apply = () => {
      pendant.current?.style.setProperty("--swing", `${angle.a.toFixed(2)}deg`);
      beam.current?.style.setProperty("--swing", `${angle.a.toFixed(2)}deg`);
      cord.current?.style.setProperty("--cord", `${(-angle.a * 1.6).toFixed(2)}deg`);
    };
    const step = () => {
      angle.v = (angle.v - angle.a * 0.035) * 0.94;
      angle.a += angle.v * 0.6;
      apply();
      if (Math.abs(angle.a) > 0.02 || Math.abs(angle.v) > 0.02) raf = requestAnimationFrame(step);
      else {
        raf = 0;
        angle.a = 0;
        angle.v = 0;
        apply();
      }
    };
    const kick = (delta: number) => {
      if (reduce) return;
      angle.v += delta;
      if (!raf) raf = requestAnimationFrame(step);
    };
    (cafe.current as HTMLElement & { __kick?: (d: number) => void }).__kick = kick;
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  useEffect(() => {
    const cordNode = cord.current;
    if (!cordNode) return;
    let startY: number | null = null;
    let pulled = 0;

    const onDown = (event: PointerEvent) => {
      startY = event.clientY;
      cordNode.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (startY === null) return;
      pulled = Math.max(0, Math.min(64, event.clientY - startY));
      cordNode.style.setProperty("--pull", `${pulled}px`);
    };
    const release = () => {
      if (startY === null) return;
      const shouldToggle = pulled > 22;
      startY = null;
      const from = pulled;
      cordNode.animate(
        [
          { transform: `translateY(${from}px) rotate(var(--cord))` },
          { transform: "translateY(-8px) rotate(var(--cord))" },
          { transform: "translateY(0px) rotate(var(--cord))" },
        ],
        { duration: reduce ? 1 : 420, easing: "cubic-bezier(.34,1.56,.64,1)" },
      );
      cordNode.style.setProperty("--pull", "0px");
      pulled = 0;
      if (shouldToggle) setLit((current) => !current);
      const host = cafe.current as HTMLElement & { __kick?: (d: number) => void };
      host.__kick?.(shouldToggle ? 7 : 3);
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = 180;
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        gain.gain.exponentialRampToValueAtTime(0.03, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.14);
        window.setTimeout(() => void ctx.close(), 220);
      } catch {
        /* ignore audio failures */
      }
    };

    cordNode.addEventListener("pointerdown", onDown);
    cordNode.addEventListener("pointermove", onMove);
    cordNode.addEventListener("pointerup", release);
    cordNode.addEventListener("pointercancel", release);
    return () => {
      cordNode.removeEventListener("pointerdown", onDown);
      cordNode.removeEventListener("pointermove", onMove);
      cordNode.removeEventListener("pointerup", release);
      cordNode.removeEventListener("pointercancel", release);
    };
  }, [reduce]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "l") return;
      if (/input|textarea|select/i.test((event.target as HTMLElement)?.tagName ?? "")) return;
      setLit((current) => !current);
      const host = cafe.current as HTMLElement & { __kick?: (d: number) => void };
      host.__kick?.(7);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || reduce || tier === "lite") return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let W = 0;
    let H = 0;
    let motes: Mote[] = [];
    let raf = 0;
    let t = 0;

    const newMote = (anyY: boolean): Mote => {
      const y = anyY ? Math.random() * H : H * (0.55 + Math.random() * 0.45);
      const spread = 0.08 + 0.42 * (y / Math.max(H, 1));
      return {
        x: W * (0.5 + (Math.random() * 2 - 1) * spread),
        y,
        r: (Math.random() * 1.9 + 0.5) * (W / 700),
        vy: -(0.12 + Math.random() * 0.32),
        vx: (Math.random() - 0.5) * 0.18,
        a: Math.random() * 0.45 + 0.18,
        ph: Math.random() * 6,
      };
    };

    const size = () => {
      const rect = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.width = Math.max(1, Math.floor(rect.width * dpr));
      H = cv.height = Math.max(1, Math.floor(rect.height * dpr));
      const count = window.innerWidth < 820 ? 30 : 56;
      motes = Array.from({ length: count }, () => newMote(true));
    };

    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, W, H);
      if (litRef.current && !document.hidden) {
        for (const mote of motes) {
          mote.y += mote.vy;
          mote.x += mote.vx + Math.sin(t + mote.ph) * 0.14;
          if (mote.y < 0) Object.assign(mote, newMote(false));
          const glow = ctx.createRadialGradient(mote.x, mote.y, 0, mote.x, mote.y, mote.r * 3);
          glow.addColorStop(0, `rgba(255, 236, 190, ${mote.a})`);
          glow.addColorStop(1, "rgba(255, 236, 190, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(mote.x, mote.y, mote.r * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    size();
    draw();
    window.addEventListener("resize", size);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
    };
  }, [reduce, tier]);

  async function submitAuth() {
    setBusy(true);
    setError("");
    try {
      const path = mode === "up" ? "/backend/v1/auth/register" : "/backend/v1/auth/login";
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: mode === "up" ? name || email.split("@", 1)[0] : undefined,
        }),
      });
      if (!response.ok) {
        const detail =
          response.status === 409
            ? "That email already has an account."
            : response.status === 401
              ? "Email or password is incorrect."
              : response.status >= 500
                ? "Sign-in is unavailable right now."
                : "Check your email and password.";
        setError(detail);
        return;
      }
      if (remember) localStorage.setItem("crema:rememberEmail", email);
      else localStorage.removeItem("crema:rememberEmail");
      router.replace(homeFor((await response.json()) as AuthUser));
    } catch {
      setError("Could not reach Crema right now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setBusy(true);
    setError("");
    try {
      if (GOOGLE_CLIENT_ID) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector<HTMLScriptElement>("script[data-crema-google]");
          const start = () => {
            if (!window.google?.accounts?.id) {
              reject(new Error("Google script missing"));
              return;
            }
            window.google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: (response) => {
                void fetch("/backend/v1/auth/google", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ credential: response.credential }),
                }).then(async (res) => {
                  if (!res.ok) {
                    setError("Google could not sign you in.");
                    setBusy(false);
                    reject(new Error("google auth failed"));
                    return;
                  }
                  router.replace(homeFor((await res.json()) as AuthUser));
                  resolve();
                });
              },
            });
            window.google.accounts.id.prompt();
            setBusy(false);
          };
          if (existing && window.google?.accounts?.id) {
            start();
            return;
          }
          const script = document.createElement("script");
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          script.dataset.cremaGoogle = "1";
          script.onload = () => start();
          script.onerror = () => reject(new Error("Google script failed"));
          document.head.append(script);
        });
        return;
      }
      const guestEmail = email.trim() || "guest@gmail.com";
      const response = await fetch("/backend/v1/auth/google", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: guestEmail,
          name: name.trim() || guestEmail.split("@", 1)[0],
        }),
      });
      if (!response.ok) {
        setError("Google sign-in is unavailable right now.");
        return;
      }
      router.replace(homeFor((await response.json()) as AuthUser));
    } catch {
      setError("Google sign-in did not complete.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("crema:rememberEmail");
    if (saved) setEmail(saved);
  }, []);

  return (
    <main
      ref={cafe}
      className={`lamp-cafe ${lit ? "is-lit" : ""} ${mode === "up" ? "mode-up" : ""}`}
      data-motion={tier}
    >
      <div className="lamp-ceiling" aria-hidden="true" />
      <div className="lamp-grain" aria-hidden="true" />
      <div className="lamp-window" aria-hidden="true" />
      <div className="lamp-wall-glow" aria-hidden="true" />
      <div className="lamp-steam lamp-steam-a" aria-hidden="true" />
      <div className="lamp-steam lamp-steam-b" aria-hidden="true" />
      <div className="lamp-counter" aria-hidden="true">
        <div className="lamp-cup lamp-cup-l">
          <span className="lamp-cup-steam" />
        </div>
        <div className="lamp-cup lamp-cup-r">
          <span className="lamp-cup-steam" />
        </div>
      </div>
      <div className="lamp-vignette" aria-hidden="true" />

      <section className="lamp-zone" aria-hidden="true">
        <div className="lamp-pendant" ref={pendant}>
          <div className="lamp-wire" />
          <div className="lamp-canopy" />
          <div className="lamp-shade">
            <div className="lamp-shade-rim" />
          </div>
          <div className="lamp-bulb">
            <span className="lamp-filament" />
          </div>
          <div className="lamp-cord" ref={cord}>
            <div className="lamp-cord-line" />
            <div className="lamp-cord-knob" />
          </div>
        </div>
        <div className="lamp-beam" ref={beam}>
          <canvas className="lamp-motes" ref={canvas} />
        </div>
      </section>

      <button
        className="lamp-switch"
        type="button"
        aria-pressed={lit}
        aria-controls="lamp-auth-card"
        onClick={() => {
          setLit((current) => !current);
          const host = cafe.current as HTMLElement & { __kick?: (d: number) => void };
          host.__kick?.(7);
        }}
      >
        <span className="sr-only">Toggle café lamp. Light is </span>
        <span>{lit ? "on" : "off"}</span>
      </button>

      <section
        className="lamp-auth"
        id="lamp-auth-card"
        aria-live="polite"
        inert={!lit ? true : undefined}
      >
        <div className="lamp-brand">
          <span className="lamp-bean" aria-hidden="true" />
          Crema
        </div>
        <div className="lamp-tabs" role="tablist" aria-label="Account">
          <button
            role="tab"
            type="button"
            className="lamp-tab"
            aria-selected={mode === "in"}
            onClick={() => {
              setMode("in");
              setError("");
            }}
          >
            Sign in
          </button>
          <button
            role="tab"
            type="button"
            className="lamp-tab"
            aria-selected={mode === "up"}
            onClick={() => {
              setMode("up");
              setError("");
            }}
          >
            Sign up
          </button>
          <span className="lamp-tab-pill" aria-hidden="true" />
        </div>

        <h1>{mode === "in" ? "Welcome back" : "Join Crema"}</h1>
        <p className="lamp-sub">
          {mode === "in"
            ? "Your usual is waiting. Sign in to order ahead."
            : "Create an account to keep stamps and past pickups."}
        </p>

        <form
          method="post"
          action="/login"
          onSubmit={(event) => {
            event.preventDefault();
            void submitAuth();
          }}
        >
          {mode === "up" ? (
            <div className="lamp-field">
              <label htmlFor="lamp-name">Name</label>
              <input
                id="lamp-name"
                name="name"
                autoComplete="name"
                placeholder="Tanvir Hasan"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
          ) : null}
          <div className="lamp-field">
            <label htmlFor="lamp-email">Email</label>
            <input
              ref={emailRef}
              id="lamp-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@crema.cafe"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="lamp-field">
            <label htmlFor="lamp-password">Password</label>
            <div className="lamp-pw">
              <input
                id="lamp-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                placeholder="••••••••"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="lamp-eye"
                aria-pressed={showPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {mode === "in" ? (
            <div className="lamp-row">
              <label className="lamp-chk">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                Remember me
              </label>
            </div>
          ) : null}
          {error ? (
            <p className="lamp-err" role="alert">
              {error}
            </p>
          ) : null}
          <button className="lamp-primary" type="submit" disabled={busy}>
            {busy ? "Brewing…" : mode === "in" ? "Sign in" : "Create account"}
          </button>
          <div className="lamp-or">
            <span>or</span>
          </div>
          <button
            className="lamp-ghost lamp-google"
            type="button"
            disabled={busy}
            onClick={() => void googleSignIn()}
          >
            <span className="lamp-google-mark" aria-hidden="true">
              G
            </span>
            Continue with Google
          </button>
        </form>

        <p className="lamp-foot">
          Already pouring? <Link href="/menu">Browse the menu</Link>
        </p>
      </section>

      <p className="lamp-hint" aria-hidden="true">
        Pull the cord · press L
      </p>
    </main>
  );
}
