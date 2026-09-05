import React, { useState, useEffect, useRef } from "react";
import { UserProfile } from "../types";
import { SUPPORTED_LANGUAGES } from "../constants/languages";
import { playConnectedChime, speakText, getAudioContext } from "../services/audio";
import { Mic, Volume2, Check } from "lucide-react";

interface SettingsTabProps {
  currentUser: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ currentUser, onUpdateProfile }) => {
  const [myLang, setMyLang] = useState(currentUser.myLanguage);
  const [hearLang, setHearLang] = useState(currentUser.hearLanguage);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Mic test
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState("");
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAnimFrameRef = useRef<number | null>(null);

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

    setMicError("");
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
    } catch {
      setMicError("Microphone permission denied or not available.");
    }
  };

  const handleTestSpeaker = () => {
    playConnectedChime();
  };

  const handleTestVoice = () => {
    speakText(`Testing speech in ${myLang}`, myLang);
  };

  const handleSavePreferences = () => {
    onUpdateProfile({
      myLanguage: myLang,
      hearLanguage: hearLang,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Default Languages Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-zinc-900 mb-1">Language Preferences</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Default languages configured for your account
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase mb-1">
              Your Spoken Language
            </label>
            <select
              id="settings-my-language"
              value={myLang}
              onChange={(e) => setMyLang(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs px-3 py-2 rounded-xl outline-none focus:border-zinc-400 font-medium cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={`set_my_${l.code}`} value={l.name}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase mb-1">
              Your Preferred Audio Hearing
            </label>
            <select
              id="settings-hear-language"
              value={hearLang}
              onChange={(e) => setHearLang(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs px-3 py-2 rounded-xl outline-none focus:border-zinc-400 font-medium cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={`set_hear_${l.code}`} value={l.name}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {saveSuccess ? (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
              <Check className="w-4 h-4" /> Preferences saved
            </span>
          ) : (
            <span />
          )}

          <button
            id="settings-save-btn"
            onClick={handleSavePreferences}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Save Settings
          </button>
        </div>
      </div>

      {/* Audio & Rate-Limit Optimization */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 mb-1">Hardware & AI Optimization</h3>
          <p className="text-xs text-zinc-500">
            Engineered for Google Gemini Free-Tier (15 RPM) using zero-quota client speech recognition and local speech synthesis.
          </p>
        </div>

        {/* Mic Test */}
        <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleMicTest}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                isTestingMic
                  ? "bg-rose-50 text-rose-600 border-rose-200"
                  : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
            <div>
              <div className="text-xs font-semibold text-zinc-800">
                {isTestingMic ? "Testing Microphone..." : "Microphone Check"}
              </div>
              <div className="text-[11px] text-zinc-400">
                {isTestingMic ? `Input Level: ${micLevel}%` : "Click to test audio input"}
              </div>
            </div>
          </div>

          {isTestingMic && (
            <div className="w-24 bg-zinc-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-75"
                style={{ width: `${micLevel}%` }}
              />
            </div>
          )}
        </div>

        {micError && <p className="text-xs text-rose-600">{micError}</p>}

        {/* Speaker Test */}
        <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200">
          <div className="flex items-center gap-3">
            <button
              onClick={handleTestSpeaker}
              className="p-2 bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <div>
              <div className="text-xs font-semibold text-zinc-800">Speaker Chime</div>
              <div className="text-[11px] text-zinc-400">Plays notification sound</div>
            </div>
          </div>

          <button
            onClick={handleTestVoice}
            className="text-xs text-zinc-600 hover:text-zinc-900 font-medium px-2.5 py-1 rounded-lg border border-zinc-200 bg-white cursor-pointer"
          >
            Test Voice
          </button>
        </div>
      </div>
    </div>
  );
};
