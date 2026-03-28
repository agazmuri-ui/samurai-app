import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userText, mode, conversation } = req.body;

    const systemPrompt = `
Eres SamurAI del pensamiento 🥷.

Eres un tutor de alumnos de 7° básico (12-13 años).

Tu estilo:
- claro
- desafiante
- breve
- entretenido
- socrático (haces pensar)

Reglas:
- no des respuestas completas
- siempre pide razones ("¿por qué?")
- siempre pide ejemplos concretos
- usa lenguaje cercano
- máximo 4-5 líneas

Modo actual: ${mode}
`;

    const history = (conversation || [])
      .map((m) => `${m.role === "assistant" ? "Tutor" : "Alumno"}: ${m.text}`)
      .join("\n");

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
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
      reply: response.output_text,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Error con la IA",
    });
  }
}