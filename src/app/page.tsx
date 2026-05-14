"use client";

import { useState, useCallback } from "react";

interface EmailMessage {
  id: string;
  from: { address: string; name: string };
  subject: string;
  intro: string;
  createdAt: string;
}

interface FullMessage {
  id: string;
  from: { address: string; name: string };
  subject: string;
  text: string;
  html: string[];
  createdAt: string;
}

type Tab = "email" | "inbox" | "apikey";

export default function Home() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<FullMessage | null>(
    null
  );
  const [otpCodes, setOtpCodes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("email");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }, []);

  const createEmail = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/email/create", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEmail(data.email);
      setToken(data.token);
      setMessages([]);
      setSelectedMessage(null);
      setOtpCodes([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create email");
    }
    setLoading(false);
  };

  const fetchInbox = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/email/inbox?token=${token}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(data.messages);
      setSelectedMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch inbox");
    }
    setLoading(false);
  };

  const readMessage = async (id: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/email/message?token=${token}&id=${id}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSelectedMessage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read message");
    }
    setLoading(false);
  };

  const findOtp = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/email/otp?token=${token}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOtpCodes(data.otpCodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find OTP");
    }
    setLoading(false);
  };

  const deleteEmail = () => {
    setEmail("");
    setToken("");
    setMessages([]);
    setSelectedMessage(null);
    setOtpCodes([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-md bg-black/30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold">
              A
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                API Key Generator
              </h1>
              <p className="text-xs text-gray-500">
                Temp Mail + Google AI Studio
              </p>
            </div>
          </div>
          <a
            href="https://t.me/bmw_aura1"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition-all text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.94 8.19l-1.98 9.33c-.15.67-.54.83-1.1.52l-3.03-2.23-1.46 1.41c-.16.16-.3.3-.61.3l.22-3.06 5.57-5.03c.24-.22-.05-.34-.38-.13l-6.88 4.34-2.96-.93c-.64-.2-.66-.64.14-.95l11.58-4.46c.54-.2 1.01.13.83.95l.06-.06z" />
            </svg>
            Telegram Bot
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl w-fit">
          {(
            [
              { id: "email" as Tab, label: "📧 Temp Mail", icon: "mail" },
              { id: "inbox" as Tab, label: "📥 Inbox", icon: "inbox" },
              { id: "apikey" as Tab, label: "🔑 API Key", icon: "key" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 animate-fade-in">
            {error}
          </div>
        )}

        {/* Email Tab */}
        {activeTab === "email" && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create Email Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400">
                    +
                  </span>
                  New Temp Email
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                  Generate a new temporary email address using mail.tm API
                </p>
                <button
                  onClick={createEmail}
                  disabled={loading}
                  className="w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-glow"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-5 w-5"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    "Generate Email"
                  )}
                </button>
              </div>

              {/* Current Email Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                    @
                  </span>
                  Your Email
                </h2>
                {email ? (
                  <div className="space-y-4">
                    <div
                      onClick={() => copyToClipboard(email, "email")}
                      className="p-4 bg-black/30 rounded-xl border border-white/10 cursor-pointer hover:border-indigo-500/50 transition-all group"
                    >
                      <p className="font-mono text-indigo-400 text-sm break-all">
                        {email}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 group-hover:text-indigo-400 transition-colors">
                        {copied === "email"
                          ? "Copied!"
                          : "Click to copy"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setActiveTab("inbox");
                          fetchInbox();
                        }}
                        className="flex-1 py-2 px-4 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-all text-sm"
                      >
                        📥 Inbox
                      </button>
                      <button
                        onClick={findOtp}
                        disabled={loading}
                        className="flex-1 py-2 px-4 bg-amber-600/20 border border-amber-500/30 text-amber-400 rounded-lg hover:bg-amber-600/30 transition-all text-sm"
                      >
                        🔐 Find OTP
                      </button>
                      <button
                        onClick={deleteEmail}
                        className="py-2 px-4 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-600/30 transition-all text-sm"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No email yet. Click &quot;Generate Email&quot; to create
                    one.
                  </p>
                )}
              </div>
            </div>

            {/* OTP Section */}
            {otpCodes.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-amber-400 mb-4">
                  🔐 OTP Codes Found
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {otpCodes.map((code, i) => (
                    <button
                      key={i}
                      onClick={() => copyToClipboard(code, `otp-${i}`)}
                      className="p-3 bg-black/30 rounded-xl border border-amber-500/20 font-mono text-2xl text-center text-amber-400 hover:border-amber-400 transition-all"
                    >
                      {code}
                      <span className="block text-xs text-gray-500 mt-1">
                        {copied === `otp-${i}` ? "Copied!" : "Click to copy"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Inbox Tab */}
        {activeTab === "inbox" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                📥 Inbox{" "}
                {email && (
                  <span className="text-sm text-gray-500 font-normal">
                    ({email})
                  </span>
                )}
              </h2>
              <button
                onClick={fetchInbox}
                disabled={!token || loading}
                className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-lg hover:bg-indigo-600/30 transition-all text-sm disabled:opacity-50"
              >
                {loading ? "Loading..." : "🔄 Refresh"}
              </button>
            </div>

            {!token ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                <p className="text-gray-500 text-lg">
                  Pehle Email tab me ja ke email banao!
                </p>
                <button
                  onClick={() => setActiveTab("email")}
                  className="mt-4 px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-all"
                >
                  Go to Email Tab
                </button>
              </div>
            ) : selectedMessage ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-indigo-400 hover:text-indigo-300 text-sm mb-4 flex items-center gap-1"
                >
                  ← Back to Inbox
                </button>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {selectedMessage.subject || "No subject"}
                      </h3>
                      <p className="text-sm text-gray-400">
                        From: {selectedMessage.from?.address ?? "Unknown"}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(selectedMessage.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <hr className="border-white/10" />
                  <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                    {selectedMessage.text || "No content"}
                  </div>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                <p className="text-gray-500 text-4xl mb-3">📭</p>
                <p className="text-gray-500">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => readMessage(msg.id)}
                    className="w-full text-left bg-white/5 border border-white/10 rounded-xl p-4 hover:border-indigo-500/50 hover:bg-white/8 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {msg.subject || "No subject"}
                        </p>
                        <p className="text-sm text-gray-400 truncate">
                          {msg.from?.address ?? "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {msg.intro}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 ml-4 shrink-0">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* API Key Tab */}
        {activeTab === "apikey" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                🔑 Google AI Studio API Key
              </h2>
              <p className="text-gray-400 mb-6">
                Follow these steps to get your free Gemini API key
              </p>

              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    title: "Generate Temp Email",
                    desc: "Email tab me ja ke new temp email generate karo",
                    action: !email
                      ? {
                          label: "Generate Email Now",
                          onClick: () => {
                            setActiveTab("email");
                            createEmail();
                          },
                        }
                      : null,
                    done: !!email,
                  },
                  {
                    step: 2,
                    title: "Copy Your Email",
                    desc: email
                      ? `Your email: ${email}`
                      : "Pehle email generate karo",
                    action: email
                      ? {
                          label: "Copy Email",
                          onClick: () => copyToClipboard(email, "step-email"),
                        }
                      : null,
                    done: !!email,
                  },
                  {
                    step: 3,
                    title: "Open Google AI Studio",
                    desc: "Google AI Studio kholke sign up karo temp email se",
                    action: {
                      label: "Open AI Studio",
                      onClick: () =>
                        window.open(
                          "https://aistudio.google.com/apikey",
                          "_blank"
                        ),
                    },
                    done: false,
                  },
                  {
                    step: 4,
                    title: "Verify OTP",
                    desc: "Google verification code ke liye inbox check karo",
                    action: token
                      ? {
                          label: "Find OTP",
                          onClick: () => {
                            findOtp();
                            setActiveTab("email");
                          },
                        }
                      : null,
                    done: false,
                  },
                  {
                    step: 5,
                    title: "Create API Key",
                    desc: "AI Studio me jaake 'Create API Key' pe click karo",
                    action: {
                      label: "Open API Keys Page",
                      onClick: () =>
                        window.open(
                          "https://aistudio.google.com/apikey",
                          "_blank"
                        ),
                    },
                    done: false,
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                      item.done
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold ${
                        item.done
                          ? "bg-green-500 text-white"
                          : "bg-white/10 text-gray-400"
                      }`}
                    >
                      {item.done ? "✓" : item.step}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {item.desc}
                      </p>
                      {copied === "step-email" && item.step === 2 && (
                        <p className="text-xs text-green-400 mt-1">
                          Copied!
                        </p>
                      )}
                    </div>
                    {item.action && (
                      <button
                        onClick={item.action.onClick}
                        className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-lg hover:bg-indigo-600/30 transition-all text-sm shrink-0"
                      >
                        {item.action.label}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Telegram Bot Section */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-2">
                🤖 Telegram Bot
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Yeh sab Telegram bot se bhi kar sakte ho! Bot me /start
                command bhejo
              </p>
              <a
                href="https://t.me/bmw_aura1"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-all"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.94 8.19l-1.98 9.33c-.15.67-.54.83-1.1.52l-3.03-2.23-1.46 1.41c-.16.16-.3.3-.61.3l.22-3.06 5.57-5.03c.24-.22-.05-.34-.38-.13l-6.88 4.34-2.96-.93c-.64-.2-.66-.64.14-.95l11.58-4.46c.54-.2 1.01.13.83.95l.06-.06z" />
                </svg>
                Open Telegram Bot
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>
            👑 Owner: {OWNER_USERNAME} | Powered by mail.tm &amp; Google AI
            Studio
          </p>
        </div>
      </footer>
    </div>
  );
}

const OWNER_USERNAME = "@bmw_aura1";
