import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * App basada en tu versión real, pero:
 * - sin modos de juego
 * - con IA real
 * - con XP, nivel, racha y condecoraciones
 * - con sonidos ON/OFF para nivel y badge
 * - layout con panel superior fijo
 * - solo el chat tiene scroll
 * - escalera colapsable
 * - panel superior más compacto
 * - guardado de progreso con cookies
 * - mejoras visuales del chat
 * - gamificación más visible
 */

const USE_REAL_AI = true;
const SAVE_COOKIE_NAME = "samurai_progress_v1";
const SAVE_COOKIE_DAYS = 45;

const levels = [
  { n: 1, name: "Novato", icon: "👶", avatar: "/avatars/level1.png" },
  { n: 2, name: "Repetidor", icon: "🗣️", avatar: "/avatars/level2.png" },
  { n: 3, name: "Intuitivo", icon: "💡", avatar: "/avatars/level3.png" },
  { n: 4, name: "Explorador", icon: "🔍", avatar: "/avatars/level4.png" },
  { n: 5, name: "Constructor", icon: "🧱", avatar: "/avatars/level5.png" },
  { n: 6, name: "Presidente", icon: "⚖️", avatar: "/avatars/level6.png" },
  { n: 7, name: "Rey Crítico", icon: "🎯", avatar: "/avatars/level7.png" },
  { n: 8, name: "Rey Filósofo", icon: "🧠", avatar: "/avatars/level8.png" },
  { n: 9, name: "GOAT del Pensamiento", icon: "⚔️", avatar: "/avatars/level9.png" },
  { n: 10, name: "Samurai del Pensamiento", icon: "👑", avatar: "/avatars/level10.png" },
];

const starterMessages = () => [
  {
    role: "assistant",
    text: `Hola. Mi nombre es “SamurAI del pensamiento”🥷 y soy ayudante de Humanismo Cristiano del Colegio San Benito. Estoy aquí para ayudarte a transformarte en un verdadero Samurai del Pensamiento!

Para partir, dime: ¿Cómo te llamas?`,
  },
];

function setCookie(name, value, days = 30) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const cookieName = `${name}=`;
  const parts = document.cookie.split(";").map((part) => part.trim());
  const found = parts.find((part) => part.startsWith(cookieName));
  if (!found) return null;
  return decodeURIComponent(found.slice(cookieName.length));
}

function inferFeedback(text) {
  const lower = text.toLowerCase();

  const score = Math.min(
    5,
    Math.max(
      1,
      (lower.length > 35 ? 1 : 0) +
        (/(porque|ya que|por eso|debido)/.test(lower) ? 1 : 0) +
        (/(ejemplo|por ejemplo|como cuando|por ejemplo,)/.test(lower) ? 1 : 0) +
        (/(vida|amigos|colegio|familia|verdad|felicidad|dios|amor|amistad|dolor|muerte)/.test(lower) ? 1 : 0) +
        (/(aunque|pero|depende|sin embargo)/.test(lower) ? 1 : 0)
    )
  );

  const mood = score >= 4 ? "happy" : score === 3 ? "surprised" : "thinking";

  const strengths = [];
  if (lower.length > 35) strengths.push("desarrollas la idea");
  if (/(porque|ya que|por eso|debido)/.test(lower)) strengths.push("das razones");
  if (/(ejemplo|por ejemplo|como cuando|por ejemplo,)/.test(lower)) strengths.push("usas ejemplos");
  if (/(vida|amigos|colegio|familia|verdad|felicidad|dios|amor|amistad|dolor|muerte)/.test(lower)) strengths.push("conectas con la vida");
  if (/(aunque|pero|depende|sin embargo)/.test(lower)) strengths.push("muestras matices");
  if (!strengths.length) strengths.push("te atreves a responder");

  const improve = [];
  if (!/(porque|ya que|por eso|debido)/.test(lower)) improve.push("agregar una razón clara");
  if (!/(ejemplo|por ejemplo|como cuando|por ejemplo,)/.test(lower)) improve.push("agregar un ejemplo concreto");
  if (!/(aunque|pero|depende|sin embargo)/.test(lower)) improve.push("mostrar un matiz");
  if (!/(vida|amigos|colegio|familia|verdad|felicidad|dios|amor|amistad|dolor|muerte)/.test(lower)) improve.push("conectarlo con la vida real");

  return { score, mood, strengths, improve };
}

