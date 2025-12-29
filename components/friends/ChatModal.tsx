"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { UserProfile } from "@/lib/types/friends";
import { Message } from "@/lib/types/messages";
import { X, PaperPlaneTilt, UserCircle } from "phosphor-react";
import ModalPortal from "../goals/ModalPortal";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: UserProfile;
}

const ChatModal = ({ isOpen, onClose, friend }: ChatModalProps) => {
  const { user, getCurrentUserIdToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!isOpen || !user?.uid) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        const idToken = await getCurrentUserIdToken();
        if (!idToken) return;

        const response = await fetch(
          `/api/messages?otherUserId=${friend.uid}`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          // Convert date strings to Date objects
          const processedMessages = (data.messages || []).map(
            (msg: Message) => ({
              ...msg,
              createdAt: new Date(msg.createdAt),
              readAt: msg.readAt ? new Date(msg.readAt) : null,
            })
          );
          setMessages(processedMessages);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    // Initial fetch
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));

    // Poll for new messages every 2 seconds
    pollingIntervalRef.current = setInterval(() => {
      fetchMessages();
    }, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setMessages([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user?.uid, friend.uid]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.uid || sending) return;

    try {
      setSending(true);
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          receiverId: friend.uid,
          content: newMessage.trim(),
        }),
      });

      if (response.ok) {
        setNewMessage("");
        // Refresh messages immediately after sending
        const refreshResponse = await fetch(
          `/api/messages?otherUserId=${friend.uid}`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          // Convert date strings to Date objects
          const processedMessages = (data.messages || []).map(
            (msg: Message) => ({
              ...msg,
              createdAt: new Date(msg.createdAt),
              readAt: msg.readAt ? new Date(msg.readAt) : null,
            })
          );
          setMessages(processedMessages);
        }
      } else {
        const error = await response.json();
        alert(error.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: Date) => {
    // Validate date before formatting
    if (!date || isNaN(date.getTime())) {
      return "";
    }
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  const formatDate = (date: Date) => {
    // Validate date before formatting
    if (!date || isNaN(date.getTime())) {
      return "";
    }
    const today = new Date();
    const messageDate = new Date(date);
    const diffTime = today.getTime() - messageDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return messageDate.toLocaleDateString("en-US", { weekday: "long" });
    } else {
      return messageDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-amber-100 border-2 border-emerald-900 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-emerald-900">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              {friend.photoURL ? (
                <img
                  src={friend.photoURL}
                  alt={`${friend.displayName || "User"}'s avatar`}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-emerald-900 object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserCircle
                    size={24}
                    className="text-amber-100"
                    weight="fill"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                  {friend.displayName || "Anonymous User"}
                </h2>
                {friend.email && (
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    {friend.email}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-emerald-900 hover:text-amber-100 rounded-full transition-colors flex-shrink-0"
              aria-label="Close chat"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClose();
                }
              }}
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {loading ? (
              <div className="text-center py-8 text-gray-600">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <p className="text-sm sm:text-base">
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => {
                  const isOwnMessage = message.senderId === user?.uid;
                  const prevMessage = index > 0 ? messages[index - 1] : null;
                  const currentDate = formatDate(message.createdAt);
                  const prevDate = prevMessage
                    ? formatDate(prevMessage.createdAt)
                    : null;
                  const showDateSeparator = currentDate !== prevDate;

                  return (
                    <div key={message.id}>
                      {showDateSeparator && (
                        <div className="text-center py-2">
                          <span className="text-xs text-gray-500 bg-amber-100 px-2 py-1 rounded">
                            {currentDate}
                          </span>
                        </div>
                      )}
                      <div
                        className={`flex ${
                          isOwnMessage ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[75%] sm:max-w-[60%] rounded-lg px-3 sm:px-4 py-2 ${
                            isOwnMessage
                              ? "bg-emerald-900 text-amber-100"
                              : "bg-white border border-emerald-900 text-gray-900"
                          }`}
                        >
                          <p className="text-sm sm:text-base break-words">
                            {message.content}
                          </p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwnMessage ? "text-amber-200" : "text-gray-500"
                            }`}
                          >
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input */}
          <form
            onSubmit={handleSendMessage}
            className="border-t border-emerald-900 p-4 sm:p-6"
          >
            <div className="flex items-center space-x-2 sm:space-x-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-emerald-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-900 text-sm sm:text-base bg-white text-gray-900"
                disabled={sending}
                aria-label="Message input"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="p-2 sm:p-2.5 bg-emerald-900 text-amber-100 rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                aria-label="Send message"
                tabIndex={0}
              >
                <PaperPlaneTilt
                  size={20}
                  weight="fill"
                  className="sm:w-5 sm:h-5"
                />
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ChatModal;
