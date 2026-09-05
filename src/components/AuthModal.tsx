import React, { useEffect, useState, useRef } from "react";
import { UserProfile } from "../types";
import { Lock, PhoneCall, Globe2, ShieldCheck, Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface AuthModalProps {
  onSignInSuccess: (user: Partial<UserProfile>) => void;
}

// Unicode-safe JWT decoder for Google OAuth tokens
function parseGoogleJwt(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error("JWT parse error:", err);
    return null;
  }
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSignInSuccess }) => {
  const [googleClientId, setGoogleClientId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string>("");
  const [buttonRendered, setButtonRendered] = useState<boolean>(false);
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;

    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (!isMountedRef.current) return;
        if (data.googleClientId) {
          setGoogleClientId(data.googleClientId);
          initGoogleOAuth(data.googleClientId);
        } else {
          setIsLoading(false);
          setAuthError("Google Client ID not configured on server.");
        }
      })
      .catch(() => {
        if (!isMountedRef.current) return;
        setIsLoading(false);
        setAuthError("Could not reach backend server.");
      });

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const initGoogleOAuth = (clientId: string) => {
    let attempts = 0;
    const maxAttempts = 20;

    const renderGoogleBtn = () => {
      if (!isMountedRef.current) return;

      const gsi = (window as any).google?.accounts?.id;
      const container = buttonContainerRef.current;

      if (gsi && container) {
        try {
          gsi.initialize({
            client_id: clientId,
            callback: (response: any) => {
              if (response?.credential) {
                handleGoogleCredential(response.credential);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Safe rendering: do NOT touch container.innerHTML or React children
          gsi.renderButton(container, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "pill",
            logo_alignment: "left",
            width: 300,
          });

          if (isMountedRef.current) {
            setButtonRendered(true);
            setIsLoading(false);
          }
        } catch (e: any) {
          console.warn("Google button render note:", e);
          if (isMountedRef.current) {
            setIsLoading(false);
            setAuthError("Google Identity services blocked or unavailable in this window.");
          }
        }
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(renderGoogleBtn, 250);
      } else {
        if (isMountedRef.current) {
          setIsLoading(false);
          setAuthError("Google Sign-In library failed to load. Please check connection.");
        }
      }
    };

    renderGoogleBtn();
  };

  const handleGoogleCredential = (credential: string) => {
    try {
      const payload = parseGoogleJwt(credential);
      if (!payload || !payload.sub) {
        throw new Error("Invalid Google token payload");
      }

      const { sub: userId, name, email, picture, given_name } = payload;
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
      console.error("Error processing Google sign-in:", err);
      if (isMountedRef.current) {
        setAuthError("Failed to parse Google OAuth credential. Please try again.");
      }
    }
  };

  const handleRetry = () => {
    setAuthError("");
    setIsLoading(true);
    if (googleClientId) {
      initGoogleOAuth(googleClientId);
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

      {/* Highlights */}
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

      {/* Google Sign-In Area */}
      <div className="flex flex-col items-center justify-center pt-2 pb-3">
        <div className="text-[11px] font-semibold text-[#54656f] uppercase tracking-wider mb-3">
          Sign In to Continue
        </div>

        {/* Loading Spinner - Kept COMPLETELY OUTSIDE the Google button DOM container */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-[#54656f]">
            <Loader2 className="w-4 h-4 text-[#00a884] animate-spin" />
            <span>Connecting to Google Identity...</span>
          </div>
        )}

        {/* Dedicated empty container for Google GSI button */}
        <div
          ref={buttonContainerRef}
          id="google-signin-btn-container"
          className={`min-h-[44px] flex items-center justify-center w-full transition-opacity duration-200 ${
            isLoading || !buttonRendered ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
          }`}
        />

        {/* Error notification */}
        {authError && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex flex-col gap-2 text-left w-full">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-800">Sign-In Notice</p>
                <p className="text-[11px] mt-0.5 text-rose-700 leading-relaxed">{authError}</p>
              </div>
            </div>
            <button
              onClick={handleRetry}
              className="self-end px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
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
