/*
 * Nabta phone bridge.
 *
 * Terminates HTTPS on the local network and forwards to the plain HTTP dev
 * server on 127.0.0.1:3000. The point is getUserMedia: browsers refuse camera
 * access on a non secure origin, so http://192.168.x.x:3000 can display the
 * site on a phone but the verification loop, which is the whole product, will
 * not run. An HTTPS origin fixes that.
 *
 * Runs in front of the existing dev server rather than replacing it, because
 * two `next dev` processes share the .next directory and corrupt each other.
 * Desktop keeps using http://localhost:3000, the phone uses https://<lan ip>:3443.
 *
 * No dependencies. Node standard library only.
 */

const https = require("node:https");
const http = require("node:http");
const net = require("node:net");
const fs = require("node:fs");

const TARGET_HOST = "127.0.0.1";
const TARGET_PORT = Number(process.env.TARGET_PORT || 3000);
const LISTEN_PORT = Number(process.env.PHONE_PORT || 3443);
const KEY = process.env.CERT_KEY;
const CRT = process.env.CERT_CRT;

if (!KEY || !CRT) {
  console.error("CERT_KEY and CERT_CRT must be set.");
  process.exit(1);
}

/*
 * Next refuses or warns on dev requests whose Host looks foreign, and the HMR
 * socket is origin sensitive. Presenting every forwarded request as if it came
 * from 127.0.0.1:3000 keeps the dev server in its same origin path.
 */
function localiseHeaders(headers) {
  const out = { ...headers };
  out.host = `${TARGET_HOST}:${TARGET_PORT}`;
  if (out.origin) out.origin = `http://${TARGET_HOST}:${TARGET_PORT}`;
  if (out.referer) {
    out.referer = out.referer.replace(
      /^https?:\/\/[^/]+/,
      `http://${TARGET_HOST}:${TARGET_PORT}`,
    );
  }
  // We terminated TLS, the hop to the dev server is plaintext.
  delete out["upgrade-insecure-requests"];
  return out;
}

const server = https.createServer({
  key: fs.readFileSync(KEY),
  cert: fs.readFileSync(CRT),
});

server.on("request", (req, res) => {
  const upstream = http.request(
    {
      host: TARGET_HOST,
      port: TARGET_PORT,
      method: req.method,
      path: req.url,
      headers: localiseHeaders(req.headers),
    },
    (upRes) => {
      res.writeHead(upRes.statusCode || 502, upRes.headers);
      upRes.pipe(res);
    },
  );

  upstream.on("error", (err) => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end(
      "Nabta phone bridge could not reach the dev server on port " +
        TARGET_PORT +
        ".\n\n" +
        err.message +
        "\n\nStart it with: npm run dev\n",
    );
  });

  req.pipe(upstream);
});

/* Hot reload and any other websocket traffic. */
server.on("upgrade", (req, socket, head) => {
  socket.on("error", () => socket.destroy());

  const upstream = net.connect(TARGET_PORT, TARGET_HOST, () => {
    const headers = localiseHeaders(req.headers);
    const lines = Object.entries(headers).flatMap(([k, v]) =>
      Array.isArray(v) ? v.map((one) => `${k}: ${one}`) : [`${k}: ${v}`],
    );
    upstream.write(
      `${req.method} ${req.url} HTTP/1.1\r\n${lines.join("\r\n")}\r\n\r\n`,
    );
    if (head && head.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });

  upstream.on("error", () => socket.destroy());
});

server.on("clientError", (err, socket) => {
  if (socket.writable) socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

server.listen(LISTEN_PORT, "0.0.0.0", () => {
  console.log(`phone bridge listening on 0.0.0.0:${LISTEN_PORT}`);
});
