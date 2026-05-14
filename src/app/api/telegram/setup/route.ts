import type { NextRequest } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";

export async function POST(request: NextRequest) {
  if (!BOT_TOKEN) {
    return Response.json(
      { error: "TELEGRAM_BOT_TOKEN not set in environment" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const webhookUrl = body.url;

    if (!webhookUrl) {
      return Response.json(
        { error: "url field is required in request body" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      }
    );
    const data = await res.json();

    return Response.json(data);
  } catch {
    return Response.json(
      { error: "Failed to set webhook" },
      { status: 500 }
    );
  }
}
