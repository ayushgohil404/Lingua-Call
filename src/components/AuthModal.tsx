import React, { useEffect, useState } from "react";
import { UserProfile } from "../types";
import { ArrowRight } from "lucide-react";

interface AuthModalProps {
  onSignInSuccess: (user: Partial<UserProfile>) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSignInSuccess }) => {
  const [googleClientId, setGoogleClientId] = useState<string>("");
  const [customName, setCustomName] = useState("");
  const [customLanguage, setCustomLanguage] = useState("Hindi");

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.googleClientId) {
          setGoogleClientId(data.googleClientId);
          initGoogleSignIn(data.googleClientId);
        }
      })
      .catch(() => {});
  }, []);

  const initGoogleSignIn = (clientId: string) => {
    if (typeof window !== "undefined" && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            handleGoogleCredential(response.credential);
          },
        });
        const buttonDiv = document.getElementById("google-signin-button");
        if (buttonDiv) {
          (window as any).google.accounts.id.renderButton(buttonDiv, {
            theme: "outline",
            size: "large",
            shape: "pill",
            width: 280,
          });
        }
      } catch (e) {
        console.warn("Google sign-in init note:", e);
      }
    }
  };

  const handleGoogleCredential = (credential: string) => {
    try {
      const payload = JSON.parse(atob(credential.split(".")[1]));
      const { sub: userId, name, email, picture } = payload;
      onSignInSuccess({
        userId,
        name: name || "Google User",
        email,
        picture: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      });
    } catch (err) {
      console.error("Failed to parse Google JWT:", err);
    }
  };

  const handleDemoSignIn = (preset: {
    name: string;
    username: string;
    lang: string;
    hearLang: string;
    pic: string;
  }) => {
    const userId = `demo_${preset.username}`;
    onSignInSuccess({
      userId,
      username: preset.username,
      name: preset.name,
      myLanguage: preset.lang,
      hearLanguage: preset.hearLang,
      picture: preset.pic,
    });
  };

  const handleCustomGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    const clean = customName.trim();
    const cleanUname = clean.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Math.floor(Math.random() * 90 + 10);
    onSignInSuccess({
      userId: `user_${Date.now()}`,
      username: cleanUname,
      name: clean,
      myLanguage: customLanguage,
      hearLanguage: customLanguage === "English" ? "Hindi" : "English",
      picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUname}`,
    });
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        {/* Simple Header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-lg mx-auto mb-3">
            L
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Welcome to LinguaCall
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time speech-to-speech voice translation
          </p>
        </div>

        {/* Google OAuth Section */}
        <div className="flex flex-col items-center justify-center mb-5">
          <div id="google-signin-button" className="min-h-[44px] flex items-center justify-center"></div>
          {googleClientId && (
            <p className="text-[11px] text-zinc-400 mt-1.5 font-medium">
              Sign in with Google OAuth 2.0
            </p>
          )}
        </div>

        <div className="relative my-5 flex items-center justify-center">
          <div className="border-t border-zinc-100 w-full" />
          <span className="bg-white px-2.5 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold absolute">
            or quick start
          </span>
        </div>

        {/* Quick Demo profiles */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <button
            onClick={() =>
              handleDemoSignIn({
                name: "Ayush",
                username: "ayush_hi",
                lang: "Hindi",
                hearLang: "English",
                pic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
              })
            }
            className="p-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-left transition-colors flex items-center gap-2.5 cursor-pointer"
          >
            <span className="text-lg">🇮🇳</span>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-900 truncate">Ayush</div>
              <div className="text-[10px] text-zinc-400">Hindi</div>
            </div>
          </button>

          <button
            onClick={() =>
              handleDemoSignIn({
                name: "Elena",
                username: "elena_es",
                lang: "Spanish",
                hearLang: "English",
                pic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
              })
            }
            className="p-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-left transition-colors flex items-center gap-2.5 cursor-pointer"
          >
            <span className="text-lg">🇪🇸</span>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-900 truncate">Elena</div>
              <div className="text-[10px] text-zinc-400">Spanish</div>
            </div>
          </button>
        </div>

        {/* Custom Username form */}
        <form onSubmit={handleCustomGuest} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase mb-1">
              Display Name
            </label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3.5 py-2 rounded-xl text-xs outline-none focus:border-zinc-400 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase mb-1">
              Your Primary Language
            </label>
            <select
              value={customLanguage}
              onChange={(e) => setCustomLanguage(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 px-3 py-2 rounded-xl text-xs outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="Hindi">🇮🇳 Hindi</option>
              <option value="English">🇺🇸 English</option>
              <option value="Spanish">🇪🇸 Spanish</option>
              <option value="French">🇫🇷 French</option>
              <option value="German">🇩🇪 German</option>
              <option value="Japanese">🇯🇵 Japanese</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!customName.trim()}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Continue as Guest</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
