"use client";

import Image from "next/image";
import { formatTime } from "@/lib/date-utils";
import type { type as socialType } from "@/app/social/index";

type MessageBubbleProps = {
  message: socialType.Messages;
  isOwnMessage: boolean;
  isLastUserMessage: boolean;
  unread: boolean;
  isExpanded: boolean;
  customUserAvatar?: string | null;
  senderName: string;
  senderAvatar: string;
  maxDisplayLength: number;
  onExpand: () => void;
  onProfileClick?: () => void;
};

export function MessageBubble({
  message,
  isOwnMessage,
  isLastUserMessage,
  unread,
  isExpanded,
  customUserAvatar,
  senderName,
  senderAvatar,
  maxDisplayLength,
  onExpand,
  onProfileClick,
}: MessageBubbleProps) {
  const messageText = message.message ?? "";
  const displayText = isExpanded ? messageText : messageText.slice(0, maxDisplayLength);
  const shouldShowExpandButton = messageText.length > maxDisplayLength;

  const displayAvatar = isOwnMessage && customUserAvatar ? customUserAvatar : senderAvatar;

  const isImageFile = (attachment: socialType.Attachment) => {
    return attachment.type.startsWith("image/");
  };

  return (
    <div className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}>
      <button
        type="button"
        onClick={onProfileClick}
        className="mb-1 flex items-center gap-2 text-xs text-gray-400"
      >
        <Image
          src={displayAvatar}
          alt="Avatar"
          width={20}
          height={20}
          className="h-4 w-4 rounded transition-transform hover:scale-125"
          unoptimized
        />
        <span className="font-semibold">{senderName}</span>
        <span className="opacity-75">{formatTime(message.createdAt)}</span>
      </button>
      <div className={`flex items-end ${isOwnMessage ? "flex-row-reverse gap-2" : "gap-2"}`}>
        <article
          className={`max-w-[44rem] rounded-2xl px-4 py-2 ${
            isOwnMessage
              ? "bg-[var(--accent-color)] text-white"
              : "border border-[#c9a227]/30 bg-[#242033] text-gray-100"
          }`}
        >
          {message.message && (
            <div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {displayText}
              </p>
              {shouldShowExpandButton && (
                <button
                  onClick={onExpand}
                  className={`mt-2 text-xs font-semibold transition-colors ${
                    isOwnMessage
                      ? "text-white/80 hover:text-white"
                      : "text-gray-300 hover:text-gray-100"
                  }`}
                >
                  {isExpanded ? "voir moins" : "voir plus"}
                </button>
              )}
            </div>
          )}

          {message.attachments.length > 0 && (
            <div className={`mt-2 grid gap-2 ${message.attachments.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
              {message.attachments.map((attachment) => (
                <button
                  key={attachment.id}
                  type="button"
                  onClick={() => window.open(attachment.previewUrl, "_blank")}
                  className={`rounded-lg border p-2 cursor-pointer transition-opacity hover:opacity-80 ${
                    isOwnMessage ? "border-white/30 bg-white/10" : "border-[#c9a227]/30 bg-[#15131d]"
                  }`}
                >
                  {isImageFile(attachment) ? (
                    <>
                      <Image
                        src={`${attachment.previewUrl}`}
                        alt={attachment.name}
                        width={320}
                        height={220}
                        className="h-28 w-full rounded-md object-cover"
                        unoptimized
                      />
                      <p className="mt-2 truncate text-xs font-semibold">{attachment.name}</p>
                      <p className="text-[11px] opacity-75">{attachment.sizeLabel}</p>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6">
                      <i className="fa-solid fa-file text-2xl mb-2"></i>
                      <p className="truncate text-xs font-semibold">{attachment.name}</p>
                      <p className="text-[11px] opacity-75">{attachment.sizeLabel}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </article>
        {isLastUserMessage && (
          <div>
            {unread ? (
              <span className="text-gray-500 text-sm">
                <i className="fa-solid fa-check"></i>
              </span>
            ) : (
              <span className="text-emerald-400 text-sm">
                <i className="fa-solid fa-check-double"></i>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
