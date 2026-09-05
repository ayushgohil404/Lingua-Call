import React, { useState, useEffect, useRef } from "react";
import { UserProfile, ChatMessage } from "../types";
import { SUPPORTED_LANGUAGES, getLanguageByName } from "../constants/languages";
import { getSocket } from "../services/socket";
import { speakText } from "../services/audio";
import {
  Phone,
  MessageSquare,
  Search,
  Send,
  Volume2,
  Lock,
  Smile,
  Paperclip,
  MoreVertical,
  LogOut,
  PhoneCall,
  Globe,
  Settings,
  X,
  Check,
  Share2,
  Copy,
  CheckCheck,
  UserCheck,
  Sparkles,
} from "lucide-react";

interface LinguaCallLayoutProps {
  currentUser: UserProfile;
  onlineUsers: UserProfile[];
  socketConnected: boolean;
  onStartCall: (target: UserProfile, myLang: string, hearLang: string) => void;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onLogout: () => void;
}

export const LinguaCallLayout: React.FC<LinguaCallLayoutProps> = ({
  currentUser,
  onlineUsers,
  socketConnected,
  onStartCall,
  onUpdateProfile,
  onLogout,
}) => {
  const socket = getSocket();

  // Active view tab
  const [activeView, setActiveView] = useState<"chats" | "calls">("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Settings state
  const [myLang, setMyLang] = useState(currentUser.myLanguage || "Hindi");
  const [hearLang, setHearLang] = useState(currentUser.hearLanguage || "English");
  const [saveToast, setSaveToast] = useState(false);

  // Filter out self from online users
  const otherUsers = onlineUsers.filter((u) => u.username !== currentUser.username);

  // Selected contact
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(() => {
    return otherUsers.length > 0 ? otherUsers[0] : null;
  });

  // Real messages state (No fake messages)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedUser]);

  // Keep selected user updated if they go offline or online
  useEffect(() => {
    if (!selectedUser && otherUsers.length > 0) {
      setSelectedUser(otherUsers[0]);
    } else if (selectedUser) {
      const refreshed = otherUsers.find((u) => u.username === selectedUser.username);
      if (refreshed) {
        setSelectedUser(refreshed);
      }
    }
  }, [onlineUsers]);

  // Socket chat message handling
  useEffect(() => {
    const handleIncomingMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    const handleMessageSent = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("chat:message", handleIncomingMessage);
    socket.on("chat:message:sent", handleMessageSent);

    return () => {
      socket.off("chat:message", handleIncomingMessage);
      socket.off("chat:message:sent", handleMessageSent);
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUser || isSending) return;

    const text = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      socket.emit("chat:message", {
        targetUsername: selectedUser.username,
        message: text,
        fromUsername: currentUser.username,
        sourceLang: myLang,
        targetLang: selectedUser.myLanguage || "English",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleTriggerVoiceCall = (userToCall: UserProfile) => {
    onStartCall(userToCall, myLang, hearLang);
  };

  const handleSaveSettings = () => {
    onUpdateProfile({
      myLanguage: myLang,
      hearLanguage: hearLang,
    });
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      setShowSettingsModal(false);
    }, 1200);
  };

  const handleCopyInviteLink = () => {
    const link = `${window.location.origin}?invite=${encodeURIComponent(currentUser.username)}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Filter contacts by search query
  const filteredContacts = otherUsers.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.myLanguage && u.myLanguage.toLowerCase().includes(q))
    );
  });

  // Filter messages for current selected user
  const conversationMessages = messages.filter((m) => {
    if (!selectedUser) return false;
    return (
      (m.fromUsername === currentUser.username && m.targetUsername === selectedUser.username) ||
      (m.fromUsername === selectedUser.username && m.targetUsername === currentUser.username)
    );
  });

  const selectedUserLang = selectedUser ? getLanguageByName(selectedUser.myLanguage || "English") : null;
  const myLangObj = getLanguageByName(myLang);
  const hearLangObj = getLanguageByName(hearLang);

  return (
    <div className="relative w-full min-h-screen bg-[#eae6df] flex flex-col items-center justify-center p-0 md:p-3 selection:bg-[#00a884] selection:text-white">
      {/* Top Emerald Accent Strip */}
      <div className="hidden md:block absolute top-0 left-0 right-0 h-32 bg-[#00a884] -z-0" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-7xl h-screen md:h-[calc(100vh-2rem)] bg-white md:rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-[#d1d7db]">
        {/* ================= LEFT SIDEBAR (CONTROLS & CONTACTS) ================= */}
        <div className="w-full md:w-[410px] bg-white border-r border-[#d1d7db] flex flex-col shrink-0 h-full">
          {/* Top Sidebar Header */}
          <div className="h-16 bg-[#f0f2f5] px-4 flex items-center justify-between border-b border-[#e9edef] shrink-0">
            {/* User Profile Info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative">
                <img
                  src={currentUser.picture}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-full object-cover border border-white shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#f0f2f5] ${
                    socketConnected ? "bg-[#00a884]" : "bg-amber-400"
                  }`}
                  title={socketConnected ? "Connected" : "Reconnecting..."}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-semibold text-[#111b21] truncate">
                    {currentUser.name}
                  </h2>
                  <span className="text-[10px] text-[#00a884] font-medium bg-[#00a884]/10 px-1.5 py-0.5 rounded">
                    You
                  </span>
                </div>
                <div className="text-[11px] text-[#667781] truncate flex items-center gap-1">
                  <span>@{currentUser.username}</span>
                  <span>·</span>
                  <span className="font-medium text-[#3b4a54]">
                    🗣️ {myLangObj.flag} ➔ 👂 {hearLangObj.flag}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Icons */}
            <div className="flex items-center gap-1 text-[#54656f]">
              <button
                id="copy-invite-header-btn"
                onClick={handleCopyInviteLink}
                className="p-2 hover:bg-[#e9edef] rounded-full transition-colors cursor-pointer text-[#54656f] hover:text-[#111b21]"
                title="Copy Invite Link"
              >
                {copiedLink ? <CheckCheck className="w-5 h-5 text-[#00a884]" /> : <Share2 className="w-5 h-5" />}
              </button>

              <button
                id="open-settings-header-btn"
                onClick={() => setShowSettingsModal(true)}
                className="p-2 hover:bg-[#e9edef] rounded-full transition-colors cursor-pointer text-[#54656f] hover:text-[#111b21]"
                title="Languages & Audio Settings"
              >
                <Settings className="w-5 h-5" />
              </button>

              <button
                id="signout-header-btn"
                onClick={onLogout}
                className="p-2 hover:bg-[#e9edef] rounded-full transition-colors cursor-pointer text-[#54656f] hover:text-rose-600"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-2 bg-white border-b border-[#e9edef]">
            <div className="flex items-center gap-2 bg-[#f0f2f5] px-3 py-1.5 rounded-xl border border-transparent focus-within:border-[#00a884] focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-[#667781] shrink-0" />
              <input
                id="contacts-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search online users or handle..."
                className="w-full bg-transparent text-xs text-[#111b21] outline-none placeholder-[#667781]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-[#667781] hover:text-[#111b21]">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-2 bg-[#f0f2f5] text-xs font-semibold text-[#667781] border-b border-[#e9edef]">
            <button
              onClick={() => setActiveView("chats")}
              className={`py-2.5 flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeView === "chats"
                  ? "border-[#00a884] text-[#00a884] bg-white font-bold"
                  : "border-transparent hover:text-[#111b21]"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>CHATS</span>
            </button>
            <button
              onClick={() => setActiveView("calls")}
              className={`py-2.5 flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeView === "calls"
                  ? "border-[#00a884] text-[#00a884] bg-white font-bold"
                  : "border-transparent hover:text-[#111b21]"
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>VOICE CALLS ({otherUsers.length})</span>
            </button>
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#f0f2f5]">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((user) => {
                const isSelected = selectedUser?.username === user.username;
                const userLang = getLanguageByName(user.myLanguage || "English");

                return (
                  <div
                    key={user.userId || user.username}
                    onClick={() => setSelectedUser(user)}
                    className={`flex items-center justify-between px-3.5 py-3 hover:bg-[#f5f6f6] cursor-pointer transition-colors ${
                      isSelected ? "bg-[#f0f2f5]" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative">
                        <img
                          src={user.picture}
                          alt={user.name}
                          className="w-12 h-12 rounded-full object-cover border border-[#e9edef]"
                          referrerPolicy="no-referrer"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            user.online ? "bg-[#00a884]" : "bg-zinc-400"
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-[#111b21] truncate">
                            {user.name}
                          </h3>
                          <span className="text-[11px] font-medium text-[#00a884] bg-[#00a884]/10 px-2 py-0.5 rounded-full shrink-0">
                            {userLang.flag} {userLang.name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-[#667781] truncate">
                            @{user.username}
                          </p>
                          <span className="text-[10px] text-[#8696a0]">
                            {user.online ? "Online" : "Away"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Instant Voice Call Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerVoiceCall(user);
                      }}
                      className="ml-3 p-2.5 bg-[#00a884]/10 hover:bg-[#00a884] text-[#00a884] hover:text-white rounded-full transition-all duration-150 shrink-0 shadow-sm cursor-pointer active:scale-95"
                      title={`Start Translated Call with ${user.name}`}
                    >
                      <Phone className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                );
              })
            ) : (
              /* Authentic Empty State - When no other users are logged in */
              <div className="p-6 text-center flex flex-col items-center justify-center h-full text-[#667781]">
                <div className="w-16 h-16 rounded-full bg-[#f0f2f5] flex items-center justify-center text-[#00a884] mb-3 shadow-inner">
                  <Globe className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-semibold text-[#111b21] mb-1">
                  {searchQuery ? "No matching contacts" : "No Other Users Online"}
                </h4>
                <p className="text-xs text-[#667781] max-w-xs mb-4 leading-relaxed">
                  {searchQuery
                    ? `No registered user matching "${searchQuery}".`
                    : "LinguaCall translates live speech between real users. Open a second tab with another Google account or invite a peer to test real-time translation!"}
                </p>

                <button
                  id="invite-btn-sidebar"
                  onClick={handleCopyInviteLink}
                  className="px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy App Link to Test</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT PANEL (CHAT & CALL LAUNCHER) ================= */}
        <div className="flex-1 bg-[#efeae2] flex flex-col h-full relative overflow-hidden">
          {selectedUser ? (
            <>
              {/* Chat Top Header */}
              <div className="h-16 bg-[#f0f2f5] px-4 flex items-center justify-between border-b border-[#e9edef] shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <img
                      src={selectedUser.picture}
                      alt={selectedUser.name}
                      className="w-10 h-10 rounded-full object-cover border border-[#d1d7db]"
                      referrerPolicy="no-referrer"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#f0f2f5] ${
                        selectedUser.online ? "bg-[#00a884]" : "bg-zinc-400"
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#111b21] truncate">
                      {selectedUser.name}
                    </h3>
                    <p className="text-xs text-[#667781] truncate flex items-center gap-1.5">
                      <span>@{selectedUser.username}</span>
                      <span>·</span>
                      <span className="font-medium text-[#00a884]">
                        Speaks {selectedUserLang?.flag} {selectedUserLang?.name}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Right Action: Voice Call Button */}
                <div className="flex items-center gap-2">
                  <button
                    id="header-start-call-btn"
                    onClick={() => handleTriggerVoiceCall(selectedUser)}
                    className="flex items-center gap-2 px-3.5 py-1.5 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-xl text-xs font-semibold shadow-sm transition-transform active:scale-95 cursor-pointer"
                    title="Start Live-Translated Voice Call"
                  >
                    <Phone className="w-3.5 h-3.5 fill-current" />
                    <span className="hidden sm:inline">Voice Call</span>
                  </button>
                </div>
              </div>

              {/* Chat Canvas */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
                {/* Security Notice */}
                <div className="flex justify-center mb-4">
                  <div className="bg-[#ffeecd] border border-[#f5c67e] rounded-xl px-4 py-2 max-w-md text-center shadow-xs">
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#54656f]">
                      <Lock className="w-3.5 h-3.5 text-[#856404]" />
                      <span>
                        Calls and messages are direct peer-to-peer. Real-time translation powered by Gemini AI.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Conversation Messages */}
                {conversationMessages.length > 0 ? (
                  conversationMessages.map((msg) => {
                    const isSelf = msg.fromUsername === currentUser.username;
                    const dateStr = new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-md rounded-2xl px-3.5 py-2 shadow-xs text-xs relative leading-relaxed ${
                            isSelf
                              ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-none"
                              : "bg-white text-[#111b21] rounded-tl-none border border-[#e9edef]"
                          }`}
                        >
                          {/* Original Text */}
                          <div className="font-normal text-[#111b21] text-[13px]">{msg.originalText}</div>

                          {/* Translated text if languages differ */}
                          {msg.translatedText && msg.translatedText !== msg.originalText && (
                            <div className="mt-1.5 pt-1.5 border-t border-black/10 flex items-start gap-1.5 text-[12px] font-medium text-[#005c4b]">
                              <span className="text-[10px] text-[#667781] shrink-0 uppercase tracking-wider">
                                {msg.targetLang}:
                              </span>
                              <span className="flex-1">{msg.translatedText}</span>
                              <button
                                onClick={() => speakText(msg.translatedText, msg.targetLang)}
                                className="text-[#00a884] hover:text-[#008f6f] p-0.5 cursor-pointer shrink-0"
                                title="Speak Translation"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Timestamp and status check */}
                          <div className="flex items-center justify-end gap-1 text-[10px] text-[#667781] mt-1">
                            <span>{dateStr}</span>
                            {isSelf && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-[#667781]">
                    <p className="text-xs">No messages yet with @{selectedUser.username}.</p>
                    <p className="text-[11px] text-[#8696a0] mt-1">
                      Type a message below or tap <span className="font-semibold text-[#00a884]">Voice Call</span> to speak with live translation.
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="h-16 bg-[#f0f2f5] px-3 sm:px-4 flex items-center gap-2 border-t border-[#e9edef] shrink-0"
              >
                <div className="flex-1 bg-white rounded-xl px-4 py-2 flex items-center border border-[#d1d7db] focus-within:border-[#00a884]">
                  <input
                    id="chat-message-input"
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Type in ${myLangObj.name} (auto-translates to ${selectedUserLang?.name})...`}
                    className="w-full bg-transparent text-xs text-[#111b21] outline-none"
                  />
                </div>

                <button
                  id="chat-send-message-btn"
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-40 text-white flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer shrink-0"
                  title="Send Message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </>
          ) : (
            /* Default Welcome / Empty Screen */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f0f2f5] border-l border-[#d1d7db]">
              <div className="w-20 h-20 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-lg mb-5">
                <PhoneCall className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-[#111b21] tracking-tight">
                LinguaCall
              </h2>
              <p className="text-xs text-[#54656f] mt-2 max-w-sm leading-relaxed">
                Connect and speak with anyone in any language. Gemini AI interprets your voice and translates text in real time.
              </p>

              <div className="mt-6 flex flex-col items-center gap-3">
                <button
                  id="invite-btn-empty-state"
                  onClick={handleCopyInviteLink}
                  className="px-5 py-2.5 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? "Link Copied to Clipboard!" : "Copy Test Link for 2nd Tab"}</span>
                </button>
                <span className="text-[11px] text-[#8696a0]">
                  Open in incognito or another browser with another Google account to test live calling.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#d1d7db]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e9edef] mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#00a884]" />
                <h3 className="text-base font-semibold text-[#111b21]">Language Preferences</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 text-[#667781] hover:text-[#111b21] rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#54656f] uppercase mb-1">
                  🗣️ My Native Spoken Language
                </label>
                <select
                  id="settings-my-language-select"
                  value={myLang}
                  onChange={(e) => setMyLang(e.target.value)}
                  className="w-full bg-[#f0f2f5] border border-[#d1d7db] text-[#111b21] px-3 py-2 rounded-xl text-xs outline-none focus:border-[#00a884] cursor-pointer font-medium"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={`set_my_${lang.code}`} value={lang.name}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#8696a0] mt-1">
                  When you speak or type, this is your input language.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#54656f] uppercase mb-1">
                  👂 Preferred Translation Language (What I Hear)
                </label>
                <select
                  id="settings-hear-language-select"
                  value={hearLang}
                  onChange={(e) => setHearLang(e.target.value)}
                  className="w-full bg-[#f0f2f5] border border-[#d1d7db] text-[#111b21] px-3 py-2 rounded-xl text-xs outline-none focus:border-[#00a884] cursor-pointer font-medium"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={`set_hear_${lang.code}`} value={lang.name}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#8696a0] mt-1">
                  Incoming speech and messages are translated into this language.
                </p>
              </div>

              {/* Google account badge */}
              <div className="p-3 bg-[#f0f2f5] rounded-xl border border-[#e9edef] text-xs text-[#54656f] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#111b21]">{currentUser.name}</div>
                  <div className="text-[11px] text-[#667781]">{currentUser.email || `@${currentUser.username}`}</div>
                </div>
                <span className="text-[11px] text-[#00a884] font-medium bg-[#00a884]/10 px-2 py-0.5 rounded">
                  Google Authenticated
                </span>
              </div>

              {saveToast && (
                <div className="p-2.5 bg-[#d9fdd3] text-[#005c4b] rounded-xl text-xs font-medium flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Preferences saved successfully</span>
                </div>
              )}

              <button
                id="save-preferences-btn"
                onClick={handleSaveSettings}
                className="w-full py-2.5 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
