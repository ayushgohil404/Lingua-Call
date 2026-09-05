export interface Contact {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  phone?: string;
  status?: string;
  isOnline?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isOutgoing: boolean;
  status: "sent" | "delivered" | "read";
  date?: string;
  replyTo?: {
    id: string;
    text: string;
    senderName?: string;
    isOutgoing?: boolean;
  };
}

export const mockContacts: Contact[] = [
  {
    id: "c1",
    name: "Aarav Sharma",
    avatarColor: "#128C7E",
    initials: "AS",
    lastMessage: "Are you joining the standup call?",
    time: "10:42 AM",
    unreadCount: 3,
    phone: "+91 98765 43210",
    status: "Available",
    isOnline: true,
  },
  {
    id: "c2",
    name: "Elena Rostova",
    avatarColor: "#E91E63",
    initials: "ER",
    lastMessage: "The project files have been uploaded to Drive.",
    time: "10:15 AM",
    unreadCount: 1,
    phone: "+7 912 345-67-89",
    status: "In a meeting",
    isOnline: false,
  },
  {
    id: "c3",
    name: "Marcus Vance",
    avatarColor: "#3F51B5",
    initials: "MV",
    lastMessage: "Sounds good, let's catch up tomorrow.",
    time: "Yesterday",
    unreadCount: 0,
    phone: "+1 (555) 234-5678",
    status: "Busy",
    isOnline: false,
  },
  {
    id: "c4",
    name: "Priya Patel",
    avatarColor: "#9C27B0",
    initials: "PP",
    lastMessage: "Can you review the latest translation pull request?",
    time: "Yesterday",
    unreadCount: 2,
    phone: "+91 91234 56789",
    status: "At work",
    isOnline: true,
  },
  {
    id: "c5",
    name: "Kenji Sato",
    avatarColor: "#009688",
    initials: "KS",
    lastMessage: "Arigato! The voice latency is much improved.",
    time: "Wednesday",
    unreadCount: 0,
    phone: "+81 90-1234-5678",
    status: "Battery about to die",
    isOnline: false,
  },
  {
    id: "c6",
    name: "Sophia Martinez",
    avatarColor: "#FF5722",
    initials: "SM",
    lastMessage: "Shared 3 photos",
    time: "Tuesday",
    unreadCount: 0,
    phone: "+34 612 34 56 78",
    status: "Can't talk, WhatsApp only",
    isOnline: false,
  },
  {
    id: "c7",
    name: "Dev Team Global",
    avatarColor: "#25D366",
    initials: "DT",
    lastMessage: "Alex: Phase 1 setup has been initiated.",
    time: "Monday",
    unreadCount: 5,
    phone: "Group - 8 participants",
    status: "Team Discussion Group",
    isOnline: true,
  },
  {
    id: "c8",
    name: "Liam O'Connor",
    avatarColor: "#607D8B",
    initials: "LO",
    lastMessage: "Voice note (0:45)",
    time: "Sunday",
    unreadCount: 0,
    phone: "+353 87 123 4567",
    status: "Urgent calls only",
    isOnline: false,
  },
  {
    id: "c9",
    name: "Fatima Al-Mansoor",
    avatarColor: "#FF9800",
    initials: "FA",
    lastMessage: "Checking the translation accuracy right now.",
    time: "28/08/2026",
    unreadCount: 0,
    phone: "+971 50 123 4567",
    status: "Sleeping",
    isOnline: true,
  },
  {
    id: "c10",
    name: "David Kim",
    avatarColor: "#00BCD4",
    initials: "DK",
    lastMessage: "See you at the conference next week!",
    time: "25/08/2026",
    unreadCount: 0,
    phone: "+82 10-1234-5678",
    status: "Available",
    isOnline: false,
  },
];

export const mockMessages: Record<string, Message[]> = {
  c1: [
    {
      id: "m1",
      senderId: "c1",
      text: "Hey! How is the new build coming along?",
      timestamp: "10:35 AM",
      isOutgoing: false,
      status: "read",
    },
    {
      id: "m2",
      senderId: "me",
      text: "Setting up Phase 1 architecture and theme tokens right now.",
      timestamp: "10:38 AM",
      isOutgoing: true,
      status: "read",
    },
    {
      id: "m3",
      senderId: "c1",
      text: "Are you joining the standup call?",
      timestamp: "10:42 AM",
      isOutgoing: false,
      status: "read",
    },
  ],
};
