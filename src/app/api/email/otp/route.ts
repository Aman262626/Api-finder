import type { NextRequest } from "next/server";

const MAIL_API = "https://api.mail.tm";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return Response.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${MAIL_API}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    const messages: Array<Record<string, unknown>> =
      data["hydra:member"] ?? [];

    const otpCodes: string[] = [];

    for (const msg of messages.slice(0, 10)) {
      const msgRes = await fetch(`${MAIL_API}/messages/${msg.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      });
      const msgData = await msgRes.json();
      const text = `${msgData.text ?? ""} ${msgData.subject ?? ""}`;
      const codes = text.match(/\b\d{4,8}\b/g);
      if (codes) {
        otpCodes.push(...codes);
      }
    }

    const unique = [...new Set(otpCodes)];
    return Response.json({ otpCodes: unique });
  } catch {
    return Response.json(
      { error: "Failed to find OTP" },
      { status: 500 }
    );
  }
}
