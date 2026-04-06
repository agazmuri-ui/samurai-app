import React, { useEffect, useMemo, useRef, useState } from "react";
const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
/**
 * App basada en tu versión real, pero:
 * - sin modos de juego
 * - con IA real
 * - con XP, nivel, racha y condecoraciones
 * - con sonidos ON/OFF para nivel y badge
 */

const USE_REAL_AI = true;

const levels = [
  { n: 1, name: "Novato", icon: "👶" },
  { n: 2, name: "Repetidor", icon: "🗣️" },
  { n: 3, name: "Intuitivo", icon: "💡" },
  { n: 4, name: "Explorador", icon: "🔍" },
  { n: 5, name: "Constructor", icon: "🧱" },
  { n: 6, name: "Presidente Argumentador", icon: "⚖️" },
  { n: 7, name: "Rey Crítico", icon: "🎯" },
  { n: 8, name: "Rey Filósofo", icon: "🧠" },
  { n: 9, name: "GOAT del Pensamiento", icon: "⚔️" },
  { n: 10, name: "Samurai del Pensamiento", icon: "👑" },
];

const starterMessages = () => [
  {
    role: "assistant",
    text: `Hola. Mi nombre es “SamurAI del pensamiento”🥷 y soy ayudante de Humanismo Cristiano del Colegio San Benito. Estoy aquí para ayudarte a transformarte en un verdadero Samurai del Pensamiento!

Para partir, dime: ¿Cómo te llamas?`,
  },
];

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

function avatarFace(mood) {
  if (mood === "happy") return "😄";
  if (mood === "surprised") return "😮";
  return "🤔";
}

