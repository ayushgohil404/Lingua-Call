// Web Audio API and Speech Synthesis utilities for LinguaCall

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  } catch (e) {
    console.warn("AudioContext init notice:", e);
  }
  return audioCtx as AudioContext;
}

// Play pleasant incoming call ringtone loop
let ringtoneOscillator: OscillatorNode | null = null;
let ringtoneGain: GainNode | null = null;
let ringtoneInterval: number | null = null;

export function startIncomingRingtone(): void {
  stopIncomingRingtone();
  try {
    // Trigger vibration on mobile devices if supported
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([500, 250, 500, 250, 500]);
      } catch {}
    }

    const ctx = getAudioContext();
    if (!ctx) return;
    const playChime = () => {
      const now = ctx.currentTime;
      // High note
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);

      // Second note
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1318.51, now + 0.2); // E6
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.35); // A6
      gain2.gain.setValueAtTime(0.2, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.65);
    };

    playChime();
    ringtoneInterval = window.setInterval(playChime, 2200);
  } catch (e) {
    console.warn("Could not play ringtone:", e);
  }
}

export function stopIncomingRingtone(): void {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (ringtoneOscillator) {
    try {
      ringtoneOscillator.stop();
      ringtoneOscillator.disconnect();
    } catch {}
    ringtoneOscillator = null;
  }
  if (ringtoneGain) {
    try {
      ringtoneGain.disconnect();
    } catch {}
    ringtoneGain = null;
  }
}

// Play call connected chime
export function playConnectedChime(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
    osc.frequency.setValueAtTime(1046.5, now + 0.3); // C6
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  } catch {}
}

// Play call ended chime
export function playEndCallChime(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch {}
}

// Play base64 audio data returned by Gemini (handles PCM or WAV/MP3)
export async function playBase64Audio(base64Data: string, sampleRate = 24000): Promise<void> {
  try {
    const ctx = getAudioContext();
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Try standard decodeAudioData (for WAV, MP3, etc.)
    try {
      const buffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      return;
    } catch {
      // If headerless 16-bit raw PCM from Gemini Live/TTS:
      const pcm16 = new Int16Array(bytes.buffer);
      const audioBuffer = ctx.createBuffer(1, pcm16.length, sampleRate);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768.0;
      }
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start(0);
    }
  } catch (err) {
    console.error("Error playing base64 audio:", err);
  }
}

// Web Speech API fallback for real-time speech output
export function speakText(text: string, langName: string): void {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    // Map language name to voice or lang code
    const langCodeMap: Record<string, string> = {
      hindi: "hi-IN",
      english: "en-US",
      spanish: "es-ES",
      french: "fr-FR",
      german: "de-DE",
      japanese: "ja-JP",
      chinese: "zh-CN",
      arabic: "ar-SA",
      telugu: "te-IN",
      tamil: "ta-IN",
      bengali: "bn-IN",
      marathi: "mr-IN",
      punjabi: "pa-IN",
      gujarati: "gu-IN",
      russian: "ru-RU",
      portuguese: "pt-BR",
      italian: "it-IT",
      korean: "ko-KR",
      turkish: "tr-TR",
      dutch: "nl-NL",
    };

    const targetCode = langCodeMap[langName.toLowerCase()] || "en-US";
    utterance.lang = targetCode;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((v) => v.lang.startsWith(targetCode.slice(0, 2)));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("SpeechSynthesis error:", e);
  }
}
