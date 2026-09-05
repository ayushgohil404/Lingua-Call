import React, { useEffect, useState } from "react";
import { UserProfile } from "../types";
import { Sparkles, Globe2, ShieldCheck, ArrowRight, UserPlus, CheckCircle2 } from "lucide-react";

interface AuthModalProps {
  onSignInSuccess: (user: Partial<UserProfile>) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSignInSuccess }) => {
  const [googleClientId, setGoogleClientId] = useState<string>("");
  const [customName, setCustomName] = useState("");
  const [customLanguage, setCustomLanguage] = useState("Hindi");

  useEffect(() => {
    // Fetch server config
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
            width: 320,
          });
        }
      } catch (e) {
        console.warn("GIS initialization error:", e);
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
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 sm:p-6 bg-zinc-100 text-zinc-900">
      <div className="w-full max-w-xl bg-white border-2 border-zinc-200 rounded-[2rem] p-6 sm:p-8 shadow-sm relative overflow-hidden">
        {/* Header */}
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 border border-indigo-200 rounded-full text-xs font-bold text-indigo-700 mb-4 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Real-Time Voice Translation</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 mb-3">
            Call anyone. <br />
            <span className="text-indigo-600">
              In any language.
            </span>
          </h1>

          <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed font-medium">
            Speak in your mother tongue. The person on the other end hears you in their language — preserving your tone, pacing, and emotion in real time.
          </p>
        </div>

        {/* Google OAuth Section */}
        <div className="flex flex-col items-center justify-center mb-6 relative z-10">
          <div id="google-signin-button" className="min-h-[44px] flex items-center justify-center"></div>
          {googleClientId && (
            <p className="text-xs text-zinc-400 mt-2 font-medium">
              Protected by Google OAuth 2.0 Identity Services
            </p>
          )}
        </div>

        <div className="relative my-6 flex items-center justify-center">
          <div className="border-t-2 border-zinc-100 w-full" />
          <span className="bg-white px-3 text-[10px] uppercase tracking-widest text-zinc-400 font-bold absolute">
            Or test with a demo profile
          </span>
        </div>

        {/* Demo profiles for 1-click test calling */}
        <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
          <button
            onClick={() =>
              handleDemoSignIn({
                name: "Ayush (Hindi)",
                username: "ayush_hi",
                lang: "Hindi",
                hearLang: "English",
                pic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
              })
            }
            className="p-3.5 bg-zinc-50 hover:bg-zinc-100 border-2 border-zinc-200 hover:border-zinc-300 rounded-2xl text-left transition-all group flex items-center gap-3 shadow-xs cursor-pointer"
          >
            <div className="text-2xl">🇮🇳</div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-zinc-900 group-hover:text-indigo-600 truncate">
                Ayush Sharma
              </div>
              <div className="text-[11px] text-zinc-500 font-medium">
                Speaks <span className="font-bold text-amber-600">Hindi</span>
              </div>
            </div>
          </button>

          <button
            onClick={() =>
              handleDemoSignIn({
                name: "Elena (Spanish)",
                username: "elena_es",
                lang: "Spanish",
                hearLang: "English",
                pic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
              })
            }
            className="p-3.5 bg-zinc-50 hover:bg-zinc-100 border-2 border-zinc-200 hover:border-zinc-300 rounded-2xl text-left transition-all group flex items-center gap-3 shadow-xs cursor-pointer"
          >
            <div className="text-2xl">🇪🇸</div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-zinc-900 group-hover:text-indigo-600 truncate">
                Elena Rodriguez
              </div>
              <div className="text-[11px] text-zinc-500 font-medium">
                Speaks <span className="font-bold text-amber-600">Spanish</span>
              </div>
            </div>
          </button>

          <button
            onClick={() =>
              handleDemoSignIn({
                name: "Kenji (Japanese)",
                username: "kenji_ja",
                lang: "Japanese",
                hearLang: "English",
                pic: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
              })
            }
            className="p-3.5 bg-zinc-50 hover:bg-zinc-100 border-2 border-zinc-200 hover:border-zinc-300 rounded-2xl text-left transition-all group flex items-center gap-3 shadow-xs cursor-pointer"
          >
            <div className="text-2xl">🇯🇵</div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-zinc-900 group-hover:text-indigo-600 truncate">
                Kenji Sato
              </div>
              <div className="text-[11px] text-zinc-500 font-medium">
                Speaks <span className="font-bold text-amber-600">Japanese</span>
              </div>
            </div>
          </button>

          <button
            onClick={() =>
              handleDemoSignIn({
                name: "Sophie (French)",
                username: "sophie_fr",
                lang: "French",
                hearLang: "Hindi",
                pic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
              })
            }
            className="p-3.5 bg-zinc-50 hover:bg-zinc-100 border-2 border-zinc-200 hover:border-zinc-300 rounded-2xl text-left transition-all group flex items-center gap-3 shadow-xs cursor-pointer"
          >
            <div className="text-2xl">🇫🇷</div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-zinc-900 group-hover:text-indigo-600 truncate">
                Sophie Dubois
              </div>
              <div className="text-[11px] text-zinc-500 font-medium">
                Speaks <span className="font-bold text-amber-600">French</span>
              </div>
            </div>
          </button>
        </div>

        {/* Custom quick account login */}
        <form onSubmit={handleCustomGuest} className="bg-zinc-50 p-5 rounded-2xl border-2 border-zinc-200">
          <div className="text-xs font-bold text-zinc-700 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
            <UserPlus className="w-4 h-4 text-indigo-600" />
            <span>Or enter your name to begin:</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="guest-name-input"
              type="text"
              placeholder="e.g. Maya Patel"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="flex-1 bg-white border-2 border-zinc-200 text-zinc-900 px-3.5 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-600 font-medium placeholder:text-zinc-400"
            />
            <select
              value={customLanguage}
              onChange={(e) => setCustomLanguage(e.target.value)}
              className="bg-white border-2 border-zinc-200 text-zinc-900 px-3.5 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-600 font-semibold cursor-pointer"
            >
              <option value="Hindi">🇮🇳 Hindi</option>
              <option value="English">🇺🇸 English</option>
              <option value="Spanish">🇪🇸 Spanish</option>
              <option value="French">🇫🇷 French</option>
              <option value="German">🇩🇪 German</option>
              <option value="Japanese">🇯🇵 Japanese</option>
              <option value="Telugu">🇮🇳 Telugu</option>
              <option value="Tamil">🇮🇳 Tamil</option>
              <option value="Bengali">🇮🇳 Bengali</option>
              <option value="Arabic">🇸🇦 Arabic</option>
            </select>
            <button
              id="guest-join-btn"
              type="submit"
              disabled={!customName.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 border border-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Feature badges footer */}
        <div className="mt-6 pt-4 border-t-2 border-zinc-100 flex items-center justify-between text-xs text-zinc-500 font-medium">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>WebRTC P2P Audio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe2 className="w-4 h-4 text-indigo-600" />
            <span>20+ Languages</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Natural Voice Tone</span>
          </div>
        </div>
      </div>
    </div>
  );
};
