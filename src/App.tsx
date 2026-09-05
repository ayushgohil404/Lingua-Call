import React, { useState, useEffect } from "react";
import { UserProfile } from "./types";
import { getSocket } from "./services/socket";
import { AuthModal } from "./components/AuthModal";
import { UsernameSetup } from "./components/UsernameSetup";
import { ActiveCallModal } from "./components/ActiveCallModal";
import { IncomingCallDialog } from "./components/IncomingCallDialog";
import { LinguaCallLayout } from "./components/LinguaCallLayout";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem("linguacall_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isSettingUpUsername, setIsSettingUpUsername] = useState<boolean>(false);
  const [tempAuthUser, setTempAuthUser] = useState<Partial<UserProfile> | null>(null);

  const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);

  // Calling states
  const [activeCall, setActiveCall] = useState<{
    targetUser: UserProfile;
    role: "caller" | "receiver" | "group";
    myLanguage: string;
    hearLanguage: string;
    callerSocketId?: string;
    incomingOffer?: any;
  } | null>(null);

  const [incomingCall, setIncomingCall] = useState<any | null>(null);

  // Setup socket connection
  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      setSocketConnected(true);
      if (user) {
        socket.emit("user:online", user);
      }
      socket.emit("users:get");
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleUsersUpdate = (list: UserProfile[]) => {
      setOnlineUsers(list);
    };

    const handleIncomingCall = (data: any) => {
      // Show incoming call modal
      setIncomingCall(data);
    };

    const handleCallEnded = () => {
      setIncomingCall(null);
      setActiveCall(null);
    };

    const handleCallRejected = () => {
      setIncomingCall(null);
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("users:update", handleUsersUpdate);
    socket.on("users:list", handleUsersUpdate);
    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:rejected", handleCallRejected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("users:update", handleUsersUpdate);
      socket.off("users:list", handleUsersUpdate);
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:rejected", handleCallRejected);
    };
  }, [user]);

  // Handle successful sign in from AuthModal
  const handleSignInSuccess = (partial: Partial<UserProfile>) => {
    if (partial.username) {
      // Complete user
      const fullProfile: UserProfile = {
        userId: partial.userId || `user_${Date.now()}`,
        username: partial.username,
        name: partial.name || partial.username,
        email: partial.email,
        picture: partial.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${partial.username}`,
        myLanguage: partial.myLanguage || "Hindi",
        hearLanguage: partial.hearLanguage || "English",
        online: true,
        lastActive: Date.now(),
      };
      saveUser(fullProfile);
    } else {
      // Needs username selection
      setTempAuthUser(partial);
      setIsSettingUpUsername(true);
    }
  };

  const handleUsernameSetupComplete = (completedProfile: UserProfile) => {
    saveUser(completedProfile);
    setIsSettingUpUsername(false);
    setTempAuthUser(null);
  };

  const saveUser = (u: UserProfile) => {
    setUser(u);
    try {
      localStorage.setItem("linguacall_user", JSON.stringify(u));
    } catch {}
    const socket = getSocket();
    socket.emit("user:online", u);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("linguacall_user");
    } catch {}
    setUser(null);
    setIsSettingUpUsername(false);
    setTempAuthUser(null);
    setActiveCall(null);
    setIncomingCall(null);
  };

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    if (!user) return;
    const merged = { ...user, ...updated };
    saveUser(merged);
  };

  // Start 1-to-1 Call
  const handleStartCall = (targetUser: UserProfile, myLang: string, hearLang: string) => {
    setActiveCall({
      targetUser,
      role: "caller",
      myLanguage: myLang,
      hearLanguage: hearLang,
    });
  };

  // Accept incoming call
  const handleAcceptIncomingCall = (chosenHearLang: string) => {
    if (!incomingCall || !user) return;

    const callerProfile: UserProfile = {
      userId: incomingCall.callerSocketId,
      username: incomingCall.callerUsername,
      name: incomingCall.callerName || incomingCall.callerUsername,
      picture:
        incomingCall.callerPicture ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${incomingCall.callerUsername}`,
      myLanguage: incomingCall.callerLanguage || "English",
      hearLanguage: chosenHearLang,
      online: true,
      socketId: incomingCall.callerSocketId,
      lastActive: Date.now(),
    };

    setActiveCall({
      targetUser: callerProfile,
      role: "receiver",
      myLanguage: user.myLanguage,
      hearLanguage: chosenHearLang,
      callerSocketId: incomingCall.callerSocketId,
      incomingOffer: incomingCall.offer,
    });

    setIncomingCall(null);
  };

  const handleRejectIncomingCall = () => {
    if (incomingCall) {
      const socket = getSocket();
      socket.emit("call:reject", {
        callerSocketId: incomingCall.callerSocketId,
        reason: "Call declined",
      });
      setIncomingCall(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#eae6df] text-[#111b21] flex flex-col font-sans selection:bg-[#00a884] selection:text-white antialiased">
      {!user ? (
        <main className="flex-1 flex items-center justify-center p-4">
          {isSettingUpUsername && tempAuthUser ? (
            <UsernameSetup
              initialUser={tempAuthUser}
              onComplete={handleUsernameSetupComplete}
            />
          ) : (
            <AuthModal onSignInSuccess={handleSignInSuccess} />
          )}
        </main>
      ) : (
        <LinguaCallLayout
          currentUser={user}
          onlineUsers={onlineUsers}
          socketConnected={socketConnected}
          onStartCall={handleStartCall}
          onUpdateProfile={handleUpdateProfile}
          onLogout={handleLogout}
        />
      )}

      {/* Incoming Call Notification Dialog */}
      {incomingCall && user && (
        <IncomingCallDialog
          incomingCall={incomingCall}
          defaultHearLanguage={user.hearLanguage || "English"}
          onAccept={handleAcceptIncomingCall}
          onReject={handleRejectIncomingCall}
        />
      )}

      {/* Active Call Modal Screen */}
      {activeCall && user && (
        <ActiveCallModal
          currentUser={user}
          targetUser={activeCall.targetUser}
          role={activeCall.role}
          myLanguage={activeCall.myLanguage}
          hearLanguage={activeCall.hearLanguage}
          callerSocketId={activeCall.callerSocketId}
          incomingOffer={activeCall.incomingOffer}
          onEndCall={() => setActiveCall(null)}
        />
      )}
    </div>
  );
}
