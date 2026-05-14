import type { NextRequest } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const MAIL_API = "https://api.mail.tm";
const OWNER_USERNAME = process.env.OWNER_USERNAME ?? "@bmw_aura1";

interface UserSession {
  email: string;
  token: string;
}

const sessions = new Map<number, UserSession>();

function randomString(length = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>
) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: text + `\n\n👑 <b>Owner:</b> ${escapeHtml(OWNER_USERNAME)}`,
    parse_mode: "HTML",
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "📧 New Email", callback_data: "new_email" }],
      [
        { text: "📥 Inbox", callback_data: "inbox" },
        { text: "👤 My Email", callback_data: "show_email" },
      ],
      [
        { text: "🔐 Find OTP", callback_data: "find_otp" },
        { text: "🗑 Delete Email", callback_data: "delete_email" },
      ],
      [
        { text: "🔑 Get API Key", callback_data: "get_api_key" },
        { text: "❓ Help", callback_data: "help_menu" },
      ],
    ],
  };
}

async function handleNewEmail(chatId: number) {
  if (sessions.has(chatId)) {
    await sendTelegramMessage(
      chatId,
      "⚠️ Pehle Delete Email use kar!",
      mainMenuKeyboard()
    );
    return;
  }

  try {
    const domainRes = await fetch(`${MAIL_API}/domains`, {
      signal: AbortSignal.timeout(10000),
    });
    const domainData = await domainRes.json();
    const domain = domainData["hydra:member"]?.[0]?.domain ?? "clerk.com";
    const address = `${randomString(12)}@${domain}`;
    const password = randomString(16);

    await fetch(`${MAIL_API}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, password }),
      signal: AbortSignal.timeout(10000),
    });

    const tokenRes = await fetch(`${MAIL_API}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, password }),
      signal: AbortSignal.timeout(10000),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.token) {
      sessions.set(chatId, { email: address, token: tokenData.token });
      await sendTelegramMessage(
        chatId,
        `✅ <b>EMAIL READY!</b>\n\n<code>${escapeHtml(address)}</code>\n\nUse Inbox button to check messages!`,
        mainMenuKeyboard()
      );
    } else {
      await sendTelegramMessage(
        chatId,
        "❌ Fail ho gaya! Phir try kar.",
        mainMenuKeyboard()
      );
    }
  } catch {
    await sendTelegramMessage(
      chatId,
      "❌ Email nahi ban paya!",
      mainMenuKeyboard()
    );
  }
}

