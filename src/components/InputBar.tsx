import React, { useState } from "react";
import { Smile, Paperclip, Camera, Mic, Send, X } from "lucide-react";
import { Message } from "../data/mockData";

export interface InputBarProps {
  onSend?: (text: string, replyTo?: Message["replyTo"]) => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  isDarkMode?: boolean;
  contactName?: string;
}

/**
 * WhatsApp Input Bar:
 * - Shows quoted reply preview bar when replyingTo is active
 * - Rounded input field with emoji icon on the left
 * - Paperclip (attach), camera icons on the right
 * - Mic button (green circle) that turns into a green SEND button when text is typed
 * - WhatsApp light and dark mode support
 */
export const InputBar: React.FC<InputBarProps> = ({
  onSend,
  replyingTo,
  onCancelReply,
  isDarkMode = false,
  contactName = "Contact",
}) => {
  const [inputText, setInputText] = useState("");

  const hasText = inputText.trim().length > 0;

  const handleSendOrMic = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (hasText) {
      const textToSend = inputText.trim();
      setInputText("");

      const replyData = replyingTo
        ? {
            id: replyingTo.id,
            text: replyingTo.text,
            senderName: replyingTo.isOutgoing ? "You" : contactName,
            isOutgoing: replyingTo.isOutgoing,
          }
        : undefined;

      if (onSend) {
        onSend(textToSend, replyData);
      }
      if (onCancelReply) {
        onCancelReply();
      }
    } else {
      console.log("Mic button tapped (Voice note recording placeholder)");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendOrMic();
    }
  };

  return (
    <div
      id="whatsapp-input-bar"
      className={`border-t px-3 py-2 flex flex-col gap-1.5 select-none shrink-0 transition-colors ${
        isDarkMode
          ? "bg-[#202C33] border-[#222D34]"
          : "bg-white border-[#e9edef]"
      }`}
    >
      {/* Quoted Message Preview Header (when replying) */}
      {replyingTo && (
        <div
          id="reply-preview-bar"
          className={`flex items-center justify-between px-3 py-2 rounded-lg border-l-4 border-[#00a884] animate-fadeIn ${
            isDarkMode ? "bg-[#111B21]" : "bg-[#f0f2f5]"
          }`}
        >
          <div className="flex-1 min-w-0 pr-2">
            <span className="text-xs font-semibold text-[#00a884] block truncate">
              {replyingTo.isOutgoing ? "You" : contactName}
            </span>
            <span
              className={`text-xs block truncate ${
                isDarkMode ? "text-[#8696A0]" : "text-[#54656f]"
              }`}
            >
              {replyingTo.text}
            </span>
          </div>
          <button
            type="button"
            id="cancel-reply-btn"
            onClick={onCancelReply}
            className={`p-1 rounded-full hover:bg-black/10 transition-colors ${
              isDarkMode ? "text-[#8696A0]" : "text-[#54656f]"
            }`}
            title="Cancel reply"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-center gap-2">
        {/* Rounded Input Field Container */}
        <div
          className={`flex-1 rounded-full px-3.5 py-2 flex items-center gap-2 transition-all ${
            isDarkMode
              ? "bg-[#2A3942] focus-within:ring-1 focus-within:ring-[#00a884]"
              : "bg-[#f0f2f5] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#008069]"
          }`}
        >
          {/* Emoji Button (Left) */}
          <button
            type="button"
            id="input-emoji-btn"
            className={`transition-colors p-0.5 rounded-full cursor-pointer shrink-0 ${
              isDarkMode
                ? "text-[#8696A0] hover:text-[#E9EDEF]"
                : "text-[#54656f] hover:text-[#111b21]"
            }`}
            title="Emojis"
            aria-label="Emojis"
          >
            <Smile className="w-5 h-5 stroke-[1.8]" />
          </button>

          {/* Text Input Field */}
          <input
            id="chat-message-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            className={`w-full bg-transparent text-[15px] outline-none leading-normal ${
              isDarkMode
                ? "text-[#E9EDEF] placeholder-[#8696A0]"
                : "text-[#111b21] placeholder-[#667781]"
            }`}
          />

          {/* Action Icons on the Right: Paperclip (Attach) & Camera */}
          <div
            className={`flex items-center gap-2 shrink-0 ${
              isDarkMode ? "text-[#8696A0]" : "text-[#54656f]"
            }`}
          >
            <button
              type="button"
              id="input-attach-btn"
              className={`p-0.5 rounded-full cursor-pointer transition-colors ${
                isDarkMode ? "hover:text-[#E9EDEF]" : "hover:text-[#111b21]"
              }`}
              title="Attach file or photo"
              aria-label="Attach"
            >
              <Paperclip className="w-5 h-5 stroke-[1.8] -rotate-45" />
            </button>

            <button
              type="button"
              id="input-camera-btn"
              className={`p-0.5 rounded-full cursor-pointer transition-colors ${
                isDarkMode ? "hover:text-[#E9EDEF]" : "hover:text-[#111b21]"
              }`}
              title="Camera"
              aria-label="Camera"
            >
              <Camera className="w-5 h-5 stroke-[1.8]" />
            </button>
          </div>
        </div>

        {/* Mic or Send Button (Green Circle) */}
        <button
          id="input-action-btn"
          type="button"
          onClick={() => handleSendOrMic()}
          style={{ backgroundColor: isDarkMode ? "#00a884" : "#008069" }}
          className="w-11 h-11 rounded-full text-white flex items-center justify-center shrink-0 shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer"
          title={hasText ? "Send message" : "Hold to record audio"}
          aria-label={hasText ? "Send" : "Voice message"}
        >
          {hasText ? (
            <Send className="w-5 h-5 stroke-[2.2] translate-x-0.5" />
          ) : (
            <Mic className="w-5 h-5 stroke-[2.2]" />
          )}
        </button>
      </div>
    </div>
  );
};

export default InputBar;
