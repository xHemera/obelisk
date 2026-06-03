"use client";

import { ConversationTab } from "@/components/molecules/social/ConversationTab";
import type { type as socialType } from "@/app/social/index";

type ConversationListProps = {
  users: socialType.User[];
  selectedUser: string;
  unreadMap: Record<string, number>;
  inboxes: socialType.Inbox[];
  customUserAvatar?: string | null;
  currentUserName: string;
  onSelectUser: (userName: string) => void;
  onAddContactClick: () => void;
};

export function ConversationList({
  users,
  selectedUser,
  unreadMap,
  inboxes,
  customUserAvatar,
  currentUserName,
  onSelectUser,
  onAddContactClick,
}: ConversationListProps) {
  return (
    <header className="flex items-center border-b border-[#c9a227]/30 px-3 py-2 sm:px-5 sm:py-3">
      {/* Contacts scroll horizontally */}
      <div className="flex-1 overflow-x-auto px-2 sm:px-4">
        <div className="flex gap-1 sm:gap-2">
          {users.map((user) => {
            const isActive = selectedUser === user.name;
            if (user.name === currentUserName) return null;

            const hasConversation = inboxes.some((inbox) => {
              const ids = inbox.inboxUser.map((iu) => iu.user_id);
              return ids.includes(user.id);
            });

            if (!hasConversation) return null;

            return (
              <ConversationTab
                key={user.name}
                user={user}
                isActive={isActive}
                unreadCount={unreadMap[user.name] ?? 0}
                customUserAvatar={currentUserName === user.name ? customUserAvatar : undefined}
                onSelect={onSelectUser}
              />
            );
          })}
        </div>
      </div>

      {/* Add button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onAddContactClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--accent-border)] bg-[var(--accent-color)] text-white transition-colors hover:bg-[var(--accent-hover)]"
          aria-label="Ajouter un contact"
        >
          <i className="fa-solid fa-plus"></i>
        </button>
      </div>
    </header>
  );
}
