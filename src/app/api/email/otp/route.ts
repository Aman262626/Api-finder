import type { NextRequest } from "next/server";

const MAIL_API = "https://api.mail.tm";
const GUERRILLA_API = "https://api.guerrillamail.com/ajax.php";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const provider = request.nextUrl.searchParams.get("provider") ?? "mailtm";

  if (!token) {
    return Response.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    const otpCodes: string[] = [];

    if (provider === "guerrilla") {
      const res = await fetch(
        `${GUERRILLA_API}?f=check_email&sid_token=${token}&seq=0`,
        { signal: AbortSignal.timeout(10000) }
      );
      const data = await res.json();
      const messages: Array<Record<string, unknown>> = data.list ?? [];

      for (const msg of messages.slice(0, 10)) {
        const fetchRes = await fetch(
          `${GUERRILLA_API}?f=fetch_email&sid_token=${token}&email_id=${msg.mail_id}`,
          { signal: AbortSignal.timeout(10000) }
        );
        const msgData = await fetchRes.json();
        const body = String(msgData.mail_body ?? "").replace(/<[^>]*>/g, " ");
        const text = `${body} ${msgData.mail_subject ?? ""}`;
        const codes = text.match(/\b\d{4,8}\b/g);
        if (codes) otpCodes.push(...codes);
      }

      const unique = [...new Set(otpCodes)];
      return Response.json({ otpCodes: unique });
    }

    const res = await fetch(`${MAIL_API}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    const messages: Array<Record<string, unknown>> =
      data["hydra:member"] ?? [];

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
      { error: "OTP nahi mila. Retry karo." },
      { status: 500 }
    );
  }
}
