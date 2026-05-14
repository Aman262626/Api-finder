import type { NextRequest } from "next/server";

const MAIL_API = "https://api.mail.tm";
const GUERRILLA_API = "https://api.guerrillamail.com/ajax.php";

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
        { signal: AbortSignal.timeout(10000) }
      );
      const data = await res.json();
      return Response.json({
        id: data.mail_id,
        from: {
          address: data.mail_from,
          name: String(data.mail_from ?? ""),
        },
        subject: data.mail_subject,
        text: data.mail_body ? String(data.mail_body).replace(/<[^>]*>/g, " ") : "",
        html: data.mail_body ? [data.mail_body] : [],
        createdAt: data.mail_date,
      });
    }

    const res = await fetch(`${MAIL_API}/messages/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
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
