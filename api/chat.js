import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Falta OPENAI_API_KEY en Vercel" });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { userText, mode, conversation } = req.body || {};

    const systemPrompt = `
Eres SamurAI del pensamiento 🥷.
Tutor para alumnos de 7° básico.
Sé breve, claro, desafiante y socrático.
No regales la respuesta.
Pide razones y ejemplos.
Máximo 4 líneas.
Modo actual: ${mode}
`;

    const history = (conversation || [])
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
    console.error("ERROR /api/chat:", error);
    return res.status(500).json({
      error: error?.message || "Error con la IA",
    });
  }
}