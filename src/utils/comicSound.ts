/**
 * Shared comic sound engine.
 *
 * Generic UI blips stay small on purpose — the four founder "hero themes"
 * on /about are full mini-fanfares: compressor-limited master bus, hall
 * echo, noise risers, sub-booms and stacked power chords, so every founder
 * sounds like their own movie trailer.
 */

const STORAGE_KEY = 'civiceyeComicSound';

let ctx: AudioContext | null = null;
let master: AudioNode | null = null;
let echoSend: GainNode | null = null;
/** True once any valid user-gesture (pointerdown/keydown/click/touchstart) has fired.
 *  Browsers refuse to start an AudioContext before such a gesture; creating one
 *  eagerly (e.g. on mouseenter) throws the "AudioContext was prevented from
 *  starting automatically" console warning. We therefore gate construction. */
let audioPrimed = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioPrimed) return null; // refuse to build before a real user gesture
  const Ctor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Sound defaults to ON; the navbar SOUND toggle persists the choice here. */
export function isComicSoundOn(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setComicSoundOn(on: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    /* private mode — ignore */
  }
}

/**
 * Browsers only let audio start after a real user gesture (click/touch/key).
 * Defer AudioContext construction until one of those fires, otherwise we get
 * the "AudioContext was prevented from starting automatically" warning when
 * the first sound call happens on e.g. a mouseenter (which is NOT a gesture).
 */
export function primeComicAudio() {
  if (typeof window === 'undefined') return;
  if (audioPrimed) return;
  const prime = () => {
    audioPrimed = true;
    const Ctor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!ctx) {
      try {
        ctx = new Ctor();
      } catch {
        return;
      }
    }
    if (ctx.state === 'suspended') void ctx.resume();
  };
  const opts: AddEventListenerOptions = { once: true, passive: true };
  window.addEventListener('pointerdown', prime, opts);
  window.addEventListener('touchstart', prime, opts);
  window.addEventListener('click', prime, opts);
  window.addEventListener('keydown', prime, opts);
}

/**
 * Master chain: compressor (loud but never clips) + feedback-delay "hall".
 * Everything musical routes through here instead of straight to speakers.
 */
function getMaster(c: AudioContext): AudioNode {
  if (master) return master;
  const comp = c.createDynamicsCompressor();
  comp.threshold.setValueAtTime(-16, c.currentTime);
  comp.knee.setValueAtTime(22, c.currentTime);
  comp.ratio.setValueAtTime(8, c.currentTime);
  comp.attack.setValueAtTime(0.002, c.currentTime);
  comp.release.setValueAtTime(0.24, c.currentTime);
  comp.connect(c.destination);
  master = comp;

  const delay = c.createDelay(1);
  delay.delayTime.value = 0.23;
  const feedback = c.createGain();
  feedback.gain.value = 0.34;
  const wet = c.createGain();
  wet.gain.value = 0.28;
  echoSend = c.createGain();
  echoSend.gain.value = 1;
  echoSend.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(comp);
  return comp;
}

function tone(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  wave: OscillatorType,
  peak: number,
  detune = 0,
  echo = 0.5,
) {
  const out = getMaster(c);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  const t = c.currentTime + start;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + 0.014);
  gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  osc.connect(gain);
  gain.connect(out);
  if (echo > 0 && echoSend) {
    const send = c.createGain();
    send.gain.value = echo;
    gain.connect(send);
    send.connect(echoSend);
  }
  osc.start(t);
  osc.stop(t + dur + 0.08);
}

/** Double-oscillator sub boom — the chest-thump under every epic hit. */
function boom(c: AudioContext, start = 0, peak = 0.3) {
  const out = getMaster(c);
  const t = c.currentTime + start;
  const voices: Array<[OscillatorType, number, number]> = [
    ['sine', 100, 36],
    ['triangle', 200, 72],
  ];
  voices.forEach(([wave, from, to]) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + 0.4);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.016);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.55);
    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.62);
  });
}

/** High-passed noise hit — the comic "KA-POW" shh. */
function crash(c: AudioContext, start = 0, peak = 0.1, dur = 0.3) {
  const out = getMaster(c);
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain();
  gain.gain.value = peak;
  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2200;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  src.start(c.currentTime + start);
}

/** Band-passed noise sweep 250Hz→3.8kHz — the trailer riser before the hit. */
function riser(c: AudioContext, start = 0, dur = 0.4, peak = 0.12) {
  const out = getMaster(c);
  const t = c.currentTime + start;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.4;
  filter.frequency.setValueAtTime(250, t);
  filter.frequency.exponentialRampToValueAtTime(3800, t + dur);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(peak, t + dur * 0.9);
  gain.gain.linearRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  src.start(t);
}

