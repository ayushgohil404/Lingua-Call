import React, { useState, useEffect, useRef } from "react";
import { UserProfile, ChatMessage } from "../types";
import { getSocket } from "../services/socket";
import { getLanguageByName } from "../constants/languages";
import { speakText } from "../services/audio";
import { Send, Volume2, Sparkles, MessageSquare, Globe } from "lucide-react";

interface ChatsTabProps {
  currentUser: UserProfile;
  onlineUsers: UserProfile[];
  initialChatUser?: UserProfile | null;
}

export const ChatsTab: React.FC<ChatsTabProps> = ({
  currentUser,
  onlineUsers,
  initialChatUser,
}) => {
  const socket = getSocket();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(
    initialChatUser || onlineUsers.find((u) => u.username !== currentUser.username) || null
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "seed_1",
      fromUsername: "elena_es",
      targetUsername: currentUser.username,
      originalText: "¡Hola! ¿Cómo estás hoy? LinguaCall traduce todo en tiempo real.",
      translatedText: "Hello! How are you today? LinguaCall translates everything in real time.",
      sourceLang: "Spanish",
      targetLang: currentUser.myLanguage,
      timestamp: Date.now() - 360000,
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialChatUser) {
      setSelectedUser(initialChatUser);
    }
  }, [initialChatUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        sourceLang: currentUser.myLanguage,
        targetLang: selectedUser.myLanguage,
      });

      // If chatting with demo contact, generate simulated reply
      if (selectedUser.userId.startsWith("demo_")) {
        setTimeout(async () => {
          try {
            const res = await fetch("/api/translate-text", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: `Reply naturally as ${selectedUser.name} to: "${text}"`,
                sourceLang: "English",
                targetLang: selectedUser.myLanguage,
              }),
            });
            const data = await res.json();
            const replyMsg = data.translatedText || `Sounds great! Multilingual chat is working.`;

            // Translate back for current user
            const replyTransRes = await fetch("/api/translate-text", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: replyMsg,
                sourceLang: selectedUser.myLanguage,
                targetLang: currentUser.myLanguage,
              }),
            });
            const replyTransData = await replyTransRes.json();

            setMessages((prev) => [
              ...prev,
              {
                id: `demo_msg_${Date.now()}`,
                fromUsername: selectedUser.username,
                targetUsername: currentUser.username,
                originalText: replyMsg,
                translatedText: replyTransData.translatedText || replyMsg,
                sourceLang: selectedUser.myLanguage,
                targetLang: currentUser.myLanguage,
                timestamp: Date.now(),
              },
            ]);
          } catch {}
        }, 1200);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSpeak = (text: string, langName: string) => {
    speakText(text, langName);
  };

  const otherUsers = onlineUsers.filter((u) => u.username !== currentUser.username);

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-8.5rem)] min-h-[500px] bg-white border-2 border-zinc-200 rounded-[2rem] overflow-hidden flex flex-col md:flex-row shadow-sm">
      {/* Contact sidebar list */}
      <div className="w-full md:w-80 bg-zinc-50 border-b md:border-b-0 md:border-r-2 border-zinc-200 flex flex-col">
        <div className="p-4 border-b-2 border-zinc-200 flex items-center justify-between">
          <div className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <span>Translated Chats</span>
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold uppercase tracking-wider">
            Auto AI
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {otherUsers.map((user) => {
            const isSelected = selectedUser?.username === user.username;
            const lang = getLanguageByName(user.myLanguage);
            return (
              <button
                key={user.username}
                onClick={() => setSelectedUser(user)}
                className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all text-left cursor-pointer ${
                  isSelected
                    ? "bg-indigo-50 border-2 border-indigo-600 text-zinc-900 shadow-xs"
                    : "hover:bg-zinc-100 text-zinc-700 border-2 border-transparent"
                }`}
              >
                <div className="relative">
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-10 h-10 rounded-2xl object-cover border-2 border-zinc-200 bg-zinc-200"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate text-zinc-900">{user.name}</div>
                  <div className="text-[11px] text-zinc-400 font-medium truncate">@{user.username}</div>
                  <div className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 mt-0.5">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main chat conversation window */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="p-4 bg-white border-b-2 border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedUser.picture}
                  alt={selectedUser.name}
                  className="w-10 h-10 rounded-2xl object-cover border-2 border-zinc-200 bg-zinc-100"
                />
                <div>
                  <div className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                    <span>{selectedUser.name}</span>
                    <span className="text-[11px] text-zinc-400 font-medium">(@{selectedUser.username})</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-medium flex items-center gap-1.5">
                    <span>Speaks: {getLanguageByName(selectedUser.myLanguage).flag} {selectedUser.myLanguage}</span>
                    <span className="text-zinc-300">·</span>
                    <span className="text-emerald-600 font-bold">Online</span>
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-zinc-100 border border-zinc-200 rounded-full text-xs text-zinc-600 font-medium">
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                <span>Auto-translates between {currentUser.myLanguage} & {selectedUser.myLanguage}</span>
              </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50">
              {messages.map((msg) => {
                const isSelf = msg.fromUsername === currentUser.username;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-md p-3.5 rounded-2xl text-xs space-y-1.5 shadow-sm ${
                        isSelf
                          ? "bg-indigo-600 text-white rounded-br-xs border border-indigo-700"
                          : "bg-white text-zinc-800 border-2 border-zinc-200 rounded-bl-xs"
                      }`}
                    >
                      {/* Original text */}
                      <div className={`font-medium ${isSelf ? "text-white" : "text-zinc-900"}`}>
                        {msg.originalText}
                      </div>

                      {/* Translated subtext */}
                      {msg.translatedText && msg.translatedText !== msg.originalText && (
                        <div
                          className={`pt-1.5 border-t text-[11px] flex items-center justify-between gap-2 ${
                            isSelf
                              ? "border-indigo-400/50 text-indigo-100"
                              : "border-zinc-200 text-emerald-700 font-medium"
                          }`}
                        >
                          <div className="italic">
                            <span className="text-[9px] uppercase font-mono px-1 rounded bg-black/10 mr-1">
                              {msg.targetLang}
                            </span>
                            "{msg.translatedText}"
                          </div>

                          <button
                            onClick={() => handleSpeak(msg.translatedText, msg.targetLang)}
                            title="Speak translation"
                            className="p-1 hover:bg-black/10 rounded text-inherit transition-colors cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-zinc-400 px-1 mt-1 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3.5 bg-zinc-50 border-t-2 border-zinc-200 flex gap-2">
              <input
                id="chat-message-input"
                type="text"
                placeholder={`Type in ${currentUser.myLanguage}... It will be translated to ${selectedUser.myLanguage}`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-white border-2 border-zinc-200 text-zinc-900 px-4 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-600 transition-all font-medium placeholder:text-zinc-400"
              />
              <button
                id="chat-send-btn"
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm border border-indigo-700 cursor-pointer"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
            <MessageSquare className="w-12 h-12 text-zinc-300 mb-3" />
            <p className="text-sm font-bold text-zinc-700">Select a contact to start chatting</p>
            <p className="text-xs text-zinc-400 mt-1">
              Every message is automatically translated into the recipient's native language.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
