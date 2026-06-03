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

app.prepare().then(() => {
  const httpsServer = https.createServer(httpsOptions, (req, res) => {
    handle(req, res, parse(req.url, true));
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
