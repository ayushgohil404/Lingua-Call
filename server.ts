import express from "express";
import http from "http";
import path from "path";
import { Server as SocketIOServer } from "socket.io";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Setup Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 1e7, // 10MB for audio chunks
});

// Middleware
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Lazy GoogleGenAI client
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// In-Memory Database for Users, Sessions, and Rooms
interface UserProfile {
  userId: string;
  username: string;
  name: string;
  email?: string;
  picture: string;
  myLanguage: string;
  hearLanguage: string;
  online: boolean;
  socketId?: string;
  lastActive: number;
}

// In-memory Translation Cache to conserve Gemini Free-Tier Quota (15 RPM)
const translationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

function getCacheKey(source: string, target: string, text: string): string {
  return `${(source || "auto").toLowerCase()}_${(target || "en").toLowerCase()}_${text.trim().toLowerCase()}`;
}

function getCachedTranslation(source: string, target: string, text: string): string | null {
  const key = getCacheKey(source, target, text);
  return translationCache.get(key) || null;
}

function setCachedTranslation(source: string, target: string, text: string, translated: string) {
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) translationCache.delete(firstKey);
  }
  const key = getCacheKey(source, target, text);
  translationCache.set(key, translated);
}

const users = new Map<string, UserProfile>(); // username -> UserProfile
const socketIdToUsername = new Map<string, string>();
const rooms = new Map<string, { id: string; name: string; host: string; members: string[]; createdAt: number }>();

function findUser(target: string): UserProfile | undefined {
  if (!target) return undefined;
  const clean = target.trim().toLowerCase().replace(/^@/, "");
  if (!clean) return undefined;
  if (users.has(clean)) return users.get(clean);
  for (const u of users.values()) {
    if (u.username.toLowerCase() === clean) return u;
    if (u.email && u.email.toLowerCase() === clean) return u;
    if (u.email && u.email.split("@")[0].toLowerCase() === clean) return u;
    if (u.userId === clean) return u;
  }
  return undefined;
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    usersCount: users.size,
  });
});

// App configuration
app.get("/api/config", (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Check username availability
app.get("/api/users/check", (req, res) => {
  const q = String(req.query.username || "").trim().toLowerCase();
  if (!q || q.length < 3 || !/^[a-zA-Z0-9_]+$/.test(q)) {
    res.json({ available: false, error: "Username must be 3-20 characters (letters, numbers, underscore)." });
    return;
  }
  const exists = users.has(q);
  res.json({ available: !exists });
});

// Register or update user
app.post("/api/users/register", (req, res) => {
  const { userId, username, name, email, picture, myLanguage, hearLanguage } = req.body;
  if (!username || !userId) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const cleanUsername = username.trim().toLowerCase();
  const existing = users.get(cleanUsername);
  if (existing && existing.userId !== userId) {
    res.status(409).json({ error: "Username already in use." });
    return;
  }

  const profile: UserProfile = {
    userId,
    username: cleanUsername,
    name: name || cleanUsername,
    email,
    picture: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
    myLanguage: myLanguage || "English",
    hearLanguage: hearLanguage || "Hindi",
    online: true,
    lastActive: Date.now(),
  };

  users.set(cleanUsername, profile);
  res.json({ user: profile });
});

// Search users by username, email, or name
app.get("/api/users/search", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const list: UserProfile[] = [];

  for (const [uname, user] of users.entries()) {
    const matchesUsername = uname.includes(q);
    const matchesName = user.name.toLowerCase().includes(q);
    const matchesEmail = user.email ? user.email.toLowerCase().includes(q) : false;
    if (!q || matchesUsername || matchesName || matchesEmail) {
      list.push(user);
    }
  }

  res.json({ users: list.slice(0, 20) });
});

// Text translation API (using gemini-3.8-flash with in-memory caching and rate-limit guard)
app.post("/api/translate-text", async (req, res) => {
  try {
    const { text, sourceLang, targetLang } = req.body;
    if (!text || !targetLang) {
      res.status(400).json({ error: "Missing text or targetLang" });
      return;
    }

    const cleanText = String(text).trim();
    if (!cleanText) {
      res.json({ translatedText: "", detectedLang: sourceLang || "Auto" });
      return;
    }

    // 1. Check in-memory cache first (0 API requests consumed)
    const cached = getCachedTranslation(sourceLang, targetLang, cleanText);
    if (cached) {
      res.json({
        translatedText: cached,
        detectedLang: sourceLang || "Auto",
        fromCache: true,
      });
      return;
    }

    const ai = getAi();
    if (!ai) {
      res.json({
        translatedText: `[${targetLang}] ${cleanText}`,
        detectedLang: sourceLang || "Auto",
      });
      return;
    }

    try {
      const prompt = `Translate the following text into ${targetLang}.
Preserve tone and colloquial spoken flow.
Output ONLY the translated sentence without quotation marks or explanations.

Text:
"${cleanText}"`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
      });

      const translatedText = (response.text || cleanText).trim();
      setCachedTranslation(sourceLang, targetLang, cleanText, translatedText);

      res.json({
        translatedText,
        detectedLang: sourceLang || "Auto",
        fromCache: false,
      });
    } catch (apiErr: any) {
      console.warn("Gemini translate error / quota limit:", apiErr?.message);
      // Graceful fallback on 429 (ResourceExhausted) so call never breaks
      res.json({
        translatedText: cleanText,
        detectedLang: sourceLang || "Auto",
        rateLimited: true,
      });
    }
  } catch (error: any) {
    console.error("Text translation error:", error);
    res.status(500).json({ error: error.message || "Failed to translate" });
  }
});

