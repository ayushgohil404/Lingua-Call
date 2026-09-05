import React, { useEffect, useState, useRef } from "react";
import { UserProfile } from "../types";
import { Lock, PhoneCall, Globe2, ShieldCheck, Loader2, AlertCircle } from "lucide-react";

interface AuthModalProps {
  onSignInSuccess: (user: Partial<UserProfile>) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSignInSuccess }) => {
  const [googleClientId, setGoogleClientId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string>("");
  const buttonContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.googleClientId) {
          setGoogleClientId(data.googleClientId);
          initGoogleOAuth(data.googleClientId);
        } else {
          setIsLoading(false);
          setAuthError("Google Client ID not configured in server environment.");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setIsLoading(false);
        setAuthError("Failed to load server configuration. Please check your network connection.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const initGoogleOAuth = (clientId: string) => {
    const renderGoogleBtn = () => {
      if (typeof window !== "undefined" && (window as any).google?.accounts?.id) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: any) => {
              handleGoogleCredential(response.credential);
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          const container = buttonContainerRef.current || document.getElementById("google-signin-btn-container");
          if (container) {
            container.innerHTML = "";
            (window as any).google.accounts.id.renderButton(container, {
              type: "standard",
              theme: "outline",
              size: "large",
              text: "continue_with",
              shape: "pill",
              logo_alignment: "left",
              width: 300,
            });
          }
          setIsLoading(false);
        } catch (e: any) {
          console.error("Google Sign-In initialization failed:", e);
          setIsLoading(false);
          setAuthError("Could not initialize Google OAuth. Please check browser settings.");
        }
      } else {
        // GSI script might still be downloading
        setTimeout(renderGoogleBtn, 300);
      }
    };

    renderGoogleBtn();
  };

  const handleGoogleCredential = (credential: string) => {
    try {
      setIsLoading(true);
      setAuthError("");
      const payload = JSON.parse(atob(credential.split(".")[1]));
      const { sub: userId, name, email, picture, given_name } = payload;

      if (!userId) {
        throw new Error("Invalid token received from Google");
      }

      // Generate suggested username from email or given name
      const emailPrefix = (email || "").split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
      const suggestedUsername = emailPrefix || `user_${userId.slice(-6)}`;

      onSignInSuccess({
        userId,
        username: suggestedUsername,
        name: name || given_name || "Google User",
        email,
        picture: picture || `https://api.dicebear.com/7.x/identicon/svg?seed=${userId}`,
      });
    } catch (err: any) {
      console.error("Failed to parse Google OAuth credential:", err);
      setAuthError("Failed to authenticate with Google. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-[#d1d7db] rounded-2xl p-7 sm:p-9 shadow-xl">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-[#00a884] text-white flex items-center justify-center mx-auto mb-3.5 shadow-md">
          <PhoneCall className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111b21]">
          LinguaCall
        </h1>
        <p className="text-xs text-[#54656f] mt-1.5 max-w-xs mx-auto leading-relaxed">
          Real-time voice-to-voice translation & live messaging powered by Gemini AI
        </p>
      </div>

      {/* Feature Highlights */}
      <div className="bg-[#f0f2f5] rounded-xl p-3.5 mb-6 border border-[#e9edef] space-y-2">
        <div className="flex items-center gap-2.5 text-xs text-[#3b4a54]">
          <Globe2 className="w-4 h-4 text-[#00a884] shrink-0" />
          <span>Speak naturally in your native language</span>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-[#3b4a54]">
          <PhoneCall className="w-4 h-4 text-[#00a884] shrink-0" />
          <span>Callers hear you in real-time translated voice</span>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-[#3b4a54]">
          <ShieldCheck className="w-4 h-4 text-[#00a884] shrink-0" />
          <span>Direct WebRTC connection with Gemini translation</span>
        </div>
      </div>

      {/* Google OAuth Section - Sole Authentication Method */}
      <div className="flex flex-col items-center justify-center pt-2 pb-3">
        <div className="text-[11px] font-semibold text-[#54656f] uppercase tracking-wider mb-3">
          Sign In to Continue
        </div>

        <div
          id="google-signin-btn-container"
          ref={buttonContainerRef}
          className="min-h-[44px] flex items-center justify-center w-full"
        >
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-2.5 text-xs text-[#54656f]">
              <Loader2 className="w-4 h-4 text-[#00a884] animate-spin" />
              <span>Loading Google Sign-In...</span>
            </div>
          )}
        </div>

        {authError && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 text-left w-full">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Authentication Notice</p>
              <p className="text-[11px] mt-0.5 text-rose-600">{authError}</p>
            </div>
          </div>
        )}

        {googleClientId && !authError && (
          <p className="text-[11px] text-[#667781] mt-3 font-medium flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#00a884]" />
            <span>Secured exclusively via Google OAuth 2.0</span>
          </p>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-[#e9edef] text-center">
        <p className="text-[11px] text-[#8696a0]">
          Only authenticated Google users can place and receive calls.
        </p>
      </div>
    </div>
  );
};
