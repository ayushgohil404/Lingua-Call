import React, { useState } from "react";
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Link,
  PhoneCall,
  X,
} from "lucide-react";
import { initialCallHistory, CallItem } from "../data/statusAndCallsData";

export const CallsScreen: React.FC = () => {
  const [calls] = useState<CallItem[]>(initialCallHistory);
  const [activeCallModal, setActiveCallModal] = useState<CallItem | null>(null);

  const handleStartCall = (call: CallItem) => {
    setActiveCallModal(call);
  };

  return (
    <div
      id="calls-screen"
      className="flex-1 flex flex-col h-full bg-white overflow-y-auto select-none relative"
    >
      {/* ================= 1. CREATE CALL LINK ITEM ================= */}
      <div
        id="create-call-link-row"
        role="button"
        tabIndex={0}
        onClick={() => {
          // Visual feedback for create call link
          alert?.("Call link generated: share with friends to join any time.");
        }}
        className="h-[76px] px-4 flex items-center hover:bg-[#f5f6f6] active:bg-[#ebebeb] cursor-pointer transition-colors border-b border-[#f0f2f5]"
      >
        <div className="w-[50px] h-[50px] rounded-full bg-[#008069] flex items-center justify-center text-white shrink-0 mr-3.5 shadow-xs">
          <Link className="w-5 h-5 -rotate-45" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] font-semibold text-[#111b21] truncate leading-tight">
            Create call link
          </h3>
          <p className="text-[14px] text-[#667781] truncate leading-normal mt-0.5">
            Share a link for your WhatsApp call
          </p>
        </div>
      </div>

      {/* ================= 2. RECENT CALLS SECTION ================= */}
      <div className="w-full">
        {/* Section Header */}
        <div className="px-4 py-2.5 bg-[#f0f2f5] text-[#667781] text-[13px] font-semibold uppercase tracking-wider">
          Recent
        </div>

        {/* Call History Rows */}
        <div className="divide-y-0">
          {calls.map((call) => {
            const isMissed = call.direction === "missed";

            return (
              <div
                key={call.id}
                id={`call-row-${call.id}`}
                className="h-[72px] px-4 flex items-center hover:bg-[#f5f6f6] active:bg-[#ebebeb] cursor-pointer transition-colors group"
                onClick={() => handleStartCall(call)}
              >
                {/* 49px Round Contact Avatar */}
                <div
                  className="w-[49px] h-[49px] rounded-full flex items-center justify-center text-white font-semibold text-[15px] shrink-0 mr-3.5 shadow-xs"
                  style={{ backgroundColor: call.avatarColor }}
                >
                  {call.initials}
                </div>

                {/* Call Info Details */}
                <div className="flex-1 min-w-0 border-b border-[#f0f2f5] h-full flex items-center justify-between pr-1">
                  <div className="min-w-0 flex-1 pr-2">
                    {/* Contact Name (Red for missed calls) */}
                    <h4
                      className={`text-[16px] font-semibold truncate leading-tight ${
                        isMissed ? "text-[#ea0038]" : "text-[#111b21]"
                      }`}
                    >
                      {call.name}
                      {call.count && call.count > 1 && (
                        <span className="ml-1 text-[14px] font-normal">
                          ({call.count})
                        </span>
                      )}
                    </h4>

                    {/* Direction Arrow + Timestamp */}
                    <div className="flex items-center gap-1.5 mt-0.5 text-[13px]">
                      {isMissed && (
                        <PhoneMissed className="w-3.5 h-3.5 text-[#ea0038] stroke-[2.2] shrink-0" />
                      )}
                      {call.direction === "incoming" && (
                        <PhoneIncoming className="w-3.5 h-3.5 text-[#008069] stroke-[2.2] shrink-0" />
                      )}
                      {call.direction === "outgoing" && (
                        <PhoneOutgoing className="w-3.5 h-3.5 text-[#008069] stroke-[2.2] shrink-0" />
                      )}
                      <span className="text-[#667781] truncate">
                        {call.time}
                      </span>
                    </div>
                  </div>

                  {/* Call Action Icon (Phone / Video) */}
                  <button
                    id={`call-action-btn-${call.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartCall(call);
                    }}
                    className="p-2.5 rounded-full hover:bg-black/5 text-[#008069] transition-colors shrink-0 cursor-pointer"
                    title={`Call ${call.name} via ${call.callType}`}
                  >
                    {call.callType === "video" ? (
                      <Video className="w-5 h-5 fill-none" />
                    ) : (
                      <Phone className="w-5 h-5 fill-none" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Action Button: Start Call */}
      <button
        id="calls-floating-action-btn"
        type="button"
        onClick={() => {
          if (calls.length > 0) handleStartCall(calls[0]);
        }}
        className="absolute bottom-5 right-5 w-14 h-14 bg-[#008069] hover:bg-[#008069]/90 text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer z-10"
        title="Start new call"
      >
        <PhoneCall className="w-6 h-6" />
      </button>

      {/* ================= 3. ACTIVE CALL SIMULATION MODAL ================= */}
      {activeCallModal && (
        <div
          id="active-call-modal"
          className="fixed inset-0 z-50 bg-[#111b21] flex flex-col justify-between items-center py-12 px-6 text-white animate-fadeIn"
        >
          {/* Top: Caller Info */}
          <div className="flex flex-col items-center mt-6">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-xl mb-4"
              style={{ backgroundColor: activeCallModal.avatarColor }}
            >
              {activeCallModal.initials}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {activeCallModal.name}
            </h2>
            <p className="text-sm text-white/70 mt-1 animate-pulse">
              Ringing...
            </p>
          </div>

          {/* Bottom: End Call Button */}
          <div className="w-full flex justify-center pb-8">
            <button
              type="button"
              onClick={() => setActiveCallModal(null)}
              className="w-16 h-16 bg-[#ea0038] hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-95 cursor-pointer"
              title="End call"
            >
              <X className="w-7 h-7 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallsScreen;
