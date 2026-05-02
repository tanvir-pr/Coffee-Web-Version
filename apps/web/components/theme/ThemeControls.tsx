"use client";

import { useEffect, useState } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import {
  THEME_STORAGE_KEY,
  greetingFor,
  resolveTheme,
  themeLabel,
  type ColorTheme,
  type ThemeSource,
  type Tod,
} from "@/lib/theme/timeOfDay";

type Resolved = { tod: Tod; theme: ColorTheme; source: ThemeSource };

function readDomTheme(): Resolved | null {
  const root = document.documentElement;
  const tod = root.dataset.tod;
  const theme = root.dataset.theme;
  const source = root.dataset.themeSource;
  if (tod !== "morning" && tod !== "afternoon" && tod !== "night") return null;
  if (theme !== "light" && theme !== "dark") return null;
  return { tod, theme, source: source === "manual" ? "manual" : "time" };
}

function paintTheme(manual: ColorTheme | null): Resolved {
  const now = new Date();
  const next = resolveTheme({
    manual,
    hour: now.getHours(),
    minute: now.getMinutes(),
  });
  const root = document.documentElement;
  root.dataset.tod = next.tod;
  root.dataset.theme = next.theme;
  root.dataset.themeSource = next.source;
  const greeting = document.getElementById("greeting");
  if (greeting) greeting.textContent = greetingFor(next.tod);
  return next;
}

export function ThemeControls() {
  const tier = useTier();
  const [theme, setTheme] = useState<Resolved | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setTheme(readDomTheme()));
    return () => cancelAnimationFrame(frame);
  }, []);

  function choose(manual: ColorTheme | null) {
    if (manual) localStorage.setItem(THEME_STORAGE_KEY, manual);
    else localStorage.removeItem(THEME_STORAGE_KEY);
    setTheme(paintTheme(manual));
  }

  const tod = theme?.tod ?? null;

  return (
    <div className="mt-8 flex flex-col gap-4">
      <p className="font-sans text-sm text-muted">
        {tod ? themeLabel(tod) : "Reading the clock"}
        {theme ? ` · ${theme.theme === "dark" ? "Dark" : "Light"}` : ""}
        {theme?.source === "manual" ? " · your choice" : theme ? " · following the clock" : ""}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Theme">
        <ThemeButton pressed={theme?.source === "time"} onClick={() => choose(null)}>
          Auto
        </ThemeButton>
        <ThemeButton pressed={theme?.source === "manual" && theme.theme === "light"} onClick={() => choose("light")}>
          Light
        </ThemeButton>
        <ThemeButton pressed={theme?.source === "manual" && theme.theme === "dark"} onClick={() => choose("dark")}>
          Dark
        </ThemeButton>
      </div>
      <p className="font-mono text-xs tracking-wide text-muted uppercase">Motion {tier}</p>
    </div>
  );
}

function ThemeButton({
  children,
  pressed,
  onClick,
}: {
  children: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded-full px-4 py-2 font-sans text-sm ${
        pressed ? "bg-primary text-on-primary" : "bg-surface/70 text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
