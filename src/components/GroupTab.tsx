import React, { useState, useEffect } from "react";
import { UserProfile, GroupRoom } from "../types";
import { getSocket } from "../services/socket";
import { getLanguageByName, SUPPORTED_LANGUAGES } from "../constants/languages";
import { speakText } from "../services/audio";
import { Users, Plus, Key, Copy, Check, MessageSquare, Volume2, Send, PhoneCall } from "lucide-react";

interface GroupTabProps {
  currentUser: UserProfile;
  onStartGroupCall: (room: GroupRoom) => void;
}

export const GroupTab: React.FC<GroupTabProps> = ({ currentUser, onStartGroupCall }) => {
  const socket = getSocket();
  const [activeRoom, setActiveRoom] = useState<GroupRoom | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomNameInput, setRoomNameInput] = useState("");
  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const [groupInput, setGroupInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [myHearingLang, setMyHearingLang] = useState(currentUser.hearLanguage || "English");

  useEffect(() => {
    const handleRoomCreated = (room: GroupRoom) => {
      setActiveRoom(room);
      setErrorMsg("");
    };

    const handleRoomJoined = (data: { room: GroupRoom; members: string[] }) => {
      setActiveRoom(data.room);
      setErrorMsg("");
    };

    const handleUserJoined = (data: { username: string; room: GroupRoom }) => {
      setActiveRoom(data.room);
    };

    const handleGroupMsg = (msg: any) => {
      setGroupMessages((prev) => [...prev, msg]);
    };

    const handleRoomError = (data: { message: string }) => {
      setErrorMsg(data.message);
    };

    socket.on("room:created", handleRoomCreated);
    socket.on("room:joined", handleRoomJoined);
    socket.on("room:user-joined", handleUserJoined);
    socket.on("room:message", handleGroupMsg);
    socket.on("room:error", handleRoomError);

    return () => {
      socket.off("room:created", handleRoomCreated);
      socket.off("room:joined", handleRoomJoined);
      socket.off("room:user-joined", handleUserJoined);
      socket.off("room:message", handleGroupMsg);
      socket.off("room:error", handleRoomError);
    };
  }, []);

  const handleCreateRoom = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const name = roomNameInput.trim() || `LinguaCall Room ${code}`;
    socket.emit("room:create", {
      roomId: code,
      roomName: name,
      username: currentUser.username,
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length < 4) {
      setErrorMsg("Please enter a valid room code.");
      return;
    }
    socket.emit("room:join", {
      roomId: code,
      username: currentUser.username,
    });
  };

  const handleCopyCode = () => {
    if (!activeRoom) return;
    navigator.clipboard.writeText(activeRoom.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendGroupMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupInput.trim() || !activeRoom) return;

    socket.emit("room:message", {
      roomId: activeRoom.id,
      message: groupInput.trim(),
      fromUsername: currentUser.username,
      sourceLang: currentUser.myLanguage,
      targetLang: myHearingLang,
    });
    setGroupInput("");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header card */}
      <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 border border-indigo-200 rounded-full text-xs font-bold text-indigo-700 mb-2 uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" />
              <span>Multiplayer Multilingual Rooms</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Group Call & Chat Rooms</h2>
            <p className="text-xs text-zinc-500 font-medium mt-1 max-w-xl">
              Create a shared room or join via a 6-character code. Every member speaks in their own language and hears in their preferred translation.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-zinc-50 p-2 rounded-xl border border-zinc-200">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Hear in:</span>
            <select
              value={myHearingLang}
              onChange={(e) => setMyHearingLang(e.target.value)}
              className="bg-white border border-zinc-200 text-zinc-900 text-xs px-3 py-1.5 rounded-lg outline-none focus:border-indigo-600 font-semibold cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={`grp_lang_${l.code}`} value={l.name}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!activeRoom ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Room */}
          <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 sm:p-8 flex flex-col justify-between shadow-sm">
            <div>
              <div className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Host Node</div>
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Create New Room</span>
              </h3>
              <p className="text-xs text-zinc-500 font-medium mb-4">
                Generates a unique 6-character code you can share with team members or friends.
              </p>

              <input
                id="group-room-name-input"
                type="text"
                placeholder="Room Name (optional, e.g. Global Team Standup)"
                value={roomNameInput}
                onChange={(e) => setRoomNameInput(e.target.value)}
                className="w-full bg-zinc-50 border-2 border-zinc-200 text-zinc-900 px-4 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-600 focus:bg-white mb-4 transition-all font-medium placeholder:text-zinc-400"
              />
            </div>

            <button
              id="group-create-room-btn"
              onClick={handleCreateRoom}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm border border-indigo-700 cursor-pointer"
            >
              + Generate Room
            </button>
          </div>

          {/* Join Room */}
          <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 sm:p-8 flex flex-col justify-between shadow-sm">
            <div>
              <div className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Guest Node</div>
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-emerald-600" />
                <span>Join Existing Room</span>
              </h3>
              <p className="text-xs text-zinc-500 font-medium mb-4">
                Enter the 6-character room code shared by your host.
              </p>

              <form onSubmit={handleJoinRoom} className="space-y-4">
                <input
                  id="group-room-code-input"
                  type="text"
                  placeholder="e.g. 8K2L9A"
                  maxLength={6}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-50 border-2 border-zinc-200 text-zinc-900 px-4 py-2.5 rounded-xl text-xs tracking-widest uppercase font-mono font-bold outline-none focus:border-emerald-600 focus:bg-white transition-all placeholder:text-zinc-400"
                />

                {errorMsg && <p className="text-xs text-rose-600 font-semibold">{errorMsg}</p>}

                <button
                  id="group-join-room-btn"
                  type="submit"
                  disabled={roomCodeInput.trim().length < 4}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm border border-emerald-700 cursor-pointer"
                >
                  Join Room
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* Active Room View */
        <div className="bg-white border-2 border-zinc-200 rounded-[2rem] p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Active Room Top Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b-2 border-zinc-100">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-bold text-zinc-900">{activeRoom.name}</h3>
                <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                  {activeRoom.id}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-1">
                Host: @{activeRoom.host} · {activeRoom.members.length} member(s) joined
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-zinc-200 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied Code" : "Copy Room Code"}</span>
              </button>

              <button
                onClick={() => onStartGroupCall(activeRoom)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm border border-emerald-700 transition-all cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Start Group Audio Call</span>
              </button>
            </div>
          </div>

          {/* Members list */}
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Room Participants:</span>
            <div className="flex flex-wrap gap-2">
              {activeRoom.members.map((m) => (
                <div
                  key={m}
                  className="px-3.5 py-2 bg-zinc-50 border-2 border-zinc-200 rounded-xl text-xs text-zinc-800 flex items-center gap-2 font-medium"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-bold">@{m}</span>
                  {m === currentUser.username && (
                    <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">(You)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Group Chat Section */}
          <div className="bg-zinc-50 border-2 border-zinc-200 rounded-2xl p-4 flex flex-col h-80">
            <div className="text-xs font-bold text-zinc-800 border-b-2 border-zinc-200 pb-2.5 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                <span>Group Live Translated Chat</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Auto-translated to {myHearingLang}</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 mb-2 pr-1">
              {groupMessages.length === 0 ? (
                <div className="text-center text-xs text-zinc-400 font-medium py-12">
                  No messages yet. Say hi to the room!
                </div>
              ) : (
                groupMessages.map((m) => (
                  <div key={m.id} className="text-xs p-3 rounded-xl bg-white border border-zinc-200 shadow-xs">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                      <span className="font-bold text-indigo-600">@{m.fromUsername}</span>
                      <span className="font-mono">{new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="text-zinc-900 font-medium">{m.message}</div>
                    {m.translated && m.translated !== m.message && (
                      <div className="text-[11px] text-emerald-700 font-medium italic mt-1 flex items-center justify-between pt-1 border-t border-zinc-100">
                        <span>"{m.translated}"</span>
                        <button
                          onClick={() => speakText(m.translated, myHearingLang)}
                          className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendGroupMessage} className="flex gap-2">
              <input
                id="group-chat-input"
                type="text"
                placeholder={`Type in ${currentUser.myLanguage}...`}
                value={groupInput}
                onChange={(e) => setGroupInput(e.target.value)}
                className="flex-1 bg-white border-2 border-zinc-200 text-zinc-900 px-3.5 py-2 rounded-xl text-xs outline-none focus:border-indigo-600 font-medium placeholder:text-zinc-400"
              />
              <button
                id="group-chat-send-btn"
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer border border-indigo-700 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
