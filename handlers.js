"use strict";

const crypto = require("crypto");

/**
 * Memverifikasi validitas HMAC-SHA256 signature dari PayQRIS.
 * Memastikan payload benar-benar berasal dari server PayQRIS dan tidak dimanipulasi.
 */
function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;

  const content =
    typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);

  const calculated = crypto
    .createHmac("sha256", secret)
    .update(content)
    .digest("hex");

  try {
    const a = Buffer.from(calculated, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Format angka ke mata uang Rupiah (IDR)
 */
function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number || 0);
}

/**
 * Mengirim notifikasi transaksi ke Telegram Bot (opsional)
 */
async function sendTelegramNotification(data) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const eventName = data.event || "payment.status";
  const isPaid = eventName === "payment.paid" || data.status === "paid";
  const icon = isPaid ? "✅" : "ℹ️";

  const message = [
    `*${icon} [PayQRIS Webhook]*`,
    `━━━━━━━━━━━━━━━━━━`,
    `*Status:* \`${(data.status || eventName).toUpperCase()}\``,
    `*Invoice ID:* \`${data.invoice_id || "-"}\``,
    `*Ref ID:* \`${data.reference_id || "-"}\``,
    data.merchant_reference_id
      ? `*Merchant Ref:* \`${data.merchant_reference_id}\``
      : null,
    `*Total Bayar:* *${formatRupiah(data.pay_amount || data.amount)}*`,
    data.unique_code ? `*Kode Unik:* \`${data.unique_code}\`` : null,
    `*Merchant:* ${data.merchant_name || "-"}`,
    `*Waktu:* \`${data.paid_at || data.created_at || new Date().toISOString()}\``,
    `━━━━━━━━━━━━━━━━━━`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });
  } catch (err) {
    console.error("[Telegram Error]", err.message);
  }
}

/**
 * Meneruskan webhook ke backend / bot webhook lain (opsional)
 */
async function forwardWebhook(data, event, signature) {
  const forwardUrl = process.env.FORWARD_URL;
  if (!forwardUrl) return;

  try {
    const res = await fetch(forwardUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Event": event || "payment.status",
        "X-Signature": signature || "",
        "X-Forwarded-By": "PayQRIS-Webhook-Receiver",
      },
      body: JSON.stringify(data),
    });
    console.log(
      `[Forward Webhook] Dikirim ke ${forwardUrl} (Status: ${res.status})`,
    );
  } catch (err) {
    console.error(
      `[Forward Webhook Error] Gagal mengirim ke ${forwardUrl}:`,
      err.message,
    );
  }
}

/**
 * Handle ketika pembayaran SUKSES / LUNAS (payment.paid)
 * Tulis logika bisnis aplikasi Anda di sini (kirim saldo bot, aktivasi pesanan, update DB).
 */
async function onPaymentPaid(data) {
  console.log(
    `[PAYMENT PAID] Invoice ${data.invoice_id} lunas sebesar ${formatRupiah(data.pay_amount)}`,
  );

  // CONTOH INTEGRASI:
  // 1. Simpan ke Database Anda (Prisma, MongoDB, MySQL, dsb)
  //    await db.orders.update({ where: { invoiceId: data.invoice_id }, data: { status: 'PAID' } });
  //
  // 2. Berikan produk/saldo ke pengguna bot Anda (Telegram / Discord)
  //    await bot.telegram.sendMessage(userChatId, `Pembayaran berhasil diterima! Saldo Anda telah bertambah.`);

  await sendTelegramNotification(data);
}

/**
 * Handle ketika status pembayaran berubah menjadi PENDING / MENUNGGU PEMBAYARAN
 */
async function onPaymentPending(data) {
  console.log(
    `[PAYMENT PENDING] Invoice ${data.invoice_id} dibuat, menunggu pembayaran`,
  );
}

/**
 * Handle ketika invoice KEDALUWARSA (payment.expired)
 */
async function onPaymentExpired(data) {
  console.log(`[PAYMENT EXPIRED] Invoice ${data.invoice_id} telah kedaluwarsa`);
  // CONTOH:
  // await db.orders.update({ where: { invoiceId: data.invoice_id }, data: { status: 'EXPIRED' } });
}

/**
 * Handle ketika invoice GAGAL atau DIBATALKAN (payment.failed)
 */
async function onPaymentFailed(data) {
  console.log(`[PAYMENT FAILED] Invoice ${data.invoice_id} gagal diproses`);
}

/**
 * Handle tes koneksi webhook dari Dashboard PayQRIS (webhook.test)
 */
async function onWebhookTest(data) {
  console.log(
    `[WEBHOOK TEST] Tes webhook berhasil diterima dari ${data.merchant_name || "PayQRIS"}`,
  );
  await sendTelegramNotification({
    ...data,
    status: "TEST KONEKSI BERHASIL",
  });
}

/**
 * Dispatcher utama: memproses payload berdasarkan jenis event
 */
async function processWebhookEvent(payload, event, signature) {
  const currentEvent = (event || payload.event || "").toLowerCase();

  switch (currentEvent) {
    case "payment.paid":
      await onPaymentPaid(payload);
      break;
    case "payment.pending":
      await onPaymentPending(payload);
      break;
    case "payment.expired":
      await onPaymentExpired(payload);
      break;
    case "payment.failed":
    case "payment.cancelled":
      await onPaymentFailed(payload);
      break;
    case "webhook.test":
      await onWebhookTest(payload);
      break;
    default:
      console.log(`[EVENT LAIN] Menerima event: ${currentEvent}`, payload);
      break;
  }

  // Jika ada FORWARD_URL di konfigurasi, teruskan webhook tersebut
  if (process.env.FORWARD_URL) {
    await forwardWebhook(payload, currentEvent, signature);
  }
}

module.exports = {
  verifySignature,
  processWebhookEvent,
  sendTelegramNotification,
  forwardWebhook,
  formatRupiah,
};
