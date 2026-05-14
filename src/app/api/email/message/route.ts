import type { NextRequest } from "next/server";

const MAIL_API = "https://api.mail.tm";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const id = request.nextUrl.searchParams.get("id");

  if (!token || !id) {
    return Response.json(
      { error: "Token and message ID are required" },
      { status: 400 }
    );
  }

  try {
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
      { error: "Failed to fetch message" },
      { status: 500 }
    );
  }
}
