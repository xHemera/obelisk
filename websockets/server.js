import https from "https";
import fs from "fs";
import { Server } from "socket.io";
import express from "express";
import { createClient } from 'redis';
import { processAction, getCurrentTurnCharacter } from "./engine/GameEngine.ts";
import "./matchmaking.js";
import "./matchmakingpong.js";
import { createGameInstance, broadcastGameState } from "./gameManager.js";

//redis settings
const redis = createClient({
    socket: {
      host: 'redis',
      port: 6379,
    }
});

redis.on('error', (err) => console.log('Redis Client Error', err));

await redis.connect();

// Game engine store: roomId -> { gameState, players: [pseudo1, pseudo2], playerConns: [socket1, socket2], teamData }
const gameRooms = new Map();

function removeSocketFromOtherGameRooms(socket, currentRoomId) {
  for (const [roomId, room] of gameRooms) {
    if (roomId === currentRoomId) continue;
    const index = room.playerConns.findIndex((sock) => sock.id === socket.id);
    if (index !== -1) {
      room.playerConns.splice(index, 1);
      socket.leave(`game:${roomId}`);
      if (room.playerConns.length === 0) {
        gameRooms.delete(roomId);
      }
    }
  }
}

//connection parameters and server creation
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 4001);

const app = express();
const certPath = process.env.CERT_PATH || "./certs";
const httpsOptions = {
  key: fs.readFileSync(`${certPath}/key.pem`),
  cert: fs.readFileSync(`${certPath}/cert.pem`),
};
const httpsServer = https.createServer(httpsOptions, app);
export const io = new Server(httpsServer, {
  cors: {
    origin: "*"
  },
  transports: ["websocket", "polling"],
});

