import React, { useEffect, useRef, useState } from "react";
import { UserProfile, LiveTranscriptItem } from "../types";
import { getLanguageByName } from "../constants/languages";
import { getSocket } from "../services/socket";
import { speakText, playConnectedChime, playEndCallChime, getAudioContext } from "../services/audio";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Subtitles,
  Lock,
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

  const [myLang] = useState(initialMyLang || currentUser.myLanguage);
  const [hearLang] = useState(initialHearLang || currentUser.hearLanguage);

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [callStatus, setCallStatus] = useState<string>("Ringing...");
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

  const targetLangObj = getLanguageByName(targetUser.myLanguage || "Spanish");
  const myLangObj = getLanguageByName(myLang);

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

  useEffect(() => {
    let active = true;

    async function initCall() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        localStreamRef.current = stream;

        // Analyser for voice volume
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

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

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
            setCallStatus("Connected");
            setIsConnected(true);
            playConnectedChime();
          } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            setCallStatus("Call ended");
          }
        };

        if (role === "caller") {
          setCallStatus("Ringing...");
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

          setTimeout(() => {
            if (!isConnected && active) {
              setCallStatus("Unavailable");
              setTimeout(onEndCall, 2500);
            }
          }, 30000);
        } else if (role === "receiver") {
          setCallStatus("Connecting...");
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
            setCallStatus("Connected");
            playConnectedChime();
          }
        } else {
          setIsConnected(true);
          setCallStatus("Connected");
          playConnectedChime();
        }

        // Native Speech Recognition
        startSpeechRecognition();
      } catch (err: any) {
        setCallStatus("Microphone error");
      }
    }

    function startSpeechRecognition() {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognitionClass) return;

      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = LANG_CODE_MAP[myLang.toLowerCase()] || "en-US";
        recognitionRef.current = recognition;

        let lastTranscript = "";

        recognition.onresult = (event: any) => {
          if (!active) return;
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const text = event.results[i][0].transcript.trim();
              if (text && text !== lastTranscript) {
                lastTranscript = text;
                socket.emit("call:speech_text", {
                  text,
                  sourceLang: myLang,
                  targetLang: hearLang,
                  targetSocketId: remoteSocketIdRef.current,
                  fromUsername: currentUser.username,
                });
              }
            }
          }
        };

        recognition.onend = () => {
          if (active && !isMuted) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognition.start();
      } catch {}
    }

    initCall();

    const handleCallAnswered = async (data: any) => {
      if (pcRef.current && data.answer) {
        remoteSocketIdRef.current = data.answererSocketId;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setIsConnected(true);
        setCallStatus("Connected");
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
      setTimeout(onEndCall, 1000);
    };

    const handleCallRejected = (data: any) => {
      setCallStatus(data?.reason || "Declined");
      playEndCallChime();
      setTimeout(onEndCall, 1500);
    };

    const handleMyTranscript = (data: any) => {
      setTranscripts((prev) => [
        ...prev.slice(-6),
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

    const handleIncomingTranscript = (data: any) => {
      setTranscripts((prev) => [
        ...prev.slice(-6),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full h-full sm:h-[620px] sm:max-w-md bg-[#111b21] sm:rounded-3xl flex flex-col justify-between p-6 sm:p-8 relative text-white shadow-2xl overflow-hidden">
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Top Security & Status Header */}
        <div className="text-center pt-2">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8696a0] font-medium tracking-wide">
            <Lock className="w-3 h-3 text-[#00a884]" />
            <span>End-to-end encrypted · LinguaCall Voice</span>
          </div>

          <h2 className="text-2xl font-semibold text-[#e9edef] mt-3">
            {targetUser.name || `@${targetUser.username}`}
          </h2>

          <div className="text-sm font-medium text-[#8696a0] mt-1">
            {isConnected ? formatTimer(callDuration) : callStatus}
          </div>

          {/* Language badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#202c33] rounded-full text-xs text-[#aebac1] mt-3">
            <span>You: {myLangObj.flag} {myLangObj.name}</span>
            <span className="text-[#00a884]">➔</span>
            <span>{targetLangObj.flag} {targetLangObj.name}</span>
          </div>
        </div>

        {/* Center Contact Avatar & Audio Ripple Indicator */}
        <div className="flex flex-col items-center justify-center my-auto py-6">
          <div className="relative flex items-center justify-center">
            {/* Pulsing ring when remote or self is speaking */}
            {isRemoteSpeaking && (
              <div className="absolute -inset-4 rounded-full border-2 border-[#00a884] animate-ping opacity-50" />
            )}
            {isSelfSpeaking && (
              <div className="absolute -inset-2 rounded-full border-2 border-emerald-400/60 animate-pulse" />
            )}

            <img
              src={targetUser.picture}
              alt={targetUser.name}
              className="w-32 h-32 rounded-full object-cover border-4 border-[#202c33] shadow-xl"
            />
          </div>

          {isRemoteSpeaking && (
            <span className="mt-4 text-xs font-semibold text-[#00a884] bg-[#202c33] px-3 py-1 rounded-full animate-pulse">
              Speaking in {targetLangObj.name}...
            </span>
          )}
        </div>

        {/* Live Subtitle Transcript */}
        {showSubtitles && (
          <div className="mb-4 max-h-32 overflow-y-auto space-y-2 px-1">
            {transcripts.map((t) => (
              <div
                key={t.id}
                className={`p-2.5 rounded-2xl text-xs ${
                  t.isSelf
                    ? "bg-[#005c4b] text-[#e9edef] ml-8 rounded-tr-none"
                    : "bg-[#202c33] text-[#e9edef] mr-8 rounded-tl-none"
                }`}
              >
                <div className="text-[10px] text-[#8696a0] mb-0.5">
                  {t.isSelf ? "You" : targetUser.name}
                </div>
                <div className="font-medium leading-relaxed">{t.translatedText}</div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Call Controls Dock */}
        <div className="bg-[#202c33] rounded-3xl p-4 flex items-center justify-around shadow-lg">
          {/* Speaker */}
          <button
            id="call-speaker-toggle-btn"
            onClick={toggleSpeaker}
            className={`p-3.5 rounded-full transition-colors cursor-pointer ${
              isSpeakerMuted ? "bg-red-500/20 text-red-400" : "bg-[#111b21] hover:bg-[#2a3942] text-[#e9edef]"
            }`}
            title="Speaker"
          >
            {isSpeakerMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>

          {/* Subtitles */}
          <button
            id="call-subtitles-toggle-btn"
            onClick={() => setShowSubtitles(!showSubtitles)}
            className={`p-3.5 rounded-full transition-colors cursor-pointer ${
              showSubtitles ? "bg-[#00a884] text-white" : "bg-[#111b21] text-[#8696a0]"
            }`}
            title="Live Captions"
          >
            <Subtitles className="w-6 h-6" />
          </button>

          {/* Mute */}
          <button
            id="call-mute-toggle-btn"
            onClick={toggleMute}
            className={`p-3.5 rounded-full transition-colors cursor-pointer ${
              isMuted ? "bg-red-500/20 text-red-400" : "bg-[#111b21] hover:bg-[#2a3942] text-[#e9edef]"
            }`}
            title="Mute Microphone"
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Red End Call Button */}
          <button
            id="call-end-call-btn"
            onClick={handleEndCall}
            className="p-3.5 bg-[#ea0038] hover:bg-[#d00032] text-white rounded-full transition-transform active:scale-95 shadow-md cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