async function handleInbox(chatId: number) {
  const session = sessions.get(chatId);
  if (!session) {
    await sendTelegramMessage(
      chatId,
      "❌ Pehle New Email use kar!",
      mainMenuKeyboard()
    );
    return;
  }

  try {
    const res = await fetch(`${MAIL_API}/messages`, {
      headers: { Authorization: `Bearer ${session.token}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    const messages: Array<Record<string, string>> =
      data["hydra:member"] ?? [];

    if (messages.length === 0) {
      await sendTelegramMessage(
        chatId,
        "📭 Koi message nahi hai!",
        mainMenuKeyboard()
      );
      return;
    }

    let text = `📬 <b>${messages.length} message(s) found!</b>\n\n`;
    for (const msg of messages.slice(0, 5)) {
      const subject = (msg.subject ?? "No subject").slice(0, 50);
      text += `📧 <b>${escapeHtml(subject)}</b>\n`;
    }
    await sendTelegramMessage(chatId, text, mainMenuKeyboard());
  } catch {
    await sendTelegramMessage(
      chatId,
      "❌ Inbox fetch fail!",
      mainMenuKeyboard()
    );
  }
}

async function handleFindOtp(chatId: number) {
  const session = sessions.get(chatId);
  if (!session) {
    await sendTelegramMessage(
      chatId,
      "❌ Pehle New Email use kar!",
      mainMenuKeyboard()
    );
    return;
  }

  try {
    const res = await fetch(`${MAIL_API}/messages`, {
      headers: { Authorization: `Bearer ${session.token}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    const messages: Array<Record<string, string>> =
      data["hydra:member"] ?? [];

    const otpCodes: string[] = [];
    for (const msg of messages.slice(0, 10)) {
      const msgRes = await fetch(`${MAIL_API}/messages/${msg.id}`, {
        headers: { Authorization: `Bearer ${session.token}` },
        signal: AbortSignal.timeout(10000),
      });
      const msgData = await msgRes.json();
      const text = `${msgData.text ?? ""} ${msgData.subject ?? ""}`;
      const codes = text.match(/\b\d{4,8}\b/g);
      if (codes) otpCodes.push(...codes);
    }

    const unique = [...new Set(otpCodes)];
    if (unique.length > 0) {
      const codesHtml = unique
        .map((c) => `<code>${escapeHtml(c)}</code>`)
        .join("\n");
      await sendTelegramMessage(
        chatId,
        `🔐 <b>OTP Codes:</b>\n\n${codesHtml}`,
        mainMenuKeyboard()
      );
    } else {
      await sendTelegramMessage(
        chatId,
        "❌ Koi OTP nahi mila!",
        mainMenuKeyboard()
      );
    }
  } catch {
    await sendTelegramMessage(
      chatId,
      "❌ OTP search fail!",
      mainMenuKeyboard()
    );
  }
}

async function handleCallback(chatId: number, data: string) {
  switch (data) {
    case "new_email":
      await handleNewEmail(chatId);
      break;
    case "inbox":
      await handleInbox(chatId);
      break;
    case "show_email": {
      const session = sessions.get(chatId);
      if (session) {
        await sendTelegramMessage(
          chatId,
          `📧 <b>Your Email:</b>\n\n<code>${escapeHtml(session.email)}</code>`,
          mainMenuKeyboard()
        );
      } else {
        await sendTelegramMessage(
          chatId,
          "❌ Pehle New Email use kar!",
          mainMenuKeyboard()
        );
      }
      break;
    }
    case "find_otp":
      await handleFindOtp(chatId);
      break;
    case "delete_email":
      sessions.delete(chatId);
      await sendTelegramMessage(
        chatId,
        "🗑️ Email delete ho gaya!",
        mainMenuKeyboard()
      );
      break;
    case "get_api_key":
      await sendTelegramMessage(
        chatId,
        `🔑 <b>Google AI Studio API Key</b>\n\n` +
          `1. Pehle 📧 New Email se temp mail banao\n` +
          `2. <a href="https://aistudio.google.com">Google AI Studio</a> pe jao\n` +
          `3. Temp mail se sign up karo\n` +
          `4. API Key section me jao\n` +
          `5. Create API Key pe click karo\n\n` +
          `Ya hamari website use karo for easy process!`,
        mainMenuKeyboard()
      );
      break;
    case "help_menu":
      await sendTelegramMessage(
        chatId,
        `🤖 <b>API Key Generator Bot - Help</b>\n\n` +
          `📧 <b>Features:</b>\n` +
          `- New Email - Temporary email banao\n` +
          `- Inbox - Messages dekho\n` +
          `- My Email - Current email dekho\n` +
          `- Find OTP - OTP codes dhundho\n` +
          `- Get API Key - Google AI Studio guide\n` +
          `- Delete Email - Email delete karo\n\n` +
          `💡 <b>Tip:</b> Temp mail se Google AI Studio me sign up karke API key lo!`,
        mainMenuKeyboard()
      );
      break;
    default:
      await sendTelegramMessage(
        chatId,
        "Select an option:",
        mainMenuKeyboard()
      );
  }
}

export async function POST(request: NextRequest) {
  if (!BOT_TOKEN) {
    return Response.json({ error: "Bot token not configured" }, { status: 500 });
  }

  try {
    const update = await request.json();

    if (update.message?.text === "/start") {
      const chatId = update.message.chat.id;
      await sendTelegramMessage(
        chatId,
        `🤖 <b>API KEY GENERATOR BOT</b>\n\n` +
          `Main aapka API key assistant hoon!\n` +
          `Temp mail + Google AI Studio API key generator\n\n` +
          `👇 Click buttons below to get started!`,
        mainMenuKeyboard()
      );
    } else if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const data = update.callback_query.data;

      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: update.callback_query.id,
        }),
      });

      await handleCallback(chatId, data);
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Webhook error" }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    status: "Telegram webhook is active",
    setup: "POST /api/telegram/setup to configure webhook",
  });
}
