// Subtle UI click sound via Web Audio (no audio files). Respects a mute flag.
let ctx: AudioContext | null = null;

const STORE_KEY = "pulpo-sound";

export function soundEnabled() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORE_KEY) !== "off";
}

export function setSoundEnabled(on: boolean) {
  localStorage.setItem(STORE_KEY, on ? "on" : "off");
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

/** A soft, short "tick" — pleasant and unobtrusive. */
export function playTick(kind: "tap" | "success" = "tap") {
  if (!soundEnabled()) return;
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});

  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);

  if (kind === "success") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(990, now + 0.12);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.start(now);
    osc.stop(now + 0.2);
  } else {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(540, now);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.start(now);
    osc.stop(now + 0.07);
  }
}

export function haptic(ms = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(ms); } catch { /* ignore */ }
  }
}
