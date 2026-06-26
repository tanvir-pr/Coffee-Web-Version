"use client";

import { useEffect, useRef, useState } from "react";
import { useTier } from "@/app/providers/MotionProvider";
import { useCould } from "@/app/providers/AnimFlags";

function paintLevel(level: number) {
  const hero = document.getElementById("hero");
  const button = document.querySelector<HTMLElement>("[data-cafe-sound]");
  hero?.style.setProperty("--audio-level", level.toFixed(3));
  button?.style.setProperty("--audio-level", level.toFixed(3));
}

function noiseBuffer(context: AudioContext, seconds = 2): AudioBuffer {
  const rate = context.sampleRate;
  const buffer = context.createBuffer(1, rate * seconds, rate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1;
    brown = (brown + 0.02 * white) / 1.02;
    data[index] = brown * 3.5;
  }
  return buffer;
}

export function CafeSound() {
  const on = useCould("15");
  const tier = useTier();
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const audio = useRef<{
    context: AudioContext;
    gain: GainNode;
    frame: number;
    stop: () => void;
  } | null>(null);

  useEffect(() => {
    return () => {
      audio.current?.stop();
      paintLevel(0);
    };
  }, []);

  if (!on) return null;

  async function toggle() {
    if (audio.current) {
      audio.current.stop();
      audio.current = null;
      setPlaying(false);
      paintLevel(0);
      try {
        window.localStorage.setItem("crema:sound", "0");
      } catch {
        /* preference is optional */
      }
      return;
    }
    const context = new AudioContext();
    const source = context.createBufferSource();
    source.buffer = noiseBuffer(context);
    source.loop = true;
    const filter = context.createBiquadFilter();
    const hour = new Date().getHours();
    filter.type = hour < 12 ? "highpass" : hour < 18 ? "bandpass" : "lowpass";
    filter.frequency.value = hour < 12 ? 800 : hour < 18 ? 500 : 400;
    const gain = context.createGain();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(filter).connect(gain).connect(analyser).connect(context.destination);
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(volume, context.currentTime + 1.5);
    source.start();
    const samples = new Uint8Array(analyser.fftSize);
    let level = 0;
    let frame = 0;
    const visual = tier === "full";
    const tick = () => {
      if (document.hidden) {
        paintLevel(0);
        frame = 0;
        return;
      }
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) {
        const centered = (sample - 128) / 128;
        sum += centered * centered;
      }
      const rms = Math.sqrt(sum / samples.length);
      level += (rms - level) * 0.15;
      paintLevel(level);
      frame = requestAnimationFrame(tick);
    };
    if (visual) frame = requestAnimationFrame(tick);
    const onHide = () => {
      if (document.hidden) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        paintLevel(0);
        gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.8);
        window.setTimeout(() => void context.suspend(), 800);
        return;
      }
      void context.resume().then(() => {
        gain.gain.linearRampToValueAtTime(gain.gain.value || volume, context.currentTime + 0.4);
        if (visual && frame === 0) frame = requestAnimationFrame(tick);
      });
    };
    document.addEventListener("visibilitychange", onHide);
    const stop = () => {
      document.removeEventListener("visibilitychange", onHide);
      if (frame) cancelAnimationFrame(frame);
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.3);
      window.setTimeout(() => void context.close(), 350);
      paintLevel(0);
    };
    let idle = window.setTimeout(stop, 30000);
    const poke = () => {
      window.clearTimeout(idle);
      idle = window.setTimeout(stop, 30000);
    };
    window.addEventListener("pointerdown", poke);
    const wrapped = () => {
      window.removeEventListener("pointerdown", poke);
      window.clearTimeout(idle);
      stop();
    };
    audio.current = { context, gain, frame, stop: wrapped };
    setPlaying(true);
    try {
      window.localStorage.setItem("crema:sound", "1");
    } catch {
      /* preference is optional */
    }
  }

  return (
    <span className="flex items-center gap-2" data-cafe-sound="">
      <button type="button" className="cafe-sound" aria-pressed={playing} onClick={() => void toggle()}>
        {playing ? "Pause café sound" : "Café sound"}
      </button>
      <input
        aria-label="Café volume"
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={(event) => {
          const next = Number(event.target.value);
          setVolume(next);
          const node = audio.current;
          if (node) node.gain.gain.setValueAtTime(next, node.context.currentTime);
        }}
      />
    </span>
  );
}
