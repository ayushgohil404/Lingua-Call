import React, { useState } from "react";
import { UserProfile } from "../types";
import { SUPPORTED_LANGUAGES, getLanguageByName } from "../constants/languages";
import { Search, Phone, MessageSquare } from "lucide-react";

interface CallsTabProps {
  currentUser: UserProfile;
  onlineUsers: UserProfile[];
  onStartCall: (targetUser: UserProfile, myLang: string, hearLang: string) => void;
  onOpenChat: (targetUser: UserProfile) => void;
}

export const CallsTab: React.FC<CallsTabProps> = ({
  currentUser,
  onlineUsers,
  onStartCall,
  onOpenChat,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedUser, setSearchedUser] = useState<UserProfile | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [myLang, setMyLang] = useState(currentUser.myLanguage || "Hindi");
  const [hearLang, setHearLang] = useState(currentUser.hearLanguage || "English");

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    setIsSearching(true);
    setSearchError("");
    setSearchedUser(null);

    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const users: UserProfile[] = data.users || [];
      const found = users.find(
        (u) => u.username.toLowerCase() === query || u.name.toLowerCase().includes(query)
      );

      if (found) {
        setSearchedUser(found);
      } else {
        setSearchError(`User "@${query}" not found.`);
      }
    } catch {
      setSearchError("Failed to find user.");
    } finally {
      setIsSearching(false);
    }
  };

  const otherUsers = onlineUsers.filter(
    (u) => u.username.toLowerCase() !== currentUser.username.toLowerCase()
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Minimalist Language Configuration Bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-900">Translation Languages</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time translation during calls and messages
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:flex-initial">
            <span className="block text-[10px] text-zinc-400 font-semibold uppercase mb-1">
              You Speak
            </span>
            <select
              id="calls-my-language-select"
              value={myLang}
              onChange={(e) => setMyLang(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs px-3 py-2 rounded-xl outline-none focus:border-zinc-400 font-medium cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={`my_lang_${l.code}`} value={l.name}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-zinc-300 font-bold self-end pb-2">➔</div>

          <div className="flex-1 sm:flex-initial">
            <span className="block text-[10px] text-zinc-400 font-semibold uppercase mb-1">
              You Hear
            </span>
            <select
              id="calls-hear-language-select"
              value={hearLang}
              onChange={(e) => setHearLang(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs px-3 py-2 rounded-xl outline-none focus:border-zinc-400 font-medium cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={`hear_lang_${l.code}`} value={l.name}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Minimalist Search Bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            <input
              id="search-user-input"
              type="text"
              placeholder="Search user by username (e.g. elena_es, rahul_hi, kenji_ja)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 pl-10 pr-4 py-2 rounded-xl text-xs outline-none focus:border-zinc-400 focus:bg-white transition-colors"
            />
          </div>
          <button
            id="search-user-btn"
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            {isSearching ? "Searching..." : "Find"}
          </button>
        </form>

        {searchError && (
          <p className="text-xs text-rose-600 font-medium mt-2 pl-1">{searchError}</p>
        )}

        {/* Found User Result */}
        {searchedUser && (
          <div className="mt-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={searchedUser.picture}
                alt={searchedUser.name}
                className="w-10 h-10 rounded-full object-cover border border-zinc-200"
              />
              <div>
                <div className="text-xs font-bold text-zinc-900">{searchedUser.name}</div>
                <div className="text-[11px] text-zinc-500">
                  @{searchedUser.username} · Speaks {getLanguageByName(searchedUser.myLanguage).flag} {searchedUser.myLanguage}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenChat(searchedUser)}
                className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
                title="Message"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                id="search-result-call-btn"
                onClick={() => onStartCall(searchedUser, myLang, hearLang)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Available Contacts */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Contacts & Partners ({otherUsers.length})
          </h3>
          <span className="text-[11px] text-zinc-400 font-medium">Free Live Translation</span>
        </div>

        <div className="divide-y divide-zinc-100">
          {otherUsers.map((user) => {
            const userLang = getLanguageByName(user.myLanguage);
            return (
              <div
                key={user.username}
                className="py-3.5 flex items-center justify-between first:pt-1 last:pb-1"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover border border-zinc-200 bg-zinc-100"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-zinc-900">{user.name}</div>
                    <div className="text-[11px] text-zinc-400">
                      @{user.username} · Speaks {userLang.flag} {userLang.name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onOpenChat(user)}
                    className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                    title="Send Message"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onStartCall(user, myLang, hearLang)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
