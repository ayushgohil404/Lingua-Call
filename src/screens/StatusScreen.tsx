import React, { useState } from "react";
import { Plus, Camera, X, Check } from "lucide-react";
import { initialStatusUpdates, StatusItem } from "../data/statusAndCallsData";

export const StatusScreen: React.FC = () => {
  const [statuses, setStatuses] = useState<StatusItem[]>(initialStatusUpdates);
  const [activeStory, setActiveStory] = useState<StatusItem | null>(null);
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [newStatusText, setNewStatusText] = useState("");
  const [myStatusTimestamp, setMyStatusTimestamp] = useState<string | null>(null);
  const [myStatusText, setMyStatusText] = useState<string | null>(null);

  const handleOpenStatus = (status: StatusItem) => {
    setActiveStory(status);
    // Mark as viewed
    setStatuses((prev) =>
      prev.map((s) => (s.id === status.id ? { ...s, viewed: true } : s))
    );
  };

  const handlePublishMyStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusText.trim()) return;
    setMyStatusText(newStatusText.trim());
    setMyStatusTimestamp("Just now");
    setNewStatusText("");
    setIsAddingStatus(false);
  };

  const handleOpenMyStatus = () => {
    if (myStatusText) {
      setActiveStory({
        id: "my-status",
        contactId: "me",
        name: "My status",
        initials: "ME",
        avatarColor: "#008069",
        timeAgo: myStatusTimestamp || "Just now",
        caption: myStatusText,
        bgColor: "#008069",
        viewed: true,
      });
    } else {
      setIsAddingStatus(true);
    }
  };

  return (
    <div
      id="status-screen"
      className="flex-1 flex flex-col h-full bg-white overflow-y-auto select-none"
    >
      {/* ================= 1. MY STATUS ROW ================= */}
      <div
        id="my-status-row"
        onClick={handleOpenMyStatus}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpenMyStatus();
          }
        }}
        className="h-[76px] px-4 flex items-center hover:bg-[#f5f6f6] active:bg-[#ebebeb] cursor-pointer transition-colors border-b border-[#f0f2f5]"
      >
        {/* Avatar with circular + button */}
        <div className="relative shrink-0 mr-3.5">
          <div
            className={`w-[52px] h-[52px] rounded-full flex items-center justify-center text-white font-semibold text-[16px] shadow-xs ${
              myStatusText ? "ring-2 ring-[#008069] ring-offset-2" : ""
            }`}
            style={{ backgroundColor: "#008069" }}
          >
            ME
          </div>

          {/* Plus icon badge */}
          {!myStatusText && (
            <button
              id="my-status-add-plus-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddingStatus(true);
              }}
              className="absolute bottom-0 right-0 w-5 h-5 bg-[#008069] text-white rounded-full flex items-center justify-center border-2 border-white cursor-pointer shadow-xs"
              title="Add status update"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] font-semibold text-[#111b21] truncate leading-tight">
            My status
          </h3>
          <p className="text-[14px] text-[#667781] truncate leading-normal mt-0.5">
            {myStatusText
              ? `${myStatusTimestamp} • Tap to view`
              : "Tap to add status update"}
          </p>
        </div>

        {/* Quick add status button */}
        <button
          id="status-quick-camera-btn"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsAddingStatus(true);
          }}
          className="p-2.5 rounded-full hover:bg-[#f0f2f5] text-[#54656f] transition-colors cursor-pointer"
          title="Create text or photo status"
        >
          <Camera className="w-5 h-5" />
        </button>
      </div>

      {/* ================= 2. RECENT UPDATES SECTION ================= */}
      <div className="w-full">
        {/* Section Header */}
        <div className="px-4 py-2.5 bg-[#f0f2f5] text-[#667781] text-[13px] font-semibold uppercase tracking-wider">
          Recent updates
        </div>

        {/* Contacts Status List */}
        <div className="divide-y-0">
          {statuses.map((status) => (
            <div
              key={status.id}
              id={`status-item-${status.id}`}
              onClick={() => handleOpenStatus(status)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleOpenStatus(status);
                }
              }}
              className="h-[74px] px-4 flex items-center hover:bg-[#f5f6f6] active:bg-[#ebebeb] cursor-pointer transition-colors"
            >
              {/* Avatar with prominent circular green status ring */}
              <div className="relative shrink-0 mr-3.5">
                <div
                  className={`w-[50px] h-[50px] rounded-full flex items-center justify-center text-white font-semibold text-[15px] p-[2px] transition-all ${
                    status.viewed
                      ? "ring-2 ring-[#8696a0]/40 ring-offset-2"
                      : "ring-2 ring-[#008069] ring-offset-2"
                  }`}
                  style={{ backgroundColor: status.avatarColor }}
                >
                  <span>{status.initials}</span>
                </div>
              </div>

              {/* Status Info */}
              <div className="flex-1 min-w-0 border-b border-[#f0f2f5] h-full flex flex-col justify-center">
                <h4 className="text-[16px] font-semibold text-[#111b21] truncate leading-tight">
                  {status.name}
                </h4>
                <p className="text-[13px] text-[#667781] truncate leading-normal mt-0.5">
                  {status.timeAgo}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= 3. WHATSAPP STATUS STORY VIEWER MODAL ================= */}
      {activeStory && (
        <div
          id="status-story-modal"
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 animate-fadeIn"
          onClick={() => setActiveStory(null)}
        >
          {/* Top Progress Bar */}
          <div className="w-full max-w-md mx-auto pt-2">
            <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white animate-[progress_5s_linear_forwards]" />
            </div>

            {/* Header info in story */}
            <div className="flex items-center justify-between mt-3 text-white">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md"
                  style={{ backgroundColor: activeStory.avatarColor }}
                >
                  {activeStory.initials}
                </div>
                <div>
                  <h4 className="text-[15px] font-semibold text-white leading-tight">
                    {activeStory.name}
                  </h4>
                  <p className="text-[12px] text-white/80 leading-none mt-0.5">
                    {activeStory.timeAgo}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveStory(null)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white cursor-pointer"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Story Main Content Card */}
          <div
            className="w-full max-w-sm mx-auto my-auto p-8 rounded-2xl flex items-center justify-center text-center shadow-xl select-text"
            style={{ backgroundColor: activeStory.bgColor }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white text-xl font-medium leading-relaxed">
              &ldquo;{activeStory.caption}&rdquo;
            </p>
          </div>

          {/* Bottom dismissal hint */}
          <div className="w-full text-center pb-4 text-white/70 text-xs select-none">
            Tap anywhere to close
          </div>
        </div>
      )}

      {/* ================= 4. ADD STATUS DIALOG ================= */}
      {isAddingStatus && (
        <div
          id="add-status-modal"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setIsAddingStatus(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f2f5]">
              <h3 className="text-lg font-semibold text-[#111b21]">
                Add Status Update
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingStatus(false)}
                className="p-1 text-[#667781] hover:text-[#111b21] rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishMyStatus} className="mt-4">
              <textarea
                value={newStatusText}
                onChange={(e) => setNewStatusText(e.target.value)}
                placeholder="Type a status update..."
                rows={3}
                autoFocus
                className="w-full p-3 border border-[#d1d7db] rounded-xl text-[14.5px] text-[#111b21] focus:ring-2 focus:ring-[#008069] focus:outline-none resize-none"
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingStatus(false)}
                  className="px-4 py-2 text-[14px] font-medium text-[#667781] hover:bg-[#f0f2f5] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newStatusText.trim()}
                  className="px-4 py-2 bg-[#008069] text-white text-[14px] font-medium rounded-lg hover:bg-[#008069]/90 disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Post Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusScreen;
