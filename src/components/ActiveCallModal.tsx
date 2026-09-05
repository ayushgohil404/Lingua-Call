import React, { useEffect, useRef, useState } from "react";
import { UserProfile, LiveTranscriptItem } from "../types";
import { getLanguageByName, SUPPORTED_LANGUAGES } from "../constants/languages";
import { getSocket } from "../services/socket";
import { playBase64Audio, speakText, playConnectedChime, playEndCallChime, getAudioContext } from "../services/audio";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Languages,
  Sparkles,
  Subtitles,
  Activity,
  CheckCircle,
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
  const [callStatus, setCallStatus] = useState<string>("Establishing secure connection...");
  const [isConnected, setIsConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Audio activity states
  const [isSelfSpeaking, setIsSelfSpeaking] = useState(false);
  const [isRemoteSpeaking, setIsRemoteSpeaking] = useState(false);
  const [selfVolume, setSelfVolume] = useState(0);

  // Transcripts list
  const [transcripts, setTranscripts] = useState<LiveTranscriptItem[]>([]);

  // WebRTC refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteSocketIdRef = useRef<string | null>(callerSocketId || targetUser.socketId || null);

  // MediaRecorder & processing
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const isTranslatingRef = useRef(false);
  const timerIntervalRef = useRef<number | null>(null);

  // Analyser node for voice activity
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

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

  // Initialize WebRTC and Audio Pipeline
  useEffect(() => {
    let active = true;

    async function initCall() {
      try {
        // Step 1: Request Microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        localStreamRef.current = stream;

        // Setup Web Audio Analyser for voice volume visualization
        try {
          const ctx = getAudioContext();
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkVolume = () => {
            if (!active) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setSelfVolume(avg);
            setIsSelfSpeaking(avg > 18);
            animFrameRef.current = requestAnimationFrame(checkVolume);
          };
          checkVolume();
        } catch (e) {
          console.warn("Audio analyser setup error:", e);
        }

        // Setup WebRTC PeerConnection
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });
        pcRef.current = pc;

        // Add local audio tracks to peer connection
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Handle remote stream
        pc.ontrack = (event) => {
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch(() => {});
          }
        };

        // Handle ICE candidates
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
            setCallStatus("Connected · AI Interpreting Live");
            setIsConnected(true);
            playConnectedChime();
          } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            setCallStatus("Connection interrupted");
          }
        };

        // Start Gemini translation pipeline
        startAudioCapturePipeline(stream);

        // Role negotiation
        if (role === "caller") {
          setCallStatus(`Calling @${targetUser.username}...`);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit("call:initiate", {
            targetUsername: targetUser.username,
            callerUsername: currentUser.username,
            callerName: currentUser.name,
            callerPicture: currentUser.picture,
            callerLanguage: myLang,
            hearLanguage: hearLang,
            offer,
          });
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
            setCallStatus("Connected · AI Interpreting Live");
            playConnectedChime();
          }
        } else {
          // Demo / AI contact loopback
          setIsConnected(true);
          setCallStatus("Connected · LinguaCall AI Interpreter");
          playConnectedChime();
        }
      } catch (err: any) {
        console.error("Init call error:", err);
        setCallStatus(`Microphone error: ${err.message || "Permission required"}`);
      }
    }

    initCall();

    // Socket Event Listeners for Call
    const handleCallAnswered = async (data: any) => {
      if (pcRef.current && data.answer) {
        remoteSocketIdRef.current = data.answererSocketId;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setIsConnected(true);
        setCallStatus("Connected · AI Interpreting Live");
        playConnectedChime();
      }
    };

    const handleIceCandidate = async (data: any) => {
      if (pcRef.current && data.candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn("Error adding ICE candidate:", e);
        }
      }
    };

    const handleCallEnded = () => {
      setCallStatus("Call ended by remote party");
      playEndCallChime();
      setTimeout(onEndCall, 1200);
    };

    const handleCallRejected = (data: any) => {
      setCallStatus(data?.reason || "Call was declined.");
      playEndCallChime();
      setTimeout(onEndCall, 2000);
    };

    const handleCallError = (data: any) => {
      setCallStatus(data?.message || "User is unavailable.");
      setTimeout(onEndCall, 2500);
    };

    // Received live transcript from remote peer
    const handleIncomingTranscript = (data: any) => {
      setTranscripts((prev) => [
        ...prev.slice(-15),
        {
          id: `tr_${Date.now()}_${Math.random()}`,
          speaker: data.fromUsername || targetUser.username,
          originalText: data.original,
          translatedText: data.translated,
          sourceLang: data.sourceLang,
          targetLang: data.targetLang,
          timestamp: data.timestamp || Date.now(),
          isSelf: false,
        },
      ]);

      // Trigger speaking wave on remote
      setIsRemoteSpeaking(true);
      setTimeout(() => setIsRemoteSpeaking(false), 2000);

      // If text-to-speech fallback is enabled
      if (!isSpeakerMuted) {
        speakText(data.translated, hearLang);
      }
    };

    // Socket translated audio packet from server
    const handleAudioTranslated = (data: any) => {
      if (data.translatedText) {
        // Record self transcript
        setTranscripts((prev) => [
          ...prev.slice(-15),
          {
            id: `tr_self_${Date.now()}`,
            speaker: "You",
            originalText: data.originalTranscript || "Spoken speech",
            translatedText: data.translatedText,
            sourceLang: data.detectedLang || myLang,
            targetLang: hearLang,
            timestamp: Date.now(),
            isSelf: true,
          },
        ]);

        // Forward to remote peer so they see the transcript & hear translation
        if (remoteSocketIdRef.current) {
          socket.emit("call:transcript", {
            targetSocketId: remoteSocketIdRef.current,
            original: data.originalTranscript || "",
            translated: data.translatedText,
            fromUsername: currentUser.username,
            sourceLang: data.detectedLang || myLang,
            targetLang: hearLang,
          });
        }

        // If target is AI demo user (e.g. elena_es, rahul_hi, etc.), trigger simulated AI partner response
        if (targetUser.userId?.startsWith("demo_")) {
          triggerAiPartnerResponse(data.translatedText);
        }
      }

      // If server returned synthesized audio
      if (data.audioData && !isSpeakerMuted) {
        playBase64Audio(data.audioData);
      }
    };

    socket.on("call:answered", handleCallAnswered);
    socket.on("ice:candidate", handleIceCandidate);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:rejected", handleCallRejected);
    socket.on("call:error", handleCallError);
    socket.on("call:transcript", handleIncomingTranscript);
    socket.on("audio:translated", handleAudioTranslated);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      socket.off("call:answered", handleCallAnswered);
      socket.off("ice:candidate", handleIceCandidate);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:rejected", handleCallRejected);
      socket.off("call:error", handleCallError);
      socket.off("call:transcript", handleIncomingTranscript);
      socket.off("audio:translated", handleAudioTranslated);

      // Stop recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }

      // Stop local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      // Close peer connection
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  // Audio Chunk Capture Pipeline using MediaRecorder
  const startAudioCapturePipeline = (stream: MediaStream) => {
    try {
      const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
      let selectedMime = "";
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 800 && !isMuted) {
          try {
            const buffer = await e.data.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
            );

            // Send to Gemini translation proxy via socket
            socket.emit("audio:translate", {
              audioData: base64,
              mimeType: selectedMime || "audio/webm",
              sourceLang: myLang,
              targetLang: hearLang,
              targetVoice: "Kore",
              sessionId: Date.now(),
            });
          } catch (err) {
            console.warn("Audio chunk encoding error:", err);
          }
        }
      };

      // Collect audio chunks every 2.4 seconds for responsive translation
      recorder.start(2400);
    } catch (e) {
      console.warn("MediaRecorder start warning:", e);
    }
  };

  // Simulated AI response for demo test users
  const triggerAiPartnerResponse = async (userSpokenText: string) => {
    setTimeout(async () => {
      try {
        setIsRemoteSpeaking(true);
        const res = await fetch("/api/translate-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `Reply naturally and briefly (1 sentence) as ${targetUser.name} to: "${userSpokenText}"`,
            sourceLang: "English",
            targetLang: myLang,
          }),
        });
        const data = await res.json();
        const replyText = data.translatedText || `Glad to hear from you! Real-time translation is working.`;

        setTranscripts((prev) => [
          ...prev.slice(-15),
          {
            id: `tr_reply_${Date.now()}`,
            speaker: targetUser.name,
            originalText: `Response in ${targetUser.myLanguage}`,
            translatedText: replyText,
            sourceLang: targetUser.myLanguage,
            targetLang: myLang,
            timestamp: Date.now(),
            isSelf: false,
          },
        ]);

        if (!isSpeakerMuted) {
          speakText(replyText, myLang);
        }

        setTimeout(() => setIsRemoteSpeaking(false), 2500);
      } catch (e) {
        setIsRemoteSpeaking(false);
      }
    }, 1500);
  };

  // Toggle Microphone
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle Speaker
  const toggleSpeaker = () => {
    setIsSpeakerMuted(!isSpeakerMuted);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerMuted;
    }
  };

  // End Call
  const handleEndCall = () => {
    if (remoteSocketIdRef.current) {
      socket.emit("call:end", { otherSocketId: remoteSocketIdRef.current });
    }
    playEndCallChime();
    onEndCall();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-zinc-900/60 backdrop-blur-md">
      <div className="w-full max-w-4xl h-[92vh] max-h-[850px] bg-white border-2 border-zinc-200 rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden relative text-zinc-900">
        {/* Hidden Remote Audio Element */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Call Top Header */}
        <div className="px-6 py-4 bg-zinc-50 border-b-2 border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm border border-indigo-700">
              🌐
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-zinc-900">LinguaCall Live</span>
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {formatTimer(callDuration)}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-medium">{callStatus}</p>
            </div>
          </div>

          {/* Translation Direction Badge */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border-2 border-zinc-200 text-xs shadow-xs">
            <span className="text-zinc-800 font-bold flex items-center gap-1">
              <span>{myLangObj.flag}</span>
              <span>{myLangObj.name}</span>
            </span>
            <span className="text-indigo-600 font-bold">⇄</span>
            <span className="text-zinc-800 font-bold flex items-center gap-1">
              <span>{hearLangObj.flag}</span>
              <span>{hearLangObj.name}</span>
            </span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 ml-1" />
          </div>
        </div>

        {/* Central Stage: Participants & Audio Reactive Visualizer */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative bg-zinc-50/40">
          <div className="w-full max-w-2xl flex items-center justify-around my-auto">
            {/* SELF PARTICIPANT */}
            <div className="flex flex-col items-center gap-3">
              <div
                className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full p-1 transition-all duration-300 ${
                  isSelfSpeaking
                    ? "ring-4 ring-indigo-500 shadow-xl shadow-indigo-500/20 scale-105"
                    : "ring-2 ring-zinc-200"
                }`}
              >
                <img
                  src={currentUser.picture}
                  alt={currentUser.name}
                  className="w-full h-full rounded-full object-cover bg-zinc-100"
                />
                {isMuted && (
                  <div className="absolute bottom-1 right-1 p-2 bg-rose-600 rounded-full text-white shadow-md">
                    <MicOff className="w-4 h-4" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-zinc-900 flex items-center justify-center gap-1.5">
                  <span>You ({currentUser.name})</span>
                </div>
                <div className="text-xs text-indigo-600 font-semibold">
                  Speaks {myLangObj.flag} {myLangObj.name}
                </div>
              </div>
            </div>

            {/* CENTRAL ANIMATED AUDIO WAVE BRIDGE */}
            <div className="flex flex-col items-center gap-2 px-4">
              <div className="flex items-center gap-1.5 h-12">
                <div className={`w-1.5 rounded-full bg-indigo-600 ${isSelfSpeaking || isRemoteSpeaking ? "animate-wave-1" : "h-2"}`} />
                <div className={`w-1.5 rounded-full bg-indigo-500 ${isSelfSpeaking || isRemoteSpeaking ? "animate-wave-2" : "h-3"}`} />
                <div className={`w-1.5 rounded-full bg-emerald-500 ${isSelfSpeaking || isRemoteSpeaking ? "animate-wave-3" : "h-4"}`} />
                <div className={`w-1.5 rounded-full bg-indigo-500 ${isSelfSpeaking || isRemoteSpeaking ? "animate-wave-4" : "h-3"}`} />
                <div className={`w-1.5 rounded-full bg-indigo-600 ${isSelfSpeaking || isRemoteSpeaking ? "animate-wave-5" : "h-2"}`} />
              </div>
              <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider font-bold">
                {isSelfSpeaking ? "Translating Voice..." : isRemoteSpeaking ? "Receiving Translation..." : "Listening"}
              </span>
            </div>

            {/* REMOTE PARTICIPANT */}
            <div className="flex flex-col items-center gap-3">
              <div
                className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full p-1 transition-all duration-300 ${
                  isRemoteSpeaking
                    ? "ring-4 ring-emerald-500 shadow-xl shadow-emerald-500/20 scale-105"
                    : "ring-2 ring-zinc-200"
                }`}
              >
                <img
                  src={
                    targetUser.picture ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUser.username}`
                  }
                  alt={targetUser.username}
                  className="w-full h-full rounded-full object-cover bg-zinc-100"
                />
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-zinc-900 flex items-center justify-center gap-1.5">
                  <span>{targetUser.name || `@${targetUser.username}`}</span>
                </div>
                <div className="text-xs text-emerald-600 font-semibold">
                  Hears {hearLangObj.flag} {hearLangObj.name}
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Subtitles / Live Transcript */}
          {showSubtitles && (
            <div className="w-full max-w-2xl bg-white border-2 border-zinc-200 rounded-2xl p-4 mt-4 shadow-sm max-h-48 overflow-y-auto flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b-2 border-zinc-100 pb-2 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1.5 font-bold text-zinc-800 uppercase tracking-wider">
                  <Subtitles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Real-Time Speech Subtitles</span>
                </span>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <Activity className="w-3 h-3 animate-pulse" />
                  <span>Live Stream Active</span>
                </span>
              </div>

              {transcripts.length === 0 ? (
                <div className="text-center py-4 text-xs text-zinc-400 italic">
                  Start speaking in your language. Gemini AI will instantly transcribe, translate, and speak your words to @{targetUser.username}...
                </div>
              ) : (
                transcripts.map((t) => (
                  <div
                    key={t.id}
                    className={`p-2.5 rounded-xl text-xs flex flex-col gap-1 ${
                      t.isSelf
                        ? "bg-indigo-50 border-2 border-indigo-200 ml-4 text-zinc-900"
                        : "bg-zinc-50 border-2 border-zinc-200 mr-4 text-zinc-900"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span className="font-bold text-zinc-800">
                        {t.isSelf ? "You" : t.speaker}
                      </span>
                      <span className="text-indigo-600 font-mono">
                        {new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>

                    {/* Original */}
                    <div className="text-zinc-500 text-[11px] italic">
                      "{t.originalText}"
                    </div>

                    {/* Translated text */}
                    <div className="text-zinc-900 font-bold text-xs flex items-center gap-1.5">
                      <span className="text-indigo-700 text-[10px] uppercase font-mono px-1.5 py-0.5 bg-indigo-100 rounded">
                        {t.targetLang}
                      </span>
                      <span>{t.translatedText}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Bottom Call Controls Bar */}
        <div className="px-6 py-4 bg-zinc-50 border-t-2 border-zinc-200 flex items-center justify-between flex-wrap gap-4">
          {/* Quick Mid-call Language Switch */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 hidden sm:inline">Output:</span>
            <select
              value={hearLang}
              onChange={(e) => setHearLang(e.target.value)}
              className="bg-white border-2 border-zinc-200 text-zinc-900 text-xs px-3 py-1.5 rounded-xl outline-none focus:border-indigo-600 font-semibold cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={`mid_${lang.code}`} value={lang.name}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Mic Toggle */}
            <button
              id="call-mute-toggle-btn"
              onClick={toggleMute}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              className={`p-3.5 rounded-full border-2 transition-all cursor-pointer ${
                isMuted
                  ? "bg-rose-50 text-rose-600 border-rose-400"
                  : "bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-200 shadow-xs"
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Speaker Toggle */}
            <button
              id="call-speaker-toggle-btn"
              onClick={toggleSpeaker}
              title={isSpeakerMuted ? "Unmute Audio" : "Mute Audio"}
              className={`p-3.5 rounded-full border-2 transition-all cursor-pointer ${
                isSpeakerMuted
                  ? "bg-amber-50 text-amber-600 border-amber-400"
                  : "bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-200 shadow-xs"
              }`}
            >
              {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Subtitles Toggle */}
            <button
              id="call-subtitles-toggle-btn"
              onClick={() => setShowSubtitles(!showSubtitles)}
              title="Toggle Live Subtitles"
              className={`p-3.5 rounded-full border-2 transition-all cursor-pointer ${
                showSubtitles
                  ? "bg-indigo-50 text-indigo-600 border-indigo-400"
                  : "bg-white text-zinc-400 border-zinc-200"
              }`}
            >
              <Subtitles className="w-5 h-5" />
            </button>

            {/* End Call Button */}
            <button
              id="call-end-call-btn"
              onClick={handleEndCall}
              title="End Call"
              className="px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold text-xs flex items-center gap-2 shadow-md border border-rose-700 transition-all cursor-pointer"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="hidden sm:inline">End Call</span>
            </button>
          </div>

          <div className="text-right hidden sm:block">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Audio Engine</div>
            <div className="text-xs font-bold text-indigo-600">Gemini Live + WebRTC</div>
          </div>
        </div>
      </div>
    </div>
  );
};
