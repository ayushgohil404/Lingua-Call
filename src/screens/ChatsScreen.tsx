import React, { useState, useMemo } from "react";
import { Contact, mockContacts } from "../data/mockData";
import { ChatListItem } from "../components/ChatListItem";
import { Search, X, Archive, MessageSquarePlus } from "lucide-react";

export interface ChatsScreenProps {
  contacts?: Contact[];
  typingContactIds?: string[];
  isDarkMode?: boolean;
  onSelectChat: (contactId: string) => void;
}

export const ChatsScreen: React.FC<ChatsScreenProps> = ({
  contacts,
  typingContactIds,
  isDarkMode = false,
  onSelectChat,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const activeContacts = contacts || mockContacts;

  // Real-time filter by contact name
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return activeContacts;
    const q = searchQuery.toLowerCase().trim();
    return activeContacts.filter((contact) =>
      contact.name.toLowerCase().includes(q)
    );
  }, [searchQuery, activeContacts]);

  return (
    <div
      id="chats-screen"
      className={`flex-1 flex flex-col h-full overflow-hidden relative transition-colors ${
        isDarkMode ? "bg-[#111B21]" : "bg-white"
      }`}
    >
      {/* ================= 1. SEARCH BAR ================= */}
      <div
        className={`px-3.5 pt-2.5 pb-2 shrink-0 border-b transition-colors ${
          isDarkMode ? "bg-[#111B21] border-[#222D34]" : "bg-white border-[#f0f2f5]"
        }`}
      >
        <div
          className={`relative flex items-center rounded-lg px-3 py-1.5 transition-all ${
            isDarkMode
              ? "bg-[#202C33] focus-within:ring-1 focus-within:ring-[#00a884]"
              : "bg-[#f0f2f5] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#008069]"
          }`}
        >
          <Search
            className={`w-4 h-4 shrink-0 mr-2.5 ${
              isDarkMode ? "text-[#8696A0]" : "text-[#54656f]"
            }`}
          />
          <input
            id="chat-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search or start new chat"
            className={`w-full bg-transparent text-[14px] outline-none ${
              isDarkMode
                ? "text-[#E9EDEF] placeholder-[#8696A0]"
                : "text-[#111b21] placeholder-[#667781]"
            }`}
          />
          {searchQuery && (
            <button
              id="chat-search-clear-btn"
              type="button"
              onClick={() => setSearchQuery("")}
              className={`p-0.5 rounded-full cursor-pointer ml-1 ${
                isDarkMode
                  ? "text-[#8696A0] hover:text-[#E9EDEF]"
                  : "text-[#667781] hover:text-[#111b21]"
              }`}
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ================= 2. ARCHIVED ROW ================= */}
      {!searchQuery && (
        <div
          id="archived-chats-row"
          role="button"
          tabIndex={0}
          className={`h-[52px] px-4 flex items-center justify-between border-b cursor-pointer transition-colors select-none shrink-0 ${
            isDarkMode
              ? "border-[#222D34] hover:bg-[#202C33] active:bg-[#182229]"
              : "border-[#e9edef] hover:bg-[#f5f6f6] active:bg-[#ebebeb]"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-[49px] flex justify-center ${
                isDarkMode ? "text-[#00a884]" : "text-[#008069]"
              }`}
            >
              <Archive className="w-5 h-5" />
            </div>
            <span
              className={`text-[16px] font-semibold ${
                isDarkMode ? "text-[#E9EDEF]" : "text-[#111b21]"
              }`}
            >
              Archived
            </span>
          </div>
          <span
            className={`text-[12px] font-semibold ${
              isDarkMode ? "text-[#00a884]" : "text-[#008069]"
            }`}
          >
            3
          </span>
        </div>
      )}

      {/* ================= 3. CHAT ROWS LIST ================= */}
      <div
        id="chats-scroll-list"
        className="flex-1 overflow-y-auto divide-y-0 scroll-smooth"
      >
        {filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => (
            <ChatListItem
              key={contact.id}
              contact={contact}
              isTyping={typingContactIds?.includes(contact.id)}
              isDarkMode={isDarkMode}
              onClick={() => onSelectChat(contact.id)}
            />
          ))
        ) : (
          <div className="py-12 px-4 text-center">
            <p
              className={`text-sm font-medium ${
                isDarkMode ? "text-[#E9EDEF]" : "text-[#111b21]"
              }`}
            >
              No chats found
            </p>
            <p
              className={`text-xs mt-1 ${
                isDarkMode ? "text-[#8696A0]" : "text-[#667781]"
              }`}
            >
              No contacts matching &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* WhatsApp Floating Action Button (New Chat) */}
      <button
        id="fab-new-chat"
        type="button"
        className="absolute bottom-4 right-4 w-14 h-14 rounded-2xl bg-[#008069] text-white flex items-center justify-center shadow-lg hover:bg-[#00705c] active:scale-95 transition-all cursor-pointer z-10"
        title="New Chat"
        aria-label="New Chat"
      >
        <MessageSquarePlus className="w-6 h-6" />
      </button>
    </div>
  );
};

export default ChatsScreen;
