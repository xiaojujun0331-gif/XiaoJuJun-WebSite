"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ChatMode = "ai" | "human" | null;

type Message = {
  id?: string;
  role?: "user" | "bot";
  sender?: "user" | "admin" | "ai" | "system";
  text?: string;
  content?: string;
  created_at?: string;
};

type Conversation = {
  id: string;
  visitor_id: string;
  visitor_name: string | null;
};

const VISITOR_ID_KEY = "xiaojujun_visitor_id";

function getVisitorId() {
  if (typeof window === "undefined") return "";

  let visitorId = localStorage.getItem(VISITOR_ID_KEY);

  if (!visitorId) {
    visitorId = `visitor_${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }

  return visitorId;
}

function formatMessageTime(dateString?: string) {
  if (!dateString) return "";

  const date = new Date(dateString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (isToday) return `今天 ${time}`;
  if (isYesterday) return `昨天 ${time}`;

  const dateText = date.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });

  return `${dateText} ${time}`;
}

function getNowIso() {
  return new Date().toISOString();
}

export default function ChatWidget() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return <ChatWidgetContent />;
}

function ChatWidgetContent() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [isAdminTyping, setIsAdminTyping] = useState(false);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [aiMessages, setAiMessages] = useState<Message[]>([]);
  const [humanMessages, setHumanMessages] = useState<Message[]>([]);
  const [userUnreadCount, setUserUnreadCount] = useState(0);
  const [latestAdminPreview, setLatestAdminPreview] = useState("");
  const [showAdminPreview, setShowAdminPreview] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const lastAdminMessageAtRef = useRef("");
  const hasLoadedHumanOnceRef = useRef(false);

  const currentMessages = mode === "ai" ? aiMessages : humanMessages;

  const showTypingBubble =
    (mode === "ai" && isTyping) ||
    (mode === "human" && isAdminTyping && isAdminOnline);

  function clearUserUnread() {
    setUserUnreadCount(0);
    setLatestAdminPreview("");
    setShowAdminPreview(false);
    document.title = "XiaoJuJun";
  }

  function handleMessagesScroll() {
    const el = messagesContainerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 80;
  }

  function scrollToBottom() {
    if (!shouldAutoScrollRef.current) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }

  async function loadExistingConversation() {
    const visitorId = getVisitorId();

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("visitor_id", visitorId)
      .maybeSingle();

    if (error) {
      console.error("Load existing conversation error:", error);
      return;
    }

    if (!data) return;

    setConversation(data);

    await loadHumanMessages(data.id);
    await checkTypingStatus(data.id);
  }

  async function getOrCreateConversation() {
    const visitorId = getVisitorId();

    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .eq("visitor_id", visitorId)
      .maybeSingle();

    if (existing) {
      setConversation(existing);
      return existing;
    }

    const visitorName = `Visitor #${visitorId.slice(-4).toUpperCase()}`;

    const { data: created, error } = await supabase
      .from("conversations")
      .insert({
        visitor_id: visitorId,
        visitor_name: visitorName,
        status: "open",
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      console.error("Create conversation error:", error);
      return null;
    }

    setConversation(created);

    await supabase.from("typing_status").insert({
      conversation_id: created.id,
      visitor_typing: false,
      admin_typing: false,
      updated_at: new Date().toISOString(),
    });

    return created;
  }

  async function loadHumanMessages(conversationId: string) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Load messages error:", error);
      return;
    }

    const list = data || [];

    const latestAdminMessage = [...list]
      .reverse()
      .find((msg) => msg.sender === "admin");

    const latestAdminMessageAt = latestAdminMessage?.created_at || "";
    const latestAdminMessageText = latestAdminMessage?.content || "";

    if (hasLoadedHumanOnceRef.current) {
      const hasNewAdminMessage =
        latestAdminMessageAt &&
        latestAdminMessageAt !== lastAdminMessageAtRef.current;

      const userIsWatchingHumanChat = open && mode === "human";

      if (hasNewAdminMessage && !userIsWatchingHumanChat) {
        setUserUnreadCount((prev) => prev + 1);
        setLatestAdminPreview(latestAdminMessageText || "你有新的回复");
        setShowAdminPreview(true);
      }
    } else {
      hasLoadedHumanOnceRef.current = true;
    }

    if (latestAdminMessageAt) {
      lastAdminMessageAtRef.current = latestAdminMessageAt;
    }

    setHumanMessages(list);
  }

  async function checkAdminStatus() {
    const { data } = await supabase
      .from("admin_status")
      .select("*")
      .eq("id", "xiaojujun")
      .maybeSingle();

    if (!data) {
      setIsAdminOnline(false);
      return;
    }

    const lastSeen = data.last_seen_at
      ? new Date(data.last_seen_at).getTime()
      : 0;

    const online = data.is_online && Date.now() - lastSeen < 8000;

    setIsAdminOnline(Boolean(online));
  }

  async function checkTypingStatus(conversationId: string) {
    const { data } = await supabase
      .from("typing_status")
      .select("*")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (!data) {
      setIsAdminTyping(false);
      return;
    }

    const lastTyping = data.admin_last_typing_at
      ? new Date(data.admin_last_typing_at).getTime()
      : 0;

    const typing = data.admin_typing && Date.now() - lastTyping < 3000;

    setIsAdminTyping(Boolean(typing));
  }

  useEffect(() => {
    loadExistingConversation();
    checkAdminStatus();
  }, []);

  useEffect(() => {
    checkAdminStatus();

    const interval = setInterval(() => {
      checkAdminStatus();

      if (conversation?.id) {
        loadHumanMessages(conversation.id);
        checkTypingStatus(conversation.id);
      } else {
        loadExistingConversation();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [conversation?.id, open, mode]);

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages.length, showTypingBubble]);

  useEffect(() => {
    if (userUnreadCount > 0) {
      document.title = `● ${userUnreadCount} 条新消息 - XiaoJuJun`;
    } else {
      document.title = "XiaoJuJun";
    }
  }, [userUnreadCount]);

  useEffect(() => {
    if (!showAdminPreview) return;

    const timer = setTimeout(() => {
      setShowAdminPreview(false);
    }, 8000);

    return () => clearTimeout(timer);
  }, [showAdminPreview, latestAdminPreview]);

  async function openHumanChat() {
    setMode("human");
    clearUserUnread();

    const conv = await getOrCreateConversation();

    if (conv?.id) {
      await loadHumanMessages(conv.id);
      await checkTypingStatus(conv.id);
    }
  }

  async function handleInputChange(value: string) {
    setInput(value);

    if (mode === "human" && conversation?.id) {
      await supabase.from("typing_status").upsert({
        conversation_id: conversation.id,
        visitor_typing: Boolean(value.trim()),
        visitor_last_typing_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  async function sendMessage() {
    if (!input.trim() || !mode || isTyping) return;

    const messageText = input;

    const userMessage: Message = {
      role: "user",
      text: messageText,
      created_at: getNowIso(),
    };

    setInput("");

    if (mode === "ai") {
      setIsTyping(true);

      setAiMessages((prev) => [...prev, userMessage]);

      fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setAiMessages((prev) => [
            ...prev,
            {
              role: "bot",
              text: data.reply,
              created_at: getNowIso(),
            },
          ]);
        })
        .catch(() => {
          setAiMessages((prev) => [
            ...prev,
            {
              role: "bot",
              text: "抱歉，XiaoJuJun AI 暂时无法回复，请稍后再试。",
              created_at: getNowIso(),
            },
          ]);
        })
        .finally(() => {
          setIsTyping(false);
        });

      return;
    }

    if (mode === "human") {
      let conv = conversation;

      if (conv?.id) {
        const { data: existingConversation } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", conv.id)
          .maybeSingle();

        if (!existingConversation) {
          setConversation(null);
          setHumanMessages([]);
          conv = await getOrCreateConversation();
        } else {
          conv = existingConversation;
          setConversation(existingConversation);
        }
      } else {
        conv = await getOrCreateConversation();
      }

      if (!conv) return;

      await supabase.from("typing_status").upsert({
        conversation_id: conv.id,
        visitor_typing: false,
        visitor_last_typing_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const { error } = await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender: "user",
        content: messageText,
      });

      if (error) {
        console.error("Send message error:", error);
        return;
      }

      await supabase
        .from("conversations")
        .update({
          last_message: messageText,
          last_sender: "user",
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conv.id);

      await loadHumanMessages(conv.id);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {!open && userUnreadCount > 0 && showAdminPreview && (
        <button
          onClick={() => {
            setOpen(true);
            openHumanChat();
          }}
          className="mb-4 w-[300px] max-w-[calc(100vw-32px)] text-left bg-zinc-950 text-white border border-zinc-800 rounded-2xl p-4 shadow-2xl hover:bg-zinc-900 transition"
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="font-bold text-sm">XiaoJuJun 本人回复了</div>

            <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {userUnreadCount > 9 ? "9+" : userUnreadCount}
            </span>
          </div>

          <div className="text-sm text-zinc-300 line-clamp-2">
            {latestAdminPreview || "你有新的回复"}
          </div>

          <div className="text-xs text-zinc-600 mt-2">点击查看回复</div>
        </button>
      )}

      {open && (
        <div className="mb-4 w-[360px] max-w-[calc(100vw-32px)] h-[440px] bg-black text-white border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
          {!mode && (
            <div className="flex-1 px-4 pt-6 pb-4 flex flex-col">
              <p className="text-sm text-zinc-400 mb-4">
                请选择你要联系的对象
              </p>

              <button
                onClick={() => setMode("ai")}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition mb-3"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center font-black">
                    AI
                  </div>
                  <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 border-2 border-zinc-900 rounded-full"></span>
                </div>

                <div className="text-left">
                  <div className="font-bold text-lg">XiaoJuJun AI</div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    在线 · 自动回复
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    作品 / 合作 / 联系方式
                  </div>
                </div>
              </button>

              <button
                onClick={openHumanChat}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-zinc-700 text-white flex items-center justify-center font-black">
                    小
                  </div>

                  <span
                    className={`absolute bottom-0 right-0 w-4 h-4 border-2 border-zinc-900 rounded-full ${
                      isAdminOnline ? "bg-green-400" : "bg-zinc-500"
                    }`}
                  ></span>
                </div>

                <div className="text-left flex-1 min-w-0">
                  <div className="font-bold text-lg flex items-center gap-2">
                    XiaoJuJun 本人

                    {userUnreadCount > 0 && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                        {userUnreadCount > 9 ? "9+" : userUnreadCount}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isAdminOnline ? "bg-green-400" : "bg-zinc-500"
                      }`}
                    ></span>
                    {isAdminOnline ? "在线 · 本人客服" : "离线 · 留言模式"}
                  </div>

                  <div className="text-xs text-zinc-500 mt-1">
                    {userUnreadCount > 0
                      ? `XiaoJuJun 本人回复了 ${userUnreadCount} 条消息`
                      : isAdminOnline
                      ? "可以直接回复"
                      : "Admin 开启时才上线"}
                  </div>
                </div>
              </button>
            </div>
          )}

          {mode && (
            <>
              <div className="px-4 py-3 border-b border-zinc-800 bg-black flex items-center gap-3">
                <button
                  onClick={async () => {
                    if (mode === "human" && conversation?.id) {
                      await supabase.from("typing_status").upsert({
                        conversation_id: conversation.id,
                        visitor_typing: false,
                        visitor_last_typing_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      });
                    }

                    setMode(null);
                    setInput("");
                    setIsTyping(false);
                  }}
                  className="text-zinc-400 hover:text-white text-lg"
                >
                  ←
                </button>

                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center font-black text-sm">
                    {mode === "ai" ? "AI" : "小"}
                  </div>

                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-black rounded-full ${
                      mode === "ai"
                        ? "bg-green-400"
                        : isAdminOnline
                        ? "bg-green-400"
                        : "bg-zinc-500"
                    }`}
                  ></span>
                </div>

                <div>
                  <div className="font-bold">
                    {mode === "ai" ? "XiaoJuJun AI" : "XiaoJuJun 本人"}
                  </div>

                  <div className="text-xs text-zinc-500">
                    {showTypingBubble
                      ? "正在输入中..."
                      : mode === "ai"
                      ? "在线 · 自动回复"
                      : isAdminOnline
                      ? "在线 · 本人客服"
                      : "离线 · 留言模式"}
                  </div>
                </div>
              </div>

              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="flex-1 p-4 overflow-y-auto space-y-4 bg-black no-scrollbar"
              >
                {currentMessages.length === 0 && !showTypingBubble && (
                  <div className="h-full flex items-center justify-center text-sm text-zinc-600 text-center px-6">
                    开始发送消息吧
                  </div>
                )}

                {currentMessages.map((msg, index) => {
                  const sender = msg.sender;
                  const isUser = msg.role === "user" || sender === "user";
                  const text = msg.text || msg.content || "";
                  const messageTime = formatMessageTime(msg.created_at);

                  return (
                    <div
                      key={msg.id || index}
                      className={`flex ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow ${
                          isUser
                            ? "bg-white text-black rounded-br-md"
                            : "bg-zinc-800 text-white rounded-bl-md border border-zinc-700"
                        }`}
                      >
                        {!isUser && (
                          <div className="text-[11px] text-zinc-400 mb-1">
                            {mode === "ai" ? "XiaoJuJun AI" : "XiaoJuJun 本人"}
                          </div>
                        )}

                        <div>{text}</div>

                        {messageTime && (
                          <div className="text-[10px] text-zinc-500 mt-2">
                            {messageTime}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {showTypingBubble && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800 text-white rounded-2xl rounded-bl-md border border-zinc-700 px-4 py-3 shadow">
                      <div className="text-[11px] text-zinc-400 mb-2">
                        {mode === "ai" ? "XiaoJuJun AI" : "XiaoJuJun 本人"}
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce"></span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-zinc-800 bg-black">
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-2">
                  <input
                    value={input}
                    disabled={isTyping}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendMessage();
                    }}
                    placeholder={
                      mode === "ai"
                        ? "问 XiaoJuJun AI..."
                        : isAdminOnline
                        ? "发送给 XiaoJuJun 本人..."
                        : "留言给 XiaoJuJun 本人..."
                    }
                    className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    onClick={sendMessage}
                    disabled={isTyping}
                    className="bg-white disabled:bg-zinc-600 disabled:text-zinc-300 text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-zinc-200 transition"
                  >
                    {isTyping ? "..." : "发送"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);

          if (nextOpen && mode === "human") {
            clearUserUnread();
          }
        }}
        className="relative w-16 h-16 rounded-full bg-white text-black shadow-2xl flex items-center justify-center hover:scale-105 transition"
      >
        {userUnreadCount > 0 && (
          <span className="absolute -top-2 -left-2 min-w-6 h-6 px-2 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center border-2 border-black">
            {userUnreadCount > 9 ? "9+" : userUnreadCount}
          </span>
        )}

        <span className="text-2xl">{open ? "×" : "💬"}</span>
      </button>
    </div>
  );
}