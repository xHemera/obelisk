import Image from "next/image";
import { useEffect, useState } from "react";
import Button from "@/components/atoms/Button";
import Card from "@/components/atoms/Card";
import IconButton from "@/components/atoms/IconButton";
import { socket } from "../../../socket";
import NotificationToast from "@/components/organisms/home/NotificationToast";
import Validate from "../Validate";
import { useRouter } from "next/navigation";
import { type } from "@/app/social/index";
import { emitGlobalError } from "@/lib/error-events";

type Avatar = {
  url: string;
};

type User = {
  id: string;
  name: string;
  badges: string[];
  blockedUsers: string[];
  avatar: Avatar | null;
  image?: string | null;
};

type ProfileViewerModalProps = {
  open: boolean;
  onClose: () => void;
  user?: User | null;
  currentUser?: User | null;
  pseudo?: string;
  avatarUrl?: string | null;
  badges?: string[];
  isFriend?: boolean;
  isBlocked?: boolean;
};

// Organism: modal d'apercu d'un profil avec actions sociales.
export default function ProfileViewerModal({
  open,
  onClose,
  user: inputUser = null,
  currentUser: currentUser = null,
  pseudo = "Joueur inconnu",
  avatarUrl = null,
  badges = [],
}: ProfileViewerModalProps) {
  const router = useRouter();
  const [friend, setFriend] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasBlocked, setHasBlocked] = useState(false);
  const [showNotification, setShowNotification] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [notifSender, setNotifSender] = useState<string | null>(null);
  const [openRemove, setOpenRemove] = useState(false);
  const [reportNotification, setReportNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!currentUser || !inputUser) return;
    socket.on("received", async ({ sender, receiver, msg }) => {
      {
        setNotifSender(sender);
        setNotification(msg);
      }
    });

    //adds match button live
    socket.on("adding", async ({ user, oUser }) => {
      if (user == inputUser.name) {
        setFriend(true);
      }
    });

    //resets status live
    socket.on("refusing", async ({ user, oUser }) => {
      if (oUser == inputUser.name) {
        setFriend(false);
      }
    });

    //sets blocked live
    socket.on("blocked", async ({ user, oUser }) => {
      if (user == inputUser.name) setIsBlocked(true);
      setFriend(false);
    });

    socket.on("blocking", async () => {
      setHasBlocked(true);
      setFriend(false);
    });

    //resets status live
    socket.on("unblocking", async ({ user, oUser }) => {
      if (oUser == inputUser.name) setIsBlocked(false);
      if (user == currentUser.name) setHasBlocked(false);
    });
  }, [currentUser, inputUser]);

  //sets friend status
  useEffect(() => {
    async function isFriend() {
      if (!currentUser || !inputUser) return;
      const params = new URLSearchParams({
        currentUser: currentUser.name,
        otherUser: inputUser.name,
      });

      const [fres, tres] = await Promise.all([
        fetch(`/api/social/friend?${params.toString()}`, {
          method: "GET",
        }),
        fetch(`/api/social/otherFriend?${params.toString()}`, {
          method: "GET",
        }),
      ]);
      if (!fres.ok || !tres.ok) return;
      const fdata = await fres.json();
      const tdata = await tres.json();
      const myFriend: type.Friend = fdata.friend;
      const theirFriend: type.Friend = tdata.friend;
      if (!myFriend || !theirFriend) {
        setFriend(false);
        return;
      }
      if (myFriend.request_sent == false && theirFriend.request_sent == false)
        setFriend(true);
      return;
    }
    isFriend();
  }, [currentUser, inputUser]);

  //sets blocked status
  useEffect(() => {
    async function isBlockedByMe() {
      if (!currentUser || !inputUser) return;
      for (const id of currentUser.blockedUsers) {
        if (id == inputUser.id) setHasBlocked(true);
      }
      return;
    }
    isBlockedByMe();
  }, [inputUser, currentUser]);

  //sets blocked status from user
  useEffect(() => {
    async function amIBlocked() {
      if (!currentUser || !inputUser) return;
      for (const id of inputUser.blockedUsers) {
        if (id == currentUser.id) setIsBlocked(true);
      }
      return;
    }
    amIBlocked();
  }, [inputUser, currentUser]);

  // Handle report notification timeout
  useEffect(() => {
    if (!reportNotification) return;
    const timeoutId = setTimeout(() => {
      setReportNotification(null);
    }, 3000);
    return () => clearTimeout(timeoutId);
  }, [reportNotification]);

  const handleProfileClick = async () => {
    if (inputUser) {
      router.push(`/profile/${inputUser.name}`);
    } else {
      router.push("/not-connected");
    }
  };

  async function sendFriendRequest() {
    if (!currentUser || !inputUser) return;
    if (isBlocked) {
      onClose();
      return;
    }
    const res = await fetch("/api/social/friend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentUser: currentUser.name,
        otherUser: inputUser.name,
      }),
    });
    if (!res.ok) {
      emitGlobalError("Could not send friend request");
      return;
    }
    socket.emit("friend_request", {
      user: currentUser.name,
      oUser: inputUser.name,
    });
    onClose();
  }

  async function refuseFriendship() {
    if (!currentUser || !inputUser) return;
    const params = new URLSearchParams({
      currentUser: currentUser.name,
      otherUser: inputUser.name,
    });
    const res = await fetch(`/api/social/friend?${params.toString()}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      emitGlobalError("Could not delete friendship");
      return;
    }
    socket.emit("friend_denied", {
      user: currentUser.name,
      oUser: inputUser.name,
    });
    setFriend(false);
    setOpenRemove(false);
    onClose();
  }

  async function blockUser() {
    if (!currentUser || !inputUser) return;
    if (hasBlocked === false) {
      const params = new URLSearchParams({
        currentUser: currentUser.name,
        otherUser: inputUser.name,
      });
      const fres = await fetch(`/api/social/otherFriend?${params.toString()}`, {
        method: "GET",
      });
      if (!fres.ok) return;
      const fdata = await fres.json();
      const oUser: type.Friend = fdata.friend;
      if (oUser) {
        const bres = await fetch(`/api/social/block?${params.toString()}`, {
          method: "DELETE",
        });
        if (!bres) return;
      } else {
        const bres = await fetch("/api/social/block", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentUser: currentUser.name,
            otherUser: inputUser.name,
          }),
        });
        if (!bres) return;
      }
      socket.emit("friend_or_user_blocked", {
        user: currentUser.name,
        oUser: inputUser.name,
      });
      socket.emit("blocking_friend_or_user");
      setHasBlocked(true);
      setFriend(false);
    } else {
      const bres = await fetch("/api/social/block", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentUser: currentUser.name,
          otherUser: inputUser.name,
        }),
      });
      if (!bres) return;
      socket.emit("user_unblocked", {
        user: currentUser.name,
        oUser: inputUser.name,
      });
      setHasBlocked(false);
    }
    onClose();
  }

  //bouton pour defier un ami (a completer avec la vrai fonctionnalite corentin)
  const sendChallenge = async () => {
    if (!inputUser || !currentUser) return;

    try {
      socket.emit("challenge_sent", {
        sender: currentUser.name,
        receiver: inputUser.name,
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi du défi:", error);
    }
    onClose();
  };

  const displayedUser = inputUser;

  const displayedPseudo = displayedUser?.name ?? pseudo;
  const displayedAvatarUrl =
    (displayedUser?.image || displayedUser?.avatar?.url) ?? avatarUrl;
  const displayedBadges = displayedUser?.badges ?? badges;

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        onClick={onClose}
      >
        {inputUser &&
          showNotification &&
          notification &&
          notifSender &&
          notifSender !== inputUser.name && (
            <NotificationToast
              onClose={() => setShowNotification(false)}
              msg={notification}
              sender={notifSender}
            />
          )}
        {reportNotification && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-50 -translate-x-1/2">
            <div
              className={`rounded-xl border px-4 py-2 text-sm font-semibold shadow-lg ${
                reportNotification.type === "success"
                  ? "border-emerald-400/50 bg-emerald-500/90 text-white"
                  : "border-red-400/50 bg-red-500/90 text-white"
              }`}
            >
              {reportNotification.message}
            </div>
          </div>
        )}
        <Card
          className="w-full max-w-md rounded-2xl border border-[#3c3650] bg-[#15131d] p-6 font-['Arial',_Helvetica,_sans-serif] shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profileviewer-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative h-16 w-16 transition-transform hover:scale-110  overflow-hidden rounded-2xl border border-[color:var(--accent-border)] bg-[#242033]">
                  {displayedAvatarUrl ? (
                    <Image
                      src={displayedAvatarUrl}
                      alt={`Avatar de ${displayedPseudo}`}
                      fill
                      sizes="(max-width: 768px) 100vw"
                      loading="eager"
                      className="object-cover"
                      unoptimized
                      onClick={() => handleProfileClick()}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-black text-white">
                      {displayedPseudo.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h2
                    id="profileviewer-title"
                    className="truncate text-lg font-bold text-white"
                  >
                    {displayedPseudo}
                  </h2>

                  {displayedBadges.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {displayedBadges.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-full border border-[color:var(--accent-border)] bg-[var(--accent-color)]/20 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="button"
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="h-9 w-9 rounded-xl p-0"
              >
                X
              </Button>
            </div>
          {/* Actions: message, ajouter en ami, bloquer */}
          <div className="flex items-center justify-center gap-4">
            {!isBlocked && !hasBlocked && <IconButton
              type="button"
              variant="secondary"
              size="lg"
              title="Send message"
              aria-label="Send message"
              onClick={onClose}
            >
              <i className="fa-regular fa-paper-plane text-lg" />
            </IconButton>}

            {!isBlocked && !hasBlocked && <IconButton
              type="button"
              size="lg"
              title={friend ? "Remove friends" : "Add friend"}
              aria-label={friend ? "Remove friends" : "Add friend"}
              className={friend ? "border-red-500/70 bg-red-900/20 text-red-200" : undefined}
              onClick={() => !friend ? sendFriendRequest() : setOpenRemove(true)}
            >
              <i className={`fa-solid ${friend ? "fa-user-minus" : "fa-user-plus"} text-lg`} />
            </IconButton>}

            <Validate
              open={openRemove}
              title={"Do you want to remove this user from your friend list ?"}
              onYes={() => {
                if (friend) {
                  refuseFriendship();
                }
              }}
              onNo={() => {setOpenRemove(false); onClose;}}
            />

            <IconButton
              type="button"
              size="lg"
              title={hasBlocked ? "Unblock user" : "Block user"}
              aria-label={hasBlocked ? "Unblock user" : "Block user"}
              className={hasBlocked ? "border-emerald-500/70 bg-emerald-900/20 text-emerald-200 hover:bg-emerald-900/35" : "border-red-500/70 bg-red-900/20 text-red-200 hover:bg-red-900/35"}
              onClick={() => blockUser()}
            >
              <i className={`fa-solid ${hasBlocked ? "fa-circle-check" : "fa-ban"} text-lg`} />
            </IconButton>

            <IconButton
              type="button"
              size="lg"
              title="Report user"
              aria-label="Report user"
              className="border-orange-500/70 bg-orange-900/20 text-orange-200 hover:bg-orange-900/35"
              onClick={async () => {
                if (!currentUser || !inputUser) return;
                const res = await fetch("/api/social/report", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({user: currentUser.name, reportedUser: inputUser.name})
                });
                if (res.status === 201)
                {
                  setReportNotification({
                    type: "success",
                    message: "User reported successfully.",
                  });
                  socket.emit("reported");
                }
                else if (res.status === 409) {
                  setReportNotification({
                    type: "error",
                    message: "You can't report this user before he gets reviewed.",
                  });
                }
                else {
                  setReportNotification({
                    type: "error",
                    message: "Could not report.",
                  });
                }
              }}
            >
              <i className="fa-solid fa-flag text-lg" />
            </IconButton>

            {friend && <IconButton
              onClick={sendChallenge}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--accent-border)] bg-[var(--accent-color)] text-white transition-colors hover:bg-[var(--accent-hover)]"
              aria-label="Défier l'ami"
            >
              <i className="fa-solid fa-bolt" />
            </IconButton>}
          </div>
        </div>
      </Card>
    </div>
    </>
  );
}
