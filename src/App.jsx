import React, { useMemo, useState } from "react";

const USE_REAL_AI = false;

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
  { id: "duel", label: "⚔️ Duelo" },
  { id: "detective", label: "🕵️ Detectar" },
  { id: "life", label: "🎯 Vida real" },
];

const promptsByMode = {
  chat: "Responde con una idea, una razón y un ejemplo.",
  quick: "Responde en 1 frase rápida pero con sentido.",
  duel: "Elige la mejor respuesta.",
  detective: "Detecta el error en la frase.",
  life: "Aplica la idea a una situación real.",
};

const starterMessages = (name = "") => [
  {
    role: "assistant",
    text: `Hola ${name || ""}. Soy SamurAI del pensamiento 🥷. Estoy aquí para ayudarte a pensar mejor. Empecemos: ¿qué te cuesta más, hacer buenas preguntas o dar buenas respuestas?`,
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
        (/(aunque|pero|depende|sin embargo)/.test(lower) ? 1 : 0)
    )
  );

  const levelIndex = Math.min(levels.length - 1, Math.max(0, score - 1));
  const level = levels[levelIndex];
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
  if (!/(vida|amigos|colegio|familia|verdad|felicidad|dios|amor)/.test(lower)) improve.push("aplicarlo a la vida real");

  return { score, level, mood, strengths, improve };
}

