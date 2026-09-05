export interface UserProfile {
  userId: string;
  username: string;
  name: string;
  email?: string;
  picture: string;
  myLanguage: string;
  hearLanguage: string;
  online: boolean;
  socketId?: string;
  lastActive: number;
}

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
  native: string;
  ttsVoice: string; // 'Kore', 'Puck', 'Fenrir', 'Zephyr', 'Charon'
}

export interface CallSession {
  targetUser: UserProfile;
  callerUser: UserProfile;
  myLanguage: string;
  hearLanguage: string;
  role: "caller" | "receiver" | "group";
  socketId?: string;
  startTime: number;
  roomId?: string;
}

export interface LiveTranscriptItem {
  id: string;
  speaker: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
  isSelf: boolean;
}

export interface ChatMessage {
  id: string;
  fromUsername: string;
  targetUsername?: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

export interface GroupRoom {
  id: string;
  name: string;
  host: string;
  members: string[];
  createdAt: number;
}
