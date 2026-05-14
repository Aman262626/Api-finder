const MAIL_API = "https://api.mail.tm";

function randomString(length = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function getDomain(): Promise<string> {
  const res = await fetch(`${MAIL_API}/domains`, {
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  return data["hydra:member"]?.[0]?.domain ?? "clerk.com";
}

export async function POST() {
  try {
    const domain = await getDomain();
    const address = `${randomString(12)}@${domain}`;
    const password = randomString(16);

    await fetch(`${MAIL_API}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, password }),
      signal: AbortSignal.timeout(10000),
    });

    const tokenRes = await fetch(`${MAIL_API}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, password }),
      signal: AbortSignal.timeout(10000),
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.token;

    if (!token) {
      return Response.json(
        { error: "Failed to get auth token" },
        { status: 500 }
      );
    }

    return Response.json({ email: address, token });
  } catch {
    return Response.json(
      { error: "Failed to create email" },
      { status: 500 }
    );
  }
}
