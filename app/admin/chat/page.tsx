"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Conversation = {
  id: string;
  visitor_id: string;
  visitor_name: string | null;
  status: string | null;
  last_message: string | null;
  last_sender: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender: "user" | "admin" | "ai" | "system";
  content: string;
  created_at: string;
};

type TypingStatus = {
  conversation_id: string;
  visitor_typing: boolean | null;
  admin_typing: boolean | null;
  visitor_last_typing_at: string | null;
  admin_last_typing_at: string | null;
};

export default function AdminChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [unreadConversationIds, setUnreadConversationIds] = useState<string[]>(
    []
  );
  const [soundEnabled, setSoundEnabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastMessageMapRef = useRef<Record<string, string>>({});
  const hasLoadedOnceRef = useRef(false);

  async function enableSound() {
    try {
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.8;

      notificationAudioRef.current = audio;
      setSoundEnabled(true);

      await audio.play();
      audio.currentTime = 0;
    } catch (error) {
      console.error("Enable sound error:", error);
      alert(
        "声音开启失败。请确认 public 文件夹里有 notification.mp3，并且浏览器没有静音。"
      );
    }
  }

  function playNotificationSound() {
    if (!soundEnabled) return;

    try {
      const audio = notificationAudioRef.current;

      if (!audio) return;

      audio.currentTime = 0;
      audio.play();
    } catch (error) {
      console.error("Play sound error:", error);
    }
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

  async function updateAdminOnline() {
    await supabase.from("admin_status").upsert({
      id: "xiaojujun",
      is_online: true,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async function loadConversations() {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Load conversations error:", error);
      return;
    }

    const list = data || [];

    if (hasLoadedOnceRef.current) {
      const newUnreadIds: string[] = [];

      list.forEach((conversation) => {
        const oldMessageAt = lastMessageMapRef.current[conversation.id];
        const newMessageAt = conversation.last_message_at || "";

        const isNewMessage =
          newMessageAt &&
          oldMessageAt !== newMessageAt &&
          conversation.last_sender === "user";

        if (isNewMessage) {
          newUnreadIds.push(conversation.id);
        }

        if (newMessageAt) {
          lastMessageMapRef.current[conversation.id] = newMessageAt;
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
      list.forEach((conversation) => {
        if (conversation.last_message_at) {
          lastMessageMapRef.current[conversation.id] =
            conversation.last_message_at;
        }
      });

      hasLoadedOnceRef.current = true;
    }

    setConversations(list);

    if (!selectedConversation && list.length > 0) {
      setSelectedConversation(list[0]);
    }

    if (
      selectedConversation &&
      !list.some((item) => item.id === selectedConversation.id)
    ) {
      setSelectedConversation(list[0] || null);
    }
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
      .maybeSingle<TypingStatus>();

    if (!data) {
      setIsUserTyping(false);
      return;
    }

    const lastTyping = data.visitor_last_typing_at
      ? new Date(data.visitor_last_typing_at).getTime()
      : 0;

    const typing =
      Boolean(data.visitor_typing) && Date.now() - lastTyping < 3000;

    setIsUserTyping(typing);
  }

  async function handleReplyChange(value: string) {
    setReply(value);

    if (!selectedConversation) return;

    await supabase.from("typing_status").upsert({
      conversation_id: selectedConversation.id,
      admin_typing: Boolean(value.trim()),
      admin_last_typing_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async function sendReply() {
    if (!reply.trim() || !selectedConversation) return;

    const replyText = reply;
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

    await loadMessages(selectedConversation.id);
    await loadConversations();
  }

  async function deleteChatRecord() {
    if (!selectedConversation) return;

    const confirmDelete = window.confirm(
      `确定要删除 ${selectedConversation.visitor_name || "这个用户"} 的聊天记录吗？`
    );

    if (!confirmDelete) return;

    const deletingId = selectedConversation.id;

    await supabase
      .from("typing_status")
      .delete()
      .eq("conversation_id", deletingId);

    await supabase.from("messages").delete().eq("conversation_id", deletingId);

    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", deletingId);

    if (error) {
      console.error("Delete chat error:", error);
      return;
    }

    setMessages([]);
    setReply("");
    setIsUserTyping(false);
    setSelectedConversation(null);
    setUnreadConversationIds((prev) => prev.filter((id) => id !== deletingId));

    delete lastMessageMapRef.current[deletingId];

    const { data } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    setConversations(data || []);
    setSelectedConversation(data?.[0] || null);
  }

  useEffect(() => {
    updateAdminOnline();
    loadConversations();

    const interval = setInterval(() => {
      updateAdminOnline();
      loadConversations();

      if (selectedConversation?.id) {
        loadMessages(selectedConversation.id);
        checkUserTyping(selectedConversation.id);
      }
    }, 1000);

    return () => {
      clearInterval(interval);

      supabase.from("admin_status").upsert({
        id: "xiaojujun",
        is_online: false,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    };
  }, [selectedConversation?.id, soundEnabled]);

  useEffect(() => {
    if (selectedConversation?.id) {
      loadMessages(selectedConversation.id);
      checkUserTyping(selectedConversation.id);

      setUnreadConversationIds((prev) =>
        prev.filter((id) => id !== selectedConversation.id)
      );
    }
  }, [selectedConversation?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isUserTyping]);

  useEffect(() => {
    if (unreadConversationIds.length > 0) {
      document.title = "● 新消息 - 客服后台";
    } else {
      document.title = "客服后台";
    }
  }, [unreadConversationIds.length]);

  return (
    <main className="fixed inset-0 z-[60] bg-black text-white">
      <div className="h-screen flex">
        <aside className="w-[330px] border-r border-zinc-800 bg-zinc-950 flex flex-col">
          <div className="p-5 border-b border-zinc-800">
            <h1 className="text-2xl font-bold">客服后台</h1>

            <div className="flex items-center gap-2 mt-2 text-sm text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              XiaoJuJun 本人在线
            </div>

            {!soundEnabled && (
              <button
                onClick={enableSound}
                className="mt-4 w-full rounded-xl bg-white text-black py-2 text-sm font-bold hover:bg-zinc-200 transition"
              >
                开启新消息声音提醒
              </button>
            )}

            {soundEnabled && (
              <div className="mt-4 text-xs text-green-400">
                声音提醒已开启
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {conversations.length === 0 && (
              <div className="h-full flex items-center justify-center text-sm text-zinc-600 px-6 text-center">
                目前还没有用户聊天室
              </div>
            )}

            {conversations.map((conversation) => {
              const isActive = selectedConversation?.id === conversation.id;
              const hasUnread = unreadConversationIds.includes(
                conversation.id
              );

              return (
                <button
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    setReply("");
                    setIsUserTyping(false);
                    shouldAutoScrollRef.current = true;

                    setUnreadConversationIds((prev) =>
                      prev.filter((id) => id !== conversation.id)
                    );
                  }}
                  className={`w-full text-left p-4 border-b border-zinc-900 hover:bg-zinc-900 transition ${
                    isActive ? "bg-zinc-900" : "bg-zinc-950"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center font-black">
                        {conversation.visitor_name?.slice(-4) || "U"}
                      </div>

                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-zinc-950"></span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold truncate flex items-center gap-2">
                          {conversation.visitor_name || "Visitor"}

                          {hasUnread && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500 text-white">
                              新消息
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] px-2 py-1 rounded-full bg-green-400/10 text-green-400">
                          open
                        </div>
                      </div>

                      <div className="text-xs text-zinc-500 truncate mt-1">
                        {conversation.last_message || "暂无消息"}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex-1 min-w-0 flex flex-col bg-black">
          {!selectedConversation && (
            <div className="h-full flex items-center justify-center text-zinc-600">
              请选择一个用户聊天室
            </div>
          )}

          {selectedConversation && (
            <>
              <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-black">
                    {selectedConversation.visitor_name?.slice(-4) || "U"}
                  </div>

                  <div>
                    <h2 className="text-xl font-bold">
                      {selectedConversation.visitor_name || "Visitor"}
                    </h2>
                    <p className="text-xs text-zinc-500">
                      {isUserTyping ? "用户正在输入中..." : "用户聊天室"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={deleteChatRecord}
                  className="text-xs px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                >
                  删除聊天记录
                </button>
              </div>

              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-6 space-y-4"
              >
                {messages.length === 0 && !isUserTyping && (
                  <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                    这个用户还没有发送消息
                  </div>
                )}

                {messages.map((msg) => {
                  const isUser = msg.sender === "user";

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        isUser ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[65%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          isUser
                            ? "bg-zinc-800 text-white rounded-bl-md border border-zinc-700"
                            : "bg-white text-black rounded-br-md"
                        }`}
                      >
                        <div
                          className={`text-[11px] mb-1 ${
                            isUser ? "text-zinc-400" : "text-zinc-600"
                          }`}
                        >
                          {isUser ? "用户" : "XiaoJuJun 本人"}
                        </div>

                        {msg.content}
                      </div>
                    </div>
                  );
                })}

                {isUserTyping && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800 text-white rounded-2xl rounded-bl-md border border-zinc-700 px-4 py-3 shadow">
                      <div className="text-[11px] text-zinc-400 mb-2">
                        用户正在输入中...
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

              <div className="shrink-0 p-5 border-t border-zinc-800 bg-black">
                <div className="flex gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-2">
                  <input
                    value={reply}
                    onChange={(e) => handleReplyChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendReply();
                    }}
                    placeholder="输入你的回复..."
                    className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-zinc-500"
                  />

                  <button
                    onClick={sendReply}
                    className="bg-white text-black px-5 py-2 rounded-xl text-sm font-bold hover:bg-zinc-200 transition"
                  >
                    回复
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}