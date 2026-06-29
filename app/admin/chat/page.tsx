"use client";

import { useEffect, useRef, useState } from "react";
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
  created_at: string | null;
  updated_at: string | null;
};

type HumanMessage = {
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
  client_message_id?: string | null;
};

type AiVisitorGroup = {
  visitor_id: string;
  messages: AiMessage[];
  last_message: string;
  last_message_at: string;
};

function formatTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getMessagePreview(text?: string | null) {
  if (!text) return "暂无消息";
  if (text.length <= 30) return text;
  return `${text.slice(0, 30)}...`;
}

export default function AdminChatPage() {
  const [tab, setTab] = useState<AdminTab>("human");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [humanMessages, setHumanMessages] = useState<HumanMessage[]>([]);
  const [replyText, setReplyText] = useState("");

  const [aiGroups, setAiGroups] = useState<AiVisitorGroup[]>([]);
  const [selectedAiVisitorId, setSelectedAiVisitorId] = useState<string | null>(
    null
  );

  const [unreadConversationIds, setUnreadConversationIds] = useState<string[]>(
    []
  );
  const [unreadAiVisitorIds, setUnreadAiVisitorIds] = useState<string[]>([]);

  const [soundEnabled, setSoundEnabled] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const selectedAiGroup = aiGroups.find(
    (group) => group.visitor_id === selectedAiVisitorId
  );

  const totalUnread =
    unreadConversationIds.length + unreadAiVisitorIds.length;

  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
  }, []);

  useEffect(() => {
    let active = true;

    async function heartbeat() {
      if (!active) return;

      const now = new Date().toISOString();

      await supabase.from("admin_status").upsert({
        id: "xiaojujun",
        is_online: true,
        last_seen_at: now,
        updated_at: now,
      });
    }

    heartbeat();

    const interval = setInterval(() => {
      heartbeat();
    }, 3000);

    const handleBeforeUnload = () => {
      const now = new Date().toISOString();

      supabase.from("admin_status").upsert({
        id: "xiaojujun",
        is_online: false,
        last_seen_at: now,
        updated_at: now,
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    loadConversations();
    loadAiMessages();

    const interval = setInterval(() => {
      loadConversations();
      loadAiMessages();

      if (selectedConversation?.id) {
        loadHumanMessages(selectedConversation.id);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (totalUnread > 0) {
      document.title = `● ${totalUnread} 条新消息 - 客服后台`;
    } else {
      document.title = "客服后台";
    }
  }, [totalUnread]);

  useEffect(() => {
    scrollToBottom();
  }, [humanMessages, selectedAiGroup?.messages.length]);

  function playNotificationSound() {
    if (!soundEnabled) return;

    audioRef.current?.play().catch(() => {});
  }

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 80);
  }

  async function loadConversations() {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) return;

    const list = (data || []) as Conversation[];

    setConversations((prev) => {
      const previousIds = prev.map((item) => item.id);

      const newUserConversations = list.filter((item) => {
        const isNew = !previousIds.includes(item.id);
        const fromUser = item.last_sender === "user";
        return isNew && fromUser;
      });

      if (newUserConversations.length > 0) {
        playNotificationSound();

        setUnreadConversationIds((current) => {
          const next = [...current];

          for (const item of newUserConversations) {
            if (!next.includes(item.id)) {
              next.push(item.id);
            }
          }

          return next;
        });
      }

      return list;
    });
  }

  async function loadHumanMessages(conversationId: string) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) return;

    const list = (data || []) as HumanMessage[];

    setHumanMessages((prev) => {
      const previousIds = prev.map((item) => item.id);

      const newUserMessages = list.filter((item) => {
        const isNew = !previousIds.includes(item.id);
        const fromUser = item.sender === "user";
        return isNew && fromUser;
      });

      if (
        newUserMessages.length > 0 &&
        selectedConversation?.id !== conversationId
      ) {
        playNotificationSound();

        setUnreadConversationIds((current) => {
          if (current.includes(conversationId)) return current;
          return [...current, conversationId];
        });
      }

      return list;
    });
  }

  async function loadAiMessages() {
    const { data, error } = await supabase
      .from("ai_messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) return;

    const messages = (data || []) as AiMessage[];
    const map = new Map<string, AiMessage[]>();

    for (const message of messages) {
      if (!map.has(message.visitor_id)) {
        map.set(message.visitor_id, []);
      }

      map.get(message.visitor_id)?.push(message);
    }

    const groups: AiVisitorGroup[] = Array.from(map.entries())
      .map(([visitorId, groupMessages]) => {
        const lastMessage = groupMessages[groupMessages.length - 1];

        return {
          visitor_id: visitorId,
          messages: groupMessages,
          last_message: lastMessage?.content || "",
          last_message_at: lastMessage?.created_at || "",
        };
      })
      .sort(
        (a, b) =>
          new Date(b.last_message_at).getTime() -
          new Date(a.last_message_at).getTime()
      );

    setAiGroups((prev) => {
      const previousMap = new Map<string, string>();

      for (const group of prev) {
        previousMap.set(group.visitor_id, group.last_message_at);
      }

      const newGroups = groups.filter((group) => {
        const previousTime = previousMap.get(group.visitor_id);
        const hasNewMessage =
          previousTime && previousTime !== group.last_message_at;
        const isNewVisitor = !previousTime;
        const notSelected = selectedAiVisitorId !== group.visitor_id;

        return (hasNewMessage || isNewVisitor) && notSelected;
      });

      if (newGroups.length > 0 && prev.length > 0) {
        playNotificationSound();

        setUnreadAiVisitorIds((current) => {
          const next = [...current];

          for (const group of newGroups) {
            if (!next.includes(group.visitor_id)) {
              next.push(group.visitor_id);
            }
          }

          return next;
        });
      }

      return groups;
    });
  }

  async function selectConversation(conversation: Conversation) {
    setSelectedConversation(conversation);
    setTab("human");

    setUnreadConversationIds((prev) =>
      prev.filter((id) => id !== conversation.id)
    );

    await loadHumanMessages(conversation.id);
  }

  function selectAiVisitor(visitorId: string) {
    setSelectedAiVisitorId(visitorId);
    setTab("ai");

    setUnreadAiVisitorIds((prev) => prev.filter((id) => id !== visitorId));
  }

  async function sendReply() {
    const text = replyText.trim();

    if (!text || !selectedConversation?.id || sending) return;

    setSending(true);
    setReplyText("");

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: selectedConversation.id,
        sender: "admin",
        content: text,
      })
      .select("*")
      .limit(1);

    if (!error && data?.[0]) {
      const insertedMessage = data[0] as HumanMessage;

      setHumanMessages((prev) => [...prev, insertedMessage]);
    }

    const now = new Date().toISOString();

    await supabase
      .from("conversations")
      .update({
        last_message: text,
        last_sender: "admin",
        last_message_at: now,
        updated_at: now,
        status: "open",
      })
      .eq("id", selectedConversation.id);

    setConversations((prev) =>
      prev.map((item) =>
        item.id === selectedConversation.id
          ? {
              ...item,
              last_message: text,
              last_sender: "admin",
              last_message_at: now,
              updated_at: now,
            }
          : item
      )
    );

    setUnreadConversationIds((prev) =>
      prev.filter((id) => id !== selectedConversation.id)
    );

    setSending(false);
  }

  async function deleteConversation(conversationId: string) {
    const ok = window.confirm("确定要删除这个本人聊天室记录吗？");

    if (!ok) return;

    await supabase
      .from("typing_status")
      .delete()
      .eq("conversation_id", conversationId);

    await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", conversationId);

    await supabase.from("conversations").delete().eq("id", conversationId);

    setConversations((prev) =>
      prev.filter((item) => item.id !== conversationId)
    );

    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(null);
      setHumanMessages([]);
    }
  }

  async function deleteAiHistory(visitorId: string) {
    const ok = window.confirm("确定要删除这个 AI 聊天记录吗？");

    if (!ok) return;

    await supabase.from("ai_messages").delete().eq("visitor_id", visitorId);

    setAiGroups((prev) => prev.filter((item) => item.visitor_id !== visitorId));

    if (selectedAiVisitorId === visitorId) {
      setSelectedAiVisitorId(null);
    }
  }

  async function logout() {
    const now = new Date().toISOString();

    await supabase.from("admin_status").upsert({
      id: "xiaojujun",
      is_online: false,
      last_seen_at: now,
      updated_at: now,
    });

    await fetch("/api/admin/logout", {
      method: "POST",
    });

    window.location.href = "/admin/login";
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="grid lg:grid-cols-[540px_1fr] min-h-screen">
        <aside className="border-r border-zinc-800 bg-black">
          <div className="p-8 border-b border-zinc-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-black mb-2">客服后台</h1>
                <p className="text-green-400 font-bold">Admin 在线中</p>
              </div>

              <button
                onClick={logout}
                className="rounded-2xl bg-zinc-900 border border-zinc-800 px-5 py-3 hover:bg-zinc-800 transition"
              >
                退出
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-8">
              <button
                onClick={() => setTab("human")}
                className={`relative rounded-2xl px-5 py-4 font-black border transition ${
                  tab === "human"
                    ? "bg-white text-black border-white"
                    : "bg-zinc-900 text-zinc-400 border-zinc-800"
                }`}
              >
                本人回复聊天室

                {unreadConversationIds.length > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-6 h-6 px-2 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {unreadConversationIds.length > 9
                      ? "9+"
                      : unreadConversationIds.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setTab("ai")}
                className={`relative rounded-2xl px-5 py-4 font-black border transition ${
                  tab === "ai"
                    ? "bg-white text-black border-white"
                    : "bg-zinc-900 text-zinc-400 border-zinc-800"
                }`}
              >
                AI 回复聊天室

                {unreadAiVisitorIds.length > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-6 h-6 px-2 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {unreadAiVisitorIds.length > 9
                      ? "9+"
                      : unreadAiVisitorIds.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={() => setSoundEnabled(true)}
              className="w-full mt-6 rounded-2xl bg-white text-black px-5 py-4 font-black hover:bg-zinc-200 transition"
            >
              开启新消息声音提醒
            </button>
          </div>

          <div className="h-[calc(100vh-296px)] overflow-y-auto no-scrollbar">
            {tab === "human" && (
              <>
                {conversations.length === 0 && (
                  <div className="p-8 text-zinc-500">
                    目前还没有本人聊天室记录。
                  </div>
                )}

                {conversations.map((conversation) => {
                  const active = selectedConversation?.id === conversation.id;
                  const unread = unreadConversationIds.includes(
                    conversation.id
                  );

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => selectConversation(conversation)}
                      className={`w-full text-left p-5 border-b border-zinc-900 hover:bg-zinc-950 transition ${
                        active ? "bg-zinc-950" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-black text-lg truncate">
                            {conversation.visitor_name ||
                              `Visitor ${conversation.visitor_id.slice(-4)}`}
                          </div>

                          <div className="text-sm text-zinc-500 truncate mt-1">
                            {getMessagePreview(conversation.last_message)}
                          </div>

                          <div className="text-xs text-zinc-600 mt-2">
                            {formatTime(conversation.updated_at)}
                          </div>
                        </div>

                        {unread && (
                          <span className="w-3 h-3 rounded-full bg-red-500 mt-2 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {tab === "ai" && (
              <>
                {aiGroups.length === 0 && (
                  <div className="p-8 text-zinc-500">
                    目前还没有 AI 聊天记录。
                  </div>
                )}

                {aiGroups.map((group) => {
                  const active = selectedAiVisitorId === group.visitor_id;
                  const unread = unreadAiVisitorIds.includes(group.visitor_id);

                  return (
                    <button
                      key={group.visitor_id}
                      onClick={() => selectAiVisitor(group.visitor_id)}
                      className={`w-full text-left p-5 border-b border-zinc-900 hover:bg-zinc-950 transition ${
                        active ? "bg-zinc-950" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-black text-lg truncate">
                            {`AI Visitor ${group.visitor_id.slice(-4)}`}
                          </div>

                          <div className="text-sm text-zinc-500 truncate mt-1">
                            {getMessagePreview(group.last_message)}
                          </div>

                          <div className="text-xs text-zinc-600 mt-2">
                            {formatTime(group.last_message_at)}
                          </div>
                        </div>

                        {unread && (
                          <span className="w-3 h-3 rounded-full bg-red-500 mt-2 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </aside>

        <section className="bg-zinc-950 min-h-screen flex flex-col">
          {tab === "human" && !selectedConversation && (
            <div className="flex-1 flex items-center justify-center text-zinc-600 text-lg">
              请选择一个本人聊天室。
            </div>
          )}

          {tab === "human" && selectedConversation && (
            <>
              <div className="p-6 border-b border-zinc-800 bg-black flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">
                    {selectedConversation.visitor_name ||
                      `Visitor ${selectedConversation.visitor_id.slice(-4)}`}
                  </h2>
                  <p className="text-sm text-zinc-500">
                    {selectedConversation.visitor_id}
                  </p>
                </div>

                <button
                  onClick={() => deleteConversation(selectedConversation.id)}
                  className="rounded-2xl border border-red-500/30 text-red-400 px-4 py-3 hover:bg-red-500/10 transition"
                >
                  删除
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {humanMessages.map((message) => {
                  const isUser = message.sender === "user";

                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        isUser ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                          isUser
                            ? "bg-zinc-800 text-white rounded-bl-md"
                            : "bg-white text-black rounded-br-md"
                        }`}
                      >
                        <div className="text-xs opacity-60 mb-1">
                          {isUser ? "访客" : "Admin"}
                        </div>

                        <div className="whitespace-pre-wrap break-words">
                          {message.content}
                        </div>

                        <div className="text-[10px] opacity-50 mt-2">
                          {formatTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>

              <div className="p-6 border-t border-zinc-800 bg-black">
                <div className="flex gap-3">
                  <input
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        sendReply();
                      }
                    }}
                    placeholder="回复访客..."
                    className="flex-1 rounded-2xl bg-zinc-900 border border-zinc-800 px-5 py-4 outline-none focus:border-zinc-600"
                  />

                  <button
                    onClick={sendReply}
                    disabled={!replyText.trim() || sending}
                    className="rounded-2xl bg-white text-black px-8 py-4 font-black hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    发送
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === "ai" && !selectedAiGroup && (
            <div className="flex-1 flex items-center justify-center text-zinc-600 text-lg">
              请选择一个 AI 聊天记录。
            </div>
          )}

          {tab === "ai" && selectedAiGroup && (
            <>
              <div className="p-6 border-b border-zinc-800 bg-black flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">
                    AI Visitor {selectedAiGroup.visitor_id.slice(-4)}
                  </h2>
                  <p className="text-sm text-zinc-500">
                    {selectedAiGroup.visitor_id}
                  </p>
                </div>

                <button
                  onClick={() => deleteAiHistory(selectedAiGroup.visitor_id)}
                  className="rounded-2xl border border-red-500/30 text-red-400 px-4 py-3 hover:bg-red-500/10 transition"
                >
                  删除
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {selectedAiGroup.messages.map((message) => {
                  const isUser = message.sender === "user";

                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        isUser ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                          isUser
                            ? "bg-zinc-800 text-white rounded-bl-md"
                            : "bg-white text-black rounded-br-md"
                        }`}
                      >
                        <div className="text-xs opacity-60 mb-1">
                          {isUser ? "访客" : "AI"}
                        </div>

                        <div className="whitespace-pre-wrap break-words">
                          {message.content}
                        </div>

                        <div className="text-[10px] opacity-50 mt-2">
                          {formatTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}