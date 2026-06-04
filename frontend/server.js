import https from "https";
import http from "http";
import fs from "fs";
import { parse } from "url";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, dir: "." });
const handle = app.getRequestHandler();
const hostname = "0.0.0.0";
const httpsPort = Number(process.env.HTTPS_PORT || 3443);
const httpPort = Number(process.env.PORT || 3000);
const certPath = process.env.CERT_PATH || "./certs";

const httpsOptions = {
  key: fs.readFileSync(`${certPath}/key.pem`),
  cert: fs.readFileSync(`${certPath}/cert.pem`),
};

const WS_TARGET = {
  hostname: process.env.WS_TARGET_HOST || "obelisk-websockets",
  port: Number(process.env.WS_TARGET_PORT || 4001),
};

function proxyToBackend(req, res) {
  const proxyReq = https.request(
    {
      hostname: WS_TARGET.hostname,
      port: WS_TARGET.port,
      path: req.url,
      method: req.method,
      rejectUnauthorized: false,
      headers: {
        ...req.headers,
        "x-forwarded-for": req.socket.remoteAddress,
        "x-forwarded-proto": "https",
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", (err) => {
    console.error("[Proxy] HTTP error:", err.message);
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "text/plain" });
    }
    res.end("Bad Gateway");
  });

  req.pipe(proxyReq);
}

function proxyWsUpgrade(req, socket, head) {
  const proxyReq = https.request({
    hostname: WS_TARGET.hostname,
    port: WS_TARGET.port,
    path: req.url,
    method: "GET",
    rejectUnauthorized: false,
    headers: req.headers,
  });

  proxyReq.on("upgrade", (_proxyRes, proxySocket) => {
    if (head && head.length > 0) {
      proxySocket.write(head);
    }
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
    proxySocket.on("error", () => socket.destroy());
    socket.on("error", () => proxySocket.destroy());
  });

  proxyReq.on("error", (err) => {
    console.error("[Proxy] WebSocket error:", err.message);
    socket.destroy();
  });

  proxyReq.end();
}

app.prepare().then(() => {
  const httpsServer = https.createServer(httpsOptions, (req, res) => {
    if (req.url.startsWith("/socket.io/")) {
      return proxyToBackend(req, res);
    }
    handle(req, res, parse(req.url, true));
  });

  httpsServer.on("upgrade", (req, socket, head) => {
    if (req.url.startsWith("/socket.io/")) {
      return proxyWsUpgrade(req, socket, head);
    }
    socket.destroy();
  });

  httpsServer.listen(httpsPort, hostname, () => {
    console.log(`> HTTPS ready on https://${hostname}:${httpsPort}`);
  });

  const httpServer = http.createServer((req, res) => {
    const host = req.headers.host?.split(":")[0] || "localhost";
    res.writeHead(301, {
      Location: `https://${host}:${httpsPort}${req.url}`,
    });
    res.end();
  });

  httpServer.listen(httpPort, hostname, () => {
    console.log(`> Redirecting http://${hostname}:${httpPort} to https://${hostname}:${httpsPort}`);
  });
});
