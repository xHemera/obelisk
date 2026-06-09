"use client";

import Image from "next/image";
import dynamic from "next/dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import FeatureActionTile from "@/components/atoms/home/FeatureActionTile";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { MineSection } from "@/components/organisms/home/MineSection";
import { TeamBuilder } from "@/components/organisms/home/TeamBuilder";
import { CHARACTERS } from "@/public/gameResources/heroes";
import Sidebar from "@/components/Sidebar";
import {socket, ensureLoggedIn} from "../../socket"
import { handleLogout } from "@/lib/logout";
import NotificationToast from "@/components/organisms/home/NotificationToast";
import Footer from "@/components/Footer";
import { emitGlobalError } from "@/lib/error-events";

const PvpMatchmakingModal = dynamic(() => import("@/components/organisms/home/PvpMatchmakingModal"), { ssr: false });
const PongMatchmakingModal = dynamic(() => import("@/components/organisms/home/PongMatchmakingModal"), { ssr: false });



type MinePopup = {
  id: number;
  value: number;
  x: number;
  y: number;
};

type TeamDragState = {
  id: string;
  x: number;
  y: number;
};

type PendingTeamDragState = {
  id: string;
  startX: number;
  startY: number;
};



const STORAGE_KEYS = {
  team: "home-team-slots",
};



