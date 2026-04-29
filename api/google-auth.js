const GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";

export async function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") {
    return { user: null, reason: "missing_token" };
  }

  try {
    const response = await fetch(
      `${GOOGLE_TOKEN_INFO_URL}?id_token=${encodeURIComponent(idToken)}`
    );

    if (!response.ok) {
      return { user: null, reason: `google_tokeninfo_${response.status}` };
    }

    const payload = await response.json();
    const expectedClientId = globalThis?.process?.env?.GOOGLE_CLIENT_ID;

    if (expectedClientId && payload.aud !== expectedClientId) {
      return { user: null, reason: "audience_mismatch" };
    }

    const emailVerified =
      payload.email_verified === "true" || payload.email_verified === true;
    if (!emailVerified) {
      return { user: null, reason: "email_not_verified" };
    }

    return {
      user: {
        id: payload.sub,
        name: payload.name || "",
        email: payload.email || "",
        picture: payload.picture || "",
      },
      reason: null,
    };
  } catch {
    return { user: null, reason: "token_validation_error" };
  }
}
