export interface StatusItem {
  id: string;
  contactId: string;
  name: string;
  initials: string;
  avatarColor: string;
  timeAgo: string;
  caption: string;
  bgColor: string;
  viewed: boolean;
}

export interface CallItem {
  id: string;
  contactId: string;
  name: string;
  initials: string;
  avatarColor: string;
  callType: "voice" | "video";
  direction: "incoming" | "outgoing" | "missed";
  time: string;
  count?: number;
}

export interface AppSettingsState {
  readReceipts: boolean;
  highPriorityNotifications: boolean;
  enterIsSend: boolean;
  mediaAutoDownload: boolean;
  securityNotifications: boolean;
  darkMode: boolean;
}

export const initialStatusUpdates: StatusItem[] = [
  {
    id: "s1",
    contactId: "c2",
    name: "Elena Rostova",
    initials: "ER",
    avatarColor: "#E91E63",
    timeAgo: "24 minutes ago",
    caption: "Great presentation at today's tech symposium! 🚀",
    bgColor: "#795548",
    viewed: false,
  },
  {
    id: "s2",
    contactId: "c1",
    name: "Aarav Sharma",
    initials: "AS",
    avatarColor: "#128C7E",
    timeAgo: "48 minutes ago",
    caption: "Code compiled with 0 warnings! Weekend starts now ☕",
    bgColor: "#008069",
    viewed: false,
  },
  {
    id: "s3",
    contactId: "c4",
    name: "Sophia Lin",
    initials: "SL",
    avatarColor: "#9C27B0",
    timeAgo: "Today, 8:15 AM",
    caption: "Morning hike before the sprint review 🏔️",
    bgColor: "#5C6BC0",
    viewed: false,
  },
  {
    id: "s4",
    contactId: "c5",
    name: "Dev Patel",
    initials: "DP",
    avatarColor: "#FF5722",
    timeAgo: "Today, 6:40 AM",
    caption: "Early bird gets the pull request merged 🌅",
    bgColor: "#D81B60",
    viewed: false,
  },
  {
    id: "s5",
    contactId: "c6",
    name: "Sarah Jenkins",
    initials: "SJ",
    avatarColor: "#4CAF50",
    timeAgo: "Yesterday, 11:20 PM",
    caption: "New album on repeat all night 🎧",
    bgColor: "#00897B",
    viewed: true,
  },
];

export const initialCallHistory: CallItem[] = [
  {
    id: "call-1",
    contactId: "c2",
    name: "Elena Rostova",
    initials: "ER",
    avatarColor: "#E91E63",
    callType: "video",
    direction: "missed",
    time: "Today, 10:15 AM",
    count: 2,
  },
  {
    id: "call-2",
    contactId: "c1",
    name: "Aarav Sharma",
    initials: "AS",
    avatarColor: "#128C7E",
    callType: "voice",
    direction: "incoming",
    time: "Today, 9:40 AM",
  },
  {
    id: "call-3",
    contactId: "c4",
    name: "Sophia Lin",
    initials: "SL",
    avatarColor: "#9C27B0",
    callType: "voice",
    direction: "outgoing",
    time: "Yesterday, 4:25 PM",
  },
  {
    id: "call-4",
    contactId: "c3",
    name: "Marcus Vance",
    initials: "MV",
    avatarColor: "#3F51B5",
    callType: "video",
    direction: "missed",
    time: "Yesterday, 2:10 PM",
  },
  {
    id: "call-5",
    contactId: "c5",
    name: "Dev Patel",
    initials: "DP",
    avatarColor: "#FF5722",
    callType: "voice",
    direction: "incoming",
    time: "September 3, 6:30 PM",
  },
  {
    id: "call-6",
    contactId: "c6",
    name: "Sarah Jenkins",
    initials: "SJ",
    avatarColor: "#4CAF50",
    callType: "video",
    direction: "outgoing",
    time: "September 2, 11:15 AM",
  },
  {
    id: "call-7",
    contactId: "c10",
    name: "David Kim",
    initials: "DK",
    avatarColor: "#00BCD4",
    callType: "voice",
    direction: "missed",
    time: "August 30, 8:05 PM",
    count: 3,
  },
];

const SETTINGS_STORAGE_KEY = "whatsapp_settings_v1";

export const defaultSettings: AppSettingsState = {
  readReceipts: true,
  highPriorityNotifications: true,
  enterIsSend: true,
  mediaAutoDownload: true,
  securityNotifications: false,
  darkMode: false,
};

export function loadStoredSettings(): AppSettingsState {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error("Failed to load settings from storage", e);
  }
  return defaultSettings;
}

export function saveStoredSettings(settings: AppSettingsState): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings to storage", e);
  }
}