function demoTutorReply(userText) {
  const info = inferFeedback(userText);
  const lower = userText.toLowerCase();

  let opening = "Voy a tomar tu idea en serio.";
  if (lower.includes("verdad")) opening = "Estás tocando un tema central: la verdad orienta nuestras decisiones.";
  if (lower.includes("felicidad")) opening = "Interesante: la felicidad no es solo una sensación, también se relaciona con el bien.";
  if (lower.includes("pensar")) opening = "Bien: ya estás reflexionando sobre el acto mismo de pensar.";

  return `${opening}

Evaluación rápida:
• Calidad: ${info.score}/5
• Lo bueno: ${info.strengths.join(", ")}
• A mejorar: ${info.improve.slice(0, 2).join(", ") || "seguir profundizando"}

Siguiente paso: reformula tu idea con un “porque...” y un ejemplo.`;
}

async function getTutorReply({ userText, conversation, studentName, studentLevel }) {
  if (!USE_REAL_AI) {
    return demoTutorReply(userText);
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userText,
      mode: "chat",
      conversation,
      studentName,
      studentLevel,
    }),
  });

  if (!response.ok) {
    throw new Error("No se pudo obtener respuesta de la IA.");
  }

  const data = await response.json();
  return data.reply;
}

function cardStyle(extra = {}) {
  return {
    background: "rgba(255,255,255,0.96)",
    borderRadius: 24,
    padding: 18,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    ...extra,
  };
}

const soundButtonStyle = (active) => ({
  padding: "10px 12px",
  borderRadius: 12,
  border: 0,
  fontWeight: 800,
  cursor: "pointer",
  background: active ? "#0f172a" : "#e2e8f0",
  color: active ? "white" : "#334155",
});

const compactBadgeStyle = {
  background: "#f8fafc",
  borderRadius: 999,
  padding: "7px 10px",
  fontWeight: 800,
  border: "1px solid #cbd5e1",
  fontSize: 13,
};

function avatarFrameStyle(levelIndex) {
  if (levelIndex >= 9) {
    return {
      background: "linear-gradient(135deg,#fef3c7,#f59e0b,#b45309)",
      boxShadow: "0 0 0 3px rgba(245,158,11,0.25), 0 10px 24px rgba(180,83,9,0.28)",
    };
  }

  if (levelIndex >= 6) {
    return {
      background: "linear-gradient(135deg,#dbeafe,#60a5fa,#1d4ed8)",
      boxShadow: "0 0 0 3px rgba(59,130,246,0.2), 0 10px 24px rgba(37,99,235,0.24)",
    };
  }

  if (levelIndex >= 3) {
    return {
      background: "linear-gradient(135deg,#dcfce7,#4ade80,#16a34a)",
      boxShadow: "0 0 0 3px rgba(34,197,94,0.18), 0 10px 24px rgba(22,163,74,0.2)",
    };
  }

  return {
    background: "linear-gradient(135deg,#e2e8f0,#cbd5e1,#94a3b8)",
    boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
  };
}

function getLadderCardStyle(idx, currentLevelIndex) {
  if (idx > currentLevelIndex) {
    return {
      background: "#e2e8f0",
      color: "#94a3b8",
      border: "1px dashed #cbd5e1",
      opacity: 0.8,
      filter: "grayscale(0.35)",
    };
  }

  if (idx === currentLevelIndex) {
    return {
      background: "linear-gradient(135deg,#2563eb,#06b6d4,#f59e0b)",
      color: "white",
      border: "1px solid transparent",
      boxShadow: "0 8px 20px rgba(37,99,235,0.22)",
    };
  }

  return {
    background: "#f8fafc",
    color: "#334155",
    border: "1px solid #cbd5e1",
  };
}

