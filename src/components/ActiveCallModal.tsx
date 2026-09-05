import React, { useEffect, useRef, useState } from "react";
import { UserProfile, LiveTranscriptItem } from "../types";
import { getLanguageByName, SUPPORTED_LANGUAGES } from "../constants/languages";
import { getSocket } from "../services/socket";
import { speakText, playConnectedChime, playEndCallChime, getAudioContext } from "../services/audio";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Subtitles,
} from "lucide-react";

interface ActiveCallModalProps {
  currentUser: UserProfile;
  targetUser: UserProfile;
  role: "caller" | "receiver" | "group";
  myLanguage: string;
  hearLanguage: string;
  callerSocketId?: string;
  incomingOffer?: any;
  onEndCall: () => void;
}

const LANG_CODE_MAP: Record<string, string> = {
  hindi: "hi-IN",
  english: "en-US",
  spanish: "es-ES",
  french: "fr-FR",
  german: "de-DE",
  japanese: "ja-JP",
  chinese: "zh-CN",
  arabic: "ar-SA",
  telugu: "te-IN",
  tamil: "ta-IN",
  bengali: "bn-IN",
  marathi: "mr-IN",
  punjabi: "pa-IN",
  gujarati: "gu-IN",
  russian: "ru-RU",
  portuguese: "pt-BR",
  italian: "it-IT",
  korean: "ko-KR",
  turkish: "tr-TR",
  dutch: "nl-NL",
};

