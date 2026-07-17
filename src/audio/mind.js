import {
  E_DIGITS,
  PI_DIGITS,
  deriveActivity,
  deriveHarmony,
  derivePatternStep,
} from "./composition.js";

const VOLUME_KEY = "nanoswarm.audio.volume";
const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;

function savedVolume() {
  try {
    const value = Number(window.localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0.48;
  } catch {
    return 0.48;
  }
}

function bigintPresence(value) {
  if (value <= 1n) return 0;
  return Math.min(1, (value.toString().length - 1) / 9);
}

function completionDirective(message) {
  if (message.startsWith("ENERGY ACQUISITION COMPLETE")) return "energy";
  if (message.startsWith("COLLECTION RUN COMPLETE")) return "collect";
  if (message.startsWith("ATMOSPHERIC HARVEST COMPLETE")) return "atmosphere";
  if (message.startsWith("SORTING RUN COMPLETE")) return "sort";
  if (message.startsWith("REPLICATION COMPLETE")) return "replicate";
  if (message.startsWith("RESEARCH COMPLETE")) return "research";
  if (message.startsWith("SUBSTRATE SURVEY COMPLETE")) return "survey";
  return null;
}

export class SyntheticMind {
  constructor() {
    this.context = null;
    this.enabled = false;
    this.volume = savedVolume();
    this.master = null;
    this.ambientFilter = null;
    this.eventBus = null;
    this.noiseBuffer = null;
    this.droneVoices = [];
    this.activity = null;
    this.harmony = null;
    this.activitySignature = null;
    this.section = 0;
    this.patternStep = 0;
    this.nextPulseTime = 0;
    this.scheduler = null;
    this.knownCohorts = new Set();
    this.lastLogId = null;
    this.lastSectionCueAt = -Infinity;
  }

  get isSupported() {
    return Boolean(AudioContextConstructor);
  }

  get volumePercent() {
    return Math.round(this.volume * 100);
  }

  ensureGraph() {
    if (this.context) return;
    if (!AudioContextConstructor) throw new Error("Web Audio is not available in this browser.");

    const context = new AudioContextConstructor({ latencyHint: "interactive" });
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    master.gain.value = 0.0001;
    compressor.threshold.value = -24;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.02;
    compressor.release.value = 0.7;
    master.connect(compressor).connect(context.destination);

    const ambientFilter = context.createBiquadFilter();
    ambientFilter.type = "lowpass";
    ambientFilter.frequency.value = 260;
    ambientFilter.Q.value = 0.7;
    ambientFilter.connect(master);

    const eventBus = context.createGain();
    const delay = context.createDelay(1.5);
    const wet = context.createGain();
    const feedback = context.createGain();
    eventBus.gain.value = 0.8;
    delay.delayTime.value = 0.314159;
    wet.gain.value = 0.2;
    feedback.gain.value = 0.14;
    eventBus.connect(master);
    eventBus.connect(delay);
    delay.connect(wet).connect(master);
    delay.connect(feedback).connect(delay);

    const lfo = context.createOscillator();
    const lfoDepth = context.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 0.0271828;
    lfoDepth.gain.value = 72;
    lfo.connect(lfoDepth).connect(ambientFilter.frequency);
    lfo.start();

    const types = ["sine", "triangle", "sine", "sawtooth"];
    this.droneVoices = types.map((type, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = 40 + index * 10;
      oscillator.detune.value = index % 2 === 0 ? -3.14159 : 2.71828;
      gain.gain.value = 0.0001;
      oscillator.connect(gain).connect(ambientFilter);
      oscillator.start();
      return { oscillator, gain };
    });

    this.context = context;
    this.master = master;
    this.ambientFilter = ambientFilter;
    this.eventBus = eventBus;
    this.noiseBuffer = this.createNoiseBuffer();
  }

  createNoiseBuffer() {
    const length = Math.floor(this.context.sampleRate * 0.45);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 3141592653;
    for (let index = 0; index < length; index += 1) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      data[index] = ((seed >>> 0) / 2 ** 31 - 1) * (1 - index / length);
    }
    return buffer;
  }

  snapshot(state) {
    this.knownCohorts = new Set(state.cohorts.map((cohort) => cohort.id));
    this.lastLogId = state.log.at(-1)?.id ?? null;
    this.section = Number(state.nextId % BigInt(PI_DIGITS.length));
    this.patternStep = Number(state.nextId % BigInt(E_DIGITS.length));
    this.activitySignature = null;
    this.updateComposition(state, true);
  }

  async start(state) {
    this.ensureGraph();
    this.enabled = true;
    this.snapshot(state);
    const resume = this.context.resume();
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(Math.max(0.0001, this.volume), this.context.currentTime, 0.35);
    this.nextPulseTime = this.context.currentTime + 0.25;
    this.startScheduler();
    await resume;
    if (this.enabled) this.awakeningCue();
  }

  stop() {
    this.enabled = false;
    if (this.scheduler) clearInterval(this.scheduler);
    this.scheduler = null;
    if (!this.context) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0.0001, now, 0.08);
    window.setTimeout(() => {
      if (!this.enabled && this.context?.state === "running") void this.context.suspend();
    }, 300);
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    try {
      window.localStorage.setItem(VOLUME_KEY, String(this.volume));
    } catch {
      // Private browsing can deny persistent storage; audio still works for this session.
    }
    if (this.enabled && this.context) {
      this.master.gain.setTargetAtTime(Math.max(0.0001, this.volume), this.context.currentTime, 0.04);
    }
  }

  updateComposition(state, initial = false) {
    const activity = deriveActivity(state);
    if (activity.signature === this.activitySignature) return;
    if (!initial) this.section = (this.section + 1) % PI_DIGITS.length;
    this.activity = activity;
    this.harmony = deriveHarmony(activity, this.section);
    this.activitySignature = activity.signature;
    if (this.context) this.retuneDrones(initial);
    if (!initial && this.context.currentTime - this.lastSectionCueAt > 2.4) {
      this.sectionCue();
      this.lastSectionCueAt = this.context.currentTime;
    }
  }

  retuneDrones(immediate) {
    const now = this.context.currentTime;
    const timeConstant = immediate ? 0.08 : 1.8 + Number(E_DIGITS[this.section % E_DIGITS.length]) / 5;
    const thresholds = [0, 0.13, 0.3, 0.56];
    const levels = [0.0075, 0.0048, 0.0032, 0.0015];
    this.droneVoices.forEach((voice, index) => {
      const frequency = this.harmony.frequencies[index % this.harmony.frequencies.length] * (index >= 2 ? 2 : 1);
      const visible = this.activity.awakening >= thresholds[index];
      const level = visible ? levels[index] * (0.72 + this.activity.awakening * 0.42) : 0.0001;
      voice.oscillator.frequency.setTargetAtTime(frequency, now, timeConstant);
      voice.gain.gain.setTargetAtTime(level, now, immediate ? 0.2 : 1.4);
    });
    this.ambientFilter.frequency.setTargetAtTime(210 + this.activity.awakening * 720, now, 1.6);
  }

  observe(state, wallTime = Date.now()) {
    if (!this.enabled || !this.context) return;
    this.updateComposition(state);

    const currentCohorts = new Set(state.cohorts.map((cohort) => cohort.id));
    for (const cohort of state.cohorts) {
      if (!this.knownCohorts.has(cohort.id)) this.cohortStartCue(cohort, wallTime);
    }
    this.knownCohorts = currentCohorts;

    const previousLogIndex = state.log.findIndex((entry) => entry.id === this.lastLogId);
    if (previousLogIndex >= 0) {
      for (const entry of state.log.slice(previousLogIndex + 1)) {
        const directive = completionDirective(entry.message);
        if (directive) this.completionCue(directive);
      }
    }
    this.lastLogId = state.log.at(-1)?.id ?? this.lastLogId;
  }

  startScheduler() {
    if (this.scheduler) clearInterval(this.scheduler);
    this.scheduler = window.setInterval(() => this.fillSchedule(), 120);
    this.fillSchedule();
  }

  fillSchedule() {
    if (!this.enabled || this.context?.state !== "running" || !this.activity || !this.harmony) return;
    const horizon = this.context.currentTime + (document.hidden ? 3.2 : 0.85);
    let scheduled = 0;
    while (this.nextPulseTime < horizon && scheduled < 12) {
      const pattern = derivePatternStep(this.patternStep, this.activity, this.section);
      if (pattern.play) {
        const frequency = this.harmony.frequencies[pattern.chordIndex] * pattern.octave;
        this.tone(
          frequency,
          this.nextPulseTime,
          pattern.accent ? 0.42 : 0.28,
          pattern.accent ? "triangle" : "sine",
          pattern.accent ? 0.009 : 0.0055,
        );
      }
      this.nextPulseTime += pattern.intervalSeconds;
      this.patternStep = (this.patternStep + 1) % (PI_DIGITS.length * E_DIGITS.length);
      scheduled += 1;
    }
  }

  tone(frequency, when, duration, type, level, destination = this.eventBus) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), when + Math.min(0.06, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain).connect(destination);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.04);
  }

  noise(when, duration, level, frequency) {
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 5;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(level, when + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter).connect(gain).connect(this.eventBus);
    source.start(when, 0, duration);
  }

  awakeningCue() {
    const now = this.context.currentTime + 0.06;
    this.harmony.frequencies.slice(0, 3).forEach((frequency, index) => {
      const offset = Number(PI_DIGITS[(this.section + index) % PI_DIGITS.length]) * 0.018;
      this.tone(frequency * 2, now + index * 0.11 + offset, 1.5 + index * 0.4, "sine", 0.008);
    });
  }

  sectionCue() {
    const when = this.context.currentTime + 0.035;
    const frequency = this.harmony.frequencies[(this.section + 1) % this.harmony.frequencies.length] * 2;
    this.tone(frequency, when, 0.7, "sine", 0.0045);
  }

  cohortStartCue(cohort, wallTime) {
    const delay = Math.max(0.025, Math.min(0.7, (cohort.startedAt - wallTime) / 1000));
    const when = this.context.currentTime + delay;
    const presence = bigintPresence(cohort.workers);
    const base = this.harmony.frequencies[(this.section + cohort.directive.length) % this.harmony.frequencies.length];
    const level = 0.007 + presence * 0.006;
    if (cohort.directive === "energy") {
      this.tone(base * 4, when, 0.18, "sine", level);
    } else if (cohort.directive === "collect") {
      this.tone(base, when, 0.42, "triangle", level);
    } else if (cohort.directive === "atmosphere") {
      this.tone(base * 3, when, 0.7, "sine", level * 0.7);
      this.noise(when, 0.48, 0.0025, 2_400);
    } else if (cohort.directive === "sort") {
      this.tone(base * 2, when, 0.16, "triangle", level);
      this.tone(base * 3, when + 0.085, 0.2, "sine", level * 0.7);
    } else if (cohort.directive === "replicate") {
      [1, 1.5, 2].forEach((multiple, index) => this.tone(base * multiple, when + index * 0.09, 0.5, "sine", level));
      this.noise(when, 0.16, 0.0035, 920);
    } else if (cohort.directive === "survey" || cohort.directive === "prospect") {
      this.tone(base * 4, when, 0.65, "sine", level);
    }
  }

  completionCue(directive) {
    const when = this.context.currentTime + 0.025;
    const index = Math.max(0, ["energy", "collect", "atmosphere", "sort", "replicate", "research", "survey"].indexOf(directive));
    const base = this.harmony.frequencies[index % this.harmony.frequencies.length];
    if (directive === "replicate") {
      this.tone(base * 2, when, 1.2, "sine", 0.014);
      this.tone(base * 3, when + 0.11, 1.45, "triangle", 0.009);
    } else if (directive === "research") {
      [2, 3, 4].forEach((multiple, note) => this.tone(base * multiple, when + note * 0.14, 1.1, "sine", 0.009));
    } else {
      this.tone(base * 2, when, 0.34, "sine", 0.0075);
      this.tone(base * 2.5, when + 0.075, 0.28, "triangle", 0.0045);
    }
  }
}
