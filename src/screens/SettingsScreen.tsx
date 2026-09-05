import React, { useState } from "react";
import {
  Key,
  MessageSquare,
  Bell,
  HardDrive,
  HelpCircle,
  QrCode,
  ChevronRight,
  ShieldCheck,
  Check,
  Moon,
} from "lucide-react";
import {
  loadStoredSettings,
  saveStoredSettings,
  AppSettingsState,
} from "../data/statusAndCallsData";

export interface SettingsScreenProps {
  onSettingsChange?: (settings: AppSettingsState) => void;
  isDarkMode?: boolean;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onSettingsChange,
  isDarkMode: isDarkModeProp,
}) => {
  const [settings, setSettings] = useState<AppSettingsState>(() =>
    loadStoredSettings()
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isDark = isDarkModeProp !== undefined ? isDarkModeProp : settings.darkMode;

  const handleToggle = (key: keyof AppSettingsState) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveStoredSettings(updated);
    if (onSettingsChange) {
      onSettingsChange(updated);
    }

    // Provide friendly confirmation
    const readableNames: Record<keyof AppSettingsState, string> = {
      readReceipts: "Read receipts",
      highPriorityNotifications: "High priority notifications",
      enterIsSend: "Enter key is send",
      mediaAutoDownload: "Media auto-download",
      securityNotifications: "Security notifications",
      darkMode: "Dark mode",
    };
    setToastMessage(`${readableNames[key]} preference saved`);
    setTimeout(() => setToastMessage(null), 2200);
  };

  return (
    <div
      id="settings-screen"
      className={`flex-1 flex flex-col h-full overflow-y-auto select-none relative transition-colors ${
        isDark ? "bg-[#111B21] text-[#E9EDEF]" : "bg-white text-[#111b21]"
      }`}
    >
      {/* ================= 1. PROFILE ROW ================= */}
      <div
        id="settings-profile-row"
        role="button"
        tabIndex={0}
        onClick={() => {
          setToastMessage("Profile details: Alex Morgan");
          setTimeout(() => setToastMessage(null), 1800);
        }}
        className={`h-[88px] px-4 flex items-center cursor-pointer transition-colors border-b ${
          isDark
            ? "border-[#222D34] hover:bg-[#202C33] active:bg-[#182229]"
            : "border-[#f0f2f5] hover:bg-[#f5f6f6] active:bg-[#ebebeb]"
        }`}
      >
        {/* Profile Avatar (60px) */}
        <div
          className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-white font-semibold text-xl shrink-0 mr-4 shadow-sm"
          style={{ backgroundColor: "#008069" }}
        >
          AM
        </div>

        {/* Profile Name & "About" Status */}
        <div className="flex-1 min-w-0">
          <h2 className="text-[18px] font-semibold truncate leading-tight">
            Alex Morgan
          </h2>
          <p
            className={`text-[14px] truncate leading-normal mt-1 ${
              isDark ? "text-[#8696A0]" : "text-[#667781]"
            }`}
          >
            Hey there! I am using WhatsApp.
          </p>
        </div>

        {/* Right QR Code Icon */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setToastMessage("Alex Morgan's QR code");
            setTimeout(() => setToastMessage(null), 1800);
          }}
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            isDark
              ? "hover:bg-[#202C33] text-[#00a884]"
              : "hover:bg-[#f0f2f5] text-[#008069]"
          }`}
          title="View QR code"
        >
          <QrCode className="w-6 h-6" />
        </button>
      </div>

      {/* ================= 2. CORE SETTINGS LIST ================= */}
      <div className="w-full divide-y-0">
        {/* Item 1: Account */}
        <div
          id="settings-item-account"
          className={`h-[68px] px-4 flex items-center cursor-pointer transition-colors ${
            isDark ? "hover:bg-[#202C33]" : "hover:bg-[#f5f6f6]"
          }`}
          onClick={() => handleToggle("securityNotifications")}
        >
          <div
            className={`w-8 flex items-center justify-center mr-4 shrink-0 ${
              isDark ? "text-[#8696A0]" : "text-[#54656f]"
            }`}
          >
            <Key className="w-5 h-5" />
          </div>
          <div
            className={`flex-1 min-w-0 border-b h-full flex items-center justify-between pr-2 ${
              isDark ? "border-[#222D34]" : "border-[#f0f2f5]"
            }`}
          >
            <div>
              <h3 className="text-[16px] font-medium leading-tight">Account</h3>
              <p
                className={`text-[13px] leading-normal mt-0.5 ${
                  isDark ? "text-[#8696A0]" : "text-[#667781]"
                }`}
              >
                Security notifications, change number
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#8696a0]" />
          </div>
        </div>

        {/* Item 2: Chats */}
        <div
          id="settings-item-chats"
          className={`h-[68px] px-4 flex items-center cursor-pointer transition-colors ${
            isDark ? "hover:bg-[#202C33]" : "hover:bg-[#f5f6f6]"
          }`}
          onClick={() => handleToggle("darkMode")}
        >
          <div
            className={`w-8 flex items-center justify-center mr-4 shrink-0 ${
              isDark ? "text-[#8696A0]" : "text-[#54656f]"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </div>
          <div
            className={`flex-1 min-w-0 border-b h-full flex items-center justify-between pr-2 ${
              isDark ? "border-[#222D34]" : "border-[#f0f2f5]"
            }`}
          >
            <div>
              <h3 className="text-[16px] font-medium leading-tight">Chats</h3>
              <p
                className={`text-[13px] leading-normal mt-0.5 ${
                  isDark ? "text-[#8696A0]" : "text-[#667781]"
                }`}
              >
                Theme, wallpapers, chat history
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#8696a0]" />
          </div>
        </div>

        {/* Item 3: Notifications */}
        <div
          id="settings-item-notifications"
          className={`h-[68px] px-4 flex items-center cursor-pointer transition-colors ${
            isDark ? "hover:bg-[#202C33]" : "hover:bg-[#f5f6f6]"
          }`}
          onClick={() => handleToggle("highPriorityNotifications")}
        >
          <div
            className={`w-8 flex items-center justify-center mr-4 shrink-0 ${
              isDark ? "text-[#8696A0]" : "text-[#54656f]"
            }`}
          >
            <Bell className="w-5 h-5" />
          </div>
          <div
            className={`flex-1 min-w-0 border-b h-full flex items-center justify-between pr-2 ${
              isDark ? "border-[#222D34]" : "border-[#f0f2f5]"
            }`}
          >
            <div>
              <h3 className="text-[16px] font-medium leading-tight">
                Notifications
              </h3>
              <p
                className={`text-[13px] leading-normal mt-0.5 ${
                  isDark ? "text-[#8696A0]" : "text-[#667781]"
                }`}
              >
                Message, group & call tones
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#8696a0]" />
          </div>
        </div>

        {/* Item 4: Storage and data */}
        <div
          id="settings-item-storage"
          className={`h-[68px] px-4 flex items-center cursor-pointer transition-colors ${
            isDark ? "hover:bg-[#202C33]" : "hover:bg-[#f5f6f6]"
          }`}
          onClick={() => handleToggle("mediaAutoDownload")}
        >
          <div
            className={`w-8 flex items-center justify-center mr-4 shrink-0 ${
              isDark ? "text-[#8696A0]" : "text-[#54656f]"
            }`}
          >
            <HardDrive className="w-5 h-5" />
          </div>
          <div
            className={`flex-1 min-w-0 border-b h-full flex items-center justify-between pr-2 ${
              isDark ? "border-[#222D34]" : "border-[#f0f2f5]"
            }`}
          >
            <div>
              <h3 className="text-[16px] font-medium leading-tight">
                Storage and data
              </h3>
              <p
                className={`text-[13px] leading-normal mt-0.5 ${
                  isDark ? "text-[#8696A0]" : "text-[#667781]"
                }`}
              >
                Network usage, auto-download
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#8696a0]" />
          </div>
        </div>

        {/* Item 5: Help */}
        <div
          id="settings-item-help"
          className={`h-[68px] px-4 flex items-center cursor-pointer transition-colors ${
            isDark ? "hover:bg-[#202C33]" : "hover:bg-[#f5f6f6]"
          }`}
          onClick={() => {
            setToastMessage("WhatsApp Help Center & Terms");
            setTimeout(() => setToastMessage(null), 1800);
          }}
        >
          <div
            className={`w-8 flex items-center justify-center mr-4 shrink-0 ${
              isDark ? "text-[#8696A0]" : "text-[#54656f]"
            }`}
          >
            <HelpCircle className="w-5 h-5" />
          </div>
          <div
            className={`flex-1 min-w-0 border-b h-full flex items-center justify-between pr-2 ${
              isDark ? "border-[#222D34]" : "border-[#f0f2f5]"
            }`}
          >
            <div>
              <h3 className="text-[16px] font-medium leading-tight">Help</h3>
              <p
                className={`text-[13px] leading-normal mt-0.5 ${
                  isDark ? "text-[#8696A0]" : "text-[#667781]"
                }`}
              >
                Help center, contact us, privacy policy
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#8696a0]" />
          </div>
        </div>
      </div>

      {/* ================= 3. INTERACTIVE PREFERENCES WITH TOGGLES ================= */}
      <div className="w-full mt-2">
        <div
          className={`px-4 py-2 text-[13px] font-semibold uppercase tracking-wider ${
            isDark ? "bg-[#182229] text-[#8696A0]" : "bg-[#f0f2f5] text-[#667781]"
          }`}
        >
          Privacy & App Preferences
        </div>

        <div className={`divide-y ${isDark ? "divide-[#222D34]" : "divide-[#f0f2f5]"}`}>
          {/* Toggle 0: Dark mode (WhatsApp dark colors) */}
          <div
            className={`px-4 py-3.5 flex items-center justify-between transition-colors ${
              isDark ? "hover:bg-[#202C33]" : "hover:bg-[#f5f6f6]"
            }`}
          >
            <div className="min-w-0 flex-1 pr-4">
              <div className="flex items-center gap-2">
                <Moon className={`w-4 h-4 ${isDark ? "text-[#00a884]" : "text-[#008069]"}`} />
                <h4 className="text-[15px] font-medium">Dark mode</h4>
              </div>
              <p
                className={`text-[13px] mt-0.5 leading-snug ${
                  isDark ? "text-[#8696A0]" : "text-[#667781]"
                }`}
              >
                WhatsApp dark theme (bg #111B21, outgoing #005C4B, incoming #202C33).
              </p>
            </div>
            <button
              id="toggle-dark-mode"
              type="button"
              role="switch"
              aria-checked={settings.darkMode}
              onClick={() => handleToggle("darkMode")}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                settings.darkMode ? "bg-[#00a884]" : "bg-[#d1d7db]"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.darkMode ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle 1: Read receipts */}
          <div
            className={`px-4 py-3.5 flex items-center justify-between transition-colors ${
              isDark ? "hover:bg-[#202C33]" : "hover:bg-[#f5f6f6]"
            }`}
          >
            <div className="min-w-0 flex-1 pr-4">
              <h4 className="text-[15px] font-medium">Read receipts</h4>
              <p
                className={`text-[13px] mt-0.5 leading-snug ${
                  isDark ? "text-[#8696A0]" : "text-[#667781]"
                }`}
              >
                If turned off, you won&apos;t send or receive Read receipts (blue ticks).
              </p>
            </div>
            <button
              id="toggle-read-receipts"
              type="button"
              role="switch"
              aria-checked={settings.readReceipts}
              onClick={() => handleToggle("readReceipts")}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                settings.readReceipts ? (isDark ? "bg-[#00a884]" : "bg-[#008069]") : "bg-[#d1d7db]"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.readReceipts ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: High priority notifications */}
          <div
            className={`px-4 py-3.5 flex items-center justify-between transition-colors ${
              isDark ? "hover:bg-[#202C33]" : "hover:bg-[#f5f6f6]"
            }`}
          >
            <div className="min-w-0 flex-1 pr-4">
              <h4 className="text-[15px] font-medium">High priority notifications</h4>
              <p
                className={`text-[13px] mt-0.5 leading-snug ${
                  isDark ? "text-[#8696A0]" : "text-[#667781]"
                }`}
              >
                Show previews of notifications at the top of the screen.
              </p>
            </div>
            <button
              id="toggle-notifications"
              type="button"
              role="switch"
              aria-checked={settings.highPriorityNotifications}
              onClick={() => handleToggle("highPriorityNotifications")}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                settings.highPriorityNotifications
                  ? (isDark ? "bg-[#00a884]" : "bg-[#008069]")
                  : "bg-[#d1d7db]"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.highPriorityNotifications
                    ? "translate-x-6"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle 3: Enter key is send */}
          <div
            className={`px-4 py-3.5 flex items-center justify-between transition-colors ${
              isDark ? "hover:bg-[#202C33]" : "hover:bg-[#f5f6f6]"
            }`}
          >
            <div className="min-w-0 flex-1 pr-4">
              <h4 className="text-[15px] font-medium">Enter is send</h4>
              <p
                className={`text-[13px] mt-0.5 leading-snug ${
                  isDark ? "text-[#8696A0]" : "text-[#667781]"
                }`}
              >
                Enter key will send your message immediately.
              </p>
            </div>
            <button
              id="toggle-enter-send"
              type="button"
              role="switch"
              aria-checked={settings.enterIsSend}
              onClick={() => handleToggle("enterIsSend")}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                settings.enterIsSend ? (isDark ? "bg-[#00a884]" : "bg-[#008069]") : "bg-[#d1d7db]"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.enterIsSend ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle 4: Media auto-download */}
          <div
            className={`px-4 py-3.5 flex items-center justify-between transition-colors ${
              isDark ? "hover:bg-[#202C33]" : "hover:bg-[#f5f6f6]"
            }`}
          >
            <div className="min-w-0 flex-1 pr-4">
              <h4 className="text-[15px] font-medium">Media auto-download over Wi-Fi</h4>
              <p
                className={`text-[13px] mt-0.5 leading-snug ${
                  isDark ? "text-[#8696A0]" : "text-[#667781]"
                }`}
              >
                Automatically download incoming voice notes and media.
              </p>
            </div>
            <button
              id="toggle-media-download"
              type="button"
              role="switch"
              aria-checked={settings.mediaAutoDownload}
              onClick={() => handleToggle("mediaAutoDownload")}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                settings.mediaAutoDownload ? (isDark ? "bg-[#00a884]" : "bg-[#008069]") : "bg-[#d1d7db]"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.mediaAutoDownload
                    ? "translate-x-6"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle 5: Security notifications */}
          <div
            className={`px-4 py-3.5 flex items-center justify-between transition-colors ${
              isDark ? "hover:bg-[#202C33]" : "hover:bg-[#f5f6f6]"
            }`}
          >
            <div className="min-w-0 flex-1 pr-4">
              <h4 className="text-[15px] font-medium">Security code notifications</h4>
              <p
                className={`text-[13px] mt-0.5 leading-snug ${
                  isDark ? "text-[#8696A0]" : "text-[#667781]"
                }`}
              >
                Receive an alert when a contact&apos;s security code changes.
              </p>
            </div>
            <button
              id="toggle-security-notifications"
              type="button"
              role="switch"
              aria-checked={settings.securityNotifications}
              onClick={() => handleToggle("securityNotifications")}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                settings.securityNotifications
                  ? (isDark ? "bg-[#00a884]" : "bg-[#008069]")
                  : "bg-[#d1d7db]"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.securityNotifications
                    ? "translate-x-6"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer info branding */}
        <div className="p-6 text-center text-[#8696a0] text-xs">
          <div
            className={`flex items-center justify-center gap-1.5 font-semibold ${
              isDark ? "text-[#8696A0]" : "text-[#54656f]"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#008069]" />
            <span>End-to-end encrypted</span>
          </div>
          <p className="mt-1">WhatsApp Web Replica • v2.26.1</p>
        </div>
      </div>

      {/* ================= 4. CONFIRMATION TOAST ================= */}
      {toastMessage && (
        <div
          id="settings-toast"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#111b21] text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50 animate-fadeIn"
        >
          <Check className="w-3.5 h-3.5 text-[#25d366]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default SettingsScreen;
