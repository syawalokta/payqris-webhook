"use strict";

require("dotenv").config();
const http = require("http");
const handler = require("./api/webhook");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  let rawBody = "";

  req.on("data", (chunk) => {
    rawBody += chunk;
  });

  req.on("end", async () => {
    let parsedBody = {};
    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        parsedBody = rawBody;
      }
    }

    req.body = parsedBody;

    // Tambahkan helper express/vercel-like res.status().json()
    res.status = function (code) {
      res.statusCode = code;
      return res;
    };

    res.json = function (data) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
      return res;
    };

    try {
      await handler(req, res);
    } catch (err) {
      console.error("[Server Error]", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({ success: false, error: "Internal Server Error" }),
      );
    }
  });
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  PayQRIS Webhook Receiver Server Berjalan!`);
  console.log(`  Port: http://localhost:${PORT}`);
  console.log(`  Endpoint Webhook: http://localhost:${PORT}/api/webhook`);
  console.log(
    `  WEBHOOK_SECRET: ${process.env.WEBHOOK_SECRET ? "Terpasang (OK)" : "BELUM DIATUR (!)"}`,
  );
  console.log(`===============================================`);
});
