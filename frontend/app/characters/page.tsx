"use client";

import { useState, useEffect } from "react";
import CharacterViewer from "@/components/organisms/characters/CharacterViewer";
import Sidebar from "@/components/Sidebar";
import NotificationToast from "@/components/organisms/home/NotificationToast";
import type { CharacterData, PlayerResources } from "@/components/organisms/characters/types";
import { socket } from "../../socket"
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function CharactersPage() {
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [resources, setResources] = useState<PlayerResources>({ruby: 0});
  const [maxSkillLevel, setMaxSkillLevel] = useState<number>(10);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId) ?? characters[0] ?? null;
  const router = useRouter();
  const [showNotification, setShowNotification] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [notifSender, setNotifSender] = useState<string | null>(null);
  const [userPseudo, setUserPseudo] = useState<string | null>(null);

  useEffect(() => {
    const getUserData = async () => {
      const { data } = await authClient.getSession();
      if (data && data.user.name)
        setUserPseudo(data.user.name);
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
    const loadCharacters = async () => {
      try {
        const response = await fetch(`/api/characters?username=${userPseudo}`, {
          method: "GET",
          cache: "no-store"
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          characters?: CharacterData[];
          resources?: PlayerResources;
          maxSkillLevel?: number;
        };

        if (Array.isArray(payload.characters)) {
          setCharacters(payload.characters);
          setSelectedCharacterId((current) => {
            if (current && payload.characters?.some((character) => character.id === current)) {
              return current;
            }
            return payload.characters?.[0]?.id ?? "";
          });
        }

        if (payload.resources) {
          setResources(payload.resources);
        }

        if (typeof payload.maxSkillLevel === "number") {
          setMaxSkillLevel(payload.maxSkillLevel);
        }
      } catch {
        // Keep local fallback values when API is unavailable.
      }
    };

    void loadCharacters();
  }, [userPseudo]);

  useEffect(() => {
    if (!userPseudo || socket.connected) return;

    const timeoutId = window.setTimeout(() => {
      socket.connect();
      socket.emit("login", userPseudo);

      socket.on("online_users", (users) => {
        console.log("Users from Redis:", users);
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      socket.off("online_users");
    };
  }, [userPseudo]);

  useEffect(() => {
    if (!userPseudo) return;
    socket.on("received", async ({sender, msg}) => {
      setNotification(msg);
      setNotifSender(sender);
      setShowNotification(true);
    })
  }, [userPseudo])

  useEffect(() => {
    if (!userPseudo) return;
    socket.on("ban", (banned) => {
      if (banned === userPseudo)
        handleLogout();
    });
  }, [userPseudo])

  const handleLogout = async () => {
    const response = await fetch("/api/profile", {
        method: "PUT",
      })
      const user: unknown = await response.json();
      if (!response.ok) {
        const errorMessage =
        typeof user === "object" && user !== null && "error" in user
          ? String((user as { error: string }).error ?? "Impossible de charger l'utilisateur")
          : "Impossible de charger l'utilisateur";
        throw new Error(errorMessage);
      }
    socket.emit("isdisconnecting");
    socket.disconnect();
    await authClient.signOut();
    router.push("/");
  };

  const handlePlusOne = async (skillId: string): Promise<boolean> => {
    const response = await fetch("/api/characters", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: userPseudo, skillId: skillId}),
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as {
      spellId?: string;
      level?: number;
      resources?: PlayerResources;
    };

    if (payload.resources) {
      setResources(payload.resources);
    }

    if (!payload.spellId || typeof payload.level !== "number") {
      return true;
    }

    return true;
  }

  const handleUpgradeSkill = async (skillId: string): Promise<boolean> => {
    const response = await fetch("/api/characters", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: userPseudo, skillId: skillId}),
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as {
      spellId?: string;
      level?: number;
      resources?: PlayerResources;
    };

    if (payload.resources) {
      setResources(payload.resources);
    }

    if (!payload.spellId || typeof payload.level !== "number") {
      return true;
    }

    return true;
  }

  if (!userPseudo) return;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0c0a0f] font-serif">
      {showNotification && notification && notifSender && (<NotificationToast onClose={() => setShowNotification(false)} msg={notification} sender={notifSender} />)}
      {/* Sidebar */}
      <Sidebar />
      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-3 lg:pl-0 pt-14 lg:pt-3">
        {selectedCharacter && (
          <CharacterViewer
            characters={characters}
            selectedCharacter={selectedCharacter}
            onSelectCharacter={setSelectedCharacterId}
            resources={resources}
            maxSkillLevel={maxSkillLevel}
            onUpgradeSkill={handleUpgradeSkill}
            onPlusOneSkill={handlePlusOne}
          />
        )}
      </main>
    </div>
  );
}
