"use client";

import { io } from "socket.io-client";

const url = process.env.NEXT_PUBLIC_SOCKET || (typeof window !== "undefined" ? window.location.origin : "https://localhost:3443");

export const socket = io(url.trim(), {
  autoConnect: false,
  reconnection: true,
});

let currentUser = null;

export function ensureLoggedIn(user) {
  currentUser = user;
  if (socket.connected) {
    socket.emit("login", user);
    return Promise.resolve();
  }
  // If not connected, the module-level connect handler will emit login
  // Return a promise that resolves when the socket connects
  return new Promise((resolve) => {
    socket.once("connect", () => resolve());
    socket.connect();
  });
}

export function clearCurrentUser() {
  currentUser = null;
}

// Re-emit login on reconnection (socket ID changes server-side)
socket.on("connect", () => {
  if (currentUser) {
    socket.emit("login", currentUser);
  }
});
