import React from "react";
import { UserProfile } from "../types";
import { SUPPORTED_LANGUAGES, getLanguageByName } from "../constants/languages";
import { Phone, MessageSquare, Users, Settings, LogOut, Radio, Volume2 } from "lucide-react";

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
  onUpdateLanguages,
  socketConnected,
}) => {
  const myLangObj = user ? getLanguageByName(user.myLanguage) : null;
  const hearLangObj = user ? getLanguageByName(user.hearLanguage) : null;

  return (
    <header className="w-full bg-white/90 border-b-2 border-zinc-200 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Logo and branding */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 border-2 border-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 font-bold text-xl">
            🌐
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight text-zinc-900">
                LinguaCall
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full uppercase tracking-wider">
                Live AI
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-medium hidden sm:block">
              Real-time speech-to-speech multilingual calling
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        {user && (
          <nav className="hidden md:flex items-center gap-1.5 bg-zinc-100 p-1.5 rounded-2xl border-2 border-zinc-200">
            <button
              id="nav-tab-calls"
              onClick={() => onTabChange("calls")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "calls"
                  ? "bg-indigo-600 text-white shadow-md border border-indigo-700"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70"
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Calls</span>
            </button>
            <button
              id="nav-tab-chats"
              onClick={() => onTabChange("chats")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "chats"
                  ? "bg-indigo-600 text-white shadow-md border border-indigo-700"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chats</span>
            </button>
            <button
              id="nav-tab-group"
              onClick={() => onTabChange("group")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "group"
                  ? "bg-indigo-600 text-white shadow-md border border-indigo-700"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Rooms</span>
            </button>
            <button
              id="nav-tab-settings"
              onClick={() => onTabChange("settings")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "settings"
                  ? "bg-indigo-600 text-white shadow-md border border-indigo-700"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Audio & AI</span>
            </button>
          </nav>
        )}

        {/* User profile & status */}
        {user ? (
          <div className="flex items-center gap-3">
            {/* Language pair badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-zinc-100 border border-zinc-200 rounded-full text-xs font-semibold text-zinc-700">
              <span title="You speak">{myLangObj?.flag} {myLangObj?.name}</span>
              <span className="text-indigo-600 font-bold">⇄</span>
              <span title="You hear">{hearLangObj?.flag} {hearLangObj?.name}</span>
            </div>

            {/* Socket status indicator */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                socketConnected
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : "bg-amber-100 text-amber-800 border-amber-200"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${socketConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span className="hidden sm:inline uppercase tracking-wider">{socketConnected ? "Live" : "Connecting"}</span>
            </div>

            {/* User pill */}
            <div className="flex items-center gap-2.5 pl-2 border-l-2 border-zinc-200">
              <img
                src={user.picture}
                alt={user.name}
                className="w-9 h-9 rounded-full border-2 border-zinc-300 object-cover shadow-sm bg-zinc-200"
              />
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-zinc-900 truncate max-w-[110px]">
                  {user.name}
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">
                  @{user.username}
                </div>
              </div>

              <button
                id="header-logout-btn"
                onClick={onLogout}
                title="Sign Out"
                className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all ml-1 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs font-bold text-zinc-600 flex items-center gap-2 bg-zinc-100 px-3 py-1.5 rounded-full border border-zinc-200">
            <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span className="uppercase tracking-wider">Bento Grid OS · Gemini AI Ready</span>
          </div>
        )}
      </div>

      {/* Mobile nav bar */}
      {user && (
        <div className="md:hidden flex items-center justify-around py-2.5 px-4 bg-white border-t-2 border-zinc-200 text-xs font-medium">
          <button
            onClick={() => onTabChange("calls")}
            className={`flex flex-col items-center gap-1 ${activeTab === "calls" ? "text-indigo-600 font-bold" : "text-zinc-500"}`}
          >
            <Phone className="w-4 h-4" />
            <span>Calls</span>
          </button>
          <button
            onClick={() => onTabChange("chats")}
            className={`flex flex-col items-center gap-1 ${activeTab === "chats" ? "text-indigo-600 font-bold" : "text-zinc-500"}`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chats</span>
          </button>
          <button
            onClick={() => onTabChange("group")}
            className={`flex flex-col items-center gap-1 ${activeTab === "group" ? "text-indigo-600 font-bold" : "text-zinc-500"}`}
          >
            <Users className="w-4 h-4" />
            <span>Rooms</span>
          </button>
          <button
            onClick={() => onTabChange("settings")}
            className={`flex flex-col items-center gap-1 ${activeTab === "settings" ? "text-indigo-600 font-bold" : "text-zinc-500"}`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      )}
    </header>
  );
};
