"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { DEFAULT_PROFILE_ICON } from "@/lib/profile-icons";
import Button from "@/components/atoms/Button";
import { socket } from "../socket";

const PROFILE_BADGES_STORAGE_KEY = "profileBadges";

const readStoredBadges = () => {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const stored = localStorage.getItem(PROFILE_BADGES_STORAGE_KEY);
    if (!stored) {
      return [] as string[];
    }

    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed) ? parsed.filter((badge): badge is string => typeof badge === "string") : [];
  } catch {
    return [] as string[];
  }
};

const readStoredAvatar = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return localStorage.getItem("profileCustomAvatar");
  } catch {
    return null;
  }
};

const AdminCrownIcon = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <path
      d="M4 9.5 7.2 12.7 12 6.5l4.8 6.2L20 9.5v8.5H4V9.5Z"
      fill="currentColor"
      opacity="0.95"
    />
    <path
      d="M5.5 18h13"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
  </svg>
);

const NAV_ITEMS = [
  { href: "/home", icon: "fa-solid fa-house", label: "Home" },
  { href: "/characters", icon: "fa-solid fa-users", label: "Heroes" },
  { href: "/social", icon: "fa-solid fa-comments", label: "Social" },
  { href: "/admin", label: "Council", iconNode: <AdminCrownIcon className="h-5 w-5" /> },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pseudo, setPseudo] = useState<string | null>(null);
  const [badges, setBadges] = useState<string[]>([]);
  const [socialUnread, setSocialUnread] = useState<number>(0);
  const [customUserAvatar, setCustomUserAvatar] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const unreadRequestSeqRef = useRef(0);

  const scheduleDeferredWork = (task: () => void) => {
    const timeoutId = window.setTimeout(task, 0);
    return () => window.clearTimeout(timeoutId);
  };

  const refreshSocialUnread = async () => {
    const requestSeq = ++unreadRequestSeqRef.current;

    try {
      const response = await fetch("/api/social/unread", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { totalUnread?: number };
      if (requestSeq !== unreadRequestSeqRef.current) return;
      setSocialUnread(Math.max(0, payload.totalUnread ?? 0));
    } catch {
      // Keep the current value if fetch fails.
    }
  };

  useEffect(() => {
    // Read persisted local-only data on mount to avoid hydration mismatch
    try {
      setBadges(readStoredBadges());
      setCustomUserAvatar(readStoredAvatar());
    } catch {
      // ignore
    }

    let isCancelled = false;
    const cancelDeferredWork = scheduleDeferredWork(() => {
      const hydrateIdentity = async () => {
        const [session, profileResponse] = await Promise.all([authClient.getSession(), fetch("/api/profile/")]);
        const profile = (await profileResponse.json()) as { pseudo?: string; name?: string; badges?: string[] };
        const identity = profile.pseudo || profile.name || session.data?.user?.name || null;

        if (isCancelled) {
          return;
        }

        setPseudo(identity);
        const nextBadges = profile.badges ?? [];
        setBadges(nextBadges);

        try {
          localStorage.setItem(PROFILE_BADGES_STORAGE_KEY, JSON.stringify(nextBadges));
        } catch {
          // Ignore cache write failures.
        }
      };

      void hydrateIdentity();
    });

    return () => {
      isCancelled = true;
      cancelDeferredWork();
    };
  }, []);

  useEffect(() => {
    const cancelDeferredWork = scheduleDeferredWork(() => {
      void refreshSocialUnread();
    });

    return cancelDeferredWork;
  }, [pathname]);

  useEffect(() => {
    if (!pseudo) return;

    let cleanupSocketListeners: (() => void) | null = null;
    const cancelDeferredWork = scheduleDeferredWork(() => {
      if (!socket.connected) {
        socket.connect();
      }

      const login = () => {
        socket.emit("login", pseudo);
      };

      login();

      const onReceived = () => {
        void refreshSocialUnread();
      };

      socket.on("connect", login);
      socket.on("received", onReceived);

      cleanupSocketListeners = () => {
        socket.off("connect", login);
        socket.off("received", onReceived);
      };
    });

    return () => {
      cancelDeferredWork();
      cleanupSocketListeners?.();
    };
  }, [pseudo]);

  useEffect(() => {
    if (!pseudo) return;
    const onUnreadUpdated = () => {
      void refreshSocialUnread();
    };

    window.addEventListener("social-unread-updated", onUnreadUpdated);
    return () => {
      window.removeEventListener("social-unread-updated", onUnreadUpdated);
    };
  }, []);

  const handleProfileClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    const { data } = await authClient.getSession();
    if (data && data.user.name) {
      router.push(`/profile/${data.user.name}`);
    } else {
      router.push("/not-connected");
    }
  };

  const isProfileActive = pathname.startsWith("/profile");

  const sidebarContent = (
    <>
      {/* Decorative top element */}
      <div className="mb-1 flex h-8 w-8 items-center justify-center">
        <i className="fa-solid fa-dragon text-lg text-[#c9a227]" />
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#c9a227]/30 to-transparent" />

      {NAV_ITEMS.map(({ href, label, iconNode, icon }) => {
        // Hide Admin tab if user doesn't have ADMIN badge
        if (href === "/admin" && !badges.includes("ADMIN") && !badges.includes("MODERATOR")) {
          return null;
        }

        const isActive = pathname === href;
        const isSocial = href === "/social";
        return (
          <Link
            key={href}
            href={href}
            title={label}
            onClick={() => setMobileOpen(false)}
            className={`group relative flex h-12 w-12 items-center justify-center rounded-lg border-2 transition-all duration-300 ${
              isActive
                ? "border-[#c9a227] bg-[#c9a227]/20 text-[#f5e6c8] shadow-[0_0_15px_rgba(201,162,39,0.3)]"
                : "border-[#2a2638] bg-[#0c0a0f]/50 text-[#8a7a5a] hover:border-[#c9a227]/50 hover:text-[#c9b896]"
            }`}
          >
            {iconNode ?? <i className={`${icon} text-lg`} />}
            {isSocial && socialUnread > 0 && pathname !== "/social" && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#cd5c5c] bg-[#8b0000] px-1 text-[10px] font-bold text-white shadow-lg">
                {socialUnread > 99 ? "99+" : socialUnread}
              </span>
            )}
          </Link>
        );
      })}

      <div className="flex-1" />

      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#c9a227]/30 to-transparent" />

      {/* Profile Button */}
      <Button
        type="button"
        onClick={(e) => { handleProfileClick(e); setMobileOpen(false); }}
        title={pseudo ?? "Profile"}
        variant="ghost"
        className={`relative h-12 w-12 p-0 overflow-hidden rounded-lg border-2 transition-all duration-300 ${
          isProfileActive
            ? "border-[#c9a227] shadow-[0_0_10px_rgba(201,162,39,0.2)]"
            : "border-[#2a2638] hover:border-[#c9a227]/50"
        }`}
      >
        {customUserAvatar ? (
          <Image
            src={customUserAvatar}
            alt={pseudo ?? "Profile"}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <Image
            src={DEFAULT_PROFILE_ICON.url}
            alt={pseudo ?? "Profile"}
            fill
            className="object-cover"
            unoptimized
            priority
          />
        )}
      </Button>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-[#c9a227]/30 bg-[#1e1a24] text-[#c9a227] shadow-lg lg:hidden"
        aria-label="Toggle navigation menu"
      >
        <i className={`fa-solid ${mobileOpen ? "fa-xmark" : "fa-bars"} text-lg`} />
      </button>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer (hidden on desktop) */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-20 shrink-0 flex-col items-center gap-3 rounded-r-xl border-2 border-[#c9a227]/30 bg-gradient-to-b from-[#1e1a24] via-[#15121a] to-[#0c0a0f] p-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ boxShadow: "inset 0 1px 0 rgba(201,162,39,0.1), 0 4px 12px rgba(0,0,0,0.5)" }}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar (hidden on mobile, visible on lg+) */}
      <aside
        className="hidden h-full w-20 shrink-0 flex-col items-center gap-3 rounded-xl border-2 border-[#c9a227]/30 bg-gradient-to-b from-[#1e1a24] via-[#15121a] to-[#0c0a0f] p-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] lg:flex lg:mr-3 lg:ml-2"
        style={{ boxShadow: "inset 0 1px 0 rgba(201,162,39,0.1), 0 4px 12px rgba(0,0,0,0.5)" }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
