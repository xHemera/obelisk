"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppPageShell from "@/components/AppPageShell";
import Card from "@/components/atoms/Card";
import NotificationToast from "@/components/organisms/home/NotificationToast";
import { ProfileHeader } from "@/components/organisms/profile/ProfileHeader";
import { MatchHistoryList } from "@/components/organisms/profile/MatchHistoryList";
import { authClient } from "@/lib/auth-client";
import { persistAvatarPreference } from "@/lib/avatar-preference";
import { applyAccentPalette, DEFAULT_PROFILE_ICON, resolveProfileIcon } from "@/lib/profile-icons";
import { socket } from "../../../socket";
import Footer from "@/components/Footer";

type MatchHistoryEntry = {
  id: string;
  result: string;
  createdAt: Date;
  playerTeam: string[];
  opponentTeam: string[];
  opponent: string;
  user_id: string;
};

type ProfileClientViewProps = {
  profileName: string;
  initialAvatar: string;
  initialBackground?: string;
  isOwnProfile: boolean;
  profileBadges: string[];
  matchHistory: MatchHistoryEntry[];
};

export default function ProfileClientView({
  profileName,
  initialAvatar,
  isOwnProfile,
  profileBadges,
  matchHistory,
}: ProfileClientViewProps) {
  const router = useRouter();
  const [userPseudo, setUserPseudo] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [notifSender, setNotifSender] = useState<string | null>(null);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [displayAvatar, setDisplayAvatar] = useState(initialAvatar);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const avatarUploadRef = useRef<HTMLInputElement>(null);

  const totalMatches = matchHistory.length;

  useEffect(() => {
    if (!isOwnProfile) {
      setDisplayAvatar(initialAvatar);
      return;
    }

    const savedAvatar = localStorage.getItem("profileCustomAvatar");
    if (savedAvatar) {
      setCustomAvatar(savedAvatar);
      setDisplayAvatar(savedAvatar);
    }
  }, [initialAvatar, isOwnProfile]);

  useEffect(() => {
    const getUserData = async () => {
      const { data } = await authClient.getSession();
      if (data && data.user.name) {
        setUserPseudo(data.user.name);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void getUserData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
      if (!userPseudo || socket.connected) return;
      socket.connect();
      socket.emit("login", userPseudo);
      return () => {
        socket.off("online_users");
      };
    }, [userPseudo]);
    
  useEffect(() => {
    if (!userPseudo) return;
    socket.on("ban", (banned) => {
      if (banned === userPseudo)
        handleLogout();
    });
  }, [userPseudo]);


  useEffect(() => {
    const onBan = (banned: string) => {
      if (banned === userPseudo) {
        void handleLogout();
      }
    };

    const onReceived = ({ sender, msg }: { sender: string; msg: string }) => {
      setNotifSender(sender);
      setNotification(msg);
      setShowNotification(true);
    };

    const timeoutId = window.setTimeout(() => {
      socket.connect();
      socket.emit("login", userPseudo);
      socket.on("ban", onBan);
      socket.on("received", onReceived);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      socket.off("ban", onBan);
      socket.off("received", onReceived);
    };
  }, [userPseudo]);

  useEffect(() => {
    if (isOwnProfile) return;

    const onAvatarUpdated = ({ userName, imageUrl }: { userName: string; imageUrl: string }) => {
      if (userName === profileName) {
        setDisplayAvatar(imageUrl);
      }
    };

    socket.on("avatar_updated", onAvatarUpdated);
    return () => {
      socket.off("avatar_updated", onAvatarUpdated);
    };
  }, [isOwnProfile, profileName]);

  useEffect(() => {
    const icon = resolveProfileIcon({ url: DEFAULT_PROFILE_ICON.url });
    applyAccentPalette(icon);
  }, []);

  const currentAvatar = customAvatar || displayAvatar || DEFAULT_PROFILE_ICON.url;

  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "profile");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload profile picture");
    }

    const data = await response.json();
    const imageUrl = `/api/uploads/profiles/${data.name}`;

    const profileUpdateResponse = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    });

    if (!profileUpdateResponse.ok) {
      throw new Error("Failed to save profile picture to database");
    }

    setCustomAvatar(imageUrl);
    setDisplayAvatar(imageUrl);
    localStorage.setItem("profileCustomAvatar", imageUrl);
    persistAvatarPreference(imageUrl);

    socket.emit("avatar_updated", {
      userName: profileName,
      imageUrl,
    });
  };

  const handleLogout = async () => {
    if (isActionLoading) return;

    setIsActionLoading(true);
    try {
      await fetch("/api/profile", {
        method: "PUT"
      })
      socket.emit("isdisconnecting");
      socket.disconnect();
      await authClient.signOut();
      router.push("/not-connected");
    } finally {
      setIsActionLoading(false);
    }
  };

  const verifyDeleteAccount = () => {
    const hasConfirmed = window.confirm(
      "Deleting your account is permanent. This will remove your profile and related data. Continue?",
    );
    if (!hasConfirmed) {
      return false;
    }

    const typedName = window.prompt(`Type your username (${profileName}) to confirm deletion:`);
    if (!typedName || typedName.trim() !== profileName) {
      window.alert("Verification failed. Account deletion has been cancelled.");
      return false;
    }

    return true;
  };

  const deleteProfile = async () => {
    if (isActionLoading || !verifyDeleteAccount()) return;

    setIsActionLoading(true);
    try {
      const response = await fetch("/api/profile", {
        method: "DELETE",
      });
      const user: unknown = await response.json();
      if (!response.ok) {
        const errorMessage =
        typeof user === "object" && user !== null && "error" in user
          ? String((user as { error: string }).error ?? "Impossible de charger l'utilisateur")
          : "Impossible de charger l'utilisateur";
        throw new Error(errorMessage);
      }
      socket.emit("has_delete", {
        sender: userPseudo,
      });
      socket.disconnect();
      await authClient.signOut();
      router.push("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      window.alert("Unable to delete account. Please try again.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const totalWins = matchHistory.filter((match) => match.result.toLowerCase() === "win").length;

  return (
    <AppPageShell
      showSidebar
      containerClassName="min-h-0 flex-1"
    >
      {showNotification && notification && notifSender && (
        <NotificationToast
          onClose={() => setShowNotification(false)}
          msg={notification}
          sender={notifSender}
        />
      )}

      <div className="flex-1 w-full flex flex-col overflow-hidden">
        <div className="mx-auto flex flex-1 w-full max-w-7xl flex-col gap-6 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:gap-8">
        <ProfileHeader
          profileName={profileName}
          isOwnProfile={isOwnProfile}
          badges={profileBadges}
          currentAvatar={currentAvatar}
          totalWins={totalWins}
          onAvatarUploadClick={() => avatarUploadRef.current?.click()}
          onLogout={() => void handleLogout()}
          onDeleteAccount={() => void deleteProfile()}
          isActionLoading={isActionLoading}
        />

        <input
          ref={avatarUploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            try {
              await handleAvatarUpload(file);
            } catch (error) {
              console.error("Error uploading profile picture:", error);
            }

            event.target.value = "";
          }}
        />

        {/* Match History Section */}
        <div className="border border-white/10 bg-[#15131d]/60 rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          {/* Header */}
          <div className="border-b border-white/10 px-3 py-2 sm:px-6 sm:py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <h2 className="text-lg sm:text-3xl font-black text-white break-words" style={{ fontFamily: "var(--font-display), serif" }}>
                Match History
              </h2>
              <div className="flex gap-2">
                <div className="border border-[#c9a227]/30 bg-[#c9a227]/10 rounded-xl px-2 py-1 sm:px-3 sm:py-1.5 whitespace-nowrap">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[#c9a227]/80">Total Fights</span>
                  <span className="ml-1.5 text-sm sm:text-lg font-black text-white" style={{ fontFamily: "var(--font-display), serif" }}>{totalMatches}</span>
                </div>
                <div className="border border-[#c9a227]/30 bg-[#c9a227]/10 rounded-xl px-2 py-1 sm:px-3 sm:py-1.5 whitespace-nowrap">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[#c9a227]/80">Winrate</span>
                  <span className="ml-1.5 text-sm sm:text-lg font-black text-white" style={{ fontFamily: "var(--font-display), serif" }}>{totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0}%</span>
                </div>
              </div>
            </div>
          </div>

          <MatchHistoryList matches={matchHistory} />
        </div>
        </div>
      </div>
      <Footer />
    </AppPageShell>
  );
}
