import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { SUPPORTED_LANGUAGES } from "../constants/languages";
import { AtSign, Check, X, Loader2, PhoneCall, CheckCircle2 } from "lucide-react";

interface UsernameSetupProps {
  initialUser: Partial<UserProfile>;
  onComplete: (completedProfile: UserProfile) => void;
}

export const UsernameSetup: React.FC<UsernameSetupProps> = ({ initialUser, onComplete }) => {
  const [username, setUsername] = useState(initialUser.username || "");
  const [name, setName] = useState(initialUser.name || "");
  const [myLanguage, setMyLanguage] = useState(initialUser.myLanguage || "Hindi");
  const [hearLanguage, setHearLanguage] = useState(initialUser.hearLanguage || "English");
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        picture: initialUser.picture || `https://api.dicebear.com/7.x/identicon/svg?seed=${username.trim()}`,
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
    <div className="w-full max-w-md bg-white border border-[#d1d7db] rounded-2xl p-6 sm:p-8 shadow-xl">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-[#00a884] text-white flex items-center justify-center mx-auto mb-3 shadow-md">
          <PhoneCall className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-[#111b21]">Setup LinguaCall Profile</h2>
        <p className="text-xs text-[#667781] mt-1">
          Confirm your handle and preferred languages for live translation
        </p>
      </div>

      {initialUser.email && (
        <div className="mb-4 py-2 px-3 bg-[#f0f2f5] rounded-xl border border-[#e9edef] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate text-[#3b4a54]">
            {initialUser.picture ? (
              <img
                src={initialUser.picture}
                alt="Google avatar"
                className="w-5 h-5 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : null}
            <span className="truncate">{initialUser.email}</span>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-medium text-[#00a884] shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Google Verified</span>
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-semibold text-[#54656f] uppercase mb-1">
            Display Name
          </label>
          <input
            id="setup-fullname-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ayush Gohil"
            required
            className="w-full bg-[#f0f2f5] border border-[#d1d7db] text-[#111b21] px-3.5 py-2 rounded-xl text-xs outline-none focus:border-[#00a884] focus:bg-white transition-colors font-medium"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#54656f] uppercase mb-1">
            Unique Handle (@)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667781]">
              <AtSign className="w-3.5 h-3.5" />
            </div>
            <input
              id="setup-username-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. ayush404"
              maxLength={20}
              required
              className="w-full bg-[#f0f2f5] border border-[#d1d7db] text-[#111b21] pl-9 pr-9 py-2 rounded-xl text-xs outline-none focus:border-[#00a884] focus:bg-white transition-colors font-medium"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {isChecking ? (
                <Loader2 className="w-3.5 h-3.5 text-[#00a884] animate-spin" />
              ) : isAvailable === true ? (
                <Check className="w-3.5 h-3.5 text-[#00a884]" />
              ) : isAvailable === false ? (
                <X className="w-3.5 h-3.5 text-rose-600" />
              ) : null}
            </div>
          </div>

          {errorMessage ? (
            <p className="text-[11px] text-rose-600 mt-1">{errorMessage}</p>
          ) : isAvailable === true ? (
            <p className="text-[11px] text-[#00a884] mt-1 font-medium">Username available</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-[#54656f] uppercase mb-1">
              🗣️ I Speak
            </label>
            <select
              id="setup-my-language"
              value={myLanguage}
              onChange={(e) => setMyLanguage(e.target.value)}
              className="w-full bg-[#f0f2f5] border border-[#d1d7db] text-[#111b21] px-3 py-2 rounded-xl text-xs outline-none focus:border-[#00a884] cursor-pointer font-medium"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={`my_${lang.code}`} value={lang.name}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#54656f] uppercase mb-1">
              👂 I Hear
            </label>
            <select
              id="setup-hear-language"
              value={hearLanguage}
              onChange={(e) => setHearLanguage(e.target.value)}
              className="w-full bg-[#f0f2f5] border border-[#d1d7db] text-[#111b21] px-3 py-2 rounded-xl text-xs outline-none focus:border-[#00a884] cursor-pointer font-medium"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={`hear_${lang.code}`} value={lang.name}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          id="setup-confirm-btn"
          type="submit"
          disabled={!username.trim() || isAvailable === false || isSubmitting}
          className="w-full mt-2 py-2.5 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
        >
          {isSubmitting ? (
            <span>Saving...</span>
          ) : (
            <span>Start LinguaCall</span>
          )}
        </button>
      </form>
    </div>
  );
};