// Audio Speech-to-Speech / Speech-to-Text-to-Audio Translation
app.post("/api/translate-audio", async (req, res) => {
  try {
    const { audioData, mimeType, sourceLang, targetLang, targetVoice } = req.body;
    if (!audioData) {
      res.status(400).json({ error: "No audio data received" });
      return;
    }

    const ai = getAi();
    if (!ai) {
      res.json({
        transcription: "Audio received (Gemini API key not configured)",
        translatedText: `Translated to ${targetLang}`,
        audioBase64: null,
      });
      return;
    }

    // Step 1: Transcribe and translate the audio input using gemini-3.8-flash
    const cleanMime = mimeType || "audio/webm";
    const audioPart = {
      inlineData: {
        data: audioData,
        mimeType: cleanMime,
      },
    };

    const translationPrompt = `Listen to this spoken audio carefully.
1. Transcribe what was said in the original language (${sourceLang || "auto-detected"}).
2. Translate that exact message into ${targetLang || "English"}.
3. Maintain the original emotion, urgency, speaking style, and natural phrasing.

Format your output strictly as a JSON object with this exact schema:
{
  "originalTranscript": "transcription of what was spoken in original language",
  "translatedText": "translation in ${targetLang}",
  "detectedLanguage": "detected original language name"
}`;

    const transResponse = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: {
        parts: [audioPart, { text: translationPrompt }],
      },
      config: {
        responseMimeType: "application/json",
      },
    });

    let originalTranscript = "";
    let translatedText = "";
    let detectedLanguage = sourceLang || "Auto";

    try {
      const parsed = JSON.parse(transResponse.text || "{}");
      originalTranscript = parsed.originalTranscript || "";
      translatedText = parsed.translatedText || "";
      detectedLanguage = parsed.detectedLanguage || sourceLang || "Auto";
    } catch {
      translatedText = transResponse.text || "Translated message";
      originalTranscript = "Voice input";
    }

    // Step 2: Generate synthesized speech audio for the translated text using Gemini TTS
    let ttsAudioBase64: string | null = null;
    if (translatedText) {
      try {
        const voice = targetVoice || "Kore"; // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
        const ttsResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: translatedText }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
              },
            },
          },
        });

        ttsAudioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
      } catch (ttsErr) {
        console.warn("Gemini TTS warning (client will fallback to Web Speech API):", ttsErr);
      }
    }

    res.json({
      originalTranscript,
      translatedText,
      detectedLanguage,
      ttsAudioBase64,
    });
  } catch (err: any) {
    console.error("Audio translation error:", err);
    res.status(500).json({ error: err.message || "Failed to process audio translation" });
  }
});

