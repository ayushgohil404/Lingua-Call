import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { SUPPORTED_LANGUAGES } from "../constants/languages";
import { playBase64Audio, speakText } from "../services/audio";
import { AtSign, Check, X, Loader2, Sparkles, Volume2 } from "lucide-react";

interface UsernameSetupProps {
  initialUser: Partial<UserProfile>;
  onComplete: (completedProfile: UserProfile) => void;
}

export const UsernameSetup: React.FC<UsernameSetupProps> = ({ initialUser, onComplete }) => {
  const [username, setUsername] = useState(initialUser.username || "");
  const [name, setName] = useState(initialUser.name || "");
  const [myLanguage, setMyLanguage] = useState(initialUser.myLanguage || "Hindi");
  const [hearLanguage, setHearLanguage] = useState(initialUser.hearLanguage || "English");
  const [selectedVoice, setSelectedVoice] = useState("Kore");
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // Debounced check username
  useEffect(() => {
    if (!username || username.trim().length < 3) {
      setIsAvailable(null);
      setErrorMessage(username.trim().length > 0 ? "Minimum 3 characters" : "");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setIsAvailable(false);
      setErrorMessage("Only letters, numbers, and underscores allowed");
      return;
    }

    setIsChecking(true);
    setErrorMessage("");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/check?username=${encodeURIComponent(username.trim())}`);
        const data = await res.json();
        setIsAvailable(data.available);
        if (!data.available) {
          setErrorMessage(data.error || "Username is already taken");
        }
      } catch {
        setIsAvailable(true);
      } finally {
        setIsChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const handlePreviewVoice = async () => {
    setIsPlayingPreview(true);
    const sampleText = `Hello! This is LinguaCall with the ${selectedVoice} voice. Real-time translation ready.`;
    speakText(sampleText, "English");
    setTimeout(() => setIsPlayingPreview(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || isAvailable === false) return;

    setIsSubmitting(true);
    try {
      const payload = {
        userId: initialUser.userId || `usr_${Date.now()}`,
        username: username.trim().toLowerCase(),
        name: name.trim() || username.trim(),
        email: initialUser.email,
        picture: initialUser.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${username.trim()}`,
        myLanguage,
        hearLanguage,
      };

      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.user) {
        onComplete(data.user);
      } else {
        setErrorMessage(data.error || "Could not register username");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 bg-zinc-100 text-zinc-900">
      <div className="w-full max-w-lg bg-white border-2 border-zinc-200 rounded-[2rem] p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl font-bold shadow-md shadow-indigo-600/20 border border-indigo-700">
            🌐
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Create Your Caller ID</h2>
          <p className="text-xs text-zinc-500 font-medium mt-1">
            Choose your unique username and configure your spoken and hearing languages.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
              Your Full Name
            </label>
            <input
              id="setup-fullname-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ayush Gohil"
              required
              className="w-full bg-zinc-50 border-2 border-zinc-200 text-zinc-900 px-3.5 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-600 focus:bg-white transition-all font-medium placeholder:text-zinc-400"
            />
          </div>

          {/* Username with real-time status */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
              Unique Username (@)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <AtSign className="w-4 h-4" />
              </div>
              <input
                id="setup-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. ayush_404"
                maxLength={20}
                required
                className={`w-full bg-zinc-50 border-2 text-zinc-900 pl-10 pr-10 py-2.5 rounded-xl text-xs outline-none transition-all font-medium placeholder:text-zinc-400 ${
                  isAvailable === true
                    ? "border-emerald-500 focus:border-emerald-600 bg-white"
                    : isAvailable === false
                    ? "border-rose-500 focus:border-rose-600 bg-white"
                    : "border-zinc-200 focus:border-indigo-600 focus:bg-white"
                }`}
              />
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                {isChecking ? (
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                ) : isAvailable === true ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : isAvailable === false ? (
                  <X className="w-4 h-4 text-rose-600" />
                ) : null}
              </div>
            </div>

            {errorMessage ? (
              <p className="text-[11px] font-semibold text-rose-600 mt-1">{errorMessage}</p>
            ) : isAvailable === true ? (
              <p className="text-[11px] font-bold text-emerald-600 mt-1">Username is available!</p>
            ) : (
              <p className="text-[11px] text-zinc-400 font-medium mt-1">
                Others will use this to call and message you.
              </p>
            )}
          </div>

          {/* Languages Setup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                🗣️ I usually speak:
              </label>
              <select
                id="setup-my-language"
                value={myLanguage}
                onChange={(e) => setMyLanguage(e.target.value)}
                className="w-full bg-zinc-50 border-2 border-zinc-200 text-zinc-900 px-3 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-600 focus:bg-white font-semibold cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={`my_${lang.code}`} value={lang.name}>
                    {lang.flag} {lang.name} ({lang.native})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                👂 I prefer to hear:
              </label>
              <select
                id="setup-hear-language"
                value={hearLanguage}
                onChange={(e) => setHearLanguage(e.target.value)}
                className="w-full bg-zinc-50 border-2 border-zinc-200 text-zinc-900 px-3 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-600 focus:bg-white font-semibold cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={`hear_${lang.code}`} value={lang.name}>
                    {lang.flag} {lang.name} ({lang.native})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Voice timbre selection */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Translated Voice Persona (Gemini TTS)</span>
              </label>
              <button
                type="button"
                onClick={handlePreviewVoice}
                disabled={isPlayingPreview}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{isPlayingPreview ? "Playing..." : "Preview"}</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "Kore", label: "Kore", desc: "Warm & Natural" },
                { id: "Puck", label: "Puck", desc: "Upbeat & Crisp" },
                { id: "Fenrir", label: "Fenrir", desc: "Deep & Authoritative" },
                { id: "Zephyr", label: "Zephyr", desc: "Smooth & Balanced" },
                { id: "Charon", label: "Charon", desc: "Gentle & Calm" },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVoice(v.id)}
                  className={`p-2.5 rounded-xl text-left border-2 text-xs transition-all cursor-pointer ${
                    selectedVoice === v.id
                      ? "bg-indigo-50 border-indigo-600 text-indigo-900 shadow-xs"
                      : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  <div className="font-bold">{v.label}</div>
                  <div className="text-[10px] text-zinc-400 font-medium truncate">{v.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            id="setup-confirm-btn"
            type="submit"
            disabled={!username.trim() || isAvailable === false || isSubmitting}
            className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md border border-indigo-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Confirm & Enter LinguaCall</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
