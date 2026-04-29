import { verifyGoogleIdToken } from "./google-auth.js";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const idToken = body?.idToken;

    const { user, reason } = await verifyGoogleIdToken(idToken);
    if (!user) {
      return res
        .status(401)
        .json({ error: "Credenciales de Google inválidas.", reason: reason || "unknown" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Error de autenticación." });
  }
}
