import React, { useEffect, useState } from "react";
import { SUPPORTED_LANGUAGES, getLanguageByName } from "../constants/languages";
import { startIncomingRingtone, stopIncomingRingtone } from "../services/audio";
import { Phone, PhoneOff, Lock } from "lucide-react";

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
    startIncomingRingtone();
    return () => {
      stopIncomingRingtone();
    };
  }, []);

  const handleAccept = () => {
    stopIncomingRingtone();
    onAccept(selectedHearLanguage);
  };

  const handleReject = () => {
    stopIncomingRingtone();
    onReject();
  };

  const callerLangObj = getLanguageByName(incomingCall.callerLanguage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-[#111b21] rounded-3xl p-6 text-center text-white shadow-2xl border border-[#222e35]">
        {/* Security & call branding */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8696a0] font-medium mb-4">
          <Lock className="w-3 h-3 text-[#00a884]" />
          <span>LinguaCall Audio Call</span>
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
            className="w-full h-full rounded-full border-2 border-[#202c33] object-cover relative z-10"
          />
        </div>

        <h3 className="text-xl font-semibold text-[#e9edef]">
          {incomingCall.callerName || `@${incomingCall.callerUsername}`}
        </h3>
        <p className="text-xs text-[#8696a0] mt-1 mb-4">
          Speaks {callerLangObj.flag} {callerLangObj.name}
        </p>

        {/* Translation Option */}
        <div className="bg-[#202c33] p-3 rounded-2xl text-left mb-6">
          <label className="block text-[10px] font-semibold text-[#8696a0] uppercase tracking-wider mb-1">
            Translate voice to:
          </label>
          <select
            id="incoming-hear-language-select"
            value={selectedHearLanguage}
            onChange={(e) => setSelectedHearLanguage(e.target.value)}
            className="w-full bg-[#111b21] border border-[#2a3942] text-[#e9edef] px-3 py-1.5 rounded-xl text-xs outline-none cursor-pointer"
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
              className="w-14 h-14 rounded-full bg-[#ea0038] hover:bg-[#d00032] flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 cursor-pointer"
              title="Decline"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-[11px] text-[#8696a0] font-medium">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              id="incoming-accept-btn"
              onClick={handleAccept}
              className="w-14 h-14 rounded-full bg-[#00a884] hover:bg-[#008f6f] flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 cursor-pointer animate-pulse"
              title="Accept"
            >
              <Phone className="w-6 h-6" />
            </button>
            <span className="text-[11px] text-[#00a884] font-medium">Answer</span>
          </div>
        </div>
      </div>
    </div>
  );
};
