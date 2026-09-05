import React, { useState, useCallback } from "react";
import { Contact, Message } from "./data/mockData";
import {
  loadStoredContacts,
  saveStoredContacts,
  loadStoredMessages,
  saveStoredMessages,
} from "./data/chatStore";
import {
  loadStoredSettings,
  saveStoredSettings,
  AppSettingsState,
} from "./data/statusAndCallsData";
import { ChatsScreen } from "./screens/ChatsScreen";
import { StatusScreen } from "./screens/StatusScreen";
import { CallsScreen } from "./screens/CallsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ChatDetailScreen } from "./screens/ChatDetailScreen";
import {
  MessageSquare,
  CircleDashed,
  Phone,
  Settings as SettingsIcon,
  Search,
  MoreVertical,
} from "lucide-react";

type TabKey = "chats" | "status" | "calls" | "settings";

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("chats");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Settings & Dark mode state
  const [settings, setSettings] = useState<AppSettingsState>(() =>
    loadStoredSettings()
  );
  const isDarkMode = settings.darkMode;

  // Persistent contacts & messages loaded from localStorage
  const [contacts, setContacts] = useState<Contact[]>(() => loadStoredContacts());
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(() =>
    loadStoredMessages()
  );
  // Contacts currently typing
  const [typingContactIds, setTypingContactIds] = useState<string[]>([]);

  // Ref to always access latest selectedChatId inside async timers
  const selectedChatIdRef = React.useRef<string | null>(selectedChatId);
  React.useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  // Small list of natural WhatsApp canned auto-replies
  const cannedReplies = React.useMemo(
    () => [
      "Sounds great, let's connect soon!",
      "Thanks for the update! Checking it out now.",
      "Got it! I'll review and get back to you shortly.",
      "Perfect! Let me know if you need anything else.",
      "Awesome, thanks for following up!",
      "Sure thing, talk to you later today.",
      "That works for me! 👍",
      "Great to hear! Let's touch base soon.",
      "Received! I'll get back to you in a bit.",
    ],
    []
  );

  // Calculate total unread count from live contacts
  const totalUnreadCount = contacts.reduce(
    (sum, contact) => sum + (contact.unreadCount || 0),
    0
  );

  // When a chat is selected, open it and clear unread badge for this contact
  const handleSelectChat = useCallback((id: string) => {
    setSelectedChatId(id);
    setContacts((prev) => {
      const updated = prev.map((c) =>
        c.id === id ? { ...c, unreadCount: 0 } : c
      );
      saveStoredContacts(updated);
      return updated;
    });
  }, []);

  // When a message is sent in ChatDetailScreen (with optional replyTo)
  const handleSendMessage = useCallback(
    (contactId: string, text: string, replyTo?: Message["replyTo"]) => {
      if (!text.trim()) return;

      const now = new Date();
      const timeString = now.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
      const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const newMsg: Message = {
        id: msgId,
        senderId: "me",
        text: text.trim(),
        timestamp: timeString,
        isOutgoing: true,
        status: "sent",
        date: "TODAY",
        replyTo,
      };

      // 1. Instantly append message to chat with status "sent" (single tick)
      setMessagesMap((prev) => {
        const currentList = prev[contactId] || [];
        const updated = {
          ...prev,
          [contactId]: [...currentList, newMsg],
        };
        saveStoredMessages(updated);
        return updated;
      });

      // 2. Update contact's last message, time, and reset unreadCount
      setContacts((prev) => {
        const updated = prev.map((c) => {
          if (c.id === contactId) {
            return {
              ...c,
              lastMessage: newMsg.text,
              time: newMsg.timestamp,
              unreadCount: 0,
            };
          }
          return c;
        });
        saveStoredContacts(updated);
        return updated;
      });

      // 3. Status simulation: after 1 second -> "delivered" (double grey ticks)
      setTimeout(() => {
        setMessagesMap((prev) => {
          const currentList = prev[contactId];
          if (!currentList) return prev;
          const updatedList = currentList.map((m) =>
            m.id === msgId ? { ...m, status: "delivered" as const } : m
          );
          const updated = {
            ...prev,
            [contactId]: updatedList,
          };
          saveStoredMessages(updated);
          return updated;
        });
      }, 1000);

      // 4. Contact shows "typing..." in chat header after 1.5s
      setTimeout(() => {
        setTypingContactIds((prev) =>
          prev.includes(contactId) ? prev : [...prev, contactId]
        );
      }, 1500);

      // 5. Status simulation: after 2 seconds -> "read" (double blue ticks)
      setTimeout(() => {
        setMessagesMap((prev) => {
          const currentList = prev[contactId];
          if (!currentList) return prev;
          const updatedList = currentList.map((m) =>
            m.id === msgId ? { ...m, status: "read" as const } : m
          );
          const updated = {
            ...prev,
            [contactId]: updatedList,
          };
          saveStoredMessages(updated);
          return updated;
        });
      }, 2000);

      // 6. Contact sends auto-reply after typing for 1.7s (at 3.2s total)
      setTimeout(() => {
        // Clear typing indicator
        setTypingContactIds((prev) => prev.filter((id) => id !== contactId));

        // Pick canned auto-reply
        const replyText =
          cannedReplies[Math.floor(Math.random() * cannedReplies.length)];
        const replyTime = new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });
        const replyMsgId = `reply-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

        const replyMsg: Message = {
          id: replyMsgId,
          senderId: contactId,
          text: replyText,
          timestamp: replyTime,
          isOutgoing: false,
          status: "read",
          date: "TODAY",
        };

        // Append auto-reply to messages
        setMessagesMap((prev) => {
          const currentList = prev[contactId] || [];
          const updated = {
            ...prev,
            [contactId]: [...currentList, replyMsg],
          };
          saveStoredMessages(updated);
          return updated;
        });

        // Update contact last message, time, and unread count if not currently viewing
        setContacts((prev) => {
          const isViewingThisChat = selectedChatIdRef.current === contactId;
          const updated = prev.map((c) => {
            if (c.id === contactId) {
              return {
                ...c,
                lastMessage: replyMsg.text,
                time: replyMsg.timestamp,
                unreadCount: isViewingThisChat ? 0 : (c.unreadCount || 0) + 1,
              };
            }
            return c;
          });
          saveStoredContacts(updated);
          return updated;
        });
      }, 3200);
    },
    [cannedReplies]
  );

  // Delete message for me
  const handleDeleteMessage = useCallback(
    (contactId: string, messageId: string) => {
      setMessagesMap((prev) => {
        const currentList = prev[contactId] || [];
        const updatedList = currentList.filter((m) => m.id !== messageId);
        const updated = {
          ...prev,
          [contactId]: updatedList,
        };
        saveStoredMessages(updated);

        // Also update contact's lastMessage and time
        setContacts((cPrev) => {
          const cUpdated = cPrev.map((c) => {
            if (c.id === contactId) {
              const lastMsg = updatedList[updatedList.length - 1];
              return {
                ...c,
                lastMessage: lastMsg ? lastMsg.text : "",
                time: lastMsg ? lastMsg.timestamp : "",
              };
            }
            return c;
          });
          saveStoredContacts(cUpdated);
          return cUpdated;
        });

        return updated;
      });
    },
    []
  );

  // Forward message to another contact
  const handleForwardMessage = useCallback(
    (targetContactId: string, text: string) => {
      handleSendMessage(targetContactId, text);
    },
    [handleSendMessage]
  );

  // Handle settings change from SettingsScreen
  const handleSettingsChange = (newSettings: AppSettingsState) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
  };

  // Top App Bar configuration per tab
  const getAppBarTitle = () => {
    switch (activeTab) {
      case "chats":
        return "WhatsApp";
      case "status":
        return "Status";
      case "calls":
        return "Calls";
      case "settings":
        return "Settings";
    }
  };

  return (
    <div
      id="app-shell"
      className={`min-h-screen w-full flex items-center justify-center p-0 sm:p-4 transition-colors ${
        isDarkMode ? "bg-[#0c1317]" : "bg-[#efeae2]"
      }`}
    >
      {/* Mobile-proportioned container for authentic WhatsApp experience */}
      <div
        className={`w-full max-w-md h-[100dvh] sm:h-[840px] sm:rounded-3xl sm:shadow-2xl overflow-hidden flex flex-col mx-auto border-0 sm:border relative transition-colors ${
          isDarkMode
            ? "bg-[#111B21] border-[#222D34] text-[#E9EDEF]"
            : "bg-white border-[#d1d7db] text-[#111b21]"
        }`}
      >
        {/* If a chat is selected, render ChatDetailScreen fullscreen */}
        {selectedChatId ? (
          <ChatDetailScreen
            contactId={selectedChatId}
            contact={contacts.find((c) => c.id === selectedChatId)}
            allContacts={contacts}
            messages={messagesMap[selectedChatId] || []}
            isTyping={typingContactIds.includes(selectedChatId)}
            isDarkMode={isDarkMode}
            onBack={() => setSelectedChatId(null)}
            onSendMessage={(text, replyTo) =>
              handleSendMessage(selectedChatId, text, replyTo)
            }
            onDeleteMessage={(msgId) => handleDeleteMessage(selectedChatId, msgId)}
            onForwardMessage={handleForwardMessage}
          />
        ) : (
          <>
            {/* ================= TOP APP BAR ================= */}
            <header
              id="top-app-bar"
              className={`h-16 px-4 flex items-center justify-between shrink-0 select-none shadow-md z-10 transition-colors ${
                isDarkMode ? "bg-[#202C33]" : "bg-[#008069]"
              }`}
            >
              {/* App Bar Title */}
              <h1 className="text-white text-xl font-semibold tracking-wide">
                {getAppBarTitle()}
              </h1>

              {/* Action Icons (White text/icons) */}
              <div className="flex items-center gap-4 text-white">
                {activeTab !== "settings" && (
                  <button
                    id="app-bar-search-btn"
                    type="button"
                    className="p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                    title="Search"
                    aria-label="Search"
                  >
                    <Search className="w-5 h-5 text-white" />
                  </button>
                )}

                <button
                  id="app-bar-menu-btn"
                  type="button"
                  className="p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  title="More options"
                  aria-label="More options"
                >
                  <MoreVertical className="w-5 h-5 text-white" />
                </button>
              </div>
            </header>

            {/* ================= ACTIVE SCREEN AREA ================= */}
            <main
              className={`flex-1 flex flex-col overflow-hidden relative transition-colors ${
                isDarkMode ? "bg-[#111B21]" : "bg-white"
              }`}
            >
              {activeTab === "chats" && (
                <ChatsScreen
                  contacts={contacts}
                  typingContactIds={typingContactIds}
                  isDarkMode={isDarkMode}
                  onSelectChat={handleSelectChat}
                />
              )}
              {activeTab === "status" && <StatusScreen />}
              {activeTab === "calls" && <CallsScreen />}
              {activeTab === "settings" && (
                <SettingsScreen
                  isDarkMode={isDarkMode}
                  onSettingsChange={handleSettingsChange}
                />
              )}
            </main>

            {/* ================= BOTTOM NAVIGATION BAR (4 TABS) ================= */}
            <nav
              id="bottom-navigation-bar"
              aria-label="Bottom Navigation"
              className={`h-16 px-2 flex items-center justify-around shrink-0 select-none shadow-[0_-2px_10px_rgba(0,0,0,0.03)] border-t transition-colors ${
                isDarkMode
                  ? "bg-[#202C33] border-[#222D34]"
                  : "bg-white border-[#e9edef]"
              }`}
            >
              {/* 1. Chats Tab */}
              <button
                id="nav-tab-chats"
                type="button"
                onClick={() => setActiveTab("chats")}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors ${
                  activeTab === "chats"
                    ? isDarkMode
                      ? "text-[#00a884]"
                      : "text-[#008069]"
                    : isDarkMode
                    ? "text-[#8696A0] hover:text-[#E9EDEF]"
                    : "text-[#54656f] hover:text-[#111b21]"
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <div
                    className={`px-4 py-0.5 rounded-full transition-all ${
                      activeTab === "chats"
                        ? isDarkMode
                          ? "bg-[#00a884]/20"
                          : "bg-[#d9fdd3]"
                        : "bg-transparent"
                    }`}
                  >
                    <MessageSquare
                      className={`w-5 h-5 ${
                        activeTab === "chats" ? "stroke-[2.5]" : "stroke-[1.75]"
                      }`}
                    />
                  </div>

                  {/* Small green badge with total unread count */}
                  {totalUnreadCount > 0 && (
                    <span
                      id="chats-unread-badge"
                      className={`absolute -top-1 right-2 min-w-[18px] h-[18px] px-1 bg-[#25d366] text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ${
                        isDarkMode ? "ring-[#202C33]" : "ring-white"
                      }`}
                    >
                      {totalUnreadCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] mt-0.5 leading-none ${
                    activeTab === "chats" ? "font-semibold" : "font-normal"
                  }`}
                >
                  Chats
                </span>
              </button>

              {/* 2. Status Tab */}
              <button
                id="nav-tab-status"
                type="button"
                onClick={() => setActiveTab("status")}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors ${
                  activeTab === "status"
                    ? isDarkMode
                      ? "text-[#00a884]"
                      : "text-[#008069]"
                    : isDarkMode
                    ? "text-[#8696A0] hover:text-[#E9EDEF]"
                    : "text-[#54656f] hover:text-[#111b21]"
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <div
                    className={`px-4 py-0.5 rounded-full transition-all ${
                      activeTab === "status"
                        ? isDarkMode
                          ? "bg-[#00a884]/20"
                          : "bg-[#d9fdd3]"
                        : "bg-transparent"
                    }`}
                  >
                    <CircleDashed
                      className={`w-5 h-5 ${
                        activeTab === "status" ? "stroke-[2.5]" : "stroke-[1.75]"
                      }`}
                    />
                  </div>
                </div>
                <span
                  className={`text-[11px] mt-0.5 leading-none ${
                    activeTab === "status" ? "font-semibold" : "font-normal"
                  }`}
                >
                  Status
                </span>
              </button>

              {/* 3. Calls Tab */}
              <button
                id="nav-tab-calls"
                type="button"
                onClick={() => setActiveTab("calls")}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors ${
                  activeTab === "calls"
                    ? isDarkMode
                      ? "text-[#00a884]"
                      : "text-[#008069]"
                    : isDarkMode
                    ? "text-[#8696A0] hover:text-[#E9EDEF]"
                    : "text-[#54656f] hover:text-[#111b21]"
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <div
                    className={`px-4 py-0.5 rounded-full transition-all ${
                      activeTab === "calls"
                        ? isDarkMode
                          ? "bg-[#00a884]/20"
                          : "bg-[#d9fdd3]"
                        : "bg-transparent"
                    }`}
                  >
                    <Phone
                      className={`w-5 h-5 ${
                        activeTab === "calls" ? "stroke-[2.5]" : "stroke-[1.75]"
                      }`}
                    />
                  </div>
                </div>
                <span
                  className={`text-[11px] mt-0.5 leading-none ${
                    activeTab === "calls" ? "font-semibold" : "font-normal"
                  }`}
                >
                  Calls
                </span>
              </button>

              {/* 4. Settings Tab */}
              <button
                id="nav-tab-settings"
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 cursor-pointer transition-colors ${
                  activeTab === "settings"
                    ? isDarkMode
                      ? "text-[#00a884]"
                      : "text-[#008069]"
                    : isDarkMode
                    ? "text-[#8696A0] hover:text-[#E9EDEF]"
                    : "text-[#54656f] hover:text-[#111b21]"
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <div
                    className={`px-4 py-0.5 rounded-full transition-all ${
                      activeTab === "settings"
                        ? isDarkMode
                          ? "bg-[#00a884]/20"
                          : "bg-[#d9fdd3]"
                        : "bg-transparent"
                    }`}
                  >
                    <SettingsIcon
                      className={`w-5 h-5 ${
                        activeTab === "settings" ? "stroke-[2.5]" : "stroke-[1.75]"
                      }`}
                    />
                  </div>
                </div>
                <span
                  className={`text-[11px] mt-0.5 leading-none ${
                    activeTab === "settings" ? "font-semibold" : "font-normal"
                  }`}
                >
                  Settings
                </span>
              </button>
            </nav>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