function demoTutorReply(userText, mode) {
  const info = inferFeedback(userText);
  const lower = userText.toLowerCase();

  let opening = "Voy a tomar tu idea en serio.";
  if (lower.includes("verdad")) opening = "Estás tocando un tema central: la verdad orienta nuestras decisiones.";
  if (lower.includes("felicidad")) opening = "Interesante: la felicidad no es solo sensación, también tiene que ver con el bien.";
  if (lower.includes("pensar")) opening = "Bien: ya estás reflexionando sobre el acto mismo de pensar.";

  if (mode === "improve") {
    return `${opening}\n\nTu mejora va en camino. Ahora hazla más fuerte agregando dos cosas: una razón clara y un ejemplo de la vida real.`;
  }

  return `${opening}\n\nEvaluación rápida:\n• Nivel: ${info.level.icon} ${info.level.name}\n• Calidad: ${info.score}/5\n• Lo bueno: ${info.strengths.join(", ")}\n• A mejorar: ${(info.improve.slice(0, 2).join(", ") || "seguir profundizando")}\n\nSiguiente paso: reformula tu idea en 2 o 3 líneas con un “porque...” y un ejemplo.`;
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
    improve: xp >= 20,
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
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Hubo un problema al responder. Volvamos a intentar." },
      ]);
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
          <div style={{ fontSize: 42, marginBottom: 8 }}>🥷</div>
          <h1 style={{ margin: 0, fontSize: window.innerWidth < 500 ? 22 : 26, lineHeight: 1.2, textAlign: "center", wordBreak: "break-word" }}>SamurAI del pensamiento</h1>
          <p style={{ color: "#475569", lineHeight: 1.45, fontSize: 15, marginTop: 10 }}>Versión híbrida: IA para conversar, reglas para evaluar.</p>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Escribe tu nombre..."
            style={{ width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 14, border: "1px solid #cbd5e1", marginTop: 12, fontSize: 15 }}
          />
          <button
            onClick={startApp}
            style={{ marginTop: 12, width: "100%", padding: 12, borderRadius: 14, border: 0, color: "white", fontWeight: 800, fontSize: 15, background: "linear-gradient(135deg,#d946ef,#fb923c)", cursor: "pointer" }}
          >
            Comenzar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#fef3c7,#fce7f3,#cffafe)", padding: 20, fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 20, gridTemplateColumns: window.innerWidth < 900 ? "1fr" : "280px 1fr 280px" }}>
        <div style={cardStyle()}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48 }}>{avatarFace(avatarMood)}</div>
            <div style={{ fontWeight: 800, marginTop: 4 }}>{studentName}</div>
            <div style={{ color: "#64748b", marginTop: 4 }}>Nivel actual: {currentLevel.icon} {currentLevel.name}</div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700 }}>
              <span>Progreso</span>
              <span>{Math.round(progressWithinLevel)}%</span>
            </div>
            <div style={{ marginTop: 8, height: 14, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
              <div style={{ width: `${progressWithinLevel}%`, height: "100%", background: "linear-gradient(135deg,#d946ef,#fb923c)" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 18 }}>
            <div style={{ background: "#fef08a", borderRadius: 16, padding: 14 }}>
              <div style={{ fontSize: 12, color: "#475569", fontWeight: 700 }}>XP</div>
              <div style={{ fontWeight: 900, fontSize: 28 }}>{xp}</div>
            </div>
            <div style={{ background: "#bfdbfe", borderRadius: 16, padding: 14 }}>
              <div style={{ fontSize: 12, color: "#475569", fontWeight: 700 }}>Racha</div>
              <div style={{ fontWeight: 900, fontSize: 28 }}>🔥 {streak}</div>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Modos</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {modes.map((item) => {
                const disabled = (item.id === "improve" && !unlocked.improve) || (item.id === "choice" && !unlocked.choice) || (item.id === "duel" && !unlocked.duel);
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

        <div style={{ ...cardStyle(), minHeight: window.innerWidth < 900 ? "auto" : 700, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>SamurAI híbrido</div>
              <div style={{ color: "#64748b" }}>{promptsByMode[mode]}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, background: USE_REAL_AI ? "#dcfce7" : "#fee2e2", color: USE_REAL_AI ? "#166534" : "#991b1b", padding: "8px 10px", borderRadius: 999 }}>
              {USE_REAL_AI ? "IA real activada" : "Modo demo"}
            </div>
          </div>

          {mode === "quick" ? (
            <div style={{ marginBottom: 18, borderRadius: 18, padding: 16, background: "#f8fafc" }}>
              <div style={{ fontWeight: 800 }}>Responde rápido:</div>
              <div>¿Es lo mismo pensar que opinar?</div>
            </div>
          ) : mode === "duel" ? (
            <div style={{ marginBottom: 18, borderRadius: 18, padding: 16, background: "#f8fafc" }}>
              <div style={{ fontWeight: 800 }}>¿Cuál respuesta es mejor?</div>
              <button onClick={() => handleDuel("a")} style={{ display: "block", width: "100%", marginTop: 8 }}>A. Porque sí</button>
              <button onClick={() => handleDuel("b")} style={{ display: "block", width: "100%", marginTop: 8 }}>B. Porque tiene razones y ejemplos</button>
            </div>
          ) : mode === "detective" ? (
            <div style={{ marginBottom: 18, borderRadius: 18, padding: 16, background: "#f8fafc" }}>
              <div style={{ fontWeight: 800 }}>Detecta el error:</div>
              <div>"La felicidad es hacer siempre lo que quiero"</div>
            </div>
          ) : mode === "life" ? (
            <div style={{ marginBottom: 18, borderRadius: 18, padding: 16, background: "#f8fafc" }}>
              <div style={{ fontWeight: 800 }}>Caso real:</div>
              <div>Un amigo copia en una prueba. ¿Qué harías y por qué?</div>
            </div>
          ) : null}

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

          {(mode === "chat" || mode === "quick" || mode === "detective" || mode === "life") && (
            <div style={{ marginTop: 16, borderRadius: 20, border: "2px solid #f5d0fe", padding: 12, background: "white" }}>
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "#64748b", marginBottom: 8 }}>Tu respuesta</div>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={mode === "improve" ? "Reformula mejor la respuesta..." : "Escribe una respuesta con razón y ejemplo..."}
                  style={{ flex: 1, padding: 14, borderRadius: 14, border: "1px solid #cbd5e1", fontSize: 15 }}
                />
                <button onClick={handleSend} disabled={isLoading} style={{ padding: "0 18px", borderRadius: 14, border: 0, color: "white", fontWeight: 800, background: "linear-gradient(135deg,#d946ef,#fb923c)", cursor: "pointer" }}>
                  Enviar
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={cardStyle()}>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>Reglas del híbrido</div>
            <ul style={{ paddingLeft: 18, margin: 0, color: "#475569", lineHeight: 1.6 }}>
              <li>La IA conversa y desafía.</li>
              <li>Las reglas ponen el score.</li>
              <li>El XP depende de calidad, no de cantidad.</li>
              <li>Los modos se desbloquean con progreso real.</li>
            </ul>
          </div>

          <div style={cardStyle()}>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>Escalera</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {levels.map((level, idx) => (
                <div key={level.n} style={{ borderRadius: 14, padding: "10px 12px", display: "flex", justifyContent: "space-between", background: idx === currentLevelIndex ? "linear-gradient(135deg,#d946ef,#fb923c)" : "#f1f5f9", color: idx === currentLevelIndex ? "white" : "#334155", fontWeight: 700 }}>
                  <span>{level.icon} {level.name}</span>
                  <span>{level.n}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, color: "#475569", fontWeight: 700 }}>Interacciones del alumno: {userTurns}</div>
            {feedback && <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "#f8fafc", fontWeight: 700 }}>{feedback}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
