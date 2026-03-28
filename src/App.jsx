import React, { useMemo, useState } from "react";

/**
 * Manual test cases
 * 1. Portada: escribir nombre y entrar.
 * 2. Chat: responder algo superficial -> poco XP.
 * 3. Chat: responder con "porque" + ejemplo -> más XP.
 * 4. Choice: al llegar a 40 XP, elegir la opción correcta -> feedback positivo.
 * 5. Duel: al llegar a 80 XP, elegir B -> feedback positivo.
 */

const USE_REAL_AI = true;

const levels = [
  { n: 1, name: "Novato", icon: "👶" },
  { n: 2, name: "Repetidor", icon: "🗣️" },
  { n: 3, name: "Intuitivo", icon: "💡" },
  { n: 4, name: "Explorador", icon: "🔍" },
  { n: 5, name: "Constructor", icon: "🧱" },
  { n: 6, name: "Argumentador", icon: "⚖️" },
  { n: 7, name: "Rey Crítico", icon: "🎯" },
  { n: 8, name: "Filósofo", icon: "🧠" },
  { n: 9, name: "Samurai", icon: "⚔️" },
  { n: 10, name: "GOAT", icon: "👑" },
];

const modes = [
  { id: "chat", label: "💬 Conversar" },
  { id: "quick", label: "⚡ Rápido" },
  { id: "detective", label: "🕵️ Detectar" },
  { id: "life", label: "🎯 Vida real" },
  { id: "choice", label: "🧠 Elegir" },
  { id: "duel", label: "⚔️ Duelo" },
];

const promptsByMode = {
  chat: "Responde con una idea, una razón y un ejemplo.",
  quick: "Responde en 1 frase, pero con sentido.",
  detective: "Detecta qué está mal en la frase.",
  life: "Aplica la idea a una situación real.",
  choice: "Elige la mejor opción.",
  duel: "Compara dos respuestas y elige la mejor.",
};

const starterMessages = (name = "") => [
  {
    role: "assistant",
    text: `Hola ${name}! Soy el “SamurAI del pensamiento", ayudante del profesor Alvaro. Estoy aquí para ayudarte a pensar mejor, hacer preguntas más profundas y desarrollar tu pensamiento filosófico. Para partir, cuéntame: ¿Qué te cuesta más: hacer buenas preguntas o dar buenas respuestas?”`,
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
        (/(ejemplo|por ejemplo|como cuando)/.test(lower) ? 1 : 0) +
        (/(vida|amigos|colegio|familia|verdad|felicidad|dios|amor)/.test(lower) ? 1 : 0) +
        (/(aunque|pero|depende|sin embargo)/.test(lower) ? 1 : 0),
    ),
  );

  const level = levels[Math.min(levels.length - 1, Math.max(0, score - 1))];
  const mood = score >= 4 ? "happy" : score === 3 ? "surprised" : "thinking";

  const strengths = [];
  if (lower.length > 35) strengths.push("desarrollas la idea");
  if (/(porque|ya que|por eso|debido)/.test(lower)) strengths.push("das razones");
  if (/(ejemplo|por ejemplo|como cuando)/.test(lower)) strengths.push("usas ejemplos");
  if (/(vida|amigos|colegio|familia|verdad|felicidad|dios|amor)/.test(lower)) strengths.push("conectas con la vida");
  if (!strengths.length) strengths.push("te atreves a responder");

  const improve = [];
  if (!/(porque|ya que|por eso|debido)/.test(lower)) improve.push("agregar una razón clara");
  if (!/(ejemplo|por ejemplo|como cuando)/.test(lower)) improve.push("agregar un ejemplo concreto");
  if (!/(aunque|pero|depende|sin embargo)/.test(lower)) improve.push("mostrar un matiz");
  if (!/(vida|amigos|colegio|familia|verdad|felicidad|dios|amor)/.test(lower)) improve.push("conectarlo con la vida real");

  return { score, level, mood, strengths, improve };
}

function demoTutorReply(userText, mode) {
  const info = inferFeedback(userText);
  const lower = userText.toLowerCase();

  let opening = "Voy a tomar tu idea en serio.";
  if (lower.includes("verdad")) opening = "Estás tocando un tema central: la verdad orienta nuestras decisiones.";
  if (lower.includes("felicidad")) opening = "Interesante: la felicidad no es solo una sensación, también se relaciona con el bien.";
  if (lower.includes("pensar")) opening = "Bien: ya estás reflexionando sobre el acto mismo de pensar.";

  if (mode === "quick") {
    return `${opening}\n\nAhora hazlo aún mejor: dilo en una frase corta, pero con una razón.`;
  }

  if (mode === "detective") {
    return `${opening}\n\nBuen camino. Ahora detecta exactamente qué está mal y corrígelo con tus palabras.`;
  }

  if (mode === "life") {
    return `${opening}\n\nBien. Ahora conecta tu respuesta con una situación concreta que te podría pasar a ti o a un amigo.`;
  }

  return `${opening}\n\nEvaluación rápida:\n• Nivel: ${info.level.icon} ${info.level.name}\n• Calidad: ${info.score}/5\n• Lo bueno: ${info.strengths.join(", ")}\n• A mejorar: ${info.improve.slice(0, 2).join(", ") || "seguir profundizando"}\n\nSiguiente paso: reformula tu idea con un “porque...” y un ejemplo.`;
}