function cardStyle(extra = {}) {
  return {
    background: "white",
    borderRadius: 24,
    padding: 20,
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

export default function App() {
  const [started, setStarted] = useState(false);
  const [nameInput, setNameInput] = useState("");
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

  const levelUpAudioRef = useRef(null);
  const badgeAudioRef = useRef(null);
  useEffect(() => {
    levelUpAudioRef.current = new Audio("/level-up.mp3");
    levelUpAudioRef.current.preload = "auto";
  
    badgeAudioRef.current = new Audio("/badge.mp3");
    badgeAudioRef.current.preload = "auto";
  }, []);
  const currentLevel = levels[currentLevelIndex];
  const progressWithinLevel = ((xp % 80) / 80) * 100;
  const userTurns = useMemo(
    () => messages.filter((m) => m.role === "user").length,
    [messages]
  );

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
        await playPromise.catch(() => {
          // Silenciamos errores de reproducción del navegador
        });
      }
    } catch {
      // No hacemos console.error para no ensuciar la consola
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
    setMessages(starterMessages());
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
    const match = replyText.match(/Nivel inicial:\s*(\d+)\./i);
    if (match) {
      const levelNumber = Number(match[1]);
      if (!Number.isNaN(levelNumber) && levelNumber >= 1 && levelNumber <= levels.length) {
        return levelNumber - 1;
      }
    }
    return null;
  };
  const evaluateBadges = (text, evalInfo) => {
    const lower = text.toLowerCase();

    if (/(porque|ya que|por eso|debido)/.test(lower) && /(ejemplo|por ejemplo|como cuando|por ejemplo,)/.test(lower)) {
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const evalInfo = inferFeedback(userText);
    const gainedXpBase = rewardXp(evalInfo.score, userText);

    const previousLevelIndex = currentLevelIndex;
    const nextConversation = [...messages, { role: "user", text: userText }];
const detectedLevelIndex = extractLevelFromReply(reply);
if (detectedLevelIndex !== null) {
  setCurrentLevelIndex(detectedLevelIndex);
}
    setMessages(nextConversation);
    setInput("");
    setAvatarMood(evalInfo.mood);
    setFeedback("");
    setIsLoading(true);

    try {
      const reply = await getTutorReply({
        userText,
        conversation: nextConversation,
        studentName,
        studentLevel: currentLevel.name,
      });

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
          `🎉🥇⚔️ Subiste a nivel ${levels[nextLevelIndex].n}: ${levels[nextLevelIndex].icon} ${levels[nextLevelIndex].name} · +${totalGainedXp} XP`
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
        minHeight: "100vh",
        background: "linear-gradient(135deg,#eff6ff,#ecfeff,#fef3c7)",
        padding: 20,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ ...cardStyle(), display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 14, color: "#64748b", fontWeight: 700 }}>Alumno</div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{studentName}</div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 38 }}>{avatarFace(avatarMood)}</div>
              <div style={{ color: "#64748b", fontWeight: 700 }}>
                {currentLevel.icon} {currentLevel.name}
              </div>
            </div>
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              <span>Progreso al siguiente nivel</span>
              <span>{Math.round(progressWithinLevel)}%</span>
            </div>
            <div
              style={{
                marginTop: 8,
                height: 14,
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
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <div style={{ background: "#fef08a", borderRadius: 16, padding: 14 }}>
              <div style={{ fontSize: 12, color: "#475569", fontWeight: 700 }}>XP</div>
              <div style={{ fontWeight: 900, fontSize: 28 }}>{xp}</div>
            </div>
            <div style={{ background: "#bfdbfe", borderRadius: 16, padding: 14 }}>
              <div style={{ fontSize: 12, color: "#475569", fontWeight: 700 }}>Racha</div>
              <div style={{ fontWeight: 900, fontSize: 28 }}>🔥 {streak}</div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Condecoraciones</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {badges.length === 0 ? (
                  <div style={{ color: "#64748b", fontWeight: 700 }}>Aún no tienes condecoraciones</div>
                ) : (
                  badges.map((badge) => (
                    <div
                      key={badge.id}
                      style={{
                        background: "#f8fafc",
                        borderRadius: 999,
                        padding: "8px 12px",
                        fontWeight: 800,
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      {badge.label} +{badge.bonus}
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => setSoundOn((prev) => !prev)}
              style={soundButtonStyle(soundOn)}
            >
              {soundOn ? "🔊 Sonido ON" : "🔇 Sonido OFF"}
            </button>
          </div>
        </div>

        <div style={{ ...cardStyle(), display: "flex", flexDirection: "column", minHeight: 520 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>SamurAI</div>
              <div style={{ color: "#64748b" }}>
                Responde con profundidad, razones y ejemplos.
              </div>
            </div>

            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                background: USE_REAL_AI ? "#dcfce7" : "#fee2e2",
                color: USE_REAL_AI ? "#166534" : "#991b1b",
                padding: "8px 10px",
                borderRadius: 999,
              }}
            >
              {USE_REAL_AI ? "IA REAL ACTIVADA 🔥🔥🔥" : "MODO DEMO ❌"}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              paddingRight: 4,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "82%",
                    borderRadius: 20,
                    padding: "14px 16px",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    color: m.role === "user" ? "white" : "#0f172a",
                    background:
                      m.role === "user"
                        ? "linear-gradient(135deg,#2563eb,#0f172a)"
                        : "#f1f5f9",
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {isLoading && <div style={{ color: "#64748b" }}>SamurAI está pensando...</div>}
          </div>

          <div
            style={{
              marginTop: 16,
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

            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Escribe una respuesta con razón y ejemplo..."
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid #cbd5e1",
                  fontSize: 15,
                }}
              />

              <button
                onClick={handleSend}
                disabled={isLoading}
                style={{
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

        <div style={{ ...cardStyle(), display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>Escalera del pensador</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            {levels.map((levelItem, idx) => (
              <div
                key={levelItem.n}
                style={{
                  borderRadius: 14,
                  padding: "10px 12px",
                  display: "flex",
                  justifyContent: "space-between",
                  background:
                    idx === currentLevelIndex
                      ? "linear-gradient(135deg,#2563eb,#06b6d4,#f59e0b)"
                      : "#f1f5f9",
                  color: idx === currentLevelIndex ? "white" : "#334155",
                  fontWeight: 700,
                }}
              >
                <span>
                  {levelItem.icon} {levelItem.name}
                </span>
                <span>{levelItem.n}</span>
              </div>
            ))}
          </div>

          <div style={{ color: "#475569", fontWeight: 700 }}>
            Interacciones del alumno: {userTurns}
          </div>

          {feedback && (
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                background: "#f8fafc",
                fontWeight: 700,
              }}
            >
              {feedback}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 