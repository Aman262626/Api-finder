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
    if (provider === "guerrilla") {
      const res = await fetch(
        `${GUERRILLA_API}?f=check_email&sid_token=${token}&seq=0`,
        { signal: AbortSignal.timeout(10000) }
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

    const res = await fetch(`${MAIL_API}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
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