async function getTutorReply({ userText, mode, conversation }) {
  if (!USE_REAL_AI) {
    return demoTutorReply(userText, mode);
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userText, mode, conversation }),
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

function exerciseCard(mode, onChoice, onDuel) {
  if (mode === "quick") {
    return (
      <div style={{ marginBottom: 18, borderRadius: 18, padding: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>⚡ Responde rápido</div>
        <div>¿Es lo mismo pensar que opinar?</div>
      </div>
    );
  }

  if (mode === "detective") {
    return (
      <div style={{ marginBottom: 18, borderRadius: 18, padding: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>🕵️ Detecta el error</div>
        <div>“La felicidad es hacer siempre lo que quiero”.</div>
      </div>
    );
  }

  if (mode === "life") {
    return (
      <div style={{ marginBottom: 18, borderRadius: 18, padding: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>🎯 Caso real</div>
        <div>Un amigo copia en una prueba. ¿Qué harías y por qué?</div>
      </div>
    );
  }

  if (mode === "choice") {
    return (
      <div style={{ marginBottom: 18, borderRadius: 18, padding: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>🧠 ¿Qué hace fuerte una respuesta?</div>
        <button onClick={() => onChoice(false)} style={optionButtonStyle}>Que sea corta</button>
        <button onClick={() => onChoice(true)} style={optionButtonStyle}>Que tenga razones</button>
        <button onClick={() => onChoice(false)} style={optionButtonStyle}>Que suene bien</button>
      </div>
    );
  }

  if (mode === "duel") {
    return (
      <div style={{ marginBottom: 18, borderRadius: 18, padding: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>⚔️ ¿Cuál respuesta es mejor?</div>
        <button onClick={() => onDuel("a")} style={optionButtonStyle}>A. “La verdad importa porque sí”.</button>
        <button onClick={() => onDuel("b")} style={optionButtonStyle}>B. “La verdad importa porque orienta nuestras decisiones y nos ajusta a la realidad”.</button>
      </div>
    );
  }

  return null;
}

const optionButtonStyle = {
  display: "block",
  width: "100%",
  textAlign: "left",
  marginTop: 8,
  padding: 12,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "white",
  cursor: "pointer",
};

export default function App() {
  const [started, setStarted] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [studentName, setStudentName] = useState("");
  const [mode, setMode] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [avatarMood, setAvatarMood] = useState("happy");
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const currentLevelIndex = Math.min(levels.length - 1, Math.floor(xp / 80));
  const currentLevel = levels[currentLevelIndex];
  const progressWithinLevel = ((xp % 80) / 80) * 100;
  const userTurns = useMemo(() => messages.filter((m) => m.role === "user").length, [messages]);

  const unlocked = {
    choice: xp >= 40,
    duel: xp >= 80,
  };

  const startApp = () => {
    if (!nameInput.trim()) return;
    const cleanName = nameInput.trim();
    setStudentName(cleanName);
    setMessages(starterMessages(cleanName));
    setStarted(true);
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const evalInfo = inferFeedback(userText);
    const gainedXp = rewardXp(evalInfo.score, userText);
    const nextConversation = [...messages, { role: "user", text: userText }];

    setMessages(nextConversation);
    setInput("");
    setAvatarMood(evalInfo.mood);
    setFeedback("");
    setIsLoading(true);

    try {
      const reply = await getTutorReply({ userText, mode, conversation: nextConversation });
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      setXp((prev) => prev + gainedXp);
      if (evalInfo.score >= 3) setStreak((prev) => prev + 1);
      else setStreak(0);
      setFeedback(`Calidad ${evalInfo.score}/5 · +${gainedXp} XP`);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Hubo un problema al responder. Volvamos a intentar." }]);
      setFeedback("Error al contactar la IA.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChoice = (correct) => {
    if (!unlocked.choice) return;
    if (correct) {
      setXp((prev) => prev + 12);
      setAvatarMood("happy");
      setFeedback("Correcto: una buena respuesta necesita razones.");
    } else {
      setAvatarMood("thinking");
      setFeedback("No exactamente. Una respuesta fuerte no solo suena bien: se justifica.");
    }
  };

  const handleDuel = (pick) => {
    if (!unlocked.duel) return;
    if (pick === "b") {
      setXp((prev) => prev + 18);
      setAvatarMood("happy");
      setFeedback("Bien elegido. La respuesta B es mejor porque da fundamento.");
    } else {
      setAvatarMood("thinking");
      setFeedback("No. La respuesta A es demasiado superficial.");
    }
  };

  if (!started) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#fde68a,#f9a8d4,#a5f3fc)", padding: 24, fontFamily: "sans-serif" }}>
        <div style={{ ...cardStyle({ width: "100%", maxWidth: 420, textAlign: "center" }) }}>
          <div style={{ fontSize: 64, marginBottom: 10 }}>🥷</div>
          <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.15 }}>SamurAI</h1>
          <p style={{ color: "#475569", fontSize: 15, marginTop: 8, lineHeight: 1.45 }}>
            Entrena tu mente como un filósofo ⚔️
          </p>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Tu nombre..."
            style={{ width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 14, border: "1px solid #cbd5e1", marginTop: 14, fontSize: 15 }}
          />
          <button
            onClick={startApp}
            style={{ marginTop: 12, width: "100%", padding: 12, borderRadius: 14, border: 0, color: "white", fontWeight: 800, fontSize: 15, background: "linear-gradient(135deg,#d946ef,#fb923c)", cursor: "pointer" }}
          >
            🚀 Empezar misión
          </button>
          <div style={{ marginTop: 14, fontSize: 12, color: "#64748b" }}>💡 Responde, gana XP y sube de nivel</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#fef3c7,#fce7f3,#cffafe)", padding: 20, fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ ...cardStyle(), display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 14, color: "#64748b", fontWeight: 700 }}>Alumno</div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{studentName}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 38 }}>{avatarFace(avatarMood)}</div>
              <div style={{ color: "#64748b", fontWeight: 700 }}>{currentLevel.icon} {currentLevel.name}</div>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700 }}>
              <span>Progreso</span>
              <span>{Math.round(progressWithinLevel)}%</span>
            </div>
            <div style={{ marginTop: 8, height: 14, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
              <div style={{ width: `${progressWithinLevel}%`, height: "100%", background: "linear-gradient(135deg,#d946ef,#fb923c)" }} />
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

          <div>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Modos</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {modes.map((item) => {
                const disabled = (item.id === "choice" && !unlocked.choice) || (item.id === "duel" && !unlocked.duel);
                return (
                  <button
                    key={item.id}
                    disabled={disabled}
                    onClick={() => setMode(item.id)}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      border: 0,
                      textAlign: "left",
                      fontWeight: 700,
                      background: mode === item.id ? "#0f172a" : disabled ? "#e2e8f0" : "#f8fafc",
                      color: mode === item.id ? "white" : disabled ? "#94a3b8" : "#0f172a",
                      cursor: disabled ? "not-allowed" : "pointer",
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ ...cardStyle(), display: "flex", flexDirection: "column", minHeight: 520 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>SamurAI híbrido</div>
              <div style={{ color: "#64748b" }}>{promptsByMode[mode]}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, background: USE_REAL_AI ? "#dcfce7" : "#fee2e2", color: USE_REAL_AI ? "#166534" : "#991b1b", padding: "8px 10px", borderRadius: 999 }}>
            {USE_REAL_AI ? "IA REAL ACTIVADA 🔥🔥🔥" : "MODO DEMO ❌"}
            </div>
          </div>

          {exerciseCard(mode, handleChoice, handleDuel)}

          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 4 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "82%", borderRadius: 20, padding: "14px 16px", lineHeight: 1.5, whiteSpace: "pre-wrap", color: m.role === "user" ? "white" : "#0f172a", background: m.role === "user" ? "linear-gradient(135deg,#0f172a,#334155)" : "#f1f5f9" }}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && <div style={{ color: "#64748b" }}>SamurAI está pensando...</div>}
          </div>

          {mode !== "choice" && mode !== "duel" && (
            <div style={{ marginTop: 16, borderRadius: 20, border: "2px solid #f5d0fe", padding: 12, background: "white" }}>
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "#64748b", marginBottom: 8 }}>Tu respuesta</div>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Escribe una respuesta con razón y ejemplo..."
                  style={{ flex: 1, padding: 14, borderRadius: 14, border: "1px solid #cbd5e1", fontSize: 15 }}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading}
                  style={{ padding: "0 18px", borderRadius: 14, border: 0, color: "white", fontWeight: 800, background: "linear-gradient(135deg,#d946ef,#fb923c)", cursor: "pointer" }}
                >
                  Enviar
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ ...cardStyle(), display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>Escalera del pensador</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            {levels.map((level, idx) => (
              <div key={level.n} style={{ borderRadius: 14, padding: "10px 12px", display: "flex", justifyContent: "space-between", background: idx === currentLevelIndex ? "linear-gradient(135deg,#d946ef,#fb923c)" : "#f1f5f9", color: idx === currentLevelIndex ? "white" : "#334155", fontWeight: 700 }}>
                <span>{level.icon} {level.name}</span>
                <span>{level.n}</span>
              </div>
            ))}
          </div>
          <div style={{ color: "#475569", fontWeight: 700 }}>Interacciones del alumno: {userTurns}</div>
          {feedback && <div style={{ padding: 12, borderRadius: 14, background: "#f8fafc", fontWeight: 700 }}>{feedback}</div>}
        </div>
      </div>
    </div>
  );
}
