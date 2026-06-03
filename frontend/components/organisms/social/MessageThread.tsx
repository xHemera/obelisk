"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import { MessageBubble } from "@/components/molecules/social/MessageBubble";
import { DEFAULT_PROFILE_ICON } from "@/lib/profile-icons";
import type { type as socialType } from "@/app/social/index";

type MessageThreadProps = {
  selectedUser: string;
  currentUser: socialType.User | null;
  messages: socialType.Messages[];
  unread: boolean;
  expandedMessages: Set<string>;
  users: socialType.User[];
  customUserAvatar?: string | null;
  maxDisplayLength: number;
  isTyping: boolean;
  typer: string | null;
  onMessageExpand: (messageId: string) => void;
  onProfileClick: (userName: string) => void;
  onLoadOlderMessages?: () => Promise<void>;
  isLoadingOlderMessages?: boolean;
  hasMoreMessages?: boolean;
};

export const MessageThread = memo(function MessageThread({
  selectedUser,
  currentUser,
  messages,
  unread,
  expandedMessages,
  users,
  customUserAvatar,
  maxDisplayLength,
  isTyping,
  typer,
  onMessageExpand,
  onProfileClick,
  onLoadOlderMessages,
  isLoadingOlderMessages = false,
  hasMoreMessages = true,
}: MessageThreadProps) {
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const previousHeightRef = useRef(0);
  const selectedUserData = useMemo(
    () => users.find((user) => user.name === selectedUser),
    [selectedUser, users],
  );
  const lastUserMessageIndex = useMemo(
    () => messages.findLastIndex((message) => message.user_id === currentUser?.id),
    [messages, currentUser?.id],
  );

  useEffect(() => {
    if (messageListRef.current) {
      // Use requestAnimationFrame to ensure DOM is updated before scrolling
      requestAnimationFrame(() => {
        if (messageListRef.current) {
          messageListRef.current.scrollTo({
            top: messageListRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      });
    }
  }, [selectedUser, messages.length]);

  // Scroll to bottom only when a new message is added (not when loading old messages)
  useEffect(() => {
    if (messageListRef.current && messages.length > 0) {
      // Only scroll if the last message changed (new message sent/received)
      requestAnimationFrame(() => {
        if (messageListRef.current) {
          messageListRef.current.scrollTo({
            top: messageListRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      });
    }
  }, [messages[messages.length - 1]?.id]);

  // Maintain scroll position when loading older messages
  useEffect(() => {
    if (!messageListRef.current) return;

    if (isLoadingOlderMessages) {
      // Store scroll height before loading
      previousHeightRef.current = messageListRef.current.scrollHeight;
    } else if (previousHeightRef.current > 0) {
      // After loading completed, adjust scroll to maintain visual position
      requestAnimationFrame(() => {
        if (messageListRef.current) {
          const heightIncrease = messageListRef.current.scrollHeight - previousHeightRef.current;
          messageListRef.current.scrollTop += heightIncrease;
          previousHeightRef.current = 0;
        }
      });
    }
  }, [isLoadingOlderMessages]);

  if (!selectedUser) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col min-h-[16rem] items-center justify-center text-base font-semibold text-gray-400">
        No conversation selected
      </div>
    );
  }

  return (
    <div ref={messageListRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:gap-4 sm:p-5">
      {hasMoreMessages && (
        <button
          onClick={onLoadOlderMessages}
          disabled={isLoadingOlderMessages}
          className="mx-auto rounded border border-[#c9a227]/30 bg-[#15131d] px-4 py-2 text-xs font-semibold uppercase text-[#c9a227] transition-colors hover:border-[#c9a227]/50 hover:bg-[#1e1a24] disabled:opacity-50"
        >
          {isLoadingOlderMessages ? "Loading..." : "Load older messages"}
        </button>
      )}
      
      {messages.map((msg, index) => {
        const isLastUserMessage = msg.user_id === currentUser?.id && index === lastUserMessageIndex;
        const isOwnMessage = msg.user_id === currentUser?.id;
        const senderName = isOwnMessage ? currentUser?.name : selectedUser;
        const senderAvatar = isOwnMessage
          ? currentUser?.avatar?.url || DEFAULT_PROFILE_ICON.url
          : selectedUserData?.image ||
            selectedUserData?.avatar?.url ||
            DEFAULT_PROFILE_ICON.url;

        return (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwnMessage={isOwnMessage}
            isLastUserMessage={isLastUserMessage}
            unread={unread}
            isExpanded={expandedMessages.has(msg.id)}
            customUserAvatar={isOwnMessage ? customUserAvatar : undefined}
            senderName={senderName || "Unknown"}
            senderAvatar={senderAvatar}
            maxDisplayLength={maxDisplayLength}
            onExpand={() => onMessageExpand(msg.id)}
            onProfileClick={() => {
              if (isOwnMessage && currentUser?.name) {
                onProfileClick(currentUser.name);
              } else if (selectedUser) {
                onProfileClick(selectedUser);
              }
            }}
          />
        );
      })}

      <div className="flex-1" />

      {isTyping && typer && selectedUser === typer && (
        <div className="pb-1 pt-3">
          <style>{`
            @keyframes typing-animation {
              0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
              30% { opacity: 1; transform: translateY(-8px); }
            }
            .typing-dot {
              display: inline-block;
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background-color: currentColor;
              margin: 0 2px;
              animation: typing-animation 1.4s infinite;
            }
            .typing-dot:nth-child(1) { animation-delay: 0s; }
            .typing-dot:nth-child(2) { animation-delay: 0.2s; }
            .typing-dot:nth-child(3) { animation-delay: 0.4s; }
          `}</style>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
            <span>{typer} is typing</span>
            <span className="text-[var(--accent-color)]">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </span>
          </div>
        </div>
      )}

    </div>
  );
});
