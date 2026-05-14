"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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

interface SavedApiKey {
  key: string;
  email: string;
  provider: string;
  createdAt: string;
}

type Tab = "email" | "inbox" | "apikeys";
type Provider = "mailtm" | "mailgw" | "guerrilla" | "tempmail";

const OWNER_USERNAME = "@bmw_aura1";

function loadSavedKeys(): SavedApiKey[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("api_keys") ?? "[]");
  } catch {
    return [];
  }
}

function persistKeys(keys: SavedApiKey[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("api_keys", JSON.stringify(keys));
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [provider, setProvider] = useState<Provider>("mailtm");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<FullMessage | null>(
    null
  );
  const [otpCodes, setOtpCodes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("email");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [pollingActive, setPollingActive] = useState(false);
  const pollingTokenRef = useRef("");
  const pollingProviderRef = useRef<Provider>("mailtm");

  const [flowActive, setFlowActive] = useState(false);
  const [flowStep, setFlowStep] = useState(0);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [savedKeys, setSavedKeys] = useState<SavedApiKey[]>(loadSavedKeys);
  const [studioOpened, setStudioOpened] = useState(false);

  useEffect(() => {
    if (!pollingActive) return;
    const t = pollingTokenRef.current;
    const p = pollingProviderRef.current;
    if (!t) return;

    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/email/otp?token=${t}&provider=${p}`);
        const data = await res.json();
        if (data.otpCodes && data.otpCodes.length > 0) {
          setOtpCodes(data.otpCodes);
          setPollingActive(false);
        }
        const inboxRes = await fetch(
          `/api/email/inbox?token=${t}&provider=${p}`
        );
        const inboxData = await inboxRes.json();
        if (inboxData.messages) {
          setMessages(inboxData.messages);
        }
      } catch {
        // silently continue polling
      }
    }, 5000);

    return () => clearInterval(id);
  }, [pollingActive]);

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }

  const createEmail = useCallback(async (): Promise<{
    email: string;
    token: string;
    provider: Provider;
  } | null> => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/email/create", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEmail(data.email);
      setToken(data.token);
      setProvider(data.provider ?? "mailtm");
      setMessages([]);
      setSelectedMessage(null);
      setOtpCodes([]);
      setLoading(false);
      return {
        email: data.email,
        token: data.token,
        provider: data.provider ?? "mailtm",
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email create fail hua");
      setLoading(false);
      return null;
    }
  }, []);

  async function fetchInbox() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/email/inbox?token=${token}&provider=${provider}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(data.messages);
      setSelectedMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inbox load fail");
    }
    setLoading(false);
  }

  async function readMessage(id: string) {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/email/message?token=${token}&id=${id}&provider=${provider}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSelectedMessage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message read fail");
    }
    setLoading(false);
  }

  async function findOtp(
    overrideToken?: string,
    overrideProvider?: Provider
  ): Promise<string[]> {
    const t = overrideToken ?? token;
    const p = overrideProvider ?? provider;
    if (!t) return [];
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/email/otp?token=${t}&provider=${p}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOtpCodes(data.otpCodes);
      setLoading(false);
      return data.otpCodes;
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP find fail");
      setLoading(false);
      return [];
    }
  }

  function deleteEmail() {
    setPollingActive(false);
    setEmail("");
    setToken("");
    setMessages([]);
    setSelectedMessage(null);
    setOtpCodes([]);
  }

  function startAutoPolling(t: string, p: Provider) {
    pollingTokenRef.current = t;
    pollingProviderRef.current = p;
    setPollingActive(true);
  }

  function saveApiKey(key: string) {
    const trimmed = key.trim();
    if (!trimmed) return;
    const entry: SavedApiKey = {
      key: trimmed,
      email: email || "manual",
      provider,
      createdAt: new Date().toISOString(),
    };
    const updated = [entry, ...savedKeys];
    setSavedKeys(updated);
    persistKeys(updated);
    setApiKeyInput("");
  }

  function deleteApiKey(index: number) {
    const updated = savedKeys.filter((_, i) => i !== index);
    setSavedKeys(updated);
    persistKeys(updated);
  }

  async function oneClickFlow() {
    setFlowActive(true);
    setFlowStep(1);
    setError("");
    setOtpCodes([]);
    setStudioOpened(false);
    setApiKeyInput("");

    const result = await createEmail();
    if (!result) {
      setFlowStep(0);
      setFlowActive(false);
      return;
    }

    setFlowStep(2);
    navigator.clipboard.writeText(result.email);
    setCopied("flow-email");
    setTimeout(() => setCopied(""), 3000);

    setFlowStep(3);
    startAutoPolling(result.token, result.provider);
  }

  function openStudioInBackground() {
    window.open("https://aistudio.google.com/apikey", "_blank");
    setStudioOpened(true);
    setFlowStep(4);
  }

  function handleStartOtpPolling() {
    if (!pollingActive && token) {
      startAutoPolling(token, provider);
    }
  }

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
        {/* One-Click Hero */}
        <div className="mb-8 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 border border-indigo-500/30 rounded-2xl p-8 text-center animate-fade-in">
          <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            One-Click API Key
          </h2>
          <p className="text-gray-400 mb-6">
            Ek click me email bane, OTP auto-detect ho, API key yahi panel pe
            paste karo
          </p>
          {!flowActive ? (
            <button
              onClick={oneClickFlow}
              disabled={loading}
              className="px-10 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 rounded-2xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-glow shadow-2xl shadow-indigo-500/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  Email ban raha hai...
                </span>
              ) : (
                "Click karo - API Key lo"
              )}
            </button>
          ) : (
            <div className="mt-4 space-y-3 text-left max-w-xl mx-auto">
              {/* Step 1 */}
              <FlowStep
                num={1}
                label="Temp email generate ho raha hai..."
                done={flowStep > 1}
                active={flowStep === 1}
              />

              {/* Step 2 */}
              <FlowStep
                num={2}
                label={
                  email
                    ? `Email ready: ${email}`
                    : "Email clipboard pe copy hoga..."
                }
                done={flowStep > 2}
                active={flowStep === 2}
                extra={
                  email && copied === "flow-email" ? (
                    <span className="text-green-400 text-xs ml-2">
                      Copied!
                    </span>
                  ) : email ? (
                    <button
                      onClick={() => copyToClipboard(email, "flow-email")}
                      className="text-indigo-400 text-xs ml-2 underline"
                    >
                      Copy again
                    </button>
                  ) : null
                }
              />

              {/* Step 3 */}
              <FlowStep
                num={3}
                label="Google AI Studio kholo (naye tab me)"
                done={studioOpened}
                active={flowStep === 3}
                extra={
                  flowStep >= 3 && !studioOpened ? (
                    <button
                      onClick={openStudioInBackground}
                      className="ml-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold transition-all"
                    >
                      Open AI Studio
                    </button>
                  ) : null
                }
              />

              {/* Step 4: OTP */}
              <FlowStep
                num={4}
                label={
                  otpCodes.length > 0
                    ? "OTP mil gaya!"
                    : pollingActive
                      ? "OTP auto-detect ON... har 5s me check ho raha hai"
                      : "OTP detect hoga jab email aayega"
                }
                done={otpCodes.length > 0}
                active={flowStep === 4 && otpCodes.length === 0}
              />

              {/* OTP codes inline */}
              {otpCodes.length > 0 && (
                <div className="pl-12 flex gap-2 flex-wrap">
                  {otpCodes.map((code, i) => (
                    <button
                      key={i}
                      onClick={() => copyToClipboard(code, `flow-otp-${i}`)}
                      className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg font-mono text-lg text-green-400 hover:bg-green-500/30 transition-all"
                    >
                      {code}
                      {copied === `flow-otp-${i}` && (
                        <span className="text-xs ml-1">Copied!</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Step 5: Paste API Key */}
              <FlowStep
                num={5}
                label="API key yaha paste karo"
                done={false}
                active={flowStep >= 3}
              />

              {flowStep >= 3 && (
                <div className="pl-12">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="AIzaSy... yaha paste karo"
                      className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm font-mono text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                    <button
                      onClick={() => {
                        saveApiKey(apiKeyInput);
                        setFlowActive(false);
                        setFlowStep(0);
                        setPollingActive(false);
                        setActiveTab("apikeys");
                      }}
                      disabled={!apiKeyInput.trim()}
                      className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    AI Studio me &quot;Create API Key&quot; pe click karo, key
                    copy karo, aur yaha paste karo
                  </p>
                </div>
              )}

              {/* Reset button */}
              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    setFlowActive(false);
                    setFlowStep(0);
                    setPollingActive(false);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300 underline"
                >
                  Cancel flow
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl w-fit">
          {(
            [
              { id: "email" as Tab, icon: "📧", label: "Temp Mail" },
              { id: "inbox" as Tab, icon: "📥", label: "Inbox" },
              { id: "apikeys" as Tab, icon: "🔑", label: "API Keys" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.id === "apikeys" && savedKeys.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
                  {savedKeys.length}
                </span>
              )}
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
                  Generate a new temporary email address
                </p>
                <button
                  onClick={() => createEmail()}
                  disabled={loading}
                  className="w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-glow"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner />
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
                        {copied === "email" ? "Copied!" : "Click to copy"}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Provider: {provider}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setActiveTab("inbox");
                          fetchInbox();
                        }}
                        className="flex-1 py-2 px-4 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-all text-sm"
                      >
                        Inbox
                      </button>
                      <button
                        onClick={() => findOtp()}
                        disabled={loading}
                        className="flex-1 py-2 px-4 bg-amber-600/20 border border-amber-500/30 text-amber-400 rounded-lg hover:bg-amber-600/30 transition-all text-sm"
                      >
                        Find OTP
                      </button>
                      <button
                        onClick={handleStartOtpPolling}
                        disabled={pollingActive}
                        className="flex-1 py-2 px-4 bg-green-600/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-600/30 transition-all text-sm disabled:opacity-50"
                      >
                        {pollingActive ? "Polling..." : "Auto OTP"}
                      </button>
                      <button
                        onClick={deleteEmail}
                        className="py-2 px-4 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-600/30 transition-all text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    Koi email nahi hai. &quot;Generate Email&quot; ya upar
                    &quot;One-Click API Key&quot; button use karo.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Inbox Tab */}
        {activeTab === "inbox" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                Inbox{" "}
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
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>

            {/* OTP auto-detect status */}
            {pollingActive && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
                    <span className="text-amber-300 text-sm">
                      OTP auto-detect ON - Har 5 second me check
                    </span>
                  </div>
                  <button
                    onClick={() => setPollingActive(false)}
                    className="px-3 py-1 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg text-xs hover:bg-red-600/30"
                  >
                    Stop
                  </button>
                </div>
              </div>
            )}

            {/* OTP codes */}
            {otpCodes.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-green-400 mb-4">
                  OTP Codes Mil Gaye!
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {otpCodes.map((code, i) => (
                    <button
                      key={i}
                      onClick={() => copyToClipboard(code, `otp-${i}`)}
                      className="p-3 bg-black/30 rounded-xl border border-green-500/20 font-mono text-2xl text-center text-green-400 hover:border-green-400 transition-all"
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
                  &larr; Back to Inbox
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
                <p className="text-gray-500 text-4xl mb-3">No messages</p>
                <p className="text-gray-500">Abhi koi message nahi aaya</p>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => readMessage(String(msg.id))}
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

        {/* API Keys Tab */}
        {activeTab === "apikeys" && (
          <div className="space-y-6 animate-fade-in">
            {/* Manual API key entry */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400">
                  +
                </span>
                Add API Key
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy... API key yaha paste karo"
                  className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm font-mono text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none transition-all"
                />
                <button
                  onClick={() => saveApiKey(apiKeyInput)}
                  disabled={!apiKeyInput.trim()}
                  className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Key
                </button>
              </div>
            </div>

            {/* Saved API keys list */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                  🔑
                </span>
                Saved API Keys
                {savedKeys.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full text-xs">
                    {savedKeys.length}
                  </span>
                )}
              </h2>

              {savedKeys.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-lg mb-2">
                    Koi saved key nahi hai
                  </p>
                  <p className="text-gray-600 text-sm">
                    Upar &quot;One-Click API Key&quot; button se key generate
                    karo ya manually add karo
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedKeys.map((entry, i) => (
                    <div
                      key={i}
                      className="p-4 bg-black/30 rounded-xl border border-white/10 group hover:border-indigo-500/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-indigo-400 text-sm break-all">
                            {entry.key.slice(0, 10)}...
                            {entry.key.slice(-6)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Email: {entry.email} | Provider: {entry.provider}
                          </p>
                          <p className="text-xs text-gray-600">
                            {new Date(entry.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() =>
                              copyToClipboard(entry.key, `key-${i}`)
                            }
                            className="px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-lg text-xs hover:bg-indigo-600/30 transition-all"
                          >
                            {copied === `key-${i}` ? "Copied!" : "Copy"}
                          </button>
                          <button
                            onClick={() => deleteApiKey(i)}
                            className="px-3 py-1.5 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg text-xs hover:bg-red-600/30 transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Telegram Bot Section */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-2">
                Telegram Bot
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Yeh sab Telegram bot se bhi kar sakte ho! Bot me /start command
                bhejo
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
            Owner: {OWNER_USERNAME} | Powered by mail.tm &amp; Google AI Studio
          </p>
        </div>
      </footer>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
  );
}

function FlowStep({
  num,
  label,
  done,
  active,
  extra,
}: {
  num: number;
  label: string;
  done: boolean;
  active: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        done
          ? "bg-green-500/10 border-green-500/30"
          : active
            ? "bg-indigo-500/10 border-indigo-500/30"
            : "bg-white/5 border-white/10 opacity-50"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
          done
            ? "bg-green-500 text-white"
            : active
              ? "bg-indigo-500 text-white"
              : "bg-white/10 text-gray-400"
        }`}
      >
        {done ? "✓" : num}
      </div>
      <span className={`text-sm ${done ? "text-green-400" : "text-gray-300"}`}>
        {label}
      </span>
      {extra}
      {active && !done && (
        <div className="w-3 h-3 bg-indigo-400 rounded-full animate-pulse ml-auto" />
      )}
    </div>
  );
}
