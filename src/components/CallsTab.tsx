import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { SUPPORTED_LANGUAGES, getLanguageByName } from "../constants/languages";
import { Search, Phone, MessageSquare, Sparkles, UserCheck, Radio, Shield, Globe } from "lucide-react";

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
  const [targetUsername, setTargetUsername] = useState("");
  const [searchedUser, setSearchedUser] = useState<UserProfile | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [myLang, setMyLang] = useState(currentUser.myLanguage || "Hindi");
  const [hearLang, setHearLang] = useState(currentUser.hearLanguage || "English");

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = (searchQuery || targetUsername).trim().toLowerCase();
    if (!query) return;

    setIsSearching(true);
    setSearchError("");
    setSearchedUser(null);

    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const users: UserProfile[] = data.users || [];
      const found = users.find((u) => u.username.toLowerCase() === query || u.name.toLowerCase().includes(query));

      if (found) {
        setSearchedUser(found);
      } else {
        setSearchError(`User "@${query}" not found. Try one of the online users below!`);
      }
    } catch {
      setSearchError("Failed to search user.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartDirectCall = (user: UserProfile) => {
    onStartCall(user, myLang, hearLang);
  };

  const myLangObj = getLanguageByName(myLang);
  const hearLangObj = getLanguageByName(hearLang);

  // Filter online users excluding current user
  const otherUsers = onlineUsers.filter(
    (u) => u.username.toLowerCase() !== currentUser.username.toLowerCase()
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Bento Hero Card */}
      <div className="bg-zinc-900 border-2 border-zinc-800 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden text-white shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-xs font-bold text-indigo-300 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Voice AI Live Node</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Instant Multilingual Voice Calls
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl font-medium">
              Select who to call. You speak in {myLangObj.flag} {myLangObj.name}, and they will hear you in their chosen language in real-time.
            </p>
          </div>

          {/* Quick Call Setup Bar */}
          <div className="flex flex-wrap items-center gap-2.5 bg-zinc-950/80 p-3 rounded-2xl border-2 border-zinc-800">
            <div>
              <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">I speak:</span>
              <select
                id="calls-my-language-select"
                value={myLang}
                onChange={(e) => setMyLang(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 text-white text-xs px-3 py-2 rounded-xl outline-none focus:border-indigo-500 font-semibold cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={`my_call_${l.code}`} value={l.name}>
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-indigo-400 font-bold self-end pb-2.5">➔</div>

            <div>
              <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">I hear:</span>
              <select
                id="calls-hear-language-select"
                value={hearLang}
                onChange={(e) => setHearLang(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 text-white text-xs px-3 py-2 rounded-xl outline-none focus:border-indigo-500 font-semibold cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={`hear_call_${l.code}`} value={l.name}>
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Search Card */}
      <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 shadow-sm">
        <div className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3">Directory & Search</div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-3.5" />
            <input
              id="search-user-input"
              type="text"
              placeholder="Search user by @username (e.g. elena_es, rahul_hi, kenji_ja)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border-2 border-zinc-200 text-zinc-900 pl-11 pr-4 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-600 focus:bg-white transition-all font-medium placeholder:text-zinc-400"
            />
          </div>
          <button
            id="search-user-btn"
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all border border-indigo-700 shadow-sm cursor-pointer"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </form>

        {searchError && (
          <p className="text-xs text-rose-600 font-semibold mt-2.5 pl-1">{searchError}</p>
        )}

        {/* Search Result Card */}
        {searchedUser && (
          <div className="mt-4 p-4 bg-zinc-50 rounded-2xl border-2 border-indigo-200 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-3.5">
              <img
                src={searchedUser.picture}
                alt={searchedUser.name}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-zinc-300 bg-zinc-200"
              />
              <div>
                <div className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <span>{searchedUser.name}</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold uppercase tracking-wider">
                    Speaks {getLanguageByName(searchedUser.myLanguage).flag} {searchedUser.myLanguage}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 font-medium">@{searchedUser.username}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenChat(searchedUser)}
                className="p-2.5 bg-white hover:bg-zinc-100 text-zinc-700 border-2 border-zinc-200 rounded-xl text-xs transition-colors cursor-pointer"
                title="Send Message"
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              <button
                id="search-result-call-btn"
                onClick={() => handleStartDirectCall(searchedUser)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm border border-emerald-700 transition-colors cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Now</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Online Users Bento Section */}
      <div>
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-zinc-900">Available Users & AI Partners</h3>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
              {otherUsers.length} Online
            </span>
          </div>
          <span className="text-xs text-zinc-500 font-medium">Instant connection ready</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {otherUsers.map((user) => {
            const userLang = getLanguageByName(user.myLanguage);
            return (
              <div
                key={user.username}
                className="p-5 bg-white hover:bg-zinc-50/80 border-2 border-zinc-200 hover:border-zinc-300 rounded-[2rem] flex items-center justify-between transition-all group shadow-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative">
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-zinc-200 bg-zinc-100"
                    />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-zinc-900 group-hover:text-indigo-600 truncate">
                      {user.name}
                    </div>
                    <div className="text-xs text-zinc-400 font-medium truncate">
                      @{user.username}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-medium flex items-center gap-1.5 mt-0.5">
                      <span>Speaks:</span>
                      <span className="font-bold text-indigo-600">
                        {userLang.flag} {userLang.name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenChat(user)}
                    className="p-2.5 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent hover:border-zinc-200 transition-all cursor-pointer"
                    title="Chat"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleStartDirectCall(user)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm border border-emerald-700 transition-all cursor-pointer"
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
