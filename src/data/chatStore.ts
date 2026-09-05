import { Contact, Message, mockContacts, mockMessages } from "./mockData";

const CONTACTS_STORAGE_KEY = "whatsapp_contacts_v1";
const MESSAGES_STORAGE_KEY = "whatsapp_messages_v1";

/**
 * Generate default seed messages for all 10 contacts if not yet stored
 */
export function getInitialMessagesMap(): Record<string, Message[]> {
  const map: Record<string, Message[]> = {};

  // For c1 from mockMessages
  if (mockMessages.c1) {
    map.c1 = mockMessages.c1.map((m, idx) => ({
      ...m,
      date: idx === 0 ? "YESTERDAY" : "TODAY",
    }));
  }

  // Populate for all other contacts
  for (const c of mockContacts) {
    if (!map[c.id]) {
      map[c.id] = [
        {
          id: `seed-${c.id}-1`,
          senderId: c.id,
          text: `Hi! Are we still syncing up regarding the roadmap?`,
          timestamp: "4:15 PM",
          isOutgoing: false,
          status: "read",
          date: "YESTERDAY",
        },
        {
          id: `seed-${c.id}-2`,
          senderId: "me",
          text: `Yes! I prepared the notes and shared the document.`,
          timestamp: "4:20 PM",
          isOutgoing: true,
          status: "read",
          date: "YESTERDAY",
        },
        {
          id: `seed-${c.id}-3`,
          senderId: c.id,
          text: c.lastMessage || "Let me know when you are available.",
          timestamp: c.time || "10:30 AM",
          isOutgoing: false,
          status: "read",
          date: "TODAY",
        },
      ];
    }
  }
  return map;
}

/**
 * Load contacts from localStorage or initialize with mockContacts
 */
export function loadStoredContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load contacts from localStorage", e);
  }
  saveStoredContacts(mockContacts);
  return mockContacts;
}

/**
 * Save contacts to localStorage
 */
export function saveStoredContacts(contacts: Contact[]): void {
  try {
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
  } catch (e) {
    console.error("Failed to save contacts to localStorage", e);
  }
}

/**
 * Load messages from localStorage or initialize with default messages
 */
export function loadStoredMessages(): Record<string, Message[]> {
  try {
    const raw = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load messages from localStorage", e);
  }
  const initial = getInitialMessagesMap();
  saveStoredMessages(initial);
  return initial;
}

/**
 * Save messages to localStorage
 */
export function saveStoredMessages(messagesMap: Record<string, Message[]>): void {
  try {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messagesMap));
  } catch (e) {
    console.error("Failed to save messages to localStorage", e);
  }
}
