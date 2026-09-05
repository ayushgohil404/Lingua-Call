import React, { useState, useEffect, useRef } from "react";
import { UserProfile, ChatMessage } from "../types";
import { getSocket } from "../services/socket";
import { getLanguageByName } from "../constants/languages";
import { speakText } from "../services/audio";
import { Send, Volume2, MessageSquare } from "lucide-react";

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

      // If chatting with demo contact, generate reply
      if (selectedUser.userId.startsWith("demo_")) {
        setTimeout(async () => {
          try {
            const res = await fetch("/api/translate-text", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: `Reply in 1 casual sentence as ${selectedUser.name} to: "${text}"`,
                sourceLang: "English",
                targetLang: selectedUser.myLanguage,
              }),
            });
            const data = await res.json();
            const replyMsg = data.translatedText || `Got it! Multilingual chat is working.`;

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
    <div className="max-w-4xl mx-auto h-[calc(100vh-9rem)] min-h-[500px] bg-white border border-zinc-200 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-xs">
      {/* Contact sidebar */}
      <div className="w-full md:w-72 bg-zinc-50 border-b md:border-b-0 md:border-r border-zinc-200 flex flex-col">
        <div className="p-3.5 border-b border-zinc-200 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Conversations</span>
          <span className="text-[10px] text-zinc-400 font-medium">Auto-Translated</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {otherUsers.map((user) => {
            const isSelected = selectedUser?.username === user.username;
            const lang = getLanguageByName(user.myLanguage);
            return (
              <button
                key={user.username}
                onClick={() => setSelectedUser(user)}
                className={`w-full p-2.5 rounded-xl flex items-center gap-3 transition-colors text-left cursor-pointer ${
                  isSelected
                    ? "bg-white text-zinc-900 shadow-xs border border-zinc-200"
                    : "hover:bg-zinc-100 text-zinc-700"
                }`}
              >
                <div className="relative">
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-9 h-9 rounded-full object-cover border border-zinc-200 bg-zinc-100"
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate text-zinc-900">{user.name}</div>
                  <div className="text-[11px] text-zinc-400 font-medium truncate">
                    {lang.flag} {lang.name}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main chat window */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="p-3.5 bg-white border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={selectedUser.picture}
                  alt={selectedUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-zinc-200"
                />
                <div>
                  <div className="text-xs font-bold text-zinc-900">{selectedUser.name}</div>
                  <div className="text-[11px] text-zinc-400">
                    Speaks {getLanguageByName(selectedUser.myLanguage).flag} {selectedUser.myLanguage}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50">
              {messages.map((msg) => {
                const isSelf = msg.fromUsername === currentUser.username;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-md p-3 rounded-2xl text-xs space-y-1 ${
                        isSelf
                          ? "bg-zinc-900 text-white rounded-br-xs"
                          : "bg-white text-zinc-900 border border-zinc-200 rounded-bl-xs shadow-xs"
                      }`}
                    >
                      <div className="font-normal">{msg.originalText}</div>

                      {msg.translatedText && msg.translatedText !== msg.originalText && (
                        <div
                          className={`pt-1 border-t text-[11px] flex items-center justify-between gap-2 ${
                            isSelf
                              ? "border-zinc-700 text-zinc-300"
                              : "border-zinc-100 text-zinc-500"
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
                            title="Speak"
                            className="p-0.5 hover:opacity-75 cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-zinc-400 px-1 mt-0.5">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-zinc-200 flex gap-2">
              <input
                id="chat-message-input"
                type="text"
                placeholder={`Type in ${currentUser.myLanguage}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-zinc-50 border border-zinc-200 text-zinc-900 px-3.5 py-2 rounded-xl text-xs outline-none focus:border-zinc-400 focus:bg-white transition-colors"
              />
              <button
                id="chat-send-btn"
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Send</span>
                <Send className="w-3 h-3" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
            <MessageSquare className="w-8 h-8 text-zinc-300 mb-2" />
            <p className="text-xs font-semibold text-zinc-700">Select a contact to message</p>
          </div>
        )}
      </div>
    </div>
  );
};