//sockets functions
//On connect, logs and maps the user to a socket
io.on("connection", (socket) => {
  socket.on("login", async (user) => {
    if (typeof user !== 'string' || !user.trim())
    {
      console.error("Invalid user in login: ", user);
      return ;
    }
    if (!socket.id) {
      console.error("Socket ID is undefined!", socket);
      return;
    }

    console.log("[Pong Server] User login:", { user, socketId: socket.id });
    await redis.hSet("online_users", user, socket.id);
    const users = await redis.hGetAll("online_users");
    console.log("[Pong Server] Online users after login:", users);
    io.emit("online_users", users);
  });

  //checks if a message is sent to someone else
  socket.on("msg_sent", async ({sender, receiver, msg}) => {
    const receiverSock = await redis.hGet("online_users", receiver);
    if (receiverSock)
    {
      io.to(receiverSock).emit("received", {sender, receiver, msg});
    }
  })

  //tells that a new conv is made
  socket.on("new_conv", async ({sender, receiver}) => {
    const receiverSock = await redis.hGet("online_users", receiver);
    if (receiverSock)
    {
      io.to(receiverSock).emit("add_conv");
    }
  })

  //tells that there is a friend request waiting
  socket.on("friend_request", async ({user, oUser}) => {
    const receiverSock = await redis.hGet("online_users", oUser);
    if (receiverSock)
    {
      io.to(receiverSock).emit("request", {user, oUser});
    }
  })

  //tells that the friend request has been accepted
  socket.on("friend_added", async ({user, friend}) => {
    const receiverSock = await redis.hGet("online_users", friend);
    if (receiverSock)
    {
      io.to(receiverSock).emit("adding", user, friend);
    }
    io.to(socket.id).emit("adding", {user, friend});
  })

  //tells that the friend request has been refused
  socket.on("friend_denied", async ({user, friend}) => {
    const receiverSock = await redis.hGet("online_users", friend);
    if (receiverSock)
    {
      io.to(receiverSock).emit("refusing", {user, friend});
    }
  })

  //tells that the other user has been blocked by the user
  socket.on("friend_or_user_blocked", async ({user, oUser}) => {
    const receiverSock = await redis.hGet("online_users", oUser);
    if (receiverSock)
    {
      io.to(receiverSock).emit("blocked", {user, oUser});
    }
  })

  //shows that they blocked the other user
  socket.on("blocking_friend_or_user", async () => {
    io.to(socket.id).emit("blocking");
  })

  //tells and shows that the other user has been unblocked
  socket.on("user_unblocked", async ({user, oUser}) => {
    const receiverSock = await redis.hGet("online_users", oUser);
    if (receiverSock)
    {
      io.to(receiverSock).emit("unblocking", {user, oUser});
    }
    io.to(socket.id).emit("unblocking", {user, oUser})
  })

  //tells that a challenge has been sent
  socket.on("challenge_sent", async ({sender, receiver}) => {
    const receiverSock = await redis.hGet("online_users", receiver);
    if (receiverSock)
    {
      io.to(receiverSock).emit("challenge", {sender, receiver});
    }
    io.to(socket.id).emit("challenge", {sender, receiver});
  })

  //tells that they are typing
  socket.on("typing", async ({sender, receiver}) => {
    const receiverSock = await redis.hGet("online_users", receiver);
    if (receiverSock)
    {
      io.to(receiverSock).emit("isTyping", {sender, receiver});
    }
  })

  //tells that they are not typing
  socket.on("notTyping", async ({sender, receiver}) => {
    const receiverSock = await redis.hGet("online_users", receiver);
    if (receiverSock)
    {
      io.to(receiverSock).emit("isNotTyping", {sender, receiver});
    }
  })

  //tells that the duel has been accepted
  socket.on("duel_accepted", async ({user, oUser}) => {
    const receiverSock = await redis.hGet("online_users", oUser);
    if (receiverSock)
    {
      io.to(receiverSock).emit("accept", {user, oUser});
    }
    io.to(socket.id).emit("accept", {user, oUser});
  })

  //tells that the duel has been refused
  socket.on("duel_refused", async ({user, oUser}) => {
    const receiverSock = await redis.hGet("online_users", oUser);
    if (receiverSock)
    {
      io.to(receiverSock).emit("refuse", {user, oUser});
    }
    io.to(socket.id).emit("refuse", {user, oUser});
  })

  //tells that the duel has been cancelled
  socket.on("duel_cancelled", async ({user, oUser}) => {
    const receiverSock = await redis.hGet("online_users", oUser);
    if (receiverSock)
    {
      io.to(receiverSock).emit("cancel", {user, oUser});
    }
    io.to(socket.id).emit("cancel", {user, oUser});
  })

  //tells that the message has been read
  socket.on("has_read", async ({user, oUser}) => {
    const receiverSock = await redis.hGet("online_users", oUser);
    if (receiverSock)
    {
      io.to(receiverSock).emit("read", {user, oUser});
    }
  });

  //tells that they deleted their account
  socket.on("has_delete", async (sender) => {
    io.emit("deletion", {
      sender
    });
  });

  //tells that a new user has been created
  socket.on("creation", () => {
    io.emit("newUser");
  });

  //tells that someone reported someone else
  socket.on("reported", () => {
    io.emit("newReport");
  });

  //tells that someone reviewed the report
  socket.on("reviewed", () => {
    io.emit("lessReports");
  });

  //tells that a user has been promoted
  socket.on("addMod", async () => {
    io.emit("newMod");
  });

  //tells that a mod has been removed
  socket.on("removeMod", async () => {
    io.emit("noMod");
  });

  //tells that someone has been banned
  socket.on("banning", async (banned) => {
    io.emit("ban", banned);
  });

  //tells that someone has been unbanned
  socket.on("unbanning", async (banned) => {
    io.emit("unban", banned);
  });

  //tells everyone that they are connected
  socket.on("isconnecting", () => {
    io.emit("online");
  });

  //tells everyone that they are disconnected
  socket.on("isdisconnecting",() => {
    io.emit("offline");
  });

  // --- Game Engine Events ---

  // "initiate" is emitted by the frontend game page with the player's team data
  socket.on("initiate", async ({ team, roomId }) => {
    if (!team || !team.owner || !roomId) {
      console.error("[GameServer] Invalid initiate data:", { team, roomId });
      return;
    }

    removeSocketFromOtherGameRooms(socket, roomId);
    socket.join(`game:${roomId}`);
    const currentPlayerCount = gameRooms.has(roomId) ? gameRooms.get(roomId).players.length : 0;
    console.log(`[GameServer] initiate received — player=${team.owner} room=${roomId} team=${JSON.stringify(team.characters)} playersBefore=${currentPlayerCount}`);

    if (!gameRooms.has(roomId)) {
      gameRooms.set(roomId, {
        gameState: null,
        players: [],
        playerConns: [],
        teamData: {},
      });
    }

    const room = gameRooms.get(roomId);
    if (!room.playerConns.some(s => s.id === socket.id)) {
      room.playerConns.push(socket);
      console.log(`[GameServer]   → socket ${socket.id} added to room ${roomId} (${room.playerConns.length}/2)`);
    }

    if (!room.players.includes(team.owner)) {
      room.players.push(team.owner);
    }

    room.teamData[team.owner] = {
      pseudo: team.owner,
      characters: team.characters,
      levels: team.levels,
      skillsLevels: team.skillsLevels,
    };

    // When both players have initiated, create the GameState
    if (room.players.length === 2 && !room.gameState) {
      const [p1, p2] = room.players;
      console.log(`[GameServer] Both players ready — creating game in room ${roomId}`);
      console.log(`[GameServer]   players=${p1} (P0), ${p2} (P1)`);

      room.gameState = createGameInstance(
        roomId,
        room.teamData[p1],
        room.teamData[p2],
      );

      console.log(`[GameServer] GameState created — turn=${room.gameState.turn} phase=${room.gameState.gamePhase} turnQueueLength=${room.gameState.turnQueue.length}`);
      broadcastGameState(roomId);
    }
  });

  // Forfeit — player surrenders
  socket.on("forfeit", async () => {
    console.log("[GameServer] forfeit received — socket", socket.id);

    for (const [roomId, room] of gameRooms) {
      if (room.playerConns?.some(s => s.id === socket.id)) {
        if (!room.gameState) {
          console.log(`[GameServer] forfeit skipped — no gameState in room ${roomId}`);
          return;
        }
        // Determine the forfeiting player's ID
        const forfeiterIdx = room.playerConns.findIndex(s => s.id === socket.id);
        const winnerIdx = forfeiterIdx === 0 ? 1 : 0;
        const forfeiter = room.players[forfeiterIdx] ?? "unknown";
        const winner = room.players[winnerIdx] ?? "unknown";

        console.log(`[GameServer] forfeit — room=${roomId} ${forfeiter} surrenders, ${winner} wins`);

        room.gameState.gamePhase = "end";
        room.gameState.winnerId = winnerIdx;
        broadcastGameState(roomId);
        return;
      }
    }
    console.log("[GameServer] forfeit — no room found for socket", socket.id);
  });

  // Unified game action (spell cast or basic attack)
  socket.on("gameAction", async (action) => {
    console.log("[GameServer] gameAction received:", JSON.stringify(action));

    // Find which room this socket belongs to
    for (const [roomId, room] of gameRooms) {
      room.playerConns = room.playerConns.filter((sock) => sock.connected);
      if (room.playerConns.length === 0) {
        gameRooms.delete(roomId);
        continue;
      }
      if (room.playerConns?.some((s) => s.id === socket.id)) {
        if (!room.gameState) {
          console.log(`[GameServer] gameAction skipped — no gameState in room ${roomId}`);
          return;
        }
        console.log(`[GameServer] gameAction processing — room=${roomId} turn=${room.gameState.turn} phase=${room.gameState.gamePhase}`);
        try {
          const newState = processAction(room.gameState, action);
          room.gameState = newState;
          console.log(`[GameServer] gameAction done — turn=${newState.turn} phase=${newState.gamePhase} queueLen=${newState.turnQueue.length}`);
          broadcastGameState(roomId);
        } catch (err) {
          console.error(`[GameServer] gameAction error — room=${roomId}`, err);
        }
        return;
      }
    }
    console.log("[GameServer] gameAction — no room found for socket", socket.id);
  });

  // Pong info relay - relayer les mouvements des joueurs de pong
  socket.on("pong_info", async ({ opponent, y }) => {
    console.log("[Pong Server] Received pong_info event:", { opponent, y, senderSocketId: socket.id });
    
    if (!opponent || y === undefined) {
      console.log("[Pong Server] Invalid pong_info data, ignoring");
      return;
    }
    
    // Get sender name from socket ID
    const onlineUsers = await redis.hGetAll("online_users");
    let senderName = null;
    for (const [name, socketId] of Object.entries(onlineUsers)) {
      if (socketId === socket.id) {
        senderName = name;
        break;
      }
    }
    
    if (!senderName) {
      console.log("[Pong Server] Could not find sender name for pong_info");
      return;
    }
    
    // Check if this match has already finished
    const matchKey = [senderName, opponent].sort().join(":");
    const matchFinishedKey = `pong:finished:${matchKey}`;
    const matchFinished = await redis.exists(matchFinishedKey);
    
    if (matchFinished) {
      console.log("[Pong Server] Match already finished, ignoring pong_info:", matchKey);
      return;
    }
    
    const opponentSock = await redis.hGet("online_users", opponent);
    console.log("[Pong Server] Looking up opponent:", { opponent, foundSocketId: opponentSock });
    
    if (opponentSock) {
      console.log("[Pong Server] Sending pong event to opponent socket:", opponentSock);
      io.to(opponentSock).emit("pong", { y });
    } else {
      console.log("[Pong Server] Opponent socket not found in online_users");
    }
  });

  // Ball launch relay - synchronize ball launch between players
  socket.on("ballLaunch", async ({ opponent, speedX, speedY }) => {
    console.log("[Pong Server] Received ballLaunch event:", { opponent, speedX, speedY, senderSocketId: socket.id });
    
    if (!opponent || speedX === undefined || speedY === undefined) {
      console.log("[Pong Server] Invalid ballLaunch data, ignoring");
      return;
    }
    
    // Get sender name from socket ID
    const onlineUsers = await redis.hGetAll("online_users");
    let senderName = null;
    for (const [name, socketId] of Object.entries(onlineUsers)) {
      if (socketId === socket.id) {
        senderName = name;
        break;
      }
    }
    
    if (!senderName) {
      console.log("[Pong Server] Could not find sender name for ballLaunch");
      return;
    }
    
    // Check if this match has already finished
    const matchKey = [senderName, opponent].sort().join(":");
    const matchFinishedKey = `pong:finished:${matchKey}`;
    const matchFinished = await redis.exists(matchFinishedKey);
    
    if (matchFinished) {
      console.log("[Pong Server] Match already finished, ignoring ballLaunch:", matchKey);
      return;
    }
    
    const opponentSock = await redis.hGet("online_users", opponent);
    console.log("[Pong Server] Looking up opponent for ballLaunch:", { opponent, foundSocketId: opponentSock });
    
    if (opponentSock) {
      console.log("[Pong Server] Sending ballLaunch event to opponent socket:", opponentSock);
      io.to(opponentSock).emit("ballLaunch", { speedX, speedY });
    } else {
      console.log("[Pong Server] Opponent socket not found for ballLaunch");
    }
  });

  // Match end relay - sync game end between players
  socket.on("matchEnd", async ({ opponent, winner }) => {
    console.log("[Pong Server] Received matchEnd event:", { opponent, winner, senderSocketId: socket.id });
    
    if (!opponent || !winner) {
      console.log("[Pong Server] Invalid matchEnd data, ignoring");
      return;
    }
    
    // Get the current player's name from online_users (reverse lookup)
    const onlineUsers = await redis.hGetAll("online_users");
    let currentPlayerName = null;
    for (const [name, socketId] of Object.entries(onlineUsers)) {
      if (socketId === socket.id) {
        currentPlayerName = name;
        break;
      }
    }
    
    if (!currentPlayerName) {
      console.log("[Pong Server] Could not find current player name for matchEnd");
      return;
    }
    
    // Create a match key to avoid processing the same matchEnd twice
    const matchKey = [currentPlayerName, opponent].sort().join(":"); // e.g., "Hemera:Xoco"
    const matchFinishedKey = `pong:finished:${matchKey}`;
    
    // Check if this match was already processed
    const alreadyProcessed = await redis.exists(matchFinishedKey);
    if (alreadyProcessed) {
      console.log("[Pong Server] matchEnd already processed for this pair, ignoring duplicate:", matchKey);
      return;
    }
    
    // Mark this match as finished (with 5 second TTL to prevent spam)
    await redis.setEx(matchFinishedKey, 5, "1");
    console.log("[Pong Server] Marked match as finished:", matchKey);
    
    const opponentSock = await redis.hGet("online_users", opponent);
    console.log("[Pong Server] Looking up opponent for matchEnd:", { opponent, foundSocketId: opponentSock });
    
    if (opponentSock) {
      console.log("[Pong Server] Sending matchEnd event to opponent socket:", opponentSock);
      io.to(opponentSock).emit("matchEnd", { winner });
    } else {
      console.log("[Pong Server] Opponent socket not found for matchEnd");
    }
  });

  //delete the user's socket if he's disconnected
  socket.on("disconnect", async () => {
    for (const [roomId, room] of gameRooms) {
      room.playerConns = room.playerConns.filter((sock) => sock.id !== socket.id && sock.connected);
      if (room.playerConns.length === 0) {
        gameRooms.delete(roomId);
      }
    }

    const onlineUsers = await redis.hGetAll("online_users");
    const fieldToDelete = Object.keys(onlineUsers).find(
      key => onlineUsers[key] === socket.id
    );
    if (fieldToDelete)
    {
      io.emit("cancel", {user: fieldToDelete});
      
      // Remove from inGamePlayers if in a Pong game and notify opponent
      const opponent = await redis.hGet("inGamePlayers", fieldToDelete);
      if (opponent) {
        // Get opponent's socket ID
        const opponentSock = await redis.hGet("online_users", opponent);
        if (opponentSock) {
          console.log("[Pong Server] Player disconnected during match, forcing opponent to leave:", { player: fieldToDelete, opponent, opponentSocket: opponentSock });
          // Force the opponent to disconnect and return to home
          io.to(opponentSock).emit("forceDisconnect", { reason: "opponent_disconnected" });
        }
        
        // Remove both players from inGamePlayers
        await redis.hDel("inGamePlayers", fieldToDelete, opponent);
        console.log("[Pong Server] Removed both players from inGamePlayers on disconnect:", { fieldToDelete, opponent });
      }
    }
    if (fieldToDelete)
      await redis.hDel("online_users", fieldToDelete);
    const users = await redis.hGetAll("online_users");
    console.log("Client disconnected: ", users);
    io.emit("online_users", users);
  });
});

export { gameRooms };

//errors check and set the listening port
httpsServer
  .once("error", (err) => {
    console.error(err);
    process.exit(1);
  })
  .listen(port, hostname, () => {
    console.log(`> Ready on https://${hostname}:${port}`);
  });
