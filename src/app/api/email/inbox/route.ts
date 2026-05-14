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
  const provider = request.nextUrl.searchParams.get("provider") ?? "mailtm";

  if (!token) {
    return Response.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    if (provider === "guerrilla") {
      const res = await fetch(
        `${GUERRILLA_API}?f=check_email&sid_token=${token}&seq=0`,
        { signal: AbortSignal.timeout(8000) }
      );
      const data = await res.json();
      const messages = (data.list ?? []).map(
        (msg: Record<string, unknown>) => ({
          id: msg.mail_id,
          from: {
            address: msg.mail_from,
            name: String(msg.mail_from ?? ""),
          },
          subject: msg.mail_subject,
          intro: String(msg.mail_excerpt ?? ""),
          createdAt: msg.mail_date,
        })
      );
      return Response.json({ messages });
    }

    if (provider === "tempmail") {
      const res = await fetch(`${TEMPMAIL_API}/auth/${token}`, {
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      const emails: Array<Record<string, unknown>> = data.email ?? [];
      const messages = emails.map((msg) => ({
        id: msg.id ?? String(Math.random()),
        from: {
          address: msg.from ?? "unknown",
          name: String(msg.from ?? ""),
        },
        subject: msg.subject ?? "No subject",
        intro: String(msg.body ?? "").slice(0, 100),
        createdAt: msg.date ?? new Date().toISOString(),
      }));
      return Response.json({ messages });
    }

    const baseUrl = getMailBaseUrl(provider);
    const res = await fetch(`${baseUrl}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    const messages = (data["hydra:member"] ?? []).map(
      (msg: Record<string, unknown>) => ({
        id: msg.id,
        from: msg.from,
        subject: msg.subject,
        intro: msg.intro,
        createdAt: msg.createdAt,
      })
    );

    return Response.json({ messages });
  } catch {
    return Response.json(
      { error: "Inbox load nahi ho paya. Retry karo." },
      { status: 500 }
    );
  }
}
