import React from "react";
import { Contact } from "../data/mockData";

export interface ChatListItemProps {
  contact: Contact;
  isTyping?: boolean;
  isDarkMode?: boolean;
  onClick: () => void;
}

/**
 * WhatsApp ChatListItem (72px height, matching WhatsApp exactly)
 */
export const ChatListItem: React.FC<ChatListItemProps> = ({
  contact,
  isTyping = false,
  isDarkMode = false,
  onClick,
}) => {
  const hasUnread = (contact.unreadCount || 0) > 0;

  return (
    <div
      id={`chat-row-${contact.id}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`h-[72px] w-full flex items-center px-4 cursor-pointer transition-colors select-none group ${
        isDarkMode
          ? "hover:bg-[#202C33] active:bg-[#182229]"
          : "hover:bg-[#f5f6f6] active:bg-[#ebebeb]"
      }`}
    >
      {/* 49px Round Avatar on the left with initials */}
      <div
        className="w-[49px] h-[49px] rounded-full shrink-0 flex items-center justify-center text-white font-semibold text-[15px] shadow-xs relative"
        style={{ backgroundColor: contact.avatarColor || "#008069" }}
      >
        <span>{contact.initials || contact.name.substring(0, 2).toUpperCase()}</span>
        {contact.isOnline && (
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 bg-[#25d366] border-2 rounded-full ${
              isDarkMode ? "border-[#111B21]" : "border-white"
            }`}
            title="Online"
          />
        )}
      </div>

      {/* Text Container with separator line */}
      <div
        className={`flex-1 min-w-0 ml-3.5 h-full flex flex-col justify-center border-b pr-1 ${
          isDarkMode ? "border-[#222D34]" : "border-[#e9edef]"
        }`}
      >
        {/* Top Row: Contact Name (bold, dark) + Time (small, grey/green) */}
        <div className="flex items-baseline justify-between gap-2">
          <h3
            className={`text-[16px] font-semibold truncate tracking-tight leading-snug ${
              isDarkMode ? "text-[#E9EDEF]" : "text-[#111b21]"
            }`}
          >
            {contact.name}
          </h3>
          <span
            className={`text-[12px] shrink-0 font-normal ${
              hasUnread
                ? "text-[#25d366] font-medium"
                : isDarkMode
                ? "text-[#8696A0]"
                : "text-[#667781]"
            }`}
          >
            {contact.time}
          </span>
        </div>

        {/* Bottom Row: Last Message Preview (grey, single line, "...") + Unread Badge */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          {isTyping ? (
            <p className="text-[14px] text-[#25d366] font-medium truncate leading-tight flex-1 animate-pulse">
              typing...
            </p>
          ) : (
            <p
              className={`text-[14px] truncate leading-tight flex-1 ${
                isDarkMode ? "text-[#8696A0]" : "text-[#667781]"
              }`}
            >
              {contact.lastMessage}
            </p>
          )}

          {hasUnread && (
            <span
              id={`unread-badge-${contact.id}`}
              className="min-w-[20px] h-[20px] px-1.5 bg-[#25d366] text-white text-[11px] font-bold rounded-full flex items-center justify-center shrink-0 shadow-xs"
            >
              {contact.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatListItem;