export default function App() {
  const [started, setStarted] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [avatarMood, setAvatarMood] = useState("happy");
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [badges, setBadges] = useState([]);
  const [soundOn, setSoundOn] = useState(true);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [showLadder, setShowLadder] = useState(false);

  const levelUpAudioRef = useRef(null);
  const badgeAudioRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    levelUpAudioRef.current = new Audio("/level-up.mp3");
    levelUpAudioRef.current.preload = "auto";

    badgeAudioRef.current = new Audio("/badge.mp3");
    badgeAudioRef.current.preload = "auto";
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const saved = getCookie(SAVE_COOKIE_NAME);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);

      if (typeof parsed.started === "boolean") setStarted(parsed.started);
      if (typeof parsed.studentName === "string") setStudentName(parsed.studentName);
      if (typeof parsed.xp === "number") setXp(parsed.xp);
      if (typeof parsed.streak === "number") setStreak(parsed.streak);
      if (typeof parsed.avatarMood === "string") setAvatarMood(parsed.avatarMood);
      if (typeof parsed.soundOn === "boolean") setSoundOn(parsed.soundOn);
      if (typeof parsed.currentLevelIndex === "number") setCurrentLevelIndex(parsed.currentLevelIndex);
      if (Array.isArray(parsed.badges)) setBadges(parsed.badges);
      if (typeof parsed.showLadder === "boolean") setShowLadder(parsed.showLadder);
      if (Array.isArray(parsed.messages) && parsed.messages.length > 0) setMessages(parsed.messages);
    } catch {
      // ignorar cookie dañada
    }
  }, []);

  useEffect(() => {
    if (!started) return;

    const progressData = {
      started,
      studentName,
      xp,
      streak,
      avatarMood,
      soundOn,
      currentLevelIndex,
      badges,
      showLadder,
      messages: messages.slice(-12),
    };

    try {
      setCookie(SAVE_COOKIE_NAME, JSON.stringify(progressData), SAVE_COOKIE_DAYS);
    } catch {
      // no romper si excede espacio
    }
  }, [
    started,
    studentName,
    xp,
    streak,
    avatarMood,
    soundOn,
    currentLevelIndex,
    badges,
    showLadder,
    messages,
  ]);

  const currentLevel = levels[currentLevelIndex];
  const progressWithinLevel = ((xp % 80) / 80) * 100;
  const userTurns = useMemo(() => messages.filter((m) => m.role === "user").length, [messages]);

  const safePlay = async (audioRef, src) => {
    if (!soundOn) return;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(src);
        audioRef.current.preload = "auto";
      }

      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        await playPromise.catch(() => {});
      }
    } catch {
      // ignorar
    }
  };

  const playLevelUpSound = () => {
    safePlay(levelUpAudioRef, "/level-up.mp3");
  };

  const playBadgeSound = () => {
    safePlay(badgeAudioRef, "/badge.mp3");
  };

  const addBadge = (badge) => {
    setBadges((prev) => {
      const alreadyExists = prev.some((b) => b.id === badge.id);
      if (alreadyExists) return prev;
      playBadgeSound();
      return [...prev, badge];
    });
  };

  const startApp = () => {
    setStarted(true);
    if (!messages.length) {
      setMessages(starterMessages());
    }
  };

  const rewardXp = (score, text) => {
    let gainedXp = 0;
    if (score <= 2) gainedXp = 1;
    if (score === 3) gainedXp = 5;
    if (score === 4) gainedXp = 10;
    if (score === 5) gainedXp = 15;
    if (text.trim().length < 15) gainedXp = Math.max(0, gainedXp - 3);
    return gainedXp;
  };

  const extractLevelFromReply = (replyText) => {
    const patterns = [
      /Nivel inicial del alumno:\s*(\d+)/i,
      /Nivel inicial:\s*(\d+)/i,
      /Estás en nivel\s*(\d+)/i,
      /Nivel\s*(\d+)\s*[:.\-]/i,
    ];

    for (const pattern of patterns) {
      const match = replyText.match(pattern);
      if (match) {
        const levelNumber = Number(match[1]);
        if (!Number.isNaN(levelNumber) && levelNumber >= 1 && levelNumber <= levels.length) {
          return levelNumber - 1;
        }
      }
    }

    return null;
  };

  const evaluateBadges = (text, evalInfo) => {
    const lower = text.toLowerCase();

    if (
      /(porque|ya que|por eso|debido)/.test(lower) &&
      /(ejemplo|por ejemplo|como cuando|por ejemplo,)/.test(lower)
    ) {
      addBadge({
        id: "buen-argumento",
        label: "⚖️ Buen Argumento",
        bonus: 3,
      });
      return 3;
    }

    if (evalInfo.score >= 5) {
      addBadge({
        id: "profundidad-maxima",
        label: "🔥 Profundidad Máxima",
        bonus: 3,
      });
      return 3;
    }

    if (/(verdad|felicidad|amor|amistad|dios|muerte|dolor)/.test(lower) && text.length > 60) {
      addBadge({
        id: "mente-clara",
        label: "🧠 Mente Clara",
        bonus: 1,
      });
      return 1;
    }

    return 0;
  };

  const normalizeName = (text) => {
    return text
      .replace(/^me llamo\s+/i, "")
      .replace(/^soy\s+/i, "")
      .replace(/^mi nombre es\s+/i, "")
      .trim();
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();

    if (!studentName) {
      const detectedName = normalizeName(userText);
      setStudentName(detectedName || userText);
    }

    const evalInfo = inferFeedback(userText);
    const gainedXpBase = rewardXp(evalInfo.score, userText);

    const previousLevelIndex = currentLevelIndex;
    const nextConversation = [...messages, { role: "user", text: userText }];

    setMessages(nextConversation);
    setInput("");
    setAvatarMood(evalInfo.mood);
    setFeedback("");
    setIsLoading(true);

    try {
      const reply = await getTutorReply({
        userText,
        conversation: nextConversation,
        studentName: studentName || normalizeName(userText) || userText,
        studentLevel: currentLevel.name,
      });

      const detectedLevelIndex = extractLevelFromReply(reply);
      if (detectedLevelIndex !== null) {
        setCurrentLevelIndex(detectedLevelIndex);
      }

      const bonusXp = evaluateBadges(userText, evalInfo);
      const totalGainedXp = gainedXpBase + bonusXp;
      const nextXp = xp + totalGainedXp;
      const nextLevelIndex = Math.min(levels.length - 1, Math.floor(nextXp / 80));

      if (nextLevelIndex > currentLevelIndex) {
        setCurrentLevelIndex(nextLevelIndex);
      }

      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      setXp(nextXp);

      if (evalInfo.score >= 3) setStreak((prev) => prev + 1);
      else setStreak(0);

      if (nextLevelIndex > previousLevelIndex) {
        playLevelUpSound();
        setFeedback(
          `🎉🥇⚔️ Subiste a nivel ${levels[nextLevelIndex].n}: ${levels[nextLevelIndex].name} · +${totalGainedXp} XP`
        );
      } else {
        setFeedback(`Calidad ${evalInfo.score}/5 · +${totalGainedXp} XP`);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Hubo un problema al responder. Volvamos a intentar.",
        },
      ]);
      setFeedback("Error al contactar la IA.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!started) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#dbeafe,#cffafe,#fde68a)",
          padding: 24,
          fontFamily: "sans-serif",
          boxSizing: "border-box",
        }}
      >
        <div style={{ ...cardStyle({ width: "100%", maxWidth: 460, textAlign: "center" }) }}>
          <div style={{ fontSize: 64, marginBottom: 10 }}>🥷</div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15 }}>
            SamurAI del pensamiento
          </h1>
          <p style={{ color: "#475569", fontSize: 15, marginTop: 8, lineHeight: 1.45 }}>
            Entrena tu mente, gana experiencia y sube en la Escalera del Pensador
          </p>

          <button
            onClick={startApp}
            style={{
              marginTop: 12,
              width: "100%",
              padding: 12,
              borderRadius: 14,
              border: 0,
              color: "white",
              fontWeight: 800,
              fontSize: 15,
              background: "linear-gradient(135deg,#2563eb,#06b6d4,#f59e0b)",
              cursor: "pointer",
            }}
          >
            🚀 Entrar a la batalla!
          </button>

          <div style={{ marginTop: 14, fontSize: 12, color: "#64748b" }}>
            🔊 Luego podrás activar o desactivar los sonidos
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        background: "linear-gradient(135deg,#eff6ff,#ecfeff,#fef3c7)",
        padding: 14,
        fontFamily: "sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          height: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div
          style={{
            ...cardStyle({
              flexShrink: 0,
              padding: 14,
            }),
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr auto 1fr auto",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                Alumno
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {studentName || "Sin nombre"}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#f8fafc",
                borderRadius: 18,
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 18,
                  overflow: "hidden",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...avatarFrameStyle(currentLevelIndex),
                }}
              >
                <img
                  src={currentLevel.avatar}
                  alt={`Avatar nivel ${currentLevel.n}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                  Nivel
                </span>
                <span style={{ fontWeight: 900, fontSize: 20 }}>{currentLevel.n}</span>
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#475569",
                  marginBottom: 6,
                }}
              >
                <span>{currentLevel.name}</span>
                <span>{Math.round(progressWithinLevel)}%</span>
              </div>
              <div
                style={{
                  height: 12,
                  borderRadius: 999,
                  background: "#e2e8f0",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progressWithinLevel}%`,
                    height: "100%",
                    background: "linear-gradient(135deg,#2563eb,#06b6d4,#f59e0b)",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "#64748b",
                  fontWeight: 700,
                }}
              >
                {xp % 80 === 0 && xp > 0
                  ? "Nivel recién alcanzado"
                  : `Te faltan ${80 - (xp % 80)} XP para el siguiente nivel`}
              </div>
            </div>

            <button
              onClick={() => setSoundOn((prev) => !prev)}
              style={soundButtonStyle(soundOn)}
            >
              {soundOn ? "🔊" : "🔇"}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <div
              style={{
                background: "#fef08a",
                borderRadius: 16,
                padding: "12px 14px",
              }}
            >
              <div style={{ fontSize: 11, color: "#475569", fontWeight: 800, textTransform: "uppercase" }}>
                XP
              </div>
              <div style={{ fontWeight: 900, fontSize: 24 }}>{xp}</div>
            </div>

            <div
              style={{
                background: "#bfdbfe",
                borderRadius: 16,
                padding: "12px 14px",
              }}
            >
              <div style={{ fontSize: 11, color: "#475569", fontWeight: 800, textTransform: "uppercase" }}>
                Racha
              </div>
              <div style={{ fontWeight: 900, fontSize: 24 }}>🔥 {streak}</div>
            </div>

            <div
              style={{
                background: "#dcfce7",
                borderRadius: 16,
                padding: "12px 14px",
              }}
            >
              <div style={{ fontSize: 11, color: "#475569", fontWeight: 800, textTransform: "uppercase" }}>
                Interacciones
              </div>
              <div style={{ fontWeight: 900, fontSize: 24 }}>{userTurns}</div>
            </div>

            <div
              style={{
                background: "#f5d0fe",
                borderRadius: 16,
                padding: "12px 14px",
              }}
            >
              <div style={{ fontSize: 11, color: "#475569", fontWeight: 800, textTransform: "uppercase" }}>
                Estado
              </div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 13,
                  lineHeight: 1.2,
                  marginTop: 4,
                  color: USE_REAL_AI ? "#166534" : "#991b1b",
                }}
              >
                {USE_REAL_AI ? "IA REAL ACTIVADA" : "MODO DEMO"}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 12,
              alignItems: "start",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 14 }}>
                Condecoraciones
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {badges.length === 0 ? (
                  <div style={{ color: "#64748b", fontWeight: 700, fontSize: 13 }}>
                    Aún no tienes condecoraciones
                  </div>
                ) : (
                  badges.map((badge) => (
                    <div key={badge.id} style={compactBadgeStyle}>
                      {badge.label} +{badge.bonus}
                    </div>
                  ))
                )}
              </div>

              {feedback && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "#f8fafc",
                    fontWeight: 700,
                    fontSize: 13,
                    color: "#334155",
                  }}
                >
                  {feedback}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowLadder((prev) => !prev)}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                background: "white",
                fontWeight: 800,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {showLadder ? "Ocultar escalera" : "Ver escalera"}
            </button>
          </div>

          {showLadder && (
            <div style={{ paddingTop: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>
                Escalera del pensador
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {levels.map((levelItem, idx) => {
                  const ladderStyle = getLadderCardStyle(idx, currentLevelIndex);
                  const isLocked = idx > currentLevelIndex;

                  return (
                    <div
                      key={levelItem.n}
                      style={{
                        borderRadius: 14,
                        padding: "10px 12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontWeight: 800,
                        ...ladderStyle,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>{isLocked ? "🔒" : levelItem.icon}</span>
                        <span>{levelItem.name}</span>
                      </span>

                      <span style={{ opacity: isLocked ? 0.7 : 1 }}>{levelItem.n}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            ...cardStyle({
              flex: 1,
              minHeight: 0,
              padding: 16,
            }),
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 26, fontWeight: 900 }}>SamurAI</div>
              <div style={{ color: "#64748b", fontSize: 14 }}>
                Responde con profundidad, razones y ejemplos.
              </div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              paddingRight: 4,
              scrollBehavior: "smooth",
            }}
          >
            {messages.map((m, i) => {
              const isUser = m.role === "user";

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: isUser ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "82%",
                      borderRadius: isUser ? "22px 22px 8px 22px" : "22px 22px 22px 8px",
                      padding: "14px 16px",
                      lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                      color: isUser ? "white" : "#0f172a",
                      background: isUser
                        ? "linear-gradient(135deg,#2563eb,#1d4ed8,#0f172a)"
                        : "linear-gradient(180deg,#ffffff,#f8fafc)",
                      border: isUser ? "none" : "1px solid #e2e8f0",
                      boxShadow: isUser
                        ? "0 8px 18px rgba(37,99,235,0.22)"
                        : "0 6px 16px rgba(15,23,42,0.06)",
                      wordBreak: "break-word",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        opacity: 0.75,
                        marginBottom: 6,
                      }}
                    >
                      {isUser ? "Tú" : "SamurAI"}
                    </div>

                    <div>{m.text}</div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div style={{ color: "#64748b", fontWeight: 700 }}>
                SamurAI está pensando...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div
            style={{
              flexShrink: 0,
              marginTop: 12,
              borderRadius: 20,
              border: "2px solid #bfdbfe",
              padding: 12,
              background: "white",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                color: "#64748b",
                marginBottom: 8,
              }}
            >
              Tu respuesta
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#64748b",
                marginBottom: 8,
                fontWeight: 700,
              }}
            >
              ✍️ Responde con tus propias palabras. No se permite copiar ni pegar.
            </div>

            <div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 10,
    alignItems: "end",
  }}
>
  <textarea
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={(e) => {
      const key = e.key.toLowerCase();
      const usingCommand = e.ctrlKey || e.metaKey;

      if (usingCommand && (key === "v" || key === "c" || key === "x")) {
        e.preventDefault();
        setFeedback("⚠️ No se permite copiar ni pegar. Escribe con tus propias palabras.");
        return;
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }}
    onPaste={(e) => {
      e.preventDefault();
      setFeedback("⚠️ No se permite pegar texto. Escribe con tus propias palabras.");
    }}
    onCopy={(e) => {
      e.preventDefault();
      setFeedback("⚠️ No se permite copiar desde este espacio.");
    }}
    onCut={(e) => {
      e.preventDefault();
      setFeedback("⚠️ No se permite cortar texto desde este espacio.");
    }}
    onDrop={(e) => {
      e.preventDefault();
      setFeedback("⚠️ No se permite arrastrar texto aquí.");
    }}
    onContextMenu={(e) => {
      e.preventDefault();
    }}
    placeholder="Escribe una respuesta con razones, ejemplo y profundidad..."
    rows={4}
    style={{
      width: "100%",
      resize: "none",
      padding: 14,
      borderRadius: 14,
      border: "1px solid #cbd5e1",
      fontSize: 15,
      lineHeight: 1.5,
      fontFamily: "inherit",
      boxSizing: "border-box",
    }}
  />

  <button
    onClick={handleSend}
    disabled={isLoading}
    style={{
      minHeight: 56,
      padding: "0 18px",
      borderRadius: 14,
      border: 0,
      color: "white",
      fontWeight: 800,
      background: "linear-gradient(135deg,#2563eb,#06b6d4,#f59e0b)",
      cursor: "pointer",
    }}
  >
    Enviar
  </button>
</div>
          </div>
        </div>
      </div>
    </div>
  );
}