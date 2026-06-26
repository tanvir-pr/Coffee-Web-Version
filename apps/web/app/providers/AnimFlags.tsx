"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { flagOn, previewIds } from "@/lib/motion/could";

type Flags = Record<string, boolean>;

type AnimFlagValue = {
  enabled: (id: string) => boolean;
  season: string;
};

const AnimFlagCtx = createContext<AnimFlagValue>({
  enabled: () => false,
  season: "autumn",
});

function readStoredPreview(): Set<string> {
  try {
    return previewIds(window.sessionStorage.getItem("crema:anim"));
  } catch {
    return new Set();
  }
}

export function useCould(id: string): boolean {
  return useContext(AnimFlagCtx).enabled(id);
}

export function useSeason(): string {
  return useContext(AnimFlagCtx).season;
}

export function AnimFlags({ children }: { children: ReactNode }) {
  const [remote, setRemote] = useState<Flags>({});
  const [preview, setPreview] = useState<Set<string>>(new Set());
  const [kill, setKill] = useState(false);
  const [season, setSeason] = useState("autumn");

  useEffect(() => {
    const applyPreview = () => setPreview(readStoredPreview());
    const frame = requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search).get("anim");
      if (params) {
        try {
          window.sessionStorage.setItem("crema:anim", params);
        } catch {
          /* preview is optional */
        }
      }
      applyPreview();
      void fetch("/backend/v1/config", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { season?: string; kill_switch?: boolean; flags?: { anim?: Flags } };
        setRemote(body.flags?.anim ?? {});
        setKill(body.kill_switch === true);
        if (body.season) setSeason(body.season);
      });
    });
    window.addEventListener("crema-anim", applyPreview);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("crema-anim", applyPreview);
    };
  }, []);

  const value = useMemo<AnimFlagValue>(
    () => ({
      season,
      enabled: (id) => flagOn(id, remote, preview, kill),
    }),
    [kill, preview, remote, season],
  );

  return <AnimFlagCtx.Provider value={value}>{children}</AnimFlagCtx.Provider>;
}