export const ActiveCallModal: React.FC<ActiveCallModalProps> = ({
  currentUser,
  targetUser,
  role,
  myLanguage: initialMyLang,
  hearLanguage: initialHearLang,
  callerSocketId,
  incomingOffer,
  onEndCall,
}) => {
  const socket = getSocket();

  const [myLang, setMyLang] = useState(initialMyLang || currentUser.myLanguage);
  const [hearLang, setHearLang] = useState(initialHearLang || currentUser.hearLanguage);

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [callStatus, setCallStatus] = useState<string>("Connecting call...");
  const [isConnected, setIsConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const [isSelfSpeaking, setIsSelfSpeaking] = useState(false);
  const [isRemoteSpeaking, setIsRemoteSpeaking] = useState(false);
  const [transcripts, setTranscripts] = useState<LiveTranscriptItem[]>([]);

  // WebRTC refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteSocketIdRef = useRef<string | null>(callerSocketId || targetUser.socketId || null);
  const timerIntervalRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  const myLangObj = getLanguageByName(myLang);
  const hearLangObj = getLanguageByName(hearLang);

  // Call timer
  useEffect(() => {
    if (isConnected) {
      timerIntervalRef.current = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isConnected]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // WebRTC Connection Setup
  useEffect(() => {
    let active = true;

    async function initCall() {
      try {
        // Request Microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        localStreamRef.current = stream;

        // Audio volume meter for speech ring animation
        try {
          const ctx = getAudioContext();
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkVolume = () => {
            if (!active) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            setIsSelfSpeaking(avg > 18);
            animFrameRef.current = requestAnimationFrame(checkVolume);
          };
          checkVolume();
        } catch {}

        // WebRTC PeerConnection
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });
        pcRef.current = pc;

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        pc.ontrack = (event) => {
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch(() => {});
          }
        };

        pc.onicecandidate = (e) => {
          if (e.candidate && remoteSocketIdRef.current) {
            socket.emit("ice:candidate", {
              targetSocketId: remoteSocketIdRef.current,
              candidate: e.candidate,
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            setCallStatus("Connected · AI Interpreting");
            setIsConnected(true);
            playConnectedChime();
          } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            setCallStatus("Call disconnected");
          }
        };

        // Start call as Caller or Answer as Receiver
        if (role === "caller") {
          setCallStatus(`Calling @${targetUser.username}...`);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit("call:start", {
            targetUsername: targetUser.username,
            callerUsername: currentUser.username,
            callerName: currentUser.name,
            callerPicture: currentUser.picture,
            callerLanguage: myLang,
            hearLanguage: hearLang,
            offer,
          });

          // Timeout if no answer in 30s
          setTimeout(() => {
            if (!isConnected && active) {
              setCallStatus("No answer. User might be away.");
              setTimeout(onEndCall, 2500);
            }
          }, 30000);
        } else if (role === "receiver") {
          setCallStatus("Connecting audio...");
          if (incomingOffer) {
            await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit("call:answer", {
              callerSocketId: callerSocketId,
              answer,
              receiverLanguage: hearLang,
              receiverUsername: currentUser.username,
              receiverName: currentUser.name,
              receiverPicture: currentUser.picture,
            });

            setIsConnected(true);
            setCallStatus("Connected · AI Interpreting");
            playConnectedChime();
          }
        } else {
          // Demo AI contact
          setIsConnected(true);
          setCallStatus("Connected · AI Interpreting");
          playConnectedChime();
        }

        // Initialize Low-Quota Native Speech Recognition
        startSpeechRecognition();
      } catch (err: any) {
        console.error("Init call error:", err);
        setCallStatus(`Mic error: ${err.message || "Permission required"}`);
      }
    }

    // Native Browser Speech Recognition (0 API calls, unlimited usage)
    function startSpeechRecognition() {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognitionClass) {
        console.info("Web Speech Recognition not supported in this browser. Falling back to text/audio.");
        return;
      }

      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = false;
        const code = LANG_CODE_MAP[myLang.toLowerCase()] || "en-US";
        recognition.lang = code;
        recognitionRef.current = recognition;

        let lastTranscript = "";

        recognition.onresult = (event: any) => {
          if (!active) return;
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const text = event.results[i][0].transcript.trim();
              if (text && text !== lastTranscript) {
                lastTranscript = text;

                // Send sentence for translation (1 sentence = 1 translation, perfectly within 15 RPM!)
                socket.emit("call:speech_text", {
                  text,
                  sourceLang: myLang,
                  targetLang: hearLang,
                  targetSocketId: remoteSocketIdRef.current,
                  fromUsername: currentUser.username,
                });

                // Trigger AI partner reply if calling a demo user
                if (targetUser.userId?.startsWith("demo_")) {
                  triggerAiDemoResponse(text);
                }
              }
            }
          }
        };

        recognition.onerror = () => {
          // Keep silent and recover
        };

        recognition.onend = () => {
          if (active && !isMuted) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognition.start();
      } catch (e) {
        console.warn("Speech recognition initialization note:", e);
      }
    }

    initCall();

    // Socket Event Listeners
    const handleCallAnswered = async (data: any) => {
      if (pcRef.current && data.answer) {
        remoteSocketIdRef.current = data.answererSocketId;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setIsConnected(true);
        setCallStatus("Connected · AI Interpreting");
        playConnectedChime();
      }
    };

    const handleIceCandidate = async (data: any) => {
      if (pcRef.current && data.candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch {}
      }
    };

    const handleCallEnded = () => {
      setCallStatus("Call ended");
      playEndCallChime();
      setTimeout(onEndCall, 1200);
    };

    const handleCallRejected = (data: any) => {
      setCallStatus(data?.reason || "Call declined");
      playEndCallChime();
      setTimeout(onEndCall, 2000);
    };

    // My translated transcript
    const handleMyTranscript = (data: any) => {
      setTranscripts((prev) => [
        ...prev.slice(-10),
        {
          id: `tr_self_${Date.now()}`,
          speaker: "You",
          originalText: data.original,
          translatedText: data.translated,
          sourceLang: data.sourceLang,
          targetLang: data.targetLang,
          timestamp: data.timestamp || Date.now(),
          isSelf: true,
        },
      ]);
    };

    // Incoming transcript from other caller
    const handleIncomingTranscript = (data: any) => {
      setTranscripts((prev) => [
        ...prev.slice(-10),
        {
          id: `tr_${Date.now()}_${Math.random()}`,
          speaker: data.fromUsername || targetUser.name || targetUser.username,
          originalText: data.original,
          translatedText: data.translated,
          sourceLang: data.sourceLang,
          targetLang: data.targetLang,
          timestamp: data.timestamp || Date.now(),
          isSelf: false,
        },
      ]);

      setIsRemoteSpeaking(true);
      setTimeout(() => setIsRemoteSpeaking(false), 2200);

      // Play translated audio via free Web Speech Synthesis (0 API requests)
      if (!isSpeakerMuted && data.translated) {
        speakText(data.translated, hearLang);
      }
    };

    socket.on("call:answered", handleCallAnswered);
    socket.on("ice:candidate", handleIceCandidate);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:rejected", handleCallRejected);
    socket.on("call:my_transcript", handleMyTranscript);
    socket.on("call:transcript", handleIncomingTranscript);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }

      socket.off("call:answered", handleCallAnswered);
      socket.off("ice:candidate", handleIceCandidate);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:rejected", handleCallRejected);
      socket.off("call:my_transcript", handleMyTranscript);
      socket.off("call:transcript", handleIncomingTranscript);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  // Demo user AI responder
  const triggerAiDemoResponse = async (spokenText: string) => {
    setTimeout(async () => {
      try {
        setIsRemoteSpeaking(true);
        const res = await fetch("/api/translate-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `Reply in 1 sentence to: "${spokenText}"`,
            sourceLang: "English",
            targetLang: myLang,
          }),
        });
        const data = await res.json();
        const reply = data.translatedText || "I understand and hear you clearly!";

        setTranscripts((prev) => [
          ...prev.slice(-10),
          {
            id: `demo_${Date.now()}`,
            speaker: targetUser.name,
            originalText: `Response`,
            translatedText: reply,
            sourceLang: targetUser.myLanguage,
            targetLang: myLang,
            timestamp: Date.now(),
            isSelf: false,
          },
        ]);

        if (!isSpeakerMuted) {
          speakText(reply, myLang);
        }
        setTimeout(() => setIsRemoteSpeaking(false), 2200);
      } catch {}
    }, 1200);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerMuted;
    }
    setIsSpeakerMuted(!isSpeakerMuted);
  };

  const handleEndCall = () => {
    playEndCallChime();
    socket.emit("call:end", { otherSocketId: remoteSocketIdRef.current });
    onEndCall();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 flex flex-col shadow-2xl border border-zinc-200 relative text-zinc-900">
        {/* Hidden Remote Audio */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Minimalist Header */}
        <div className="flex items-center justify-between pb-6 border-b border-zinc-100">
          <div>
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">LinguaCall Live</div>
            <div className="text-sm font-bold text-zinc-800 flex items-center gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span>{callStatus}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono font-bold bg-zinc-100 px-3 py-1.5 rounded-full text-zinc-700">
              {formatTimer(callDuration)}
            </span>
          </div>
        </div>

        {/* Minimalist Participants Section */}
        <div className="py-8 flex items-center justify-around">
          {/* Self */}
          <div className="flex flex-col items-center gap-2.5">
            <div
              className={`relative w-24 h-24 rounded-full p-0.5 transition-all duration-300 ${
                isSelfSpeaking ? "ring-4 ring-indigo-500 scale-105" : "ring-1 ring-zinc-200"
              }`}
            >
              <img
                src={currentUser.picture}
                alt={currentUser.name}
                className="w-full h-full rounded-full object-cover bg-zinc-100"
              />
              {isMuted && (
                <div className="absolute bottom-0 right-0 p-1.5 bg-rose-600 rounded-full text-white shadow-xs">
                  <MicOff className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-zinc-900">You</div>
              <div className="text-[11px] text-zinc-500 font-medium">
                {myLangObj.flag} {myLangObj.name}
              </div>
            </div>
          </div>

          {/* Simple divider arrow */}
          <div className="text-zinc-300 font-bold text-sm">➔</div>

          {/* Remote */}
          <div className="flex flex-col items-center gap-2.5">
            <div
              className={`relative w-24 h-24 rounded-full p-0.5 transition-all duration-300 ${
                isRemoteSpeaking ? "ring-4 ring-emerald-500 scale-105" : "ring-1 ring-zinc-200"
              }`}
            >
              <img
                src={targetUser.picture}
                alt={targetUser.name}
                className="w-full h-full rounded-full object-cover bg-zinc-100"
              />
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-zinc-900">{targetUser.name || `@${targetUser.username}`}</div>
              <div className="text-[11px] text-zinc-500 font-medium">
                {hearLangObj.flag} {hearLangObj.name}
              </div>
            </div>
          </div>
        </div>

        {/* Minimal Live Subtitle Stream */}
        {showSubtitles && (
          <div className="bg-zinc-50 rounded-2xl p-3.5 border border-zinc-200 min-h-[90px] max-h-[140px] overflow-y-auto flex flex-col gap-2 mb-6">
            {transcripts.length === 0 ? (
              <div className="text-center py-4 text-xs text-zinc-400 italic">
                Speak normally. Your speech will be translated live without hitting AI rate limits...
              </div>
            ) : (
              transcripts.map((t) => (
                <div
                  key={t.id}
                  className={`text-xs p-2 rounded-xl ${
                    t.isSelf ? "bg-white border border-zinc-200 text-zinc-900" : "bg-indigo-50/70 border border-indigo-100 text-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold mb-0.5">
                    <span>{t.speaker}</span>
                    <span className="uppercase">{t.targetLang}</span>
                  </div>
                  <div className="font-semibold text-zinc-900">{t.translatedText}</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Minimal Controls Dock */}
        <div className="flex items-center justify-center gap-3 pt-2">
          {/* Mute */}
          <button
            id="call-mute-toggle-btn"
            onClick={toggleMute}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
            className={`p-3.5 rounded-full border transition-all cursor-pointer ${
              isMuted ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200"
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Speaker */}
          <button
            id="call-speaker-toggle-btn"
            onClick={toggleSpeaker}
            title={isSpeakerMuted ? "Unmute Speaker" : "Mute Speaker"}
            className={`p-3.5 rounded-full border transition-all cursor-pointer ${
              isSpeakerMuted ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200"
            }`}
          >
            {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* Subtitles */}
          <button
            id="call-subtitles-toggle-btn"
            onClick={() => setShowSubtitles(!showSubtitles)}
            title="Toggle Subtitles"
            className={`p-3.5 rounded-full border transition-all cursor-pointer ${
              showSubtitles ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-zinc-100 text-zinc-400 border-zinc-200"
            }`}
          >
            <Subtitles className="w-5 h-5" />
          </button>

          {/* End Call */}
          <button
            id="call-end-call-btn"
            onClick={handleEndCall}
            title="End Call"
            className="p-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all shadow-sm cursor-pointer ml-2"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
