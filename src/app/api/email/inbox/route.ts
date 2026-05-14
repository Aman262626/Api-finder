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
      { error: "Failed to fetch inbox" },
      { status: 500 }
    );
  }
}
