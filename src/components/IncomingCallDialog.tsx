import React, { useEffect, useState } from "react";
import { SUPPORTED_LANGUAGES, getLanguageByName } from "../constants/languages";
import { startIncomingRingtone, stopIncomingRingtone } from "../services/audio";
import { PhoneCall, PhoneOff } from "lucide-react";

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
  const [selectedHearLanguage, setSelectedHearLanguage] = useState(defaultHearLanguage || "English");

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-3xl p-6 text-center shadow-2xl text-zinc-900">
        {/* Caller Avatar */}
        <div className="relative w-20 h-20 mx-auto mb-4">
          <img
            src={
              incomingCall.callerPicture ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${incomingCall.callerUsername}`
            }
            alt={incomingCall.callerUsername}
            className="w-full h-full rounded-full border border-zinc-200 object-cover bg-zinc-100"
          />
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>

        <h3 className="text-base font-bold text-zinc-900">
          {incomingCall.callerName || `@${incomingCall.callerUsername}`}
        </h3>
        <p className="text-xs text-zinc-500 mb-4">
          @{incomingCall.callerUsername} · Speaks {callerLangObj.flag} {callerLangObj.name}
        </p>

        {/* Translation Option */}
        <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200 text-left mb-5">
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
            Hear conversation translated to:
          </label>
          <select
            id="incoming-hear-language-select"
            value={selectedHearLanguage}
            onChange={(e) => setSelectedHearLanguage(e.target.value)}
            className="w-full bg-white border border-zinc-200 text-zinc-800 px-3 py-2 rounded-xl text-xs outline-none focus:border-zinc-400 font-medium cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={`inc_${lang.code}`} value={lang.name}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            id="incoming-decline-btn"
            onClick={handleReject}
            className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <PhoneOff className="w-4 h-4 text-rose-600" />
            <span>Decline</span>
          </button>

          <button
            id="incoming-accept-btn"
            onClick={handleAccept}
            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
