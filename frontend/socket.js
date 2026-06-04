"use client";

import { io } from "socket.io-client";

//connects the socket to the server and sets some options

const url = process.env.NEXT_PUBLIC_SOCKET ?? "wss://localhost:4001";

export const socket = io(url.trim(), {
  autoConnect: false,
  reconnection: true,
});