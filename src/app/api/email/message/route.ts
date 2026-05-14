import type { NextRequest } from "next/server";

const MAIL_TM_API = "https://api.mail.tm";
const MAIL_GW_API = "https://api.mail.gw";
const GUERRILLA_API = "https://api.guerrillamail.com/ajax.php";
const TEMPMAIL_API = "https://api.tempmail.lol";

function getMailBaseUrl(provider: string): string {
  return provider === "mailgw" ? MAIL_GW_API : MAIL_TM_API;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const id = request.nextUrl.searchParams.get("id");
  const provider = request.nextUrl.searchParams.get("provider") ?? "mailtm";

  if (!token || !id) {
    return Response.json(
      { error: "Token and message ID are required" },
      { status: 400 }
    );
  }

  try {
    if (provider === "guerrilla") {
      const res = await fetch(
        `${GUERRILLA_API}?f=fetch_email&sid_token=${token}&email_id=${id}`,
        { signal: AbortSignal.timeout(8000) }
      );
      const data = await res.json();
      return Response.json({
        id: data.mail_id,
        from: {
          address: data.mail_from,
          name: String(data.mail_from ?? ""),
        },
        subject: data.mail_subject,
        text: data.mail_body
          ? String(data.mail_body).replace(/<[^>]*>/g, " ")
          : "",
        html: data.mail_body ? [data.mail_body] : [],
        createdAt: data.mail_date,
      });
    }

    if (provider === "tempmail") {
      const res = await fetch(`${TEMPMAIL_API}/auth/${token}`, {
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      const emails: Array<Record<string, unknown>> = data.email ?? [];
      const msg = emails.find(
        (e) => String(e.id ?? "") === id
      );
      if (!msg) {
        return Response.json({ error: "Message not found" }, { status: 404 });
      }
      const body = String(msg.body ?? "");
      return Response.json({
        id: msg.id,
        from: {
          address: msg.from ?? "unknown",
          name: String(msg.from ?? ""),
        },
        subject: msg.subject ?? "No subject",
        text: body.replace(/<[^>]*>/g, " "),
        html: body ? [body] : [],
        createdAt: msg.date ?? new Date().toISOString(),
      });
    }

    const baseUrl = getMailBaseUrl(provider);
    const res = await fetch(`${baseUrl}/messages/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();

    return Response.json({
      id: data.id,
      from: data.from,
      subject: data.subject,
      text: data.text,
      html: data.html,
      createdAt: data.createdAt,
    });
  } catch {
    return Response.json(
      { error: "Message load nahi ho paya" },
      { status: 500 }
    );
  }
}
