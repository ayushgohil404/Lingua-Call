import React, { useEffect, useState } from "react";
import { SUPPORTED_LANGUAGES, getLanguageByName } from "../constants/languages";
import { startIncomingRingtone, stopIncomingRingtone } from "../services/audio";
import { Phone, PhoneOff, Lock, Volume2 } from "lucide-react";

interface IncomingCallData {
  callerUsername: string;
  callerName?: string;
  callerPicture?: string;
  callerSocketId: string;
  callerLanguage: string;
  hearLanguage?: string;
  offer: any;
}

interface IncomingCallDialogProps {
  incomingCall: IncomingCallData;
  defaultHearLanguage: string;
  onAccept: (hearLanguage: string) => void;
  onReject: () => void;
}

export const IncomingCallDialog: React.FC<IncomingCallDialogProps> = ({
  incomingCall,
  defaultHearLanguage,
  onAccept,
  onReject,
}) => {
  const [selectedHearLanguage, setSelectedHearLanguage] = useState(
    defaultHearLanguage || "English"
  );

  useEffect(() => {
    try {
      startIncomingRingtone();
    } catch (e) {
      console.warn("Ringtone notice:", e);
    }

    return () => {
      try {
        stopIncomingRingtone();
      } catch {}
    };
  }, []);

  const handleAccept = () => {
    try {
      stopIncomingRingtone();
    } catch {}
    onAccept(selectedHearLanguage);
  };

  const handleReject = () => {
    try {
      stopIncomingRingtone();
    } catch {}
    onReject();
  };

  const callerLangObj = getLanguageByName(incomingCall.callerLanguage);

  return (
    <div
      id="incoming-call-overlay"
      className="fixed inset-0 z-[999] flex flex-col items-center justify-between sm:justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
    >
      {/* Mobile Top Call Banner Notification */}
      <div className="w-full max-w-sm bg-[#202c33] border border-[#00a884]/40 rounded-2xl p-3 text-white shadow-2xl flex items-center justify-between sm:hidden animate-in slide-in-from-top duration-300 mt-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <img
              src={
                incomingCall.callerPicture ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${incomingCall.callerUsername}`
              }
              alt={incomingCall.callerUsername}
              className="w-10 h-10 rounded-full object-cover border border-[#00a884]"
            />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#00a884] rounded-full animate-ping" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {incomingCall.callerName || `@${incomingCall.callerUsername}`}
            </p>
            <p className="text-[10px] text-[#00a884] font-medium flex items-center gap-1">
              <Volume2 className="w-3 h-3 inline" /> Incoming Voice Call...
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleReject}
            className="w-9 h-9 rounded-full bg-[#ea0038] text-white flex items-center justify-center cursor-pointer shadow-md"
            title="Decline"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
          <button
            onClick={handleAccept}
            className="w-9 h-9 rounded-full bg-[#00a884] text-white flex items-center justify-center cursor-pointer shadow-md animate-pulse"
            title="Accept"
          >
            <Phone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Call Dialog Card (Centered on all viewports) */}
      <div className="w-full max-w-sm bg-[#111b21] rounded-3xl p-6 my-auto text-center text-white shadow-2xl border border-[#222e35]">
        {/* Security & call branding */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8696a0] font-medium mb-4">
          <Lock className="w-3.5 h-3.5 text-[#00a884]" />
          <span>LinguaCall AI Voice Call</span>
        </div>

        {/* Pulsing Avatar */}
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="absolute -inset-2 rounded-full border-2 border-[#00a884] animate-ping opacity-40" />
          <img
            src={
              incomingCall.callerPicture ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${incomingCall.callerUsername}`
            }
            alt={incomingCall.callerUsername}
            className="w-full h-full rounded-full border-2 border-[#202c33] object-cover relative z-10 shadow-lg"
          />
        </div>

        <h3 className="text-xl font-bold text-[#e9edef]">
          {incomingCall.callerName || `@${incomingCall.callerUsername}`}
        </h3>
        <p className="text-xs text-[#8696a0] mt-1 mb-4">
          Speaks {callerLangObj.flag} {callerLangObj.name}
        </p>

        {/* Translation Option */}
        <div className="bg-[#202c33] p-3 rounded-2xl text-left mb-6">
          <label className="block text-[10px] font-bold text-[#8696a0] uppercase tracking-wider mb-1.5">
            👂 Translate Voice To:
          </label>
          <select
            id="incoming-hear-language-select"
            value={selectedHearLanguage}
            onChange={(e) => setSelectedHearLanguage(e.target.value)}
            className="w-full bg-[#111b21] border border-[#2a3942] text-[#e9edef] px-3 py-2 rounded-xl text-xs outline-none cursor-pointer font-medium focus:border-[#00a884]"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={`inc_${lang.code}`} value={lang.name}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Accept & Decline Call Actions */}
        <div className="flex items-center justify-around px-4">
          {/* Decline */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              id="incoming-decline-btn"
              onClick={handleReject}
              className="w-16 h-16 rounded-full bg-[#ea0038] hover:bg-[#d00032] flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 cursor-pointer"
              title="Decline Call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs text-[#8696a0] font-medium">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              id="incoming-accept-btn"
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-[#00a884] hover:bg-[#008f6f] flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 cursor-pointer animate-pulse"
              title="Accept Call"
            >
              <Phone className="w-7 h-7 fill-current" />
            </button>
            <span className="text-xs text-[#00a884] font-bold">Answer</span>
          </div>
        </div>
      </div>
    </div>
  );
};
