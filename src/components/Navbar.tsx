import React from "react";
import { UserProfile } from "../types";
import { getLanguageByName } from "../constants/languages";
import { Phone, MessageSquare, Settings, LogOut } from "lucide-react";

interface NavbarProps {
  user: UserProfile | null;
  activeTab: "calls" | "chats" | "group" | "settings";
  onTabChange: (tab: "calls" | "chats" | "group" | "settings") => void;
  onLogout: () => void;
  onUpdateLanguages?: (myLang: string, hearLang: string) => void;
  socketConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onTabChange,
  onLogout,
  socketConnected,
}) => {
  const myLangObj = user ? getLanguageByName(user.myLanguage) : null;
  const hearLangObj = user ? getLanguageByName(user.hearLanguage) : null;

  return (
    <header className="w-full bg-white border-b border-zinc-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Simple Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-sm">
            L
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-zinc-900">
                LinguaCall
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  socketConnected ? "bg-emerald-500" : "bg-amber-400"
                }`}
                title={socketConnected ? "Connected" : "Connecting"}
              />
            </div>
          </div>
        </div>

        {/* Minimalist Tabs */}
        {user && (
          <nav className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
            <button
              id="nav-tab-calls"
              onClick={() => onTabChange("calls")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "calls"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Calls</span>
            </button>
            <button
              id="nav-tab-chats"
              onClick={() => onTabChange("chats")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "chats"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Messages</span>
            </button>
            <button
              id="nav-tab-settings"
              onClick={() => onTabChange("settings")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "settings"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </nav>
        )}

        {/* User profile & signout */}
        {user && (
          <div className="flex items-center gap-3">
            {/* Language indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 font-medium bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-200">
              <span>{myLangObj?.flag} {myLangObj?.name}</span>
              <span className="text-zinc-400">➔</span>
              <span>{hearLangObj?.flag} {hearLangObj?.name}</span>
            </div>

            <div className="flex items-center gap-2">
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-zinc-200 bg-zinc-100"
              />
              <button
                id="header-logout-btn"
                onClick={onLogout}
                title="Sign out"
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