// -------------------------------------------------------------
// SOCKET.IO SIGNALING & REALTIME TRANSLATION
// -------------------------------------------------------------

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // User online registration
  socket.on("user:online", ({ username, userId, name, picture, myLanguage, hearLanguage, email }) => {
    if (!username) return;
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
    const cleanEmail = email ? email.trim().toLowerCase() : undefined;

    // Join room for reliable targeted messaging and calls across reconnects
    socket.join(cleanUsername);
    if (cleanEmail) {
      socket.join(cleanEmail);
    }

    const user: UserProfile = users.get(cleanUsername) || {
      userId: userId || `user_${Date.now()}`,
      username: cleanUsername,
      name: name || cleanUsername,
      email: cleanEmail,
      picture: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
      myLanguage: myLanguage || "English",
      hearLanguage: hearLanguage || "Hindi",
      online: true,
      socketId: socket.id,
      lastActive: Date.now(),
    };

    user.online = true;
    user.socketId = socket.id;
    user.lastActive = Date.now();
    if (name) user.name = name;
    if (cleanEmail) user.email = cleanEmail;
    if (myLanguage) user.myLanguage = myLanguage;
    if (hearLanguage) user.hearLanguage = hearLanguage;
    if (picture) user.picture = picture;

    users.set(cleanUsername, user);
    socketIdToUsername.set(socket.id, cleanUsername);

    // Broadcast updated user presence
    io.emit("users:update", Array.from(users.values()));
  });

  // Get online users
  socket.on("users:get", () => {
    socket.emit("users:list", Array.from(users.values()));
  });

  // 1-to-1 Calling Signaling: Initiate & Start (support both event names)
  const handleCallStart = ({ targetUsername, callerUsername, callerLanguage, callerName, callerPicture, offer, hearLanguage }: any) => {
    const cleanTarget = (targetUsername || "").trim().toLowerCase().replace(/^@/, "");
    const targetUser = findUser(cleanTarget);

    const callPayload = {
      callerUsername,
      callerName: callerName || callerUsername,
      callerPicture: callerPicture || "",
      callerSocketId: socket.id,
      callerLanguage: callerLanguage || "English",
      hearLanguage: hearLanguage || "English",
      offer,
    };

    console.log(`Call initiated from @${callerUsername} to target "${cleanTarget}"`);

    // Broadcast to target's room, target username, target email, and direct socket ID
    io.to(cleanTarget).emit("call:incoming", callPayload);
    if (targetUser) {
      if (targetUser.username && targetUser.username !== cleanTarget) {
        io.to(targetUser.username).emit("call:incoming", callPayload);
      }
      if (targetUser.email) {
        io.to(targetUser.email.toLowerCase()).emit("call:incoming", callPayload);
      }
      if (targetUser.socketId && targetUser.socketId !== socket.id) {
        io.to(targetUser.socketId).emit("call:incoming", callPayload);
      }
    }
  };

  socket.on("call:start", handleCallStart);
  socket.on("call:initiate", handleCallStart);

  // Answer call
  socket.on("call:answer", ({ callerSocketId, answer, receiverLanguage, receiverUsername, receiverName, receiverPicture }) => {
    io.to(callerSocketId).emit("call:answered", {
      answer,
      receiverLanguage,
      receiverUsername,
      receiverName,
      receiverPicture,
      answererSocketId: socket.id,
    });
  });

  // Reject call
  socket.on("call:reject", ({ callerSocketId, reason }) => {
    io.to(callerSocketId).emit("call:rejected", { reason: reason || "Call declined" });
  });

  // End call
  socket.on("call:end", ({ otherSocketId }) => {
    if (otherSocketId) {
      io.to(otherSocketId).emit("call:ended", { fromSocketId: socket.id });
    }
  });

  // ICE Candidate exchange
  socket.on("ice:candidate", ({ targetSocketId, candidate }) => {
    if (targetSocketId) {
      io.to(targetSocketId).emit("ice:candidate", {
        fromSocketId: socket.id,
        candidate,
      });
    }
  });

  // Real-time Audio Translation Stream over WebSockets
  socket.on("audio:translate", async ({ audioData, mimeType, sourceLang, targetLang, targetVoice, sessionId }) => {
    try {
      const ai = getAi();
      if (!ai) {
        socket.emit("audio:translated", {
          sessionId,
          originalTranscript: "Voice captured (offline mode)",
          translatedText: `[${targetLang}] Voice translated`,
          detectedLang: sourceLang,
          audioData: null,
        });
        return;
      }

      const cleanMime = mimeType || "audio/webm";
      const audioPart = {
        inlineData: {
          data: audioData,
          mimeType: cleanMime,
        },
      };

      const prompt = `You are the core real-time speech interpreter for LinguaCall.
Spoken audio is provided.
1. Transcribe the spoken words in the speaker's original language (${sourceLang || "auto-detect"}).
2. Translate accurately into ${targetLang || "English"}.
3. Preserve the speaker's tone, pacing, urgency, and emotion.

Return strictly JSON:
{
  "originalTranscript": "what was said",
  "translatedText": "translated text in ${targetLang}",
  "detectedLang": "original language"
}`;

      const transResult = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: {
          parts: [audioPart, { text: prompt }],
        },
        config: {
          responseMimeType: "application/json",
        },
      });

      let originalTranscript = "";
      let translatedText = "";
      let detectedLang = sourceLang;

      try {
        const parsed = JSON.parse(transResult.text || "{}");
        originalTranscript = parsed.originalTranscript || "";
        translatedText = parsed.translatedText || "";
        detectedLang = parsed.detectedLang || sourceLang;
      } catch {
        translatedText = transResult.text || "";
      }

      // Generate audio using Gemini TTS
      let ttsAudio: string | null = null;
      if (translatedText) {
        try {
          const voice = targetVoice || "Kore";
          const ttsRes = await ai.models.generateContent({
            model: "gemini-3.1-flash-tts-preview",
            contents: [{ parts: [{ text: translatedText }] }],
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice },
                },
              },
            },
          });
          ttsAudio = ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        } catch (e) {
          console.warn("TTS generation in socket stream skipped:", e);
        }
      }

      socket.emit("audio:translated", {
        sessionId,
        originalTranscript,
        translatedText,
        detectedLang,
        audioData: ttsAudio,
      });
    } catch (err: any) {
      console.error("Socket audio translation error:", err);
      socket.emit("audio:error", {
        sessionId,
        error: err.message || "Translation error",
      });
    }
  });

  // Broadcast live transcript during call
  socket.on("call:transcript", ({ targetSocketId, original, translated, fromUsername, sourceLang, targetLang }) => {
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:transcript", {
        original,
        translated,
        fromUsername,
        sourceLang,
        targetLang,
        timestamp: Date.now(),
      });
    }
  });

  // Low-quota real-time speech translation (Sentence-boundary translation with cache)
  // Preserves Gemini Free Tier 15 RPM limits by avoiding continuous raw audio streaming
  socket.on("call:speech_text", async ({ text, sourceLang, targetLang, targetSocketId, fromUsername }) => {
    const cleanText = (text || "").trim();
    if (!cleanText) return;

    let translated = getCachedTranslation(sourceLang, targetLang, cleanText);
    if (!translated) {
      const ai = getAi();
      if (ai) {
        try {
          const res = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: `Translate into ${targetLang || "English"}. Natural conversational tone. Output translated sentence only: "${cleanText}"`,
          });
          translated = (res.text || cleanText).trim();
          setCachedTranslation(sourceLang, targetLang, cleanText, translated);
        } catch (err: any) {
          console.warn("Speech text translate quota / error:", err?.message);
          translated = cleanText;
        }
      } else {
        translated = cleanText;
      }
    }

    const payload = {
      original: cleanText,
      translated: translated || cleanText,
      fromUsername,
      sourceLang,
      targetLang,
      timestamp: Date.now(),
    };

    // Send back to self
    socket.emit("call:my_transcript", payload);

    // Forward to remote peer
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:transcript", payload);
    }
  });

  // 1-to-1 Chat Messages
  socket.on("chat:message", async ({ targetUsername, message, fromUsername, sourceLang, targetLang }) => {
    if (!message || !message.trim()) return;
    const cleanTarget = (targetUsername || "").trim().toLowerCase().replace(/^@/, "");
    const cleanFrom = (fromUsername || "").trim().toLowerCase().replace(/^@/, "");
    const targetUser = findUser(cleanTarget);

    let translatedMessage = message;
    // Auto translate text if languages differ (with timeout protection so message is never delayed or dropped)
    if (sourceLang && targetLang && sourceLang !== targetLang) {
      const ai = getAi();
      if (ai) {
        try {
          const translateTask = ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: `Translate the following chat message into ${targetLang || "English"}.
Maintain casual chat tone, emojis, and slang. Output only translated text.
Message: "${message}"`,
          });
          const timeoutTask = new Promise((resolve) => setTimeout(() => resolve(null), 2500));
          const res: any = await Promise.race([translateTask, timeoutTask]);
          if (res?.text) {
            translatedMessage = res.text.trim();
          }
        } catch (e) {
          console.warn("Message translation fallback:", e);
          translatedMessage = message;
        }
      }
    }

    const payload = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fromUsername: cleanFrom || fromUsername,
      targetUsername: targetUser?.username || cleanTarget,
      originalText: message,
      translatedText: translatedMessage,
      sourceLang,
      targetLang,
      timestamp: Date.now(),
    };

    console.log(`Delivering chat message from @${fromUsername} to target "${cleanTarget}"`);

    // Send to target if online via room and direct socket
    io.to(cleanTarget).emit("chat:message", payload);
    if (targetUser) {
      if (targetUser.username && targetUser.username !== cleanTarget) {
        io.to(targetUser.username).emit("chat:message", payload);
      }
      if (targetUser.email) {
        io.to(targetUser.email.toLowerCase()).emit("chat:message", payload);
      }
      if (targetUser.socketId && targetUser.socketId !== socket.id) {
        io.to(targetUser.socketId).emit("chat:message", payload);
      }
    }

    // Echo back to sender for instant UI confirmation
    socket.emit("chat:message:sent", payload);
  });

  // Group Rooms
  socket.on("room:create", ({ roomId, roomName, username }) => {
    const rId = (roomId || Math.random().toString(36).substring(2, 8)).toUpperCase();
    const room = {
      id: rId,
      name: roomName || `Room ${rId}`,
      host: username,
      members: [username],
      createdAt: Date.now(),
    };
    rooms.set(rId, room);
    socket.join(rId);
    socket.emit("room:created", room);
  });

  socket.on("room:join", ({ roomId, username }) => {
    const rId = (roomId || "").toUpperCase();
    const room = rooms.get(rId);
    if (!room) {
      socket.emit("room:error", { message: `Room "${rId}" not found.` });
      return;
    }

    if (!room.members.includes(username)) {
      room.members.push(username);
    }
    socket.join(rId);

    socket.to(rId).emit("room:user-joined", {
      username,
      socketId: socket.id,
      room,
    });

    socket.emit("room:joined", {
      room,
      members: room.members,
    });
  });

  socket.on("room:message", async ({ roomId, message, fromUsername, sourceLang, targetLang }) => {
    const rId = (roomId || "").toUpperCase();
    let translated = message;

    const ai = getAi();
    if (ai && targetLang && sourceLang !== targetLang) {
      try {
        const res = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: `Translate this message to ${targetLang}. Output ONLY translation: "${message}"`,
        });
        translated = res.text?.trim() || message;
      } catch {
        translated = message;
      }
    }

    io.to(rId).emit("room:message", {
      id: `grp_${Date.now()}`,
      roomId: rId,
      fromUsername,
      message,
      translated,
      sourceLang,
      timestamp: Date.now(),
    });
  });

  // Group WebRTC mesh signaling
  socket.on("room:signal", ({ roomId, targetSocketId, signalData, type }) => {
    if (targetSocketId) {
      io.to(targetSocketId).emit("room:signal", {
        fromSocketId: socket.id,
        signalData,
        type,
      });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    const username = socketIdToUsername.get(socket.id);
    if (username) {
      const user = users.get(username);
      if (user && user.socketId === socket.id) {
        user.online = false;
        user.lastActive = Date.now();
      }
      socketIdToUsername.delete(socket.id);
      io.emit("users:update", Array.from(users.values()));
      console.log(`User ${username} disconnected`);
    }
  });
});

// -------------------------------------------------------------
// VITE MIDDLEWARE / STATIC ASSETS
// -------------------------------------------------------------

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 LinguaCall server listening on port ${PORT}`);
  });
}

start();
