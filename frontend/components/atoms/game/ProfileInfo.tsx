"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import ProfileViewerModal from "@/components/organisms/social/ProfileViewer";

type UserAccount = {
  pseudo?: string;
  name?: string;
  profilePhoto?: string | null;
  image?: string | null;
  avatar?: {
    url: string;
  } | null;
};

type ProfileInfoProps = {
  account: UserAccount;
  className?: string;
};

export default function ProfileInfo({ account, className = "" }: ProfileInfoProps) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const pseudo = account.pseudo ?? account.name ?? "Joueur inconnu";
  const profilePhoto = account.profilePhoto ?? account.image ?? account.avatar?.url ?? null;

  const avatarFallback = useMemo(() => {
    return pseudo.slice(0, 2).toUpperCase();
  }, [pseudo]);

  const handleOpenProfile = () => {
    setIsProfileModalOpen(true);
  };

  const handleCloseProfile = () => {
    setIsProfileModalOpen(false);
  };

  return (
    <>
      <div
        className={`group relative overflow-hidden rounded-md border-2 border-[#2a1f14] bg-gradient-to-b from-[#14100a] to-[#0f0a06] px-2 py-1.5 transition-all duration-150 hover:border-[#c9a84c] hover:shadow-[0_0_14px_rgba(201,168,76,0.12)] sm:px-3 sm:py-2 ${className}`}
      >
        <div className="relative z-10 flex items-center gap-2 sm:gap-3">
          <span className="font-serif text-sm font-semibold tracking-wide text-[#c9b896] transition-colors duration-150 group-hover:text-[#e8dcc8] sm:text-lg">
            {pseudo}
          </span>

          {/* medallion avatar frame */}
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#4a3520] bg-[#1a1208] shadow-[inset_0_0_6px_rgba(0,0,0,0.6)] transition-all duration-150 group-hover:border-[#c9a84c]/60 sm:h-9 sm:w-9">
            {profilePhoto ? (
              <Image
                src={profilePhoto}
                alt={`Photo de profil de ${pseudo}`}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-serif text-xs font-bold text-[#8a7a5a]">
                {avatarFallback}
              </span>
            )}
          </span>
        </div>
      </div>
    </>
  );
}