/** Small triangle blips used by the generic comic UI (kept deliberately tiny). */
export function playBlip(notes: number[]) {
  if (!isComicSoundOn()) return;
  const c = getCtx();
  if (!c) return;
  void c.resume();
  notes.forEach((f, i) => tone(c, f, i * 0.07, 0.2, 'triangle', 0.13, 0, 0));
}

const themePlayer = (build: (c: AudioContext) => void) => () => {
  if (!isComicSoundOn()) return;
  const c = getCtx();
  if (!c) return;
  void c.resume();
  getMaster(c);
  build(c);
};

/**
 * One signature fanfare per founder — different key, rhythm and texture so
 * they are instantly tellable apart, and miles bigger than the UI blips.
 */
export const founderThemes = [
  // 01 · Archit Ranjeev — Backend: riser, boom, C power-chord wall + octave stab.
  themePlayer((c) => {
    riser(c, 0, 0.38);
    boom(c, 0.38);
    crash(c, 0.4, 0.12);
    const hit = 0.4;
    [130.81, 196.0, 261.63, 329.63, 392.0].forEach((f, i) => {
      tone(c, f, hit + i * 0.05, 1.0, 'sawtooth', 0.12, 0, 0.4);
      tone(c, f * 2, hit + i * 0.05, 0.8, 'square', 0.05, 7, 0.5);
    });
    tone(c, 65.41, hit, 1.1, 'sine', 0.22, 0, 0); // C2 sub pad
    tone(c, 523.25, hit + 0.55, 0.7, 'sawtooth', 0.12, 0, 0.7); // C5 final stab
    tone(c, 783.99, hit + 0.55, 0.7, 'square', 0.07, 5, 0.7); // G5 on top
    crash(c, hit + 0.55, 0.07, 0.22);
  }),
  // 02 · Aswathram — AI & Backend: machine-gun synth run + shimmer + E2 drone.
  themePlayer((c) => {
    crash(c, 0, 0.08, 0.2);
    const run = [329.63, 392.0, 493.88, 659.25, 783.99, 987.77, 1318.51];
    run.forEach((f, i) => {
      tone(c, f, i * 0.055, 0.34, 'square', 0.09, 0, 0.6);
      tone(c, f * 1.006, i * 0.055, 0.34, 'sawtooth', 0.05, 0, 0.6);
    });
    tone(c, 82.41, 0, 1.2, 'sawtooth', 0.16, 0, 0.2); // E2 machine drone
    tone(c, 2093.0, 0.42, 0.8, 'sine', 0.11, 0, 0.9); // C7 sparkle
    tone(c, 2637.02, 0.5, 0.8, 'sine', 0.09, 0, 0.9); // E7 sparkle
    boom(c, 0.42, 0.2);
  }),
  // 03 · Kiushki — UI Designer: bell melody + fast sparkle arpeggio tail.
  themePlayer((c) => {
    riser(c, 0, 0.3, 0.08);
    const bells: Array<[number, number]> = [
      [440, 0.05],
      [554.37, 0.18],
      [659.25, 0.31],
      [880, 0.46],
      [1108.73, 0.66],
    ];
    bells.forEach(([f, t]) => {
      tone(c, f, t, 0.8, 'triangle', 0.16, 0, 0.8);
      tone(c, f * 2, t + 0.01, 0.6, 'sine', 0.09, 0, 0.8);
      tone(c, f * 3.01, t + 0.01, 0.35, 'sine', 0.04, 0, 0.9); // bell partial
    });
    [1760, 2093, 2217.46, 2637.02].forEach((f, i) => {
      tone(c, f, 0.85 + i * 0.05, 0.4, 'sine', 0.08, 0, 0.9);
    });
    crash(c, 0.46, 0.06, 0.25);
    boom(c, 0.46, 0.16);
  }),
  // 04 · S. Himeshkara — UI Designer: guardian anthem, D-major horn call.
  themePlayer((c) => {
    boom(c, 0, 0.28);
    riser(c, 0, 0.34);
    const hit = 0.36;
    [146.83, 220.0, 293.66, 369.99, 440.0].forEach((f, i) => {
      tone(c, f, hit + i * 0.06, 1.0, 'sawtooth', 0.11, -4, 0.4); // horn-ish, slightly dark
      tone(c, f, hit + i * 0.06, 1.0, 'triangle', 0.1, 4, 0.5);
    });
    tone(c, 73.42, hit, 1.2, 'sine', 0.24, 0, 0); // D2 sub
    tone(c, 587.33, hit + 0.62, 0.8, 'sawtooth', 0.12, 0, 0.7); // D5 heroic fifth
    tone(c, 880.0, hit + 0.62, 0.8, 'triangle', 0.1, 0, 0.8); // A5 crown
    tone(c, 1174.66, hit + 0.78, 0.9, 'sine', 0.09, 0, 0.9); // D6 bell
    crash(c, hit + 0.62, 0.08, 0.28);
  }),
];
