import React, { useMemo, useRef, useEffect, useState } from "react";
import { Contact, Message, mockContacts } from "../data/mockData";
import { MessageBubble } from "../components/MessageBubble";
import { InputBar } from "../components/InputBar";
import {
  ArrowLeft,
  Video,
  Phone,
  MoreVertical,
  Lock,
  X,
  Copy,
  Trash2,
  Forward,
  Check,
  MessageCircle,
} from "lucide-react";

export interface ChatDetailScreenProps {
  contactId: string;
  contact?: Contact;
  allContacts?: Contact[];
  messages: Message[];
  isTyping?: boolean;
  isDarkMode?: boolean;
  onBack: () => void;
  onSendMessage: (text: string, replyTo?: Message["replyTo"]) => void;
  onDeleteMessage?: (messageId: string) => void;
  onForwardMessage?: (targetContactId: string, text: string) => void;
}

interface MessageGroup {
  dateLabel: string;
  messages: Message[];
}

/**
 * ChatDetailScreen
 * - Phase 8 Polish:
 *   1. Long-press message selection (Copy, Delete for me, Forward)
 *   2. Swipe-to-reply with quoted context
 *   3. Dark mode theme support
 *   4. Date separators grouping messages by day
 *   5. Empty state "Type a message" hint
 */
