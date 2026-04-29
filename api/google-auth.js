const GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";

export async function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") return null;

  try {
    const response = await fetch(
      `${GOOGLE_TOKEN_INFO_URL}?id_token=${encodeURIComponent(idToken)}`
    );

    if (!response.ok) return null;

    const payload = await response.json();
    const expectedClientId = globalThis?.process?.env?.GOOGLE_CLIENT_ID;

    if (expectedClientId && payload.aud !== expectedClientId) {
      return null;
    }

    if (payload.email_verified !== "true") {
      return null;
    }

    return {
      id: payload.sub,
      name: payload.name || "",
      email: payload.email || "",
      picture: payload.picture || "",
    };
  } catch {
    return null;
  }
}
