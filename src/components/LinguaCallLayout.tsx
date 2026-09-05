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
  LogOut,
  PhoneCall,
  Globe,
  Settings,
  X,
  Check,
  Share2,
  Copy,
  CheckCheck,
  UserPlus,
  ArrowRight,
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
  const [serverSearchResults, setServerSearchResults] = useState<UserProfile[]>([]);

  // Language settings state
  const [myLang, setMyLang] = useState(currentUser.myLanguage || "Hindi");
  const [hearLang, setHearLang] = useState(currentUser.hearLanguage || "English");
  const [saveToast, setSaveToast] = useState(false);

  // Persistent / known contacts list
  const [savedContacts, setSavedContacts] = useState<UserProfile[]>(() => {
    try {
      const stored = localStorage.getItem(`linguacall_contacts_${currentUser.username}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn("Could not read stored contacts", e);
    }
    return [];
  });

  // Filter out self from online users
  const otherOnlineUsers = onlineUsers.filter((u) => u.username !== currentUser.username);

  // Merge online users and saved contacts without duplicates
  const allContacts: UserProfile[] = React.useMemo(() => {
    const map = new Map<string, UserProfile>();
    // First add online users
    for (const u of otherOnlineUsers) {
      map.set(u.username, { ...u, online: true });
    }
    // Then add saved contacts
    for (const c of savedContacts) {
      if (!map.has(c.username)) {
        const isCurrentlyOnline = otherOnlineUsers.some((o) => o.username === c.username);
        map.set(c.username, { ...c, online: isCurrentlyOnline });
      }
    }
    return Array.from(map.values());
  }, [otherOnlineUsers, savedContacts]);

  // Selected contact for active chat/call
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(() => {
    return allContacts.length > 0 ? allContacts[0] : null;
  });

  // Real messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedUser]);

  // Keep selected user state synced if they come online
  useEffect(() => {
    if (selectedUser) {
      const live = otherOnlineUsers.find((u) => u.username === selectedUser.username);
      if (live && !selectedUser.online) {
        setSelectedUser((prev) => (prev ? { ...prev, ...live, online: true } : live));
      }
    } else if (allContacts.length > 0) {
      setSelectedUser(allContacts[0]);
    }
  }, [otherOnlineUsers, allContacts]);

  // Query server when searching by username or email
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setServerSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.users && Array.isArray(data.users)) {
            const filtered = data.users.filter((u: UserProfile) => u.username !== currentUser.username);
            setServerSearchResults(filtered);
          }
        })
        .catch((err) => console.warn("Search fetch notice:", err));
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser.username]);

  // Save contacts to localStorage
  const persistContact = (userToAdd: UserProfile) => {
    setSavedContacts((prev) => {
      const exists = prev.some((p) => p.username === userToAdd.username);
      if (exists) return prev;
      const updated = [userToAdd, ...prev];
      try {
        localStorage.setItem(`linguacall_contacts_${currentUser.username}`, JSON.stringify(updated));
      } catch (e) {
        console.warn("Storage notice:", e);
      }
      return updated;
    });
  };

  // Start chat with typed username or email
  const handleStartDirectChat = (queryValue: string) => {
    const clean = queryValue.trim();
    if (!clean) return;

    const isEmail = clean.includes("@");
    const rawUsername = isEmail ? clean.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "") : clean.toLowerCase().replace(/[^a-z0-9_]/g, "");
    const username = rawUsername || `user_${Math.floor(1000 + Math.random() * 9000)}`;

    // Check if user is already in online users
    const existing = otherOnlineUsers.find((u) => u.username === username || (u.email && u.email.toLowerCase() === clean.toLowerCase()));
    if (existing) {
      setSelectedUser(existing);
      persistContact(existing);
      setSearchQuery("");
      return;
    }

    // Create a new contact entry
    const newContact: UserProfile = {
      userId: `user_${username}`,
      username: username,
      name: isEmail ? clean.split("@")[0] : clean,
      email: isEmail ? clean : undefined,
      picture: `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
      myLanguage: "English",
      hearLanguage: "English",
      online: false,
      lastActive: Date.now(),
    };

    persistContact(newContact);
    setSelectedUser(newContact);
    setSearchQuery("");
  };

  // Socket chat message handling
  useEffect(() => {
    const handleIncomingMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      // Ensure sender is added to contacts
      if (msg.fromUsername && msg.fromUsername !== currentUser.username) {
        persistContact({
          userId: `user_${msg.fromUsername}`,
          username: msg.fromUsername,
          name: msg.fromUsername,
          picture: `https://api.dicebear.com/7.x/identicon/svg?seed=${msg.fromUsername}`,
          myLanguage: msg.sourceLang || "English",
          hearLanguage: "English",
          online: true,
          lastActive: Date.now(),
        });
      }
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
    }, 700);
  };

  const handleCopyInviteLink = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.warn("Copy notice:", e);
    }
  };

  // Filter contacts by search query
  const q = searchQuery.toLowerCase().trim();
  const filteredContacts = allContacts.filter((u) => {
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q))
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
        
        {/* ================= LEFT SIDEBAR (SEARCH, CONTACTS, USER PROFILE) ================= */}
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
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="font-medium text-[#3b4a54] hover:text-[#00a884] flex items-center gap-1 cursor-pointer transition-colors"
                    title="Click to change listening & speaking language"
                  >
                    <span>🗣️ {myLangObj.flag}</span>
                    <span>➔</span>
                    <span>👂 {hearLangObj.flag}</span>
                  </button>
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
                title="Language & Audio Settings"
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

          {/* Search Bar - Search with username or email */}
          <div className="p-2.5 bg-white border-b border-[#e9edef]">
            <div className="flex items-center gap-2 bg-[#f0f2f5] px-3 py-2 rounded-xl border border-transparent focus-within:border-[#00a884] focus-within:bg-white transition-all shadow-2xs">
              <Search className="w-4 h-4 text-[#667781] shrink-0" />
              <input
                id="contacts-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    handleStartDirectChat(searchQuery);
                  }
                }}
                placeholder="Search with username or email..."
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
              <span>CHATS ({allContacts.length})</span>
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
              <span>VOICE CALLS ({otherOnlineUsers.length})</span>
            </button>
          </div>

          {/* Direct Search / Connect Action Card */}
          {searchQuery.trim().length > 0 && (
            <div
              id="direct-connect-search-card"
              onClick={() => handleStartDirectChat(searchQuery)}
              className="p-3 bg-[#e7fce3] hover:bg-[#d4f8cd] border-b border-[#c2f3b6] cursor-pointer flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#00a884] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#111b21] truncate">
                    Start Chat & Call with "{searchQuery.trim()}"
                  </p>
                  <p className="text-[11px] text-[#54656f]">
                    {searchQuery.includes("@") ? "Connect by email" : "Connect by handle"} · Click or press Enter
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#00a884] flex items-center gap-1 shrink-0 ml-2">
                <Phone className="w-3 h-3 fill-current" />
                Call
              </span>
            </div>
          )}

          {/* Server Search Results if matching registered users */}
          {serverSearchResults.length > 0 && searchQuery.trim().length > 0 && (
            <div className="bg-[#f8f9fa] border-b border-[#e9edef] px-3.5 py-1.5 text-[10px] font-bold text-[#667781] uppercase tracking-wider">
              Matched Users
            </div>
          )}

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#f0f2f5]">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((user) => {
                const isSelected = selectedUser?.username === user.username;
                const userLang = getLanguageByName(user.myLanguage || "English");

                return (
                  <div
                    key={user.userId || user.username}
                    onClick={() => {
                      setSelectedUser(user);
                      persistContact(user);
                    }}
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
                            user.online ? "bg-[#00a884]" : "bg-zinc-300"
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
                            {user.email || `@${user.username}`}
                          </p>
                          <span className="text-[10px] text-[#8696a0]">
                            {user.online ? "Online" : "Saved"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Call Button in list item */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(user);
                        persistContact(user);
                        handleTriggerVoiceCall(user);
                      }}
                      className="ml-3 p-2.5 bg-[#00a884]/10 hover:bg-[#00a884] text-[#00a884] hover:text-white rounded-full transition-all duration-150 shrink-0 shadow-xs cursor-pointer active:scale-95"
                      title={`Call ${user.name}`}
                    >
                      <Phone className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                );
              })
            ) : (
              /* Contact Empty State */
              <div className="p-6 text-center flex flex-col items-center justify-center h-full text-[#667781]">
                <div className="w-14 h-14 rounded-full bg-[#f0f2f5] flex items-center justify-center text-[#00a884] mb-3 shadow-inner">
                  <Globe className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-semibold text-[#111b21] mb-1">
                  {searchQuery ? "No matching contacts" : "No Contacts Yet"}
                </h4>
                <p className="text-xs text-[#667781] max-w-xs mb-4 leading-relaxed">
                  {searchQuery
                    ? `Press Enter or click "Start Chat & Call" above to connect directly.`
                    : "Type a username or email in the search bar above to start chatting and calling."}
                </p>

                <button
                  id="invite-btn-sidebar"
                  onClick={handleCopyInviteLink}
                  className="px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy App Link to Invite</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT PANEL (CHAT SECTION & TOP-RIGHT CALL SECTION) ================= */}
        <div className="flex-1 bg-[#efeae2] flex flex-col h-full relative overflow-hidden">
          {selectedUser ? (
            <>
              {/* Chat Top Header - WITH CALL SECTION AT RIGHT TOP */}
              <div className="h-16 bg-[#f0f2f5] px-4 flex items-center justify-between border-b border-[#e9edef] shrink-0 z-10 shadow-sm">
                
                {/* User details on left */}
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
                    <h3 className="text-sm font-bold text-[#111b21] truncate">
                      {selectedUser.name}
                    </h3>
                    <p className="text-xs text-[#667781] truncate flex items-center gap-1.5">
                      <span>{selectedUser.email || `@${selectedUser.username}`}</span>
                      <span>·</span>
                      <span className="font-medium text-[#00a884]">
                        Speaks {selectedUserLang?.flag} {selectedUserLang?.name}
                      </span>
                    </p>
                  </div>
                </div>

                {/* CALL SECTION AT RIGHT TOP */}
                <div className="flex items-center gap-3">
                  {/* Language translation info badge */}
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="hidden sm:flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-[#d1d7db] text-[11px] font-medium text-[#54656f] hover:border-[#00a884] transition-colors cursor-pointer"
                    title="Change listening language"
                  >
                    <span>Hear in:</span>
                    <span className="font-bold text-[#111b21] flex items-center gap-1">
                      {hearLangObj.flag} {hearLangObj.name}
                    </span>
                  </button>

                  {/* PROMINENT TOP-RIGHT CALL BUTTON */}
                  <button
                    id="chat-header-call-btn"
                    onClick={() => handleTriggerVoiceCall(selectedUser)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-xl text-xs font-bold shadow-md transition-all duration-150 active:scale-95 cursor-pointer"
                    title={`Call ${selectedUser.name} with real-time translation`}
                  >
                    <Phone className="w-4 h-4 fill-current" />
                    <span>Call</span>
                  </button>
                </div>
              </div>

              {/* Chat Canvas */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
                {/* Security and Translation Banner */}
                <div className="flex justify-center mb-4">
                  <div className="bg-[#ffeecd] border border-[#f5c67e] rounded-xl px-4 py-2.5 max-w-lg text-center shadow-xs">
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#54656f]">
                      <Lock className="w-3.5 h-3.5 text-[#856404]" />
                      <span>
                        Real-time AI voice translation. Click the <strong>Call</strong> button at top right to start a voice call.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Call Out Banner if no messages yet */}
                {conversationMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-14 h-14 rounded-full bg-[#00a884]/10 text-[#00a884] flex items-center justify-center mb-3">
                      <PhoneCall className="w-7 h-7" />
                    </div>
                    <h4 className="text-sm font-bold text-[#111b21] mb-1">
                      Ready to call {selectedUser.name}?
                    </h4>
                    <p className="text-xs text-[#667781] max-w-sm mb-4">
                      Click the green <strong>Call</strong> button at the top right to start translated voice calling, or send a message below.
                    </p>
                    <button
                      onClick={() => handleTriggerVoiceCall(selectedUser)}
                      className="px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer"
                    >
                      <Phone className="w-4 h-4 fill-current" />
                      <span>Start Voice Call Now</span>
                    </button>
                  </div>
                )}

                {/* Render Conversation Messages */}
                {conversationMessages.map((msg) => {
                  const isMe = msg.fromUsername === currentUser.username;
                  const timeFormatted = new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-xs relative ${
                          isMe
                            ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-xs"
                            : "bg-white text-[#111b21] rounded-tl-xs border border-[#e9edef]"
                        }`}
                      >
                        {/* Original Message */}
                        <div className="text-xs font-medium leading-relaxed">
                          {msg.originalText}
                        </div>

                        {/* Translated Speech / Text */}
                        {msg.translatedText && msg.translatedText !== msg.originalText && (
                          <div className="mt-2 pt-2 border-t border-black/10 text-xs text-[#005c4b] bg-white/60 rounded-lg p-2">
                            <div className="flex items-center justify-between text-[10px] font-semibold text-[#00a884] mb-0.5">
                              <span className="flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                <span>{msg.targetLang} Translation</span>
                              </span>
                              <button
                                onClick={() => speakText(msg.translatedText, msg.targetLang)}
                                className="p-1 hover:bg-[#00a884]/10 rounded text-[#00a884] cursor-pointer"
                                title="Listen to pronunciation"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="italic font-medium">{msg.translatedText}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#667781]">
                          <span>{timeFormatted}</span>
                          {isMe && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
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
                    placeholder={`Type message (auto-translates into ${selectedUserLang?.name || "English"})...`}
                    className="w-full bg-transparent text-xs text-[#111b21] outline-none placeholder-[#667781]"
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
            /* Default Welcome / Quick Connect Screen */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f0f2f5] border-l border-[#d1d7db]">
              <div className="w-20 h-20 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-lg mb-5">
                <PhoneCall className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-[#111b21] tracking-tight">
                LinguaCall Voice Translation
              </h2>
              <p className="text-xs text-[#54656f] mt-2 max-w-sm leading-relaxed">
                Connect and call anyone by username or email. Gemini AI interprets live speech and translates between you in real time.
              </p>

              {/* Quick Dial / Search Card */}
              <div className="mt-6 w-full max-w-sm bg-white p-4 rounded-2xl border border-[#d1d7db] shadow-md">
                <div className="text-left text-xs font-semibold text-[#111b21] mb-2">
                  Enter Username or Email to Call
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="quick-connect-input"
                    type="text"
                    placeholder="e.g. colleague@gmail.com or username"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchQuery.trim()) {
                        handleStartDirectChat(searchQuery);
                      }
                    }}
                    className="flex-1 px-3 py-2 text-xs border border-[#d1d7db] rounded-xl outline-none focus:border-[#00a884]"
                  />
                  <button
                    id="quick-connect-btn"
                    onClick={() => handleStartDirectChat(searchQuery)}
                    disabled={!searchQuery.trim()}
                    className="px-3.5 py-2 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer shrink-0"
                  >
                    <span>Connect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-col items-center gap-2">
                <button
                  id="invite-btn-empty-state"
                  onClick={handleCopyInviteLink}
                  className="px-4 py-2 bg-white hover:bg-[#e9edef] border border-[#d1d7db] text-[#111b21] rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-[#00a884]" /> : <Copy className="w-4 h-4 text-[#00a884]" />}
                  <span>{copiedLink ? "Link Copied!" : "Copy Test Link for 2nd Tab"}</span>
                </button>
                <span className="text-[11px] text-[#8696a0]">
                  Open in another tab or send to a colleague to test two-way voice translation.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= SIMPLE SETTINGS MODAL (CHANGE LISTENING LANGUAGE) ================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#d1d7db]">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#e9edef] mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#00a884]" />
                <h3 className="text-base font-bold text-[#111b21]">Language Settings</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 text-[#667781] hover:text-[#111b21] rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              
              {/* 1. LISTENING LANGUAGE SELECTOR (FRONT & CENTER) */}
              <div className="bg-[#f0f2f5] p-3.5 rounded-xl border border-[#e9edef]">
                <label className="block text-xs font-bold text-[#111b21] mb-1">
                  👂 Listening Language (What You Want to Hear)
                </label>
                <p className="text-[11px] text-[#667781] mb-2.5">
                  Incoming speech and messages will be translated into this language.
                </p>
                <select
                  id="settings-hear-language-select"
                  value={hearLang}
                  onChange={(e) => setHearLang(e.target.value)}
                  className="w-full bg-white border border-[#d1d7db] text-[#111b21] px-3 py-2.5 rounded-xl text-xs outline-none focus:border-[#00a884] cursor-pointer font-bold shadow-2xs"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={`set_hear_${lang.code}`} value={lang.name}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. SPEAKING LANGUAGE SELECTOR */}
              <div className="bg-[#f0f2f5] p-3.5 rounded-xl border border-[#e9edef]">
                <label className="block text-xs font-bold text-[#111b21] mb-1">
                  🗣️ Speaking Language (Your Language)
                </label>
                <p className="text-[11px] text-[#667781] mb-2.5">
                  The language you speak into your microphone or type in chat.
                </p>
                <select
                  id="settings-my-language-select"
                  value={myLang}
                  onChange={(e) => setMyLang(e.target.value)}
                  className="w-full bg-white border border-[#d1d7db] text-[#111b21] px-3 py-2.5 rounded-xl text-xs outline-none focus:border-[#00a884] cursor-pointer font-bold shadow-2xs"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={`set_my_${lang.code}`} value={lang.name}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Account Info */}
              <div className="p-3 bg-white rounded-xl border border-[#e9edef] text-xs text-[#54656f] flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#111b21]">{currentUser.name}</div>
                  <div className="text-[11px] text-[#667781]">{currentUser.email || `@${currentUser.username}`}</div>
                </div>
                <span className="text-[10px] text-[#00a884] font-semibold bg-[#00a884]/10 px-2 py-0.5 rounded">
                  Google Account
                </span>
              </div>

              {/* Save toast */}
              {saveToast && (
                <div className="p-2.5 bg-[#d9fdd3] text-[#005c4b] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Preferences saved!</span>
                </div>
              )}

              {/* Save Button */}
              <button
                id="save-preferences-btn"
                onClick={handleSaveSettings}
                className="w-full py-2.5 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Save Language Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
