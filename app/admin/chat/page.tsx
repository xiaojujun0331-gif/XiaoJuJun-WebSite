"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type AdminTab = "human" | "ai";

type Conversation = {
  id: string;
  visitor_id: string;
  visitor_name: string | null;
  status: string | null;
  last_message: string | null;
  last_sender: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string | null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender: "user" | "admin";
  content: string;
  created_at: string;
};

type AiMessage = {
  id: string;
  visitor_id: string;
  sender: "user" | "ai";
  content: string;
  created_at: string;
};

type AiVisitor = {
  visitor_id: string;
  last_message: string;
  last_sender: "user" | "ai";
  last_message_at: string;
  latest_user_message_at: string | null;
  message_count: number;
};

function formatMessageTime(dateString?: string | null) {
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

function getVisitorName(visitorId: string) {
  return `Visitor #${visitorId.slice(-4).toUpperCase()}`;
}

export default function AdminChatPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>("human");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [isUserTyping, setIsUserTyping] = useState(false);

  const [aiVisitors, setAiVisitors] = useState<AiVisitor[]>([]);
  const [selectedAiVisitorId, setSelectedAiVisitorId] = useState<string | null>(
    null
  );
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);

  const [unreadConversationIds, setUnreadConversationIds] = useState<string[]>(
    []
  );
  const [unreadAiVisitorIds, setUnreadAiVisitorIds] = useState<string[]>([]);

  const [soundEnabled, setSoundEnabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);

  const lastMessageMapRef = useRef<Record<string, string>>({});
  const hasLoadedOnceRef = useRef(false);

  const aiLastUserMessageMapRef = useRef<Record<string, string>>({});
  const hasLoadedAiOnceRef = useRef(false);

  const humanUnreadCount = unreadConversationIds.length;
  const aiUnreadCount = unreadAiVisitorIds.length;
  const totalUnreadCount = humanUnreadCount + aiUnreadCount;

  function handleMessagesScroll() {
    const el = messagesContainerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 100;
  }

  function scrollToBottom() {
    if (!shouldAutoScrollRef.current) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }

  function enableSound() {
    const audio = new Audio("/notification.mp3");
    audio.volume = 0.8;
    notificationAudioRef.current = audio;
    setSoundEnabled(true);

    audio.currentTime = 0;
    audio.play().catch(() => {
      alert("浏览器阻止了声音播放，请再点击一次开启声音。");
    });
  }

  function playNotificationSound() {
    if (!soundEnabled) return;
    if (!notificationAudioRef.current) return;

    notificationAudioRef.current.currentTime = 0;
    notificationAudioRef.current.play().catch(() => {});
  }

  async function updateAdminOnlineStatus() {
    await supabase.from("admin_status").upsert({
      id: "xiaojujun",
      is_online: true,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async function setAdminOffline() {
    await supabase.from("admin_status").upsert({
      id: "xiaojujun",
      is_online: false,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async function logout() {
    await setAdminOffline();

    await fetch("/api/admin/logout", {
      method: "POST",
    });

    router.push("/admin/login");
  }

  async function loadConversations() {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Load conversations error:", error);
      return;
    }

    const list = data || [];

    if (hasLoadedOnceRef.current) {
      const newUnreadIds: string[] = [];

      list.forEach((conv) => {
        const lastMessageAt = conv.last_message_at || "";
        const previousLastMessageAt = lastMessageMapRef.current[conv.id] || "";

        const hasNewUserMessage =
          conv.last_sender === "user" &&
          lastMessageAt &&
          lastMessageAt !== previousLastMessageAt;

        const isCurrentlySelected =
          activeTab === "human" && selectedConversation?.id === conv.id;

        if (hasNewUserMessage && !isCurrentlySelected) {
          newUnreadIds.push(conv.id);
        }
      });

      if (newUnreadIds.length > 0) {
        setUnreadConversationIds((prev) => {
          const merged = [...prev];

          newUnreadIds.forEach((id) => {
            if (!merged.includes(id)) {
              merged.push(id);
            }
          });

          return merged;
        });

        playNotificationSound();
      }
    } else {
      hasLoadedOnceRef.current = true;
    }

    const nextMap: Record<string, string> = {};
    list.forEach((conv) => {
      nextMap[conv.id] = conv.last_message_at || "";
    });
    lastMessageMapRef.current = nextMap;

    setConversations(list);
  }

  async function loadMessages(conversationId: string) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Load messages error:", error);
      return;
    }

    setMessages(data || []);
  }

  async function checkUserTyping(conversationId: string) {
    const { data } = await supabase
      .from("typing_status")
      .select("*")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (!data) {
      setIsUserTyping(false);
      return;
    }

    const lastTyping = data.visitor_last_typing_at
      ? new Date(data.visitor_last_typing_at).getTime()
      : 0;

    const typing = data.visitor_typing && Date.now() - lastTyping < 3000;

    setIsUserTyping(Boolean(typing));
  }

  async function selectConversation(conversation: Conversation) {
    setSelectedConversation(conversation);

    setUnreadConversationIds((prev) =>
      prev.filter((id) => id !== conversation.id)
    );

    shouldAutoScrollRef.current = true;

    await loadMessages(conversation.id);
    await checkUserTyping(conversation.id);
  }

  async function handleReplyChange(value: string) {
    setReply(value);

    if (!selectedConversation?.id) return;

    await supabase.from("typing_status").upsert({
      conversation_id: selectedConversation.id,
      admin_typing: Boolean(value.trim()),
      admin_last_typing_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async function sendReply() {
    if (!reply.trim()) return;
    if (!selectedConversation) return;

    const replyText = reply.trim();

    setReply("");

    await supabase.from("typing_status").upsert({
      conversation_id: selectedConversation.id,
      admin_typing: false,
      admin_last_typing_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedConversation.id,
      sender: "admin",
      content: replyText,
    });

    if (error) {
      console.error("Send reply error:", error);
      return;
    }

    await supabase
      .from("conversations")
      .update({
        last_message: replyText,
        last_sender: "admin",
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedConversation.id);

    setUnreadConversationIds((prev) =>
      prev.filter((id) => id !== selectedConversation.id)
    );

    await loadMessages(selectedConversation.id);
    await loadConversations();
  }

  async function deleteConversation(conversation: Conversation) {
    const confirmDelete = confirm(
      `确定要删除 ${
        conversation.visitor_name || conversation.visitor_id
      } 的本人聊天室记录吗？`
    );

    if (!confirmDelete) return;

    await supabase
      .from("typing_status")
      .delete()
      .eq("conversation_id", conversation.id);

    await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", conversation.id);

    await supabase.from("conversations").delete().eq("id", conversation.id);

    if (selectedConversation?.id === conversation.id) {
      setSelectedConversation(null);
      setMessages([]);
      setReply("");
      setIsUserTyping(false);
    }

    setUnreadConversationIds((prev) =>
      prev.filter((id) => id !== conversation.id)
    );

    await loadConversations();
  }

  async function loadAiVisitors() {
    const { data, error } = await supabase
      .from("ai_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("Load AI visitors error:", error);
      return;
    }

    const list = (data || []) as AiMessage[];
    const map = new Map<string, AiVisitor>();

    list.forEach((msg) => {
      const existing = map.get(msg.visitor_id);

      if (!existing) {
        map.set(msg.visitor_id, {
          visitor_id: msg.visitor_id,
          last_message: msg.content,
          last_sender: msg.sender,
          last_message_at: msg.created_at,
          latest_user_message_at:
            msg.sender === "user" ? msg.created_at : null,
          message_count: 1,
        });

        return;
      }

      existing.message_count += 1;

      if (msg.sender === "user" && !existing.latest_user_message_at) {
        existing.latest_user_message_at = msg.created_at;
      }
    });

    const visitors = Array.from(map.values());

    if (hasLoadedAiOnceRef.current) {
      const newUnreadIds: string[] = [];

      visitors.forEach((visitor) => {
        const latestUserMessageAt = visitor.latest_user_message_at || "";
        const previousUserMessageAt =
          aiLastUserMessageMapRef.current[visitor.visitor_id] || "";

        const hasNewAiUserMessage =
          latestUserMessageAt && latestUserMessageAt !== previousUserMessageAt;

        const isCurrentlySelected =
          activeTab === "ai" && selectedAiVisitorId === visitor.visitor_id;

        if (hasNewAiUserMessage && !isCurrentlySelected) {
          newUnreadIds.push(visitor.visitor_id);
        }
      });

      if (newUnreadIds.length > 0) {
        setUnreadAiVisitorIds((prev) => {
          const merged = [...prev];

          newUnreadIds.forEach((id) => {
            if (!merged.includes(id)) {
              merged.push(id);
            }
          });

          return merged;
        });

        playNotificationSound();
      }
    } else {
      hasLoadedAiOnceRef.current = true;
    }

    const nextMap: Record<string, string> = {};
    visitors.forEach((visitor) => {
      nextMap[visitor.visitor_id] = visitor.latest_user_message_at || "";
    });
    aiLastUserMessageMapRef.current = nextMap;

    setAiVisitors(visitors);
  }

  async function loadAiMessages(visitorId: string) {
    const { data, error } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("visitor_id", visitorId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Load AI messages error:", error);
      return;
    }

    setAiMessages((data || []) as AiMessage[]);
  }

  async function selectAiVisitor(visitorId: string) {
    setSelectedAiVisitorId(visitorId);

    setUnreadAiVisitorIds((prev) => prev.filter((id) => id !== visitorId));

    shouldAutoScrollRef.current = true;

    await loadAiMessages(visitorId);
  }

  async function deleteAiHistory(visitorId: string) {
    const confirmDelete = confirm(
      `确定要删除 ${getVisitorName(visitorId)} 的 AI 对话记录吗？`
    );

    if (!confirmDelete) return;

    await supabase.from("ai_messages").delete().eq("visitor_id", visitorId);

    if (selectedAiVisitorId === visitorId) {
      setSelectedAiVisitorId(null);
      setAiMessages([]);
    }

    setUnreadAiVisitorIds((prev) => prev.filter((id) => id !== visitorId));

    await loadAiVisitors();
  }

  useEffect(() => {
    updateAdminOnlineStatus();
    loadConversations();
    loadAiVisitors();

    const interval = setInterval(() => {
      updateAdminOnlineStatus();
      loadConversations();
      loadAiVisitors();

      if (selectedConversation?.id) {
        loadMessages(selectedConversation.id);
        checkUserTyping(selectedConversation.id);
      }

      if (selectedAiVisitorId) {
        loadAiMessages(selectedAiVisitorId);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      setAdminOffline();
    };
  }, [selectedConversation?.id, selectedAiVisitorId, activeTab]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, aiMessages.length, isUserTyping, activeTab]);

  useEffect(() => {
    if (totalUnreadCount > 0) {
      document.title = `● ${totalUnreadCount} 条新消息 - 客服后台`;
    } else {
      document.title = "客服后台";
    }
  }, [totalUnreadCount]);

  return (
    <main className="fixed inset-0 bg-black text-white flex overflow-hidden">
      <aside className="w-[360px] border-r border-zinc-800 bg-zinc-950 flex flex-col">
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-black">
                {totalUnreadCount > 0
                  ? `客服后台 · ${totalUnreadCount} 条新消息`
                  : "客服后台"}
              </h1>

              <p className="text-xs text-green-400 mt-1">Admin 在线中</p>
            </div>

            <button
              onClick={logout}
              className="text-xs px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
            >
              退出
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setActiveTab("human")}
              className={`relative px-3 py-2 rounded-xl text-sm font-bold border transition ${
                activeTab === "human"
                  ? "bg-white text-black border-white"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
              }`}
            >
              本人回复聊天室

              {humanUnreadCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border border-black">
                  {humanUnreadCount > 9 ? "9+" : humanUnreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("ai")}
              className={`relative px-3 py-2 rounded-xl text-sm font-bold border transition ${
                activeTab === "ai"
                  ? "bg-white text-black border-white"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
              }`}
            >
              AI 回复聊天室

              {aiUnreadCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border border-black">
                  {aiUnreadCount > 9 ? "9+" : aiUnreadCount}
                </span>
              )}
            </button>
          </div>

          {!soundEnabled ? (
            <button
              onClick={enableSound}
              className="w-full text-sm px-4 py-3 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 transition"
            >
              开启新消息声音提醒
            </button>
          ) : (
            <div className="text-xs text-zinc-500">
              声音提醒已开启 · 本人消息 / AI 新记录都会提醒
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {activeTab === "human" && (
            <>
              {conversations.length === 0 && (
                <div className="p-5 text-sm text-zinc-500">
                  目前还没有本人聊天室记录。
                </div>
              )}

              {conversations.map((conversation) => {
                const isSelected =
                  selectedConversation?.id === conversation.id;
                const hasUnread = unreadConversationIds.includes(
                  conversation.id
                );

                return (
                  <div
                    key={conversation.id}
                    onClick={() => selectConversation(conversation)}
                    className={`w-full text-left px-5 py-4 border-b border-zinc-900 hover:bg-zinc-900 transition cursor-pointer ${
                      isSelected ? "bg-zinc-900" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-bold truncate">
                            {conversation.visitor_name ||
                              getVisitorName(conversation.visitor_id)}
                          </div>

                          {hasUnread && (
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span>
                          )}
                        </div>

                        <div className="text-xs text-zinc-500 mt-1 truncate">
                          {conversation.last_message || "还没有消息"}
                        </div>

                        <div className="text-[11px] text-zinc-600 mt-1">
                          {formatMessageTime(
                            conversation.last_message_at ||
                              conversation.created_at
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conversation);
                        }}
                        className="text-xs text-zinc-600 hover:text-red-400 px-2 py-1"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {activeTab === "ai" && (
            <>
              {aiVisitors.length === 0 && (
                <div className="p-5 text-sm text-zinc-500">
                  目前还没有 AI 聊天记录。
                </div>
              )}

              {aiVisitors.map((visitor) => {
                const isSelected = selectedAiVisitorId === visitor.visitor_id;
                const hasUnread = unreadAiVisitorIds.includes(
                  visitor.visitor_id
                );

                return (
                  <div
                    key={visitor.visitor_id}
                    onClick={() => selectAiVisitor(visitor.visitor_id)}
                    className={`w-full text-left px-5 py-4 border-b border-zinc-900 hover:bg-zinc-900 transition cursor-pointer ${
                      isSelected ? "bg-zinc-900" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-bold truncate">
                            {getVisitorName(visitor.visitor_id)}
                          </div>

                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            AI
                          </span>

                          {hasUnread && (
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span>
                          )}
                        </div>

                        <div className="text-xs text-zinc-500 mt-1 truncate">
                          {visitor.last_sender === "user" ? "用户：" : "AI："}
                          {visitor.last_message}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-zinc-600 mt-1">
                          <span>{formatMessageTime(visitor.last_message_at)}</span>
                          <span>·</span>
                          <span>{visitor.message_count} 条</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAiHistory(visitor.visitor_id);
                        }}
                        className="text-xs text-zinc-600 hover:text-red-400 px-2 py-1"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </aside>

      <section className="flex-1 flex flex-col bg-black">
        {activeTab === "human" && (
          <>
            {!selectedConversation ? (
              <div className="h-full flex items-center justify-center text-zinc-600">
                请选择一个本人聊天室
              </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-zinc-800 bg-black flex items-center justify-between">
                  <div>
                    <div className="font-black text-lg">
                      {selectedConversation.visitor_name ||
                        getVisitorName(selectedConversation.visitor_id)}
                    </div>

                    <div className="text-xs text-zinc-500 mt-1">
                      {isUserTyping ? "用户正在输入中..." : "本人回复聊天室"}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteConversation(selectedConversation)}
                    className="text-sm px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-900"
                  >
                    删除记录
                  </button>
                </div>

                <div
                  ref={messagesContainerRef}
                  onScroll={handleMessagesScroll}
                  className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar"
                >
                  {messages.length === 0 && !isUserTyping && (
                    <div className="h-full flex items-center justify-center text-zinc-600">
                      还没有消息
                    </div>
                  )}

                  {messages.map((message) => {
                    const isAdmin = message.sender === "admin";

                    return (
                      <div
                        key={message.id}
                        className={`flex ${
                          isAdmin ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            isAdmin
                              ? "bg-white text-black rounded-br-md"
                              : "bg-zinc-800 text-white rounded-bl-md border border-zinc-700"
                          }`}
                        >
                          <div className="text-[11px] text-zinc-500 mb-1">
                            {isAdmin ? "Admin" : "用户"}
                          </div>

                          <div>{message.content}</div>

                          <div className="text-[10px] text-zinc-500 mt-2">
                            {formatMessageTime(message.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isUserTyping && (
                    <div className="flex justify-start">
                      <div className="bg-zinc-800 text-white rounded-2xl rounded-bl-md border border-zinc-700 px-4 py-3">
                        <div className="text-[11px] text-zinc-400 mb-2">
                          用户
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

                <div className="p-5 border-t border-zinc-800 bg-black">
                  <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-2xl p-2">
                    <input
                      value={reply}
                      onChange={(e) => handleReplyChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") sendReply();
                      }}
                      placeholder="回复用户..."
                      className="flex-1 bg-transparent outline-none px-4 py-3 text-sm placeholder:text-zinc-600"
                    />

                    <button
                      onClick={sendReply}
                      className="px-6 py-3 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 transition"
                    >
                      发送
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "ai" && (
          <>
            {!selectedAiVisitorId ? (
              <div className="h-full flex items-center justify-center text-zinc-600">
                请选择一个 AI 回复聊天室
              </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-zinc-800 bg-black flex items-center justify-between">
                  <div>
                    <div className="font-black text-lg">
                      {getVisitorName(selectedAiVisitorId)}
                    </div>

                    <div className="text-xs text-zinc-500 mt-1">
                      AI 回复聊天室 · 只读记录
                    </div>
                  </div>

                  <button
                    onClick={() => deleteAiHistory(selectedAiVisitorId)}
                    className="text-sm px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-900"
                  >
                    删除 AI 记录
                  </button>
                </div>

                <div
                  ref={messagesContainerRef}
                  onScroll={handleMessagesScroll}
                  className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar"
                >
                  {aiMessages.length === 0 && (
                    <div className="h-full flex items-center justify-center text-zinc-600">
                      还没有 AI 对话记录
                    </div>
                  )}

                  {aiMessages.map((message) => {
                    const isUser = message.sender === "user";

                    return (
                      <div
                        key={message.id}
                        className={`flex ${
                          isUser ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            isUser
                              ? "bg-white text-black rounded-br-md"
                              : "bg-purple-950/60 text-white rounded-bl-md border border-purple-700/40"
                          }`}
                        >
                          <div
                            className={`text-[11px] mb-1 ${
                              isUser ? "text-zinc-500" : "text-purple-300"
                            }`}
                          >
                            {isUser ? "用户" : "XiaoJuJun AI"}
                          </div>

                          <div>{message.content}</div>

                          <div className="text-[10px] text-zinc-500 mt-2">
                            {formatMessageTime(message.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div ref={messagesEndRef} />
                </div>

                <div className="p-5 border-t border-zinc-800 bg-black">
                  <div className="text-sm text-zinc-500 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4">
                    这里是 AI 回复聊天室，只用于查看用户与 XiaoJuJun AI
                    的对话记录，Admin 不需要在这里回复。
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}