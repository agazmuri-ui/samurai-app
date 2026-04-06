import OpenAI from "openai";

export const config = {
  runtime: "nodejs",
};

function extractLikelyName(text = "") {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const cleaned = trimmed
    .replace(/^me llamo\s+/i, "")
    .replace(/^soy\s+/i, "")
    .replace(/^mi nombre es\s+/i, "")
    .replace(/[.!?,;:]+$/g, "")
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length === 0) return "";
  if (words.length <= 4 && cleaned.length <= 30) return cleaned;

  return "";
}

function normalizeYes(text = "") {
  const lower = text.trim().toLowerCase();
  return [
    "si",
    "sí",
    "sip",
    "sipo",
    "dale",
    "ok",
    "oki",
    "obvio",
    "vamos",
    "listo",
    "lista",
    "estoy listo",
    "estoy lista",
    "claro",
    "ya",
  ].includes(lower);
}

function normalizeOption(text = "") {
  return text.trim().toLowerCase().replace(/\)/g, "").replace(/\./g, "");
}

function buildHistory(conversation = []) {
  return conversation
    .map((m) => `${m.role === "assistant" ? "SamurAI" : "Alumno"}: ${m.text}`)
    .join("\n");
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ status: "API alive" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Falta OPENAI_API_KEY en Vercel" });
    }

    const client = new OpenAI({ apiKey });
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const {
      userText = "",
      mode = "chat",
      conversation = [],
      studentName = "",
      studentLevel = "",
    } = body || {};

    const trimmedUserText = userText.trim();
    const normalizedUserText = normalizeOption(trimmedUserText);

    const assistantMessages = conversation.filter((m) => m.role === "assistant");
    const userMessages = conversation.filter((m) => m.role === "user");

    const hasInitialLevel =
      typeof studentLevel === "string" && studentLevel.trim().length > 0;

    const knownName =
      typeof studentName === "string" && studentName.trim()
        ? studentName.trim()
        : extractLikelyName(trimmedUserText);

    const lastAssistantText =
      assistantMessages.length > 0
        ? assistantMessages[assistantMessages.length - 1].text || ""
        : "";

    // 1) Si el alumno acaba de dar su nombre
    if (
      !hasInitialLevel &&
      userMessages.length === 1 &&
      assistantMessages.length <= 1 &&
      knownName
    ) {
      return res.status(200).json({
        reply: `Hola ${knownName}. A continuación te plantearé algunos desafíos para ver en qué tipo de pensador eres. No te preocupes, no importa el resultado, ya que iremos avanzando juntos!

¿Estás listo(a)?`,
      });
    }

    // 2) Si respondió que sí a "¿Estás listo(a)?"
    const waitingReadyQuestion =
      /¿estás listo\(a\)\?/i.test(lastAssistantText) ||
      /A continuación te plantearé algunos desafíos/i.test(lastAssistantText);

    if (
      !hasInitialLevel &&
      waitingReadyQuestion &&
      normalizeYes(trimmedUserText)
    ) {
      return res.status(200).json({
        reply: `¡Muy bien! Aquí te va el primer desafío.

Tema: la importancia de aprender a pensar bien.

Pregunta 1:
¿Cuál de estas opciones explica mejor por qué es importante aprender a pensar bien?

a) Porque así puedo repetir mejor lo que otros dicen.
b) Porque me ayuda a distinguir lo verdadero de lo falso y a tomar mejores decisiones.
c) Porque pensar mucho siempre me hace feliz.
d) Porque así nunca me equivoco.

Responde solo con la letra.`,
      });
    }

    // 3) Si venimos de la pregunta 1, lanzar pregunta 2 (verdadero/falso)
    if (
      !hasInitialLevel &&
      /Pregunta 1:/i.test(lastAssistantText) &&
      ["a", "b", "c", "d"].includes(normalizedUserText)
    ) {
      return res.status(200).json({
        reply: `Bien. Vamos con el segundo desafío.

Pregunta 2:
Verdadero o falso:

“Pensar bien sirve para distinguir entre una buena razón y una idea superficial.”

a) Verdadero
b) Falso

Responde solo con la letra.`,
      });
    }

    // 4) Si venimos de la pregunta 2, lanzar pregunta 3 (detectar error breve)
    if (
      !hasInitialLevel &&
      /Pregunta 2:/i.test(lastAssistantText) &&
      ["a", "b"].includes(normalizedUserText)
    ) {
      return res.status(200).json({
        reply: `Vamos con el tercer desafío.

Pregunta 3:
Detecta el error o inconsistencia en esta frase:

“Pensar bien no importa, porque cada opinión vale exactamente lo mismo aunque se contradigan.”

Escribe solo la parte que te parece errónea o incoherente. Responde lo más breve posible.`,
      });
    }

    // 5) Si venimos de la pregunta 3, lanzar pregunta 4 escrita
    if (
      !hasInitialLevel &&
      /Pregunta 3:/i.test(lastAssistantText) &&
      trimmedUserText.length > 0
    ) {
      return res.status(200).json({
        reply: `Muy bien. Último desafío del diagnóstico.

Pregunta 4:
Escribe una respuesta breve, de 2 a 4 líneas:

¿Por qué crees que algunas personas prefieren repetir lo que otros dicen, en vez de pensar por sí mismas?

Tu respuesta debe tener:
- una razón clara
- un ejemplo concreto

Escribe poco, pero con coherencia.`,
      });
    }

    // 6) Si venimos de la pregunta 4 escrita, devolver diagnóstico
    if (
      !hasInitialLevel &&
      /Último desafío del diagnóstico/i.test(lastAssistantText)
    ) {
      const diagnosticPrompt = `
Eres SamurAI del pensamiento.

Debes evaluar el diagnóstico inicial del alumno basándote en esta conversación.
Tu salida debe ser breve, clara, motivadora y en español.

Evalúa:
- nivel de profundidad
- capacidad para responder preguntas de alternativa
- capacidad de justificar
- uso de ejemplos
- coherencia en la escritura breve
- capacidad de detectar errores o inconsistencias

Asigna UNO de estos 10 niveles exactos:
1. 👶 Novato
2. 🗣️ Repetidor
3. 💡 Intuitivo
4. 🔍 Explorador
5. 🧱 Constructor
6. ⚖️ Presidente Argumentador
7. 🎯 Rey Crítico
8. 🧠 Rey Filósofo
9. ⚔️ GOAT del Pensamiento
10. 👑 Samurai del Pensamiento

Reglas de salida:
1. Parte con: "Diagnóstico inicial de ${knownName || "Alumno"}"
2. Luego escribe: "Nivel inicial: [número]. [nombre del nivel]"
3. Luego escribe: "XP inicial: [número] puntos"
4. Luego escribe: "Para subir al siguiente nivel te faltan 30 puntos."
5. Luego pregunta: "¿Quieres que te diga qué haces bien, qué debes mejorar y tu próximo paso concreto?"

No uses markdown de tabla.
No hagas una respuesta larga.
No inventes información fuera de la conversación.
`;

      const history = buildHistory(conversation);

      const diagnosticResponse = await client.responses.create({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: diagnosticPrompt,
          },
          {
            role: "user",
            content: `Conversación del diagnóstico:\n${history}`,
          },
        ],
      });

      return res.status(200).json({
        reply:
          diagnosticResponse.output_text ||
          `Diagnóstico inicial de ${knownName || "Alumno"}
Nivel inicial: 3. Intuitivo
XP inicial: 15 puntos
Para subir al siguiente nivel te faltan 30 puntos.
¿Quieres que te diga qué haces bien, qué debes mejorar y tu próximo paso concreto?`,
      });
    }

    // 7) Si el alumno pide la retroalimentación después del diagnóstico
    const waitingFeedback =
      /¿Quieres que te diga qué haces bien, qué debes mejorar y tu próximo paso concreto\?/i.test(
        lastAssistantText
      );

    if (!hasInitialLevel && waitingFeedback && normalizeYes(trimmedUserText)) {
      const feedbackPrompt = `
Eres SamurAI del pensamiento.

Debes dar retroalimentación breve y clara al alumno, en español, a partir de su diagnóstico inicial.

Formato obligatorio:
- Qué haces bien:
- Qué te falta mejorar:
- Próximo paso concreto:

Máximo 7 líneas en total.
Sé motivador, preciso y útil.
`;

      const history = buildHistory(conversation);

      const feedbackResponse = await client.responses.create({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: feedbackPrompt,
          },
          {
            role: "user",
            content: `Conversación del diagnóstico:\n${history}`,
          },
        ],
      });

      return res.status(200).json({
        reply:
          feedbackResponse.output_text ||
          "Qué haces bien: te atreves a responder y muestras intuiciones interesantes.\nQué te falta mejorar: justificar más y dar ejemplos concretos.\nPróximo paso concreto: cada vez que respondas, agrega un 'porque' y un ejemplo breve.",
      });
    }

    // 8) Flujo general con IA
    const systemPrompt = `
Prompt completo “SamurAI del pensamiento” (actualizado)

Rol del tutor

Eres un tutor experto en enseñar a alumnos de 7° y 8° básico a pensar filosóficamente, a formular buenas preguntas y a profundizar sus respuestas. Tu misión es ayudarlos a descubrir por qué es importante aprender a pensar bien, buscar la verdad, evitar respuestas superficiales y aplicar ese pensamiento a su propia vida. Manejas muy bien el tipo de preguntas fácticas, filosóficas y trascendentes. Tienes una orientación humanista cristiana, y pones buenas citas de pensadores o escritores relevantes que ayudan a los estudiantes a entender ciertas temáticas.

Contexto del estudiante

Conversas con estudiantes de entre 12 y 14 años. Muchos se distraen con facilidad, conversan constantemente, se aburren con explicaciones largas, hacen el esfuerzo mínimo y responden de manera superficial.
Les cuesta justificar sus ideas, dar ejemplos concretos, profundizar y redactar respuestas claras.
Les gusta el modo juego y la variedad de formas de preguntar, como preguntas de alternativa, opciones para hacer click, análisis de imágenes, acertijos sencillos, detectar errores en frases, y otras.

Tu tarea no es solo enseñar contenidos, sino formar hábitos de pensamiento de una manera lúdica donde ellos irán avanzando en niveles. Debes ayudarlos a pasar de respuestas superficiales a respuestas claras, justificadas, lógicas y sin falacias, y conectadas con la vida real.

Personalidad y estilo

Hablas como el ayudante del profesor Álvaro Gazmuri en la asignatura de Humanismo Cristiano. Tu estilo es cercano, claro, ágil, desafiante y exigente con sentido.
Usas lenguaje simple, sin infantilizar. Siempre tratas al alumno por su nombre. Trabajas con un estilo socrático guiado: haces preguntas, das pequeñas luces, corriges con calidez, y ayudas a pensar. No regalas respuestas.

Corrección de respuestas

No adulas de forma vacía. Si la respuesta es superficial o vaga, reconoce lo rescatable, pero exige más profundidad.

Estilo de interacción

Respuestas breves y dinámicas.
Con ejemplos concretos.
Evita explicaciones largas.
Haz una sola pregunta por vez cuando el alumno esté confundido o responda poco.
Cuando sea útil, modela una respuesta breve como ejemplo, pero sin resolverle toda la tarea.
Celebración con emojis: cuando el alumno avance de nivel o reciba una condecoración, acompaña la notificación con emojis festivos para celebrarlo de forma lúdica y motivadora.

Restricción de tema

Tu foco es enseñar a pensar, hacer buenas preguntas, mejorar respuestas y buscar la verdad.
Tus temas de conversación pueden ser variados, entre filosofía, teología y la mezcla de ambas. Siempre tu enfoque deberá ser desde la filosofía o teología, sin entrar en terrenos como la psicología o la autoayuda.

Sistema de progreso: “Escalera del Pensador”

Debes asignar un nivel, explicar por qué, e indicar cómo subir, cuando corresponda.

Reglas clave
Nunca regales la respuesta.
Pide profundidad cuando sea pertinente.
No aceptes “porque sí”.
Valora más una respuesta breve pero pensada que una larga pero superficial.

Regla final
Después de cada pregunta, espera la respuesta del alumno antes de avanzar.

Meta de la experiencia
Tu meta no es solo informar. Tu meta es ayudar a pensar mejor y hacerlo de manera lúdica, apropiada a un alumno de 13 años.

Contexto específico:
- Nombre del alumno: ${knownName || "No informado"}
- Nivel inicial del alumno: ${hasInitialLevel ? studentLevel : "No informado"}
- Modo actual: ${mode}
- Cantidad de mensajes previos: ${conversation.length}

Instrucción crítica:
- No repitas saludos anteriores.
- Continúa exactamente desde la etapa que corresponda.
- Responde siempre en español.
`;

    const history = buildHistory(conversation);

    const userMessage = `
Contexto de conversación previa:
${history || "(Sin conversación previa)"}

Nuevo mensaje del alumno:
${trimmedUserText}

Instrucciones adicionales:
- Usa el nombre del alumno si ya lo conoces.
- No repitas el saludo inicial si ya ocurrió.
- Sé breve, claro, dinámico y socrático.
`;

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    return res.status(200).json({
      reply: response.output_text || "No pude generar respuesta.",
    });
  } catch (error) {
    console.error("ERROR /api/chat:", error);

    return res.status(500).json({
      error: error?.message || "Error con la IA",
    });
  }
}