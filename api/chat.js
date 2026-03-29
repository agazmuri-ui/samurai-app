import OpenAI from "openai";

// ⚠️ FIX PRINCIPAL: usar runtime Node explícito para Vercel
export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  // Permitir GET para debug
  if (req.method === "GET") {
    return res.status(200).json({ status: "API alive" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("❌ Falta OPENAI_API_KEY");
      return res.status(500).json({ error: "Falta OPENAI_API_KEY en Vercel" });
    }

    const client = new OpenAI({ apiKey });

    // ⚠️ FIX: asegurar parseo del body
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { userText = "", mode = "chat", conversation = [] } = body || {};

    const systemPrompt = `
Eres SamurAI del pensamiento 🥷.
Tutor para alumnos de 7° básico.
Sé breve, claro, desafiante y socrático.
No regales la respuesta.
Pide razones y ejemplos.
Máximo 4 líneas.
Modo actual: ${mode}
`;

    const history = conversation
      .map((m) => `${m.role === "assistant" ? "Tutor" : "Alumno"}: ${m.text}`)
      .join("\n");

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Conversación previa:\n${history}\n\nAlumno:\n${userText}`,
        },
      ],
    });

    return res.status(200).json({
      reply: response.output_text || "No pude generar respuesta.",
    });
  } catch (error) {
    console.error("🔥 ERROR /api/chat:", error);

    return res.status(500).json({
      error: error?.message || "Error con la IA",
      stack: error?.stack, // 🔥 clave para debug en Vercel
    });
  }
}