// Page Home: hub de progression front-only (Mine, PvP, Team Builder).
export default function Home() {

  const roster = useMemo(
    () => CHARACTERS.slice(0, 6).map((character) => ({
      id: character.identity.id,
      name: character.identity.name,
      portrait: character.identity.assets.portrait,
    })),
    [],
  );

  const defaultCharacterId = roster[0]?.id ?? null;
  const [ruby, setRuby] = useState<number>(0);

  const [pvpOpen, setPvpOpen] = useState(false);
  const [pongOpen, setPongOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [minePopups, setMinePopups] = useState<MinePopup[]>([]);
  const minePopupIdRef = useRef(0);

  

  const [teamSlots, setTeamSlots] = useState<Array<string | null>>([roster[0]?.id ?? null, roster[1]?.id ?? null, roster[2]?.id ?? null]);
  const [dragPreview, setDragPreview] = useState<TeamDragState | null>(null);
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);
  const slotRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pendingDragRef = useRef<PendingTeamDragState | null>(null);
  const activeDragRef = useRef<TeamDragState | null>(null);
  const suppressClickForIdRef = useRef<string | null>(null);
  const router = useRouter();
  const [showNotification, setShowNotification] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [notifSender, setNotifSender] = useState<string | null>(null);
  const [userPseudo, setUserPseudo] = useState<string | null>(null);

  useEffect(() => {
    const getUserData = async () => {
      const { data } = await authClient.getSession();
      if (data && data.user.name) {
        setUserPseudo(data.user.name);
      }
      else
        router.push("/not-connected");
    };

    const timeoutId = window.setTimeout(() => {
      void getUserData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!userPseudo) return;
    ensureLoggedIn(userPseudo);
  }, [userPseudo]);

  useEffect(() => {
    if (!userPseudo) return;
    async function fetchTeam()
    {
      const res = await fetch(`/api/home?currentUser=${userPseudo}`, {
        method: "GET",
      });
      if (res.ok)
      {
        const data = await res.json();
        if (data.team)
          setTeamSlots(data.team);
      }
    };
    fetchTeam();
  }, []);

  useEffect(() => {
    if (!userPseudo) return;
    const storedTeam = localStorage.getItem(STORAGE_KEYS.team);

    const loadResources = async () => {
      try {
        const response = await fetch("/api/profile/resources", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as { rubis?: number };
        if (typeof payload.rubis === "number") {
          setRuby(payload.rubis);
        }
      } catch {
        // Keep local defaults if the server is unavailable.
      }
    };

    void loadResources();

    socket.on("received", async ({sender, receiver, msg}) => {
      setNotification(msg);
      setNotifSender(sender);
      setShowNotification(true);
    });
    if (storedTeam) {
      try {
        const parsed = JSON.parse(storedTeam) as Array<string | null>;
        if (Array.isArray(parsed) && parsed.length === 3) {
          setTeamSlots(parsed);
        }
      } catch {
        // Ignore malformed storage value.
      }
    }
  }, [userPseudo]);

  useEffect(() => {
    if (!userPseudo || !teamSlots)
      return ;
    async function postTeam()
    {
      await fetch("/api/home", {
        method: "PUT",
        headers: { "Content-Type": "application/json", },
        body: JSON.stringify({userPseudo: userPseudo, char: teamSlots})
      });
    }
    postTeam();
    localStorage.setItem(STORAGE_KEYS.team, JSON.stringify(teamSlots));
  }, [teamSlots]);

  useEffect(() => {
  if (!userPseudo) return;

    const handleMatchFound = () => {
      router.push("/game");
    };

    const handleMatchFoundPong = () => {
      router.push("/pong");
    };

    const handleBan = (banned: string) => {
      if (banned === userPseudo)
        handleLogoutLocal();
    };

    socket.on("matchFound", handleMatchFound);
    socket.on("matchFoundPong", handleMatchFoundPong);
    socket.on("ban", handleBan);

    return () => {
      socket.off("matchFound", handleMatchFound);
      socket.off("matchFoundPong", handleMatchFoundPong);
      socket.off("ban", handleBan);
    };
  }, [userPseudo])

  const handleLogoutLocal = () => {
    handleLogout(router).catch(() => router.push("/"));
  };

  

  const handleMine = (event: React.MouseEvent<HTMLButtonElement>) => {
    const reward = Math.floor(Math.random() * 24) + 12;
    setRuby((current) => current + reward);
    void fetch("/api/profile/resources", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rubisDelta: reward }),
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { rubis?: number };
        if (typeof payload.rubis === "number") {
          setRuby(payload.rubis);
        }
      })
      .catch(() => {
        // Keep the optimistic UI update if persistence fails.
      });
    minePopupIdRef.current += 1;
    const popupId = minePopupIdRef.current;
    setMinePopups((current) => [
      ...current,
      { id: popupId, value: reward, x: event.clientX, y: event.clientY },
    ]);

    window.setTimeout(() => {
      setMinePopups((current) => current.filter((popup) => popup.id !== popupId));
    }, 900);
  };

  const handleStartPvp = async () => {
    if (!userPseudo) return;
    if (!teamSlots[0] && !teamSlots[1] && !teamSlots[2])
    {
      emitGlobalError("Can't start a game with an empty team.");
      return ;
    }

    await fetch("/api/home", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userPseudo,
        char: teamSlots.filter(Boolean),
      }),
    });

    setPvpOpen(true);
    const res = await fetch("/api/home", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({userPseudo: userPseudo}),
    });
    if (!res.ok)
      return ;
  };

  const handleStartPong = async () => {
    if (!userPseudo)
    {
      return ;
    }
    setPongOpen(true);
    // Wait for socket to be connected and logged in before entering queue
    await ensureLoggedIn(userPseudo);
    const res = await fetch("/api/pong", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({userPseudo: userPseudo}),
    })
    if (!res.ok)
      return ; //afficher un message lie a l'erreur
  };

  const handleClosePong = async () => {
    const res = await fetch(`/api/pong?userPseudo=${userPseudo}`, {
      method: "DELETE",
    })
    if (!res.ok)
    {
      setPongOpen(false);
      return ; //afficher un message lie a l'erreur
    }
    setPongOpen(false);
  };

  const handleClosePvp = async () => {
    const res = await fetch(`/api/home?userPseudo=${userPseudo}`, {
      method: "DELETE",
    })
    if (!res.ok)
    {
      setPvpOpen(false);
      return ; //afficher un message lie a l'erreur
    }
    setPvpOpen(false);
  };

  

  const handleDropToTeamSlot = (slotIndex: number, characterId: string) => {
    if (slotIndex < 0 || slotIndex > 2) {
      return;
    }

    setTeamSlots((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((slotCharacterId) => slotCharacterId === characterId);

      if (existingIndex !== -1) {
        next[existingIndex] = null;
      }

      next[slotIndex] = characterId;
      return next;
    });
  };

  const getSlotIndexAtPoint = (clientX: number, clientY: number) => {
    for (let index = 0; index < slotRefs.current.length; index += 1) {
      const slot = slotRefs.current[index];
      if (!slot) {
        continue;
      }

      const rect = slot.getBoundingClientRect();
      const isInside = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
      if (isInside) {
        return index;
      }
    }
    return null;
  };

  const handleRosterPointerDown = (event: React.PointerEvent<HTMLButtonElement>, characterId: string) => {
    if (event.button !== 0) {
      return;
    }

    pendingDragRef.current = {
      id: characterId,
      startX: event.clientX,
      startY: event.clientY,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const pending = pendingDragRef.current;
      const active = activeDragRef.current;
      if (!pending && !active) {
        return;
      }

      if (!active && pending) {
        const distanceX = moveEvent.clientX - pending.startX;
        const distanceY = moveEvent.clientY - pending.startY;
        const movedEnough = Math.hypot(distanceX, distanceY) >= 6;
        if (!movedEnough) {
          return;
        }

        const started: TeamDragState = {
          id: pending.id,
          x: moveEvent.clientX,
          y: moveEvent.clientY,
        };
        activeDragRef.current = started;
        pendingDragRef.current = null;
        suppressClickForIdRef.current = started.id;
        setDragPreview(started);
      }

      const current = activeDragRef.current;
      if (!current) {
        return;
      }

      const updated: TeamDragState = {
        ...current,
        x: moveEvent.clientX,
        y: moveEvent.clientY,
      };
      activeDragRef.current = updated;
      setDragPreview(updated);
      setHoveredSlotIndex(getSlotIndexAtPoint(moveEvent.clientX, moveEvent.clientY));
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      const current = activeDragRef.current;
      if (current) {
        const slotIndex = getSlotIndexAtPoint(upEvent.clientX, upEvent.clientY);
        if (slotIndex !== null) {
          handleDropToTeamSlot(slotIndex, current.id);
        }
      }

      pendingDragRef.current = null;
      activeDragRef.current = null;
      setDragPreview(null);
      setHoveredSlotIndex(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  };

  if (!userPseudo) return;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0c0a0f] font-serif text-white">

      <Sidebar />
      {showNotification && notification && notifSender && (<NotificationToast onClose={() => setShowNotification(false)} msg={notification} sender={notifSender} />)}

      <div className="flex flex-1 flex-col overflow-hidden">
      <main className="relative flex-1 overflow-hidden p-3 lg:pl-0 pt-14 lg:pt-3">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#0c0a0f] via-[#12101a] to-[#0a0810]" />
        <div
          className="absolute inset-0 rounded-3xl opacity-[0.02]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9a227' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />


        <div className="relative z-10 flex h-full min-h-0 flex-col gap-5 rounded-3xl border border-[#c9a227]/20 bg-black/10 p-3 sm:p-5">
          <MineSection pseudo={userPseudo ?? "Hero"} rubyCount={ruby} />

          {/* Main Content Grid */}
          <div className="flex min-h-0 flex-1 flex-col gap-5">
            {/* Features Row */}
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={handleMine}
                className="mine-clicker group relative flex min-h-[100px] w-full flex-col justify-between overflow-hidden rounded-xl border border-[#c9a227]/40 bg-gradient-to-br from-[#1a1422] to-[#0f0c14] p-2 text-left shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-[#e6c55a]/70 hover:shadow-[0_12px_40px_rgba(201,162,39,0.15)] sm:min-h-[140px] sm:p-4"
              >
                <div className="pointer-events-none absolute -inset-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#c7662d]/15 via-transparent to-[#2a2234]/15 rounded-xl" />
                </div>

                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span
                      className="text-2xl font-black uppercase tracking-[0.14em] text-[#f5e6c8]"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      Mine
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#c9b48a]">Get Crystals</span>
                  </div>
                  <i className="fa-solid fa-pickaxe text-lg text-[#e6c55a] drop-shadow-lg" aria-hidden="true" />
                </div>

                <div className="relative z-10 flex items-center gap-2.5">
                  <div className="h-px flex-1 bg-gradient-to-r from-[#e6c55a]/60 to-transparent" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[#f0dfb1]">Click to Earn</span>
                </div>
              </button>

              <FeatureActionTile
                title="PvP"
                icon="fa-swords"
                accentClassName="bg-gradient-to-br from-[#4d2f57]/20 via-[#b15b45]/15 to-transparent"
                value="Queue"
                onClick={handleStartPvp}
              />

              <FeatureActionTile
                title="Pong"
                icon="fa-flame"
                accentClassName="bg-gradient-to-br from-[#5c2f2f]/20 via-[#c75d4d]/15 to-transparent"
                value="Farm XP"
                titleAction={
                  <div onClick={(e) => { e.stopPropagation(); setRulesOpen(true); }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-[#c9a227] text-xs font-bold text-black transition-colors hover:bg-[#e6c55a] cursor-pointer"
                  >
                    i
                  </div>
                }
                onClick={handleStartPong}
              />

              
            </div>

            <TeamBuilder
              roster={roster}
              teamSlots={teamSlots}
              dragPreview={dragPreview}
              hoveredSlotIndex={hoveredSlotIndex}
              slotRefs={slotRefs}
              suppressClickForIdRef={suppressClickForIdRef}
              onTeamSlotChange={handleDropToTeamSlot}
              onRosterPointerDown={handleRosterPointerDown}
              onSlotClear={(slotIndex) => {
                setTeamSlots((current) => {
                  const next = [...current];
                  next[slotIndex] = null;
                  return next;
                });
              }}
            />
          </div>
        </div>

      {minePopups.map((popup) => (
        <span
          key={popup.id}
          className="mine-reward-pop pointer-events-none fixed z-[70] text-3xl font-black text-[#ffcf63] [text-shadow:0_2px_10px_rgba(0,0,0,0.75)]"
          style={{
            fontFamily: "var(--font-display), serif",
            left: `${popup.x}px`,
            top: `${popup.y - 10}px`,
          }}
        >
          +{popup.value}
        </span>
      ))}

      {dragPreview && (() => {
        const draggedCharacter = roster.find((character) => character.id === dragPreview.id);
        if (!draggedCharacter) {
          return null;
        }

        return (
          <div
            className="pointer-events-none fixed z-[80] w-[96px] overflow-hidden rounded-lg border border-[#c9a227] bg-[#171220] shadow-[0_10px_28px_rgba(0,0,0,0.55)]"
            style={{
              left: `${dragPreview.x - 48}px`,
              top: `${dragPreview.y - 80}px`,
            }}
          >
            <div className="relative aspect-[3/4] w-full">
              <Image src={draggedCharacter.portrait} alt={draggedCharacter.name} fill className="object-cover" draggable={false} />
            </div>
            <div className="truncate bg-[#1a1422] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-[#ead9aa]">
              {draggedCharacter.name}
            </div>
          </div>
        );
      })()}

      {/* Rules Modal */}
      {rulesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" onClick={() => setRulesOpen(false)}>
          <div className="rounded-2xl border border-[#c9a227]/30 bg-[#242033] p-8 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Pong Rules</h2>
              <button
                onClick={() => setRulesOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="text-white text-sm space-y-4">
              <div>
                <h3 className="font-bold text-[#c9a227] mb-2">Game Start</h3>
                <p>A 3-second countdown begins before the match starts to let both players prepare.</p>
              </div>
              <div>
                <h3 className="font-bold text-[#c9a227] mb-2">Objective</h3>
                <p>Use your paddle to hit the ball back and forth. Every time you or your opponent hit the ball, you score some points.</p>
              </div>
              <div>
                <h3 className="font-bold text-[#c9a227] mb-2">Controls</h3>
                <p>Move your paddle up with W and down with S to hit the ball. First player to miss the ball ends the match.</p>
              </div>
              <div>
                <h3 className="font-bold text-[#c9a227] mb-2">Experience Rewards</h3>
                <p>Each time you hit the ball with your paddle, all your characters gain XP.</p>
              </div>
              <div>
                <h3 className="font-bold text-[#c9a227] mb-2">Ball Physics</h3>
                <p>The ball bounces off paddles and walls. The longer a rally lasts, the faster the ball moves.</p>
              </div>
            </div>
            <button
              onClick={() => setRulesOpen(false)}
              className="text-gray-400 hover:text-white transition-colors absolute top-4 right-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <PvpMatchmakingModal
        open={pvpOpen}
        onClose={handleClosePvp}
      />

      <PongMatchmakingModal
        open={pongOpen}
        onClose={handleClosePong}
      />
      </main>
      <Footer />
      </div>
    </div>
  );
}

