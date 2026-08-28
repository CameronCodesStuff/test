// Pulse — simple static file server for self-hosting
// Run: node server.js
// Then open: http://localhost:3000  (or your PC's local IP on port 3000)

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DIR = __dirname;

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/" || urlPath === "") urlPath = "/index.html";

  const filePath = path.join(DIR, urlPath);

  // Security: don't serve files outside the project dir
  if (!filePath.startsWith(DIR)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA fallback — serve index.html for unknown routes
      const index = path.join(DIR, "index.html");
      res.writeHead(200, { "Content-Type": "text/html" });
      fs.createReadStream(index).pipe(res);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  const { networkInterfaces } = require("os");
  const nets = networkInterfaces();
  let localIp = "localhost";
  for (const n of Object.values(nets).flat()) {
    if (n.family === "IPv4" && !n.internal) { localIp = n.address; break; }
  }

  console.log("\n🚀  Pulse is running!\n");
  console.log(`  Local:    http://localhost:${PORT}`);
  console.log(`  Network:  http://${localIp}:${PORT}  ← share this with people on your network\n`);
  console.log("  Press Ctrl+C to stop.\n");
});
