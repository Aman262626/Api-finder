const MAIL_API = "https://api.mail.tm";
const GUERRILLA_API = "https://api.guerrillamail.com/ajax.php";

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

async function createWithMailTm(): Promise<{
  email: string;
  token: string;
  provider: "mailtm";
}> {
  const domain = await getDomain();
  const address = `${randomString(12)}@${domain}`;
  const password = randomString(16);

  const accRes = await fetch(`${MAIL_API}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, password }),
    signal: AbortSignal.timeout(10000),
  });

  if (!accRes.ok) {
    throw new Error(`Account creation failed: ${accRes.status}`);
  }

  const tokenRes = await fetch(`${MAIL_API}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, password }),
    signal: AbortSignal.timeout(10000),
  });
  const tokenData = await tokenRes.json();
  const token = tokenData.token;

  if (!token) {
    throw new Error("Failed to get auth token from mail.tm");
  }

  return { email: address, token, provider: "mailtm" };
}

async function createWithGuerrilla(): Promise<{
  email: string;
  token: string;
  provider: "guerrilla";
}> {
  const res = await fetch(
    `${GUERRILLA_API}?f=get_email_address&lang=en`,
    { signal: AbortSignal.timeout(10000) }
  );
  const data = await res.json();

  if (!data.email_addr || !data.sid_token) {
    throw new Error("Guerrilla Mail failed");
  }

  return {
    email: data.email_addr,
    token: data.sid_token,
    provider: "guerrilla",
  };
}

export async function POST() {
  // Try mail.tm first with retry
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await createWithMailTm();
      return Response.json(result);
    } catch {
      if (attempt === 1) break;
    }
  }

  // Fallback to guerrillamail
  try {
    const result = await createWithGuerrilla();
    return Response.json(result);
  } catch {
    return Response.json(
      { error: "Email generate nahi ho paya. Please try again." },
      { status: 500 }
    );
  }
}
