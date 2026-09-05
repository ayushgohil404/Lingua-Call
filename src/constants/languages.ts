import { LanguageOption } from "../types";

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "hi", name: "Hindi", flag: "🇮🇳", native: "हिन्दी", ttsVoice: "Kore" },
  { code: "en", name: "English", flag: "🇺🇸", native: "English", ttsVoice: "Zephyr" },
  { code: "es", name: "Spanish", flag: "🇪🇸", native: "Español", ttsVoice: "Puck" },
  { code: "fr", name: "French", flag: "🇫🇷", native: "Français", ttsVoice: "Charon" },
  { code: "de", name: "German", flag: "🇩🇪", native: "Deutsch", ttsVoice: "Fenrir" },
  { code: "ja", name: "Japanese", flag: "🇯🇵", native: "日本語", ttsVoice: "Kore" },
  { code: "zh", name: "Chinese", flag: "🇨🇳", native: "中文", ttsVoice: "Puck" },
  { code: "ar", name: "Arabic", flag: "🇸🇦", native: "العربية", ttsVoice: "Fenrir" },
  { code: "te", name: "Telugu", flag: "🇮🇳", native: "తెలుగు", ttsVoice: "Kore" },
  { code: "ta", name: "Tamil", flag: "🇮🇳", native: "தமிழ்", ttsVoice: "Puck" },
  { code: "bn", name: "Bengali", flag: "🇮🇳", native: "বাংলা", ttsVoice: "Kore" },
  { code: "mr", name: "Marathi", flag: "🇮🇳", native: "मराठी", ttsVoice: "Fenrir" },
  { code: "pa", name: "Punjabi", flag: "🇮🇳", native: "ਪੰਜਾਬੀ", ttsVoice: "Charon" },
  { code: "gu", name: "Gujarati", flag: "🇮🇳", native: "ગુજરાતી", ttsVoice: "Kore" },
  { code: "ru", name: "Russian", flag: "🇷🇺", native: "Русский", ttsVoice: "Fenrir" },
  { code: "pt", name: "Portuguese", flag: "🇧🇷", native: "Português", ttsVoice: "Zephyr" },
  { code: "it", name: "Italian", flag: "🇮🇹", native: "Italiano", ttsVoice: "Puck" },
  { code: "ko", name: "Korean", flag: "🇰🇷", native: "한국어", ttsVoice: "Kore" },
  { code: "tr", name: "Turkish", flag: "🇹🇷", native: "Türkçe", ttsVoice: "Charon" },
  { code: "nl", name: "Dutch", flag: "🇳🇱", native: "Nederlands", ttsVoice: "Fenrir" },
];

export function getLanguageByName(name: string): LanguageOption {
  const found = SUPPORTED_LANGUAGES.find(
    (l) => l.name.toLowerCase() === name.toLowerCase() || l.native.toLowerCase() === name.toLowerCase()
  );
  return found || SUPPORTED_LANGUAGES[1]; // default English
}
