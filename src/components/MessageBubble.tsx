import React, { useRef } from "react";
import { Message } from "../data/mockData";
import { Check, CheckCheck, CornerUpLeft } from "lucide-react";
import { motion, PanInfo } from "motion/react";

export interface MessageBubbleProps {
  message: Message;
  isSelected?: boolean;
  onLongPress?: (message: Message) => void;
  onSwipeReply?: (message: Message) => void;
  isDarkMode?: boolean;
}

/**
 * WhatsApp Message Bubble:
 * - Supports long-press selection (Copy, Delete, Forward)
 * - Supports swipe-to-reply gesture with spring animation
 * - Renders quoted preview if message is a reply
 * - WhatsApp light (#D9FDD3 / white) and dark (#005C4B / #202C33) themes
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSelected = false,
  onLongPress,
  onSwipeReply,
  isDarkMode = false,
}) => {
  const isOutgoing = message.isOutgoing;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const startLongPress = (e: React.PointerEvent) => {
    isLongPressTriggered.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    timerRef.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      if (onLongPress) {
        onLongPress(message);
      }
    }, 450);
  };

  const clearLongPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPos.current) return;
    const dx = Math.abs(e.clientX - startPos.current.x);
    const dy = Math.abs(e.clientY - startPos.current.y);
    if (dx > 10 || dy > 10) {
      clearLongPress();
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 45 && onSwipeReply) {
      onSwipeReply(message);
    }
  };

  // Color theme definitions
  const outgoingBg = isDarkMode ? "bg-[#005C4B]" : "bg-[#D9FDD3]";
  const outgoingTail = isDarkMode ? "#005C4B" : "#D9FDD3";
  const incomingBg = isDarkMode ? "bg-[#202C33]" : "bg-white";
  const incomingTail = isDarkMode ? "#202C33" : "#ffffff";
  const textColor = isDarkMode ? "text-[#E9EDEF]" : "text-[#111b21]";
  const metaTimeColor = isDarkMode ? "text-[#ffffff99]" : "text-[#667781]";

  return (
    <motion.div
      id={`msg-bubble-${message.id}`}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`w-full flex mb-2 select-text relative transition-colors duration-150 ${
        isOutgoing ? "justify-end" : "justify-start"
      } ${isSelected ? (isDarkMode ? "bg-[#00a884]/20 py-1" : "bg-[#00a884]/15 py-1") : ""}`}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress?.(message);
      }}
    >
      {/* Swipe Reply Icon Indicator (visible on drag right) */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 pointer-events-none group-active:opacity-100 text-[#008069]">
        <CornerUpLeft className="w-5 h-5 stroke-[2.2]" />
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 60 }}
        dragElastic={0.25}
        onDragEnd={handleDragEnd}
        onPointerDown={startLongPress}
        onPointerUp={clearLongPress}
        onPointerLeave={clearLongPress}
        onPointerCancel={clearLongPress}
        onPointerMove={handlePointerMove}
        className={`relative max-w-[82%] sm:max-w-[75%] px-3 py-1.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] text-[14.2px] leading-relaxed break-words cursor-pointer ${
          isOutgoing
            ? `${outgoingBg} ${textColor} rounded-lg rounded-tr-none ml-8`
            : `${incomingBg} ${textColor} rounded-lg rounded-tl-none mr-8`
        } ${isSelected ? (isDarkMode ? "ring-2 ring-[#00a884]" : "ring-2 ring-[#008069]") : ""}`}
      >
        {/* Authentic WhatsApp Tail SVG */}
        {isOutgoing ? (
          <svg
            className="absolute top-0 -right-2 w-2 h-3 pointer-events-none drop-shadow-[0_1px_0.5px_rgba(0,0,0,0.08)]"
            style={{ fill: outgoingTail }}
            viewBox="0 0 8 13"
          >
            <path d="M0 0 C3 0 7 2 8 6 C8 8 5 11 0 13 Z" />
          </svg>
        ) : (
          <svg
            className="absolute top-0 -left-2 w-2 h-3 pointer-events-none drop-shadow-[0_1px_0.5px_rgba(0,0,0,0.08)]"
            style={{ fill: incomingTail }}
            viewBox="0 0 8 13"
          >
            <path d="M8 0 C5 0 1 2 0 6 C0 8 3 11 8 13 Z" />
          </svg>
        )}

        {/* Quoted Message Box (if this message is a reply) */}
        {message.replyTo && (
          <div
            id={`msg-reply-box-${message.id}`}
            className={`mb-1.5 p-2 rounded-md border-l-[3.5px] border-[#00a884] text-xs flex flex-col select-none ${
              isDarkMode ? "bg-[#00000033]" : "bg-[#0000000d]"
            }`}
          >
            <span className="font-semibold text-[#00a884] leading-tight">
              {message.replyTo.senderName || (message.replyTo.isOutgoing ? "You" : "Contact")}
            </span>
            <span className={`truncate mt-0.5 leading-snug ${isDarkMode ? "text-[#8696A0]" : "text-[#54656f]"}`}>
              {message.replyTo.text}
            </span>
          </div>
        )}

        {/* Message Text Content */}
        <span className={`${textColor} pr-2 whitespace-pre-wrap`}>
          {message.text}
        </span>

        {/* Inline Bottom-Right Meta: Time + Status Ticks */}
        <span
          className={`float-right mt-1 ml-2 inline-flex items-center gap-1 text-[11px] ${metaTimeColor} select-none shrink-0 leading-none`}
        >
          <span>{message.timestamp}</span>

          {isOutgoing && (
            <span
              className="inline-flex items-center ml-0.5"
              title={
                message.status === "read"
                  ? "Read"
                  : message.status === "delivered"
                  ? "Delivered"
                  : "Sent"
              }
            >
              {message.status === "sent" && (
                <Check className={`w-3.5 h-3.5 ${isDarkMode ? "text-[#8696A0]" : "text-[#8696a0]"} stroke-[2.2]`} />
              )}
              {message.status === "delivered" && (
                <CheckCheck className={`w-3.5 h-3.5 ${isDarkMode ? "text-[#8696A0]" : "text-[#8696a0]"} stroke-[2.2]`} />
              )}
              {message.status === "read" && (
                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] stroke-[2.2]" />
              )}
            </span>
          )}
        </span>
      </motion.div>
    </motion.div>
  );
};

export default MessageBubble;
