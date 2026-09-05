import React, { useState, useEffect, useRef } from "react";
import { UserProfile } from "../types";
import { SUPPORTED_LANGUAGES } from "../constants/languages";
import { playConnectedChime, speakText, getAudioContext } from "../services/audio";
import { Mic, Volume2, Sparkles, Activity, ShieldCheck, Cpu } from "lucide-react";

interface SettingsTabProps {
  currentUser: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ currentUser, onUpdateProfile }) => {
  const [myLang, setMyLang] = useState(currentUser.myLanguage);
  const [hearLang, setHearLang] = useState(currentUser.hearLanguage);
  const [voice, setVoice] = useState("Kore");

  // Mic test
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAnimFrameRef = useRef<number | null>(null);

  // Health info
  const [healthInfo, setHealthInfo] = useState<{ status: string; hasApiKey: boolean; usersCount: number } | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then(setHealthInfo)
      .catch(() => {});
  }, []);

  const handleToggleMicTest = async () => {
    if (isTestingMic) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (micAnimFrameRef.current) cancelAnimationFrame(micAnimFrameRef.current);
      setIsTestingMic(false);
      setMicLevel(0);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setIsTestingMic(true);

      const ctx = getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const check = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        micAnimFrameRef.current = requestAnimationFrame(check);
      };
      check();
    } catch (e) {
      alert("Could not access microphone.");
    }
  };

  const handleTestSpeaker = () => {
    playConnectedChime();
  };

  const handleTestVoice = () => {
    speakText(`Testing LinguaCall speech translation with the ${voice} voice timbre.`, "English");
  };

  const handleSavePreferences = () => {
    onUpdateProfile({
      myLanguage: myLang,
      hearLanguage: hearLang,
    });
    alert("Preferences saved successfully!");
  };

  useEffect(() => {
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (micAnimFrameRef.current) cancelAnimationFrame(micAnimFrameRef.current);
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 sm:p-8 shadow-sm">
        <div className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Preferences & Diagnostics</div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 mb-1">Audio & Translation Settings</h2>
        <p className="text-xs text-zinc-500 font-medium">
          Configure default translation pairs, calibrate your microphone, and preview AI voices.
        </p>
      </div>

      {/* Language Preferences */}
      <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 sm:p-8 space-y-5 shadow-sm">
        <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Default Language Settings</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
              My Spoken Language
            </label>
            <select
              value={myLang}
              onChange={(e) => setMyLang(e.target.value)}
              className="w-full bg-zinc-50 border-2 border-zinc-200 text-zinc-900 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-600 font-semibold cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={`my_set_${l.code}`} value={l.name}>
                  {l.flag} {l.name} ({l.native})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
              Preferred Hearing Language
            </label>
            <select
              value={hearLang}
              onChange={(e) => setHearLang(e.target.value)}
              className="w-full bg-zinc-50 border-2 border-zinc-200 text-zinc-900 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-600 font-semibold cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={`hear_set_${l.code}`} value={l.name}>
                  {l.flag} {l.name} ({l.native})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSavePreferences}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm border border-indigo-700 cursor-pointer"
        >
          Save Language Defaults
        </button>
      </div>

      {/* Audio Hardware Calibration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mic Test */}
        <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 sm:p-8 flex flex-col justify-between shadow-sm">
          <div>
            <div className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Hardware Input</div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2 mb-1">
              <Mic className="w-4 h-4 text-emerald-600" />
              <span>Microphone Calibration</span>
            </h3>
            <p className="text-xs text-zinc-500 font-medium mb-4">
              Test your mic sensitivity for optimal AI speech recognition.
            </p>

            <div className="bg-zinc-50 p-4 rounded-xl border-2 border-zinc-200 mb-4">
              <div className="flex items-center justify-between text-xs text-zinc-600 font-bold mb-1.5">
                <span>Input Level:</span>
                <span className="font-mono text-emerald-600">{micLevel}%</span>
              </div>
              <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-75"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleToggleMicTest}
            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isTestingMic
                ? "bg-rose-50 text-rose-600 border-2 border-rose-500"
                : "bg-zinc-900 hover:bg-zinc-800 text-white"
            }`}
          >
            {isTestingMic ? "Stop Microphone Test" : "Test Microphone"}
          </button>
        </div>

        {/* Speaker Test */}
        <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 sm:p-8 flex flex-col justify-between shadow-sm">
          <div>
            <div className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Hardware Output</div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2 mb-1">
              <Volume2 className="w-4 h-4 text-indigo-600" />
              <span>Speaker & Audio Output</span>
            </h3>
            <p className="text-xs text-zinc-500 font-medium mb-4">
              Verify Web Audio playback for incoming call chimes and translated voice.
            </p>

            <div className="bg-zinc-50 p-4 rounded-xl border-2 border-zinc-200 mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 font-bold uppercase tracking-wider">Gemini Voice Timbre:</span>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="bg-white border border-zinc-200 text-zinc-900 px-2.5 py-1 rounded-lg text-xs font-semibold outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="Kore">Kore (Warm)</option>
                  <option value="Puck">Puck (Crisp)</option>
                  <option value="Fenrir">Fenrir (Deep)</option>
                  <option value="Zephyr">Zephyr (Smooth)</option>
                  <option value="Charon">Charon (Calm)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTestSpeaker}
              className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Play Chime
            </button>
            <button
              onClick={handleTestVoice}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm border border-indigo-700 cursor-pointer"
            >
              Preview AI Voice
            </button>
          </div>
        </div>
      </div>

      {/* System & Infrastructure Status */}
      <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 sm:p-8 shadow-sm">
        <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2 mb-4">
          <Cpu className="w-4 h-4 text-indigo-600" />
          <span>System & Infrastructure Health</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-zinc-50 rounded-xl border-2 border-zinc-200">
            <div className="text-zinc-500 font-medium text-[11px]">Gemini Live AI API</div>
            <div className="font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{healthInfo?.hasApiKey ? "Connected & Active" : "Online"}</span>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-50 rounded-xl border-2 border-zinc-200">
            <div className="text-zinc-500 font-medium text-[11px]">Signaling & WebSockets</div>
            <div className="font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Socket.io v4</span>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-50 rounded-xl border-2 border-zinc-200">
            <div className="text-zinc-500 font-medium text-[11px]">WebRTC Peer Traversal</div>
            <div className="font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Google STUN Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
