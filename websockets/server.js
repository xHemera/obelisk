import https from "https";
import fs from "fs";
import { Server } from "socket.io";
import express from "express";
import { createClient } from 'redis';
import { processAction } from "./engine/GameEngine.ts";
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
      return ;
    }
    if (!socket.id) {
      console.error("Socket ID is undefined!", socket);
      return;
    }

    // Disconnect old socket if user already has one
    const existingSocketId = await redis.hGet("online_users", user);
    if (existingSocketId && existingSocketId !== socket.id) {
      const oldSocket = io.sockets.sockets.get(existingSocketId);
      if (oldSocket) {
        oldSocket.disconnect(true);
      }
      // Also remove from inGamePlayers if matched
      const oldOpponent = await redis.hGet("inGamePlayers", user);
      if (oldOpponent) {
        let opponentName = oldOpponent;
          try {
            const parsed = JSON.parse(oldOpponent);
            opponentName = parsed.opp ?? opponentName;
          } catch {
            // Plain string format — use as-is
          }
          if (opponentName) {
            await redis.hDel("inGamePlayers", user, opponentName);
          } else {
            await redis.hDel("inGamePlayers", user);
          }
      }
    }

    await redis.hSet("online_users", user, socket.id);
    const users = await redis.hGetAll("online_users");
    console.log(users);
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
    if (!oUser) return ;
    const receiverSock = await redis.hGet("online_users", oUser);
    if (receiverSock)
    {
      io.to(receiverSock).emit("request", {user, oUser});
    }
  })

  //tells that the friend request has been accepted
  socket.on("friend_added", async ({user, friend}) => {
    if (!friend) return ;
    const receiverSock = await redis.hGet("online_users", friend);
    if (receiverSock)
    {
      io.to(receiverSock).emit("adding", {user, friend});
    }
    io.to(socket.id).emit("adding", {user, friend});
  })

  //tells that the friend request has been refused
  socket.on("friend_denied", async ({user, friend}) => {
    if (!friend) return ;
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

      room.gameState = createGameInstance(
        roomId,
        room.teamData[p1],
        room.teamData[p2],
      );

      broadcastGameState(roomId);
    }
  });

  // Forfeit — player surrenders
  socket.on("forfeit", async () => {

    for (const [roomId, room] of gameRooms) {
      if (room.playerConns?.some(s => s.id === socket.id)) {
        if (!room.gameState) {
          return;
        }
        // Determine the forfeiting player's ID
        const forfeiterIdx = room.playerConns.findIndex(s => s.id === socket.id);
        const winnerIdx = forfeiterIdx === 0 ? 1 : 0;

        room.gameState.gamePhase = "end";
        room.gameState.winnerId = winnerIdx;
        broadcastGameState(roomId);
        return;
      }
    }
  });

  // Unified game action (spell cast or basic attack)
  socket.on("gameAction", async (action) => {

    // Find which room this socket belongs to
    for (const [roomId, room] of gameRooms) {
      room.playerConns = room.playerConns.filter((sock) => sock.connected);
      if (room.playerConns.length === 0) {
        gameRooms.delete(roomId);
        continue;
      }
      if (room.playerConns?.some((s) => s.id === socket.id)) {
        if (!room.gameState) {
          return;
        }
        try {
          const newState = processAction(room.gameState, action);
          room.gameState = newState;
          broadcastGameState(roomId);
        } catch (err) {
          console.error(`[GameServer] gameAction error — room=${roomId}`, err);
        }
        return;
      }
    }
  });

  // Pong info relay - relayer les mouvements des joueurs de pong
  socket.on("pong_info", async ({ opponent, y }) => {
    
    if (!opponent || y === undefined) {
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
      return;
    }
    
    // Check if this match has already finished
    const matchKey = [senderName, opponent].sort().join(":");
    const matchFinishedKey = `pong:finished:${matchKey}`;
    const matchFinished = await redis.exists(matchFinishedKey);
    
    if (matchFinished) {
      return;
    }
    
    const opponentSock = await redis.hGet("online_users", opponent);
    
    if (opponentSock) {
      io.to(opponentSock).emit("pong", { y });
    } else {
    }
  });

  // Ball launch relay - synchronize ball launch between players
  socket.on("ballLaunch", async ({ opponent, speedX, speedY }) => {
    
    if (!opponent || speedX === undefined || speedY === undefined) {
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
      return;
    }
    
    // Check if this match has already finished
    const matchKey = [senderName, opponent].sort().join(":");
    const matchFinishedKey = `pong:finished:${matchKey}`;
    const matchFinished = await redis.exists(matchFinishedKey);
    
    if (matchFinished) {
      return;
    }
    
    const opponentSock = await redis.hGet("online_users", opponent);
    
    if (opponentSock) {
      io.to(opponentSock).emit("ballLaunch", { speedX, speedY });
    } else {
    }
  });

  // Match end relay - sync game end between players
  socket.on("matchEnd", async ({ opponent, winner }) => {
    
    if (!opponent || !winner) {
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
      return;
    }
    
    // Create a match key to avoid processing the same matchEnd twice
    const matchKey = [currentPlayerName, opponent].sort().join(":"); // e.g., "Hemera:Xoco"
    const matchFinishedKey = `pong:finished:${matchKey}`;
    
    // Check if this match was already processed
    const alreadyProcessed = await redis.exists(matchFinishedKey);
    if (alreadyProcessed) {
      return;
    }
    
    // Mark this match as finished (with 5 second TTL to prevent spam)
    await redis.setEx(matchFinishedKey, 5, "1");
    
    const opponentSock = await redis.hGet("online_users", opponent);
    
    if (opponentSock) {
      io.to(opponentSock).emit("matchEnd", { winner });
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
      
      // Remove from inGamePlayers if in a game and notify opponent
      const opponent = await redis.hGet("inGamePlayers", fieldToDelete);
      if (opponent) {
        // Handle both JSON format (matchmaking.js: {opp, roomId}) and plain string (matchmakingpong.js)
        let opponentName = opponent;
        try {
          const parsed = JSON.parse(opponent);
          opponentName = parsed.opp;
        } catch {
          // Plain string format — use as-is
        }
        const opponentSock = await redis.hGet("online_users", opponentName);
        if (opponentSock) {
          io.to(opponentSock).emit("forceDisconnect", { reason: "opponent_disconnected" });
        }
        if (opponentName) {
          await redis.hDel("inGamePlayers", fieldToDelete, opponentName);
        } else {
          await redis.hDel("inGamePlayers", fieldToDelete);
        }
      }
    }
    if (fieldToDelete)
      await redis.hDel("online_users", fieldToDelete);
    const users = await redis.hGetAll("online_users");
    console.log(users);
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
