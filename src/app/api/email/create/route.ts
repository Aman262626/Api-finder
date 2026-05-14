const MAIL_TM_API = "https://api.mail.tm";
const MAIL_GW_API = "https://api.mail.gw";
const GUERRILLA_API = "https://api.guerrillamail.com/ajax.php";
const TEMPMAIL_API = "https://api.tempmail.lol";

function randomString(length = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function getMailTmDomain(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/domains`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Domain fetch failed: ${res.status}`);
  const data = await res.json();
  const domain = data["hydra:member"]?.[0]?.domain;
  if (!domain) throw new Error("No domain available");
  return domain;
}

async function createWithMailTmStyle(
  baseUrl: string,
  providerName: "mailtm" | "mailgw"
): Promise<{ email: string; token: string; provider: "mailtm" | "mailgw" }> {
  const domain = await getMailTmDomain(baseUrl);
  const address = `${randomString(12)}@${domain}`;
  const password = randomString(16);

  const accRes = await fetch(`${baseUrl}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, password }),
    signal: AbortSignal.timeout(8000),
  });

  if (!accRes.ok) {
    throw new Error(`Account creation failed: ${accRes.status}`);
  }

  const tokenRes = await fetch(`${baseUrl}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, password }),
    signal: AbortSignal.timeout(8000),
  });
  const tokenData = await tokenRes.json();
  const token = tokenData.token;

  if (!token) {
    throw new Error("Failed to get auth token");
  }

  return { email: address, token, provider: providerName };
}

async function createWithGuerrilla(): Promise<{
  email: string;
  token: string;
  provider: "guerrilla";
}> {
  const res = await fetch(
    `${GUERRILLA_API}?f=get_email_address&lang=en`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error(`Guerrilla API failed: ${res.status}`);
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

async function createWithTempMailLol(): Promise<{
  email: string;
  token: string;
  provider: "tempmail";
}> {
  const res = await fetch(`${TEMPMAIL_API}/generate`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`TempMail.lol failed: ${res.status}`);
  const data = await res.json();

  if (!data.address || !data.token) {
    throw new Error("TempMail.lol returned invalid data");
  }

  return {
    email: data.address,
    token: data.token,
    provider: "tempmail",
  };
}

type ProviderFn = () => Promise<{
  email: string;
  token: string;
  provider: string;
}>;

export async function POST() {
  const providers: { name: string; fn: ProviderFn }[] = [
    { name: "mail.tm", fn: () => createWithMailTmStyle(MAIL_TM_API, "mailtm") },
    { name: "mail.gw", fn: () => createWithMailTmStyle(MAIL_GW_API, "mailgw") },
    { name: "guerrilla", fn: createWithGuerrilla },
    { name: "tempmail.lol", fn: createWithTempMailLol },
  ];

  const errors: string[] = [];

  for (const { name, fn } of providers) {
    try {
      const result = await fn();
      return Response.json(result);
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  return Response.json(
    {
      error: "All email providers failed. Please try again later.",
      details: errors,
    },
    { status: 500 }
  );
}
