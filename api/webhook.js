"use strict";

const { verifySignature, processWebhookEvent } = require("../handlers");

/**
 * Vercel Serverless Function Handler
 */
module.exports = async function handler(req, res) {
  // CORS & Security Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Signature, X-Event",
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Tampilan informasi ketika webhook URL dibuka via browser (GET)
  if (req.method === "GET") {
    return res.status(200).json({
      name: "PayQRIS Webhook Receiver",
      status: "online",
      description: "Server siap menerima webhook transaksi PayQRIS via POST.",
      configured: Boolean(process.env.WEBHOOK_SECRET),
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method Not Allowed. Gunakan POST untuk menerima webhook.",
    });
  }

  try {
    const signature =
      req.headers["x-signature"] || req.headers["X-Signature"] || "";
    const event = req.headers["x-event"] || req.headers["X-Event"] || "";
    const secret = process.env.WEBHOOK_SECRET || "";

    if (!secret) {
      console.error(
        "[Config Error] WEBHOOK_SECRET belum dikonfigurasi di Environment Variables!",
      );
      return res.status(500).json({
        success: false,
        error: "Server belum mengatur WEBHOOK_SECRET di environment variables",
      });
    }

    // Ambil payload body
    let payload = req.body;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        return res.status(400).json({
          success: false,
          error: "Body harus berupa format JSON valid",
        });
      }
    }

    if (!payload || typeof payload !== "object") {
      return res.status(400).json({
        success: false,
        error: "Payload kosong atau tidak valid",
      });
    }

    // Verifikasi HMAC-SHA256 signature
    const isValid = verifySignature(payload, signature, secret);
    if (!isValid) {
      console.warn(
        `[Security Warning] Signature tidak valid untuk event: ${event}`,
      );
      return res.status(401).json({
        success: false,
        error: "Signature tidak valid. Permintaan ditolak.",
      });
    }

    // Proses event webhook (bisnis logic, bot, DB, forwarder)
    await processWebhookEvent(payload, event, signature);

    return res.status(200).json({
      success: true,
      message: "Webhook diterima dan berhasil diproses",
      invoice_id: payload.invoice_id || null,
      event: event || payload.event,
    });
  } catch (err) {
    console.error("[Webhook Error]", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Terjadi kesalahan internal pada receiver",
    });
  }
};
