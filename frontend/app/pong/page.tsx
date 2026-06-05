"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { socket, ensureLoggedIn, clearCurrentUser } from "@/socket";

export default function PongPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [userPseudo, setUserPseudo] = useState("");
  // board
  const boardWidth = 1500;
  const boardHeight = 900;
  const router = useRouter();
  const [winner, setWinner] = useState<null | "left" | "right">(null);
  const [isCollectingXp, setIsCollectingXp] = useState(false);
  const [xpCollected, setXpCollected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);
  const xp = useRef(0);
  const countdownRef = useRef(3);
  const isPlayer1 = useRef(false);
  const angle = (Math.random() * Math.PI / 3) - Math.PI / 6;
  const [opponent, setOpponent] = useState("");

  // Joueurs 1 ref
  const player1 = useRef({
    x: 20,
    y: boardHeight / 2 - 50,
    width: 10,
    height: 100,
    speed: 6,
  });

  // Joueur 2 ref
  const player2 = useRef({
    x: boardWidth - 30,
    y: boardHeight / 2 - 50,
    width: 10,
    height: 100,
    speed: 6,
  });

  // Balle
  const ball = useRef({
    x: boardWidth / 2,
    y: boardHeight / 2,
    radius: 10,
    speedX: 0,
    speedY: 0,
    started: false,
  });

  // Touches
  const keys = useRef<{ [key: string]: boolean }>({});
  const matchEndedRef = useRef(false);
  const forceDisconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

   useEffect(() => {
    const getUserData = async () => {
      const { data } = await authClient.getSession();
      if (data && data.user.name) {
        setUserPseudo(data.user.name);
      }
      else
      {
        router.push("/not-connected");
        return;
      }

      try {
        const res = await fetch(`/api/pong?pseudo=${data.user.name}`, { method: "GET" });
        if (!res.ok) {
          console.error("Failed to fetch opponent:", res.status);
          // Fallback: attendre que l'opponent soit disponible
          await new Promise(r => setTimeout(r, 1000));
          const retryRes = await fetch(`/api/pong?pseudo=${data.user.name}`, { method: "GET" });
          if (!retryRes.ok) {
            console.error("Opponent still not found");
            return;
          }
          const odata = await retryRes.json();
          setOpponent(odata.name);
        } else {
          const odata = await res.json();
          setOpponent(odata.name);
        }
      } catch (err) {
        console.error("Error fetching opponent:", err);
      }
    };
    getUserData();
  }, []);

  useEffect(() => {
    if (!userPseudo) return;    
    ensureLoggedIn(userPseudo);
    
    return () => {
      clearCurrentUser();
    };
  }, [userPseudo]);

  useEffect(() => {
    if (!userPseudo || !opponent) {
      return;
    }
        
    // Determine if this player is Player 1 (alphabetically first)
    isPlayer1.current = userPseudo < opponent;    
    const handleBan = (banned: string) => {
      if (banned === userPseudo)
        handleLogout();
    };
    
    const handlePongUpdate = (data: { y: number }) => {
      player2.current.y = data.y;
    };
    
    const handleBallLaunch = (data: { speedX: number; speedY: number }) => {
      const b = ball.current;
      b.started = true;
      // Mirror effect: invert speedX for Player 2
      b.speedX = -data.speedX;
      b.speedY = data.speedY;
    };
    
    const handleMatchEnd = (data: { winner: string }) => {
      if (data.winner === "left" || data.winner === "right") {
        setWinner(data.winner);
        ball.current.started = false;
      }
    };

    const handleForceDisconnect = (data: { reason: string }) => {
      setError("Your opponent disconnected. Returning to home...");
      if (forceDisconnectTimerRef.current) clearTimeout(forceDisconnectTimerRef.current);
      forceDisconnectTimerRef.current = setTimeout(() => {
        clearCurrentUser();
        socket.disconnect();
        router.push("home");
      }, 2000);
    };
    
    socket.on("ban", handleBan);
    socket.on("pong", handlePongUpdate);
    socket.on("ballLaunch", handleBallLaunch);
    socket.on("matchEnd", handleMatchEnd);
    socket.on("forceDisconnect", handleForceDisconnect);
    
    return () => {
      socket.off("ban", handleBan);
      socket.off("pong", handlePongUpdate);
      socket.off("ballLaunch", handleBallLaunch);
      socket.off("matchEnd", handleMatchEnd);
      socket.off("forceDisconnect", handleForceDisconnect);
      if (forceDisconnectTimerRef.current) {
        clearTimeout(forceDisconnectTimerRef.current);
        forceDisconnectTimerRef.current = null;
      }
    };
  }, [userPseudo, opponent])

  // Reset game and start countdown when opponent is found
  useEffect(() => {
    if (!opponent) return;
    
    matchEndedRef.current = false; // Reset match ended flag for new match
    countdownRef.current = 3;
    setCountdown(3);
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const newCountdown = Math.max(0, 3 - elapsed);
      countdownRef.current = newCountdown;
      setCountdown(newCountdown);
      
      if (elapsed >= 3) {
        clearInterval(interval);
      }
    }, 100);
    
    return () => {
      clearInterval(interval);
    };
  }, [opponent])

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
    clearCurrentUser();
    socket.emit("isdisconnecting");
    socket.disconnect();
    await authClient.signOut();
    router.push("/");
  };

  // Fonction pour récolter l'XP
  const handleCollectXp = async () => {
    if (!userPseudo || xp.current === 0) return;

    setIsCollectingXp(true);
    try {
      const response = await fetch("/api/characters/reward-xp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: userPseudo, xpGained: xp.current }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Error collecting XP");
        setIsCollectingXp(false);
        return;
      }

      setXpCollected(true);
      setIsCollectingXp(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsCollectingXp(false);
    }
  };

  // Auto-collect XP when match ends
  useEffect(() => {
    if (!winner || xpCollected) return;

    const collectXpAutomatically = async () => {
      if (!userPseudo || xp.current === 0) return;

      try {
        const response = await fetch("/api/characters/reward-xp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: userPseudo, xpGained: xp.current }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || "Error collecting XP");
          return;
        }

        setXpCollected(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };

    void collectXpAutomatically();
  }, [winner, userPseudo, xpCollected]);

  //context du jeu
  useEffect(() => {
    const board = canvasRef.current;

    if (!board)
      return;
    const context = board.getContext("2d");
    if (!context)
      return;

    // Clavier
    const keyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
    };

    const keyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const rect = board.getBoundingClientRect();
      const relX = (touch.clientX - rect.left) / rect.width;
      const relY = (touch.clientY - rect.top) / rect.height;

      if (relX < 0.5) {
        keys.current["w"] = relY < 0.5;
        keys.current["s"] = relY >= 0.5;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const rect = board.getBoundingClientRect();
      const relX = (touch.clientX - rect.left) / rect.width;
      const relY = (touch.clientY - rect.top) / rect.height;

      if (relX < 0.5) {
        keys.current["w"] = relY < 0.5;
        keys.current["s"] = relY >= 0.5;
      }
    };

    const handleTouchEnd = () => {
      keys.current["w"] = false;
      keys.current["s"] = false;
    };

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    // Boucle du jeu
    const update = () => {
      const p1 = player1.current;
      const p2 = player2.current;
      const b = ball.current;

      // Stop processing if match has ended
      if (matchEndedRef.current)
        return;

      // Mouvement joueur 1
      if (keys.current["w"] && p1.y > 0) {
        p1.y -= p1.speed;
        if (socket.connected && opponent) {
          socket.emit("pong_info", {
            opponent,
            y: p1.y,
          });
        }
      }

      if (keys.current["s"] && p1.y + p1.height < boardHeight) {
        p1.y += p1.speed;
        if (socket.connected && opponent) {
          socket.emit("pong_info", {
            opponent,
            y: p1.y,
          });
        }
      }

      // Auto-launch ball after countdown (Player 1 initiates)
      if (countdownRef.current === 0 && !b.started && !winner) {
        if (isPlayer1.current) {
          // Player 1 generates random direction and sends to opponent
          const randomAngle = (Math.random() * Math.PI / 3) - Math.PI / 6; // -30° to +30°
          const randomDirection = Math.random() < 0.5 ? 1 : -1; // Left or right
          const speed = 5;
          let speedX = randomDirection * speed * Math.cos(randomAngle);
          let speedY = speed * Math.sin(randomAngle);
          
          // Éviter que la balle aille trop à l'horizontale
          const minVerticalSpeed = 2.5;
          if (Math.abs(speedY) < minVerticalSpeed) {
            speedY = (speedY >= 0 ? 1 : -1) * minVerticalSpeed;
            speedX = Math.sign(speedX) * Math.sqrt(speed * speed - speedY * speedY);
          }          
          // Apply to local ball
          b.started = true;
          b.speedX = speedX;
          b.speedY = speedY;
          
          // Send to Player 2
          if (socket.connected && opponent) {
            socket.emit("ballLaunch", { opponent, speedX, speedY });
          }
        }
        // Player 2 waits for ballLaunch event from socket (handled by handleBallLaunch)
      }

      // Mouvement balle
      if (b.started) {
        b.x += b.speedX;
        b.y += b.speedY;
      }

      // Collision haut/bas
      if (b.y - b.radius <= 0 || b.y + b.radius >= boardHeight) {
        b.speedY *= -1;
      }

      const paddleCollision = (b: any, p: any, isLeft: boolean) => {
        const nextX = b.x + b.speedX;

        const withinY =
          b.y + b.radius > p.y &&
          b.y - b.radius < p.y + p.height;

        const hitX = isLeft
          ? nextX - b.radius <= p.x + p.width && b.x > p.x
          : nextX + b.radius >= p.x && b.x < p.x + p.width;

        if (withinY && hitX) {
          // reposition anti-bug
          if (isLeft) {
            b.x = p.x + p.width + b.radius;
          } else {
            b.x = p.x - b.radius;
          }

          // inversion direction
          b.speedX *= -1;

        // multiplicateur accélération
        const accel = 1.08;

        b.speedX *= accel;
        b.speedY *= accel;

        // XP random entre 0 et 2
        const gainedXp = Math.floor(Math.random() * 3);
        xp.current += gainedXp;

        // limite vitesse
        const maxSpeed = 18;

        b.speedX = Math.max(Math.min(b.speedX, maxSpeed), -maxSpeed);
        b.speedY = Math.max(Math.min(b.speedY, maxSpeed), -maxSpeed);
        }
      };

      // Sortie gauche -> joueur droit gagne
      if (b.x < 0) {
        // Stop the ball completely on both sides
        b.speedX = 0;
        b.speedY = 0;
        b.started = false;
        
        // Show winner modal
        setWinner("right");
        
        // Send matchEnd event to opponent (only once)
        if (!matchEndedRef.current && socket.connected && opponent) {
          matchEndedRef.current = true;
          console.log("[Pong] Sending matchEnd to opponent: right wins");
          socket.emit("matchEnd", { opponent, winner: "right" });
        }
      }

      // Sortie droite -> joueur gauche gagne
      if (b.x > boardWidth) {
        // Stop the ball completely on both sides
        b.speedX = 0;
        b.speedY = 0;
        b.started = false;
        
        // Show winner modal
        setWinner("left");
        
        // Send matchEnd event to opponent (only once)
        if (!matchEndedRef.current && socket.connected && opponent) {
          matchEndedRef.current = true;
          socket.emit("matchEnd", { opponent, winner: "left" });
        }
      }

      // Nettoyage
      context.clearRect(0, 0, boardWidth, boardHeight);

      // Fond
      context.fillStyle = "black";
      context.fillRect(0, 0, boardWidth, boardHeight);

      // Ligne centrale
      context.strokeStyle = "white";
      context.setLineDash([10, 10]);
      context.beginPath();
      context.moveTo(boardWidth / 2, 0);
      context.lineTo(boardWidth / 2, boardHeight);
      context.stroke();
      
      // Joueur 1
      context.fillStyle = "gray";
      context.fillRect(
        p1.x,
        p1.y,
        p1.width,
        p1.height
      );

      // Joueur 2
      context.fillStyle = "gray";
      context.fillRect(
        p2.x,
        p2.y,
        p2.width,
        p2.height
      );

      // Dessin de la balle
      context.beginPath();

      context.arc(
        b.x,
        b.y,
        b.radius,
        0,
        Math.PI * 2
      );

      context.fillStyle = "white";
      context.fill();
      context.fillStyle = "white";
      context.font = "30px Arial";
      context.fillText(`XP: ${xp.current}`, boardWidth - 150, 50);

      paddleCollision(b, p1, true);
      paddleCollision(b, p2, false);
      requestAnimationFrame(update);

    };

    update();

    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [opponent]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative p-2 sm:p-4">
      {!opponent ? (
        <div className="text-center space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Searching for opponent...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-white text-sm">Make sure you started matchmaking</p>
        </div>
      ) : (
        <>
          <div className="relative w-full max-w-[1500px] mx-auto" style={{ aspectRatio: `${boardWidth}/${boardHeight}` }}>
            <canvas
              ref={canvasRef}
              width={boardWidth}
              height={boardHeight}
              className="absolute inset-0 w-full h-full border-2 sm:border-4 border-white"
            />
          </div>

          {/* MODAL WIN */}
          {winner && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4">
              <div className="bg-white text-black p-6 sm:p-8 rounded-xl text-center space-y-4 max-w-md w-full">
                <h2 className="text-xl sm:text-2xl font-bold">
                  You earned {xp.current} XP for each character!
                </h2>

                {error && (
                  <p className="text-red-600 font-semibold">{error}</p>
                )}

                {xpCollected && (
                  <p className="text-green-600 font-semibold">✓ XP collected successfully!</p>
                )}

                <button
                  className="px-6 py-2 bg-black text-white rounded"
                  onClick={() => {
                    clearCurrentUser();
                    router.push("home");
                  }}
                >
                  Back to home
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}