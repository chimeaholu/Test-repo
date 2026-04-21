const http = require("http");
const next = require("next");

const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    console.log(`[request] ${req.method} ${req.url}`);

    if (req.url === "/healthz") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
      return;
    }

    handle(req, res);
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`> Custom server ready on http://0.0.0.0:${port}`);
  });
});