export const ChatDetailScreen: React.FC<ChatDetailScreenProps> = ({
  contactId,
  contact: contactProp,
  allContacts = mockContacts,
  messages,
  isTyping = false,
  isDarkMode = false,
  onBack,
  onSendMessage,
  onDeleteMessage,
  onForwardMessage,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Resolve contact
  const contact: Contact = useMemo(() => {
    if (contactProp) return contactProp;
    return (
      allContacts.find((c) => c.id === contactId) || {
        id: contactId,
        name: "Unknown Contact",
        initials: "?",
        avatarColor: "#008069",
        lastMessage: "Hello!",
        time: "10:42 AM",
        unreadCount: 0,
        phone: "+1 555 000 0000",
        isOnline: true,
        status: "online",
      }
    );
  }, [allContacts, contactId, contactProp]);

  // Group messages consecutively by day
  const messageGroups: MessageGroup[] = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    const groups: MessageGroup[] = [];
    let currentGroup: MessageGroup | null = null;

    for (const msg of messages) {
      // Determine date label
      let label = msg.date;
      if (!label) {
        label = "TODAY";
      }

      if (!currentGroup || currentGroup.dateLabel !== label) {
        currentGroup = {
          dateLabel: label,
          messages: [msg],
        };
        groups.push(currentGroup);
      } else {
        currentGroup.messages.push(msg);
      }
    }

    return groups;
  }, [messages]);

  // Scroll to bottom on initial open and when messages/typing change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 60);
    return () => clearTimeout(timer);
  }, [messages.length, isTyping]);

  // Handle Copy
  const handleCopyMessage = async () => {
    if (!selectedMessage) return;
    try {
      await navigator.clipboard.writeText(selectedMessage.text);
      showToast("Message copied");
    } catch {
      showToast("Message copied to clipboard");
    }
    setSelectedMessage(null);
  };

  // Handle Delete
  const handleDeleteMessage = () => {
    if (!selectedMessage) return;
    if (onDeleteMessage) {
      onDeleteMessage(selectedMessage.id);
    }
    showToast("Message deleted");
    setSelectedMessage(null);
  };

  // Handle Forward
  const handleOpenForward = () => {
    if (!selectedMessage) return;
    setIsForwardModalOpen(true);
  };

  const handleSelectForwardContact = (targetContact: Contact) => {
    if (!selectedMessage) return;
    if (onForwardMessage) {
      onForwardMessage(targetContact.id, selectedMessage.text);
    }
    showToast(`Forwarded to ${targetContact.name}`);
    setIsForwardModalOpen(false);
    setSelectedMessage(null);
  };

  return (
    <div
      id="chat-detail-screen"
      className={`flex-1 flex flex-col h-full overflow-hidden select-text relative transition-colors ${
        isDarkMode ? "bg-[#0b141a]" : "bg-[#EFE7DD]"
      }`}
    >
      {/* ================= TOP APP BAR ================= */}
      {selectedMessage ? (
        /* WhatsApp Multi-Action Selection Bar */
        <header
          id="chat-selection-header"
          className={`h-16 px-3 flex items-center justify-between text-white shrink-0 select-none shadow-md z-20 sticky top-0 animate-fadeIn ${
            isDarkMode ? "bg-[#202C33]" : "bg-[#008069]"
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              id="cancel-selection-btn"
              type="button"
              onClick={() => setSelectedMessage(null)}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="Cancel selection"
            >
              <X className="w-5 h-5 stroke-[2.2]" />
            </button>
            <span className="text-lg font-medium tracking-wide">1</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Copy Action */}
            <button
              id="action-copy-btn"
              type="button"
              onClick={handleCopyMessage}
              className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="Copy message"
            >
              <Copy className="w-5 h-5" />
            </button>

            {/* Delete (for me) Action */}
            <button
              id="action-delete-btn"
              type="button"
              onClick={handleDeleteMessage}
              className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="Delete message"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            {/* Forward Action */}
            <button
              id="action-forward-btn"
              type="button"
              onClick={handleOpenForward}
              className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="Forward message"
            >
              <Forward className="w-5 h-5" />
            </button>
          </div>
        </header>
      ) : (
        /* Standard Header */
        <header
          id="chat-detail-header"
          className={`h-16 px-2 flex items-center justify-between text-white shrink-0 select-none shadow-md z-20 sticky top-0 transition-colors ${
            isDarkMode ? "bg-[#202C33]" : "bg-[#008069]"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
            {/* Back arrow */}
            <button
              id="chat-detail-back-btn"
              type="button"
              onClick={onBack}
              className="p-2 -ml-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-white"
              title="Back to chats"
              aria-label="Back to chats"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>

            {/* Contact Avatar (40px) */}
            <div
              id="chat-detail-avatar"
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-xs cursor-pointer select-none"
              style={{ backgroundColor: contact.avatarColor }}
            >
              {contact.initials}
            </div>

            {/* Contact Name & "online" / "typing..." text */}
            <div className="min-w-0 flex-1 ml-1 cursor-pointer">
              <h2 className="text-[16px] font-semibold text-white truncate leading-tight">
                {contact.name}
              </h2>
              {isTyping ? (
                <p
                  id="chat-header-typing-indicator"
                  className="text-[12.5px] text-[#d9fdd3] font-medium tracking-wide truncate leading-none mt-0.5 italic animate-pulse"
                >
                  typing...
                </p>
              ) : (
                <p className="text-[12px] text-white/90 truncate leading-none mt-0.5">
                  {contact.isOnline ? "online" : "last seen today at 10:20 AM"}
                </p>
              )}
            </div>
          </div>

          {/* Header Action Icons: Video, Phone, Three-dot Menu */}
          <div className="flex items-center gap-1 text-white shrink-0">
            <button
              id="chat-header-video-btn"
              type="button"
              className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-white"
              title="Video call"
              aria-label="Video call"
            >
              <Video className="w-5 h-5" />
            </button>

            <button
              id="chat-header-call-btn"
              type="button"
              className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-white"
              title="Voice call"
              aria-label="Voice call"
            >
              <Phone className="w-5 h-5" />
            </button>

            <button
              id="chat-header-menu-btn"
              type="button"
              className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-white"
              title="More options"
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}

      {/* ================= MESSAGE AREA ================= */}
      <main
        id="messages-container"
        className={`flex-1 overflow-y-auto px-3 sm:px-4 py-3 flex flex-col justify-start relative transition-colors ${
          isDarkMode ? "bg-[#0b141a]" : "bg-[#EFE7DD]"
        }`}
        onClick={() => {
          if (selectedMessage) setSelectedMessage(null);
        }}
      >
        {/* Subtle WhatsApp background watermark overlay */}
        <div
          className={`absolute inset-0 pointer-events-none ${
            isDarkMode ? "opacity-15" : "opacity-40 mix-blend-multiply"
          }`}
          style={{
            backgroundImage: `radial-gradient(${isDarkMode ? "#2a3942" : "#d3cbbf"} 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative z-10 w-full flex flex-col">
          {/* End-to-end Encryption Banner */}
          <div className="flex justify-center my-2 select-none">
            <div
              className={`text-[11px] px-3.5 py-1.5 rounded-lg shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] flex items-center gap-1.5 max-w-[90%] text-center ${
                isDarkMode
                  ? "bg-[#182229] text-[#8696A0] border border-[#222D34]"
                  : "bg-[#ffeecd] text-[#54656f] border border-[#e6d8b5]"
              }`}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>
                Messages and calls are end-to-end encrypted. No one outside of
                this chat can read or listen to them.
              </span>
            </div>
          </div>

          {/* Empty State when chat has no messages */}
          {(!messages || messages.length === 0) && (
            <div
              id="empty-chat-state"
              className="my-auto py-12 flex flex-col items-center justify-center text-center px-4 select-none animate-fadeIn"
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-sm ${
                  isDarkMode ? "bg-[#202C33] text-[#00a884]" : "bg-[#d9fdd3] text-[#008069]"
                }`}
              >
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3
                className={`text-[15px] font-semibold mb-1 ${
                  isDarkMode ? "text-[#E9EDEF]" : "text-[#111b21]"
                }`}
              >
                No messages yet
              </h3>
              <p
                className={`text-[13px] max-w-xs ${
                  isDarkMode ? "text-[#8696A0]" : "text-[#667781]"
                }`}
              >
                Type a message below to start chatting with {contact.name}.
              </p>
            </div>
          )}

          {/* Render Message Groups with Centered Date Separator Pills */}
          {messageGroups.map((group, groupIdx) => (
            <div key={`group-${groupIdx}`} className="w-full flex flex-col">
              {/* Centered Date Separator Pill */}
              <div className="flex justify-center my-3 select-none">
                <span
                  className={`text-[11px] font-semibold px-3 py-1 rounded-lg shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] uppercase tracking-wider ${
                    isDarkMode
                      ? "bg-[#182229] text-[#8696A0] border border-[#222D34]"
                      : "bg-white/95 text-[#54656f]"
                  }`}
                >
                  {group.dateLabel}
                </span>
              </div>

              {/* Group Messages */}
              {group.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isSelected={selectedMessage?.id === message.id}
                  onLongPress={(msg) => setSelectedMessage(msg)}
                  onSwipeReply={(msg) => setReplyingToMessage(msg)}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>
          ))}

          {/* Typing Indicator Bubble */}
          {isTyping && (
            <div
              id="chat-typing-bubble"
              className="w-full flex justify-start mb-2 select-none"
            >
              <div
                className={`relative rounded-lg rounded-tl-none px-4 py-2.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] flex items-center gap-1.5 mr-8 ${
                  isDarkMode ? "bg-[#202C33] text-[#E9EDEF]" : "bg-white text-[#111b21]"
                }`}
              >
                {/* Tail SVG */}
                <svg
                  className="absolute top-0 -left-2 w-2 h-3 pointer-events-none drop-shadow-[0_1px_0.5px_rgba(0,0,0,0.08)]"
                  style={{ fill: isDarkMode ? "#202C33" : "#ffffff" }}
                  viewBox="0 0 8 13"
                >
                  <path d="M8 0 C5 0 1 2 0 6 C0 8 3 11 8 13 Z" />
                </svg>
                <span className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ================= INPUT BAR ================= */}
      <InputBar
        onSend={onSendMessage}
        replyingTo={replyingToMessage}
        onCancelReply={() => setReplyingToMessage(null)}
        isDarkMode={isDarkMode}
        contactName={contact.name}
      />

      {/* ================= FORWARD MESSAGE MODAL ================= */}
      {isForwardModalOpen && selectedMessage && (
        <div
          id="forward-message-modal"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsForwardModalOpen(false)}
        >
          <div
            className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${
              isDarkMode ? "bg-[#111B21] text-[#E9EDEF]" : "bg-white text-[#111b21]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className={`p-4 flex items-center justify-between border-b ${
                isDarkMode ? "border-[#222D34]" : "border-[#f0f2f5]"
              }`}
            >
              <h3 className="font-semibold text-base">Forward message to...</h3>
              <button
                type="button"
                onClick={() => setIsForwardModalOpen(false)}
                className="p-1 rounded-full hover:bg-black/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quoted Message Preview in Forward Modal */}
            <div
              className={`px-4 py-2.5 text-xs italic truncate border-b ${
                isDarkMode ? "bg-[#202C33] text-[#8696A0] border-[#222D34]" : "bg-[#f0f2f5] text-[#667781] border-[#e9edef]"
              }`}
            >
              &ldquo;{selectedMessage.text}&rdquo;
            </div>

            {/* Contact List */}
            <div className="overflow-y-auto divide-y divide-transparent">
              {allContacts
                .filter((c) => c.id !== contactId)
                .map((c) => (
                  <div
                    key={c.id}
                    id={`forward-contact-${c.id}`}
                    onClick={() => handleSelectForwardContact(c)}
                    className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
                      isDarkMode ? "hover:bg-[#202C33]" : "hover:bg-[#f5f6f6]"
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
                      style={{ backgroundColor: c.avatarColor }}
                    >
                      {c.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{c.name}</h4>
                      <p
                        className={`text-xs truncate ${
                          isDarkMode ? "text-[#8696A0]" : "text-[#667781]"
                        }`}
                      >
                        {c.status || "Hey there! I am using WhatsApp."}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="chat-action-toast"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#111b21] text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50 animate-fadeIn"
        >
          <Check className="w-3.5 h-3.5 text-[#25d366]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default ChatDetailScreen;
