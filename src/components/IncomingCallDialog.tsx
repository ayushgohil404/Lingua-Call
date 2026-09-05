import React, { useEffect, useState } from "react";
import { SUPPORTED_LANGUAGES, getLanguageByName } from "../constants/languages";
import { startIncomingRingtone, stopIncomingRingtone } from "../services/audio";
import { PhoneCall, PhoneOff, Globe } from "lucide-react";

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
    // Start ringtone
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white border-2 border-zinc-200 rounded-[2.5rem] p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden text-zinc-900">
        {/* Animated pulse rings behind avatar */}
        <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-indigo-500/15 animate-ping opacity-75" />
          <div className="absolute -inset-3 rounded-full bg-emerald-500/15 animate-pulse" />
          <img
            src={
              incomingCall.callerPicture ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${incomingCall.callerUsername}`
            }
            alt={incomingCall.callerUsername}
            className="w-24 h-24 rounded-full border-4 border-emerald-500 object-cover relative z-10 shadow-md bg-zinc-100"
          />
        </div>

        <div className="inline-block px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold mb-2">
          Incoming LinguaCall...
        </div>

        <h3 className="text-xl font-bold tracking-tight text-zinc-900 mb-1">
          {incomingCall.callerName || `@${incomingCall.callerUsername}`}
        </h3>
        <p className="text-xs font-semibold text-zinc-400 mb-4">@{incomingCall.callerUsername}</p>

        {/* Language Information */}
        <div className="bg-zinc-50 p-4 rounded-2xl border-2 border-zinc-200 text-left mb-6 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-medium">Caller is speaking:</span>
            <span className="font-bold text-zinc-800 flex items-center gap-1">
              <span>{callerLangObj.flag}</span>
              <span>{callerLangObj.name}</span>
            </span>
          </div>

          <div className="border-t-2 border-zinc-100 pt-2.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
              <Globe className="w-3 h-3 text-indigo-600" />
              <span>Translate and hear them in:</span>
            </label>
            <select
              id="incoming-hear-language-select"
              value={selectedHearLanguage}
              onChange={(e) => setSelectedHearLanguage(e.target.value)}
              className="w-full bg-white border-2 border-zinc-200 text-zinc-900 px-3 py-2 rounded-xl text-xs outline-none focus:border-emerald-500 font-semibold cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={`inc_${lang.code}`} value={lang.name}>
                  {lang.flag} {lang.name} ({lang.native})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            id="incoming-decline-btn"
            onClick={handleReject}
            className="flex-1 py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border-2 border-rose-200 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Decline</span>
          </button>

          <button
            id="incoming-accept-btn"
            onClick={handleAccept}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md border border-emerald-700 transition-all cursor-pointer animate-pulse"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Accept Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
