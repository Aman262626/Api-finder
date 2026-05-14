# API Key Generator

Temp Mail + Google AI Studio API Key Generator website with Telegram bot integration.

## Features

- **Temp Mail Generator** - mail.tm API se temporary email banao
- **Inbox & OTP** - Inbox check karo, OTP auto-detect karo
- **Google AI Studio Guide** - Step-by-step API key generation guide
- **Telegram Bot** - Webhook-based bot for Telegram integration
- **Vercel Deploy** - One-click Vercel deployment ready

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Telegram bot token.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Telegram Bot Setup

1. Get bot token from [@BotFather](https://t.me/BotFather)
2. Add `TELEGRAM_BOT_TOKEN` to your environment variables
3. Deploy to Vercel
4. Set webhook:

```bash
curl -X POST https://your-domain.vercel.app/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.vercel.app/api/telegram"}'
```

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Aman262626/Api-finder)

1. Click the button above or connect your GitHub repo to Vercel
2. Add environment variables (`TELEGRAM_BOT_TOKEN`, `OWNER_USERNAME`)
3. Deploy!

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/email/create` | POST | Create new temp email |
| `/api/email/inbox` | GET | Fetch inbox messages |
| `/api/email/message` | GET | Read specific message |
| `/api/email/otp` | GET | Find OTP codes |
| `/api/telegram` | POST | Telegram webhook |
| `/api/telegram/setup` | POST | Set Telegram webhook URL |

## Tech Stack

- Next.js 16
- TypeScript
- Tailwind CSS 4
- mail.tm API
- Telegram Bot API
