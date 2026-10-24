# ⚡ PayQRIS Webhook Receiver

Server penerima (*receiver*) webhook open-source resmi dan siap pakai untuk ekosistem **[PayQRIS](https://payqris.id)**. Didesain sangat ringan, aman, dan dapat langsung di-deploy secara gratis ke **Vercel** hanya dalam 1 menit, atau dijalankan mandiri di Node.js / VPS / Docker.

Project ini dibuat agar developer, pemilik bot (Telegram, Discord, WhatsApp), maupun pemilik website tidak perlu membuat kode penerima webhook dari awal.

- 🌐 **Website Resmi:** [https://payqris.id](https://payqris.id)
- 📖 **Dokumentasi API & Webhook:** [https://payqris.id/docs#webhooks](https://payqris.id/docs#webhooks)
- 📊 **Dashboard Merchant:** [https://payqris.id/dashboard](https://payqris.id/dashboard)

---

## ✨ Fitur Utama

- 🔒 **Verifikasi HMAC-SHA256 Signature Otomatis**: Memverifikasi header `X-Signature` sesuai standar keamanan PayQRIS menggunakan `WEBHOOK_SECRET` Anda.
- 🚀 **Vercel Serverless Ready**: Tinggal deploy ke Vercel tanpa perlu konfigurasi server yang rumit.
- 💻 **Bisa Berjalan Mandiri (Standalone Node.js)**: Mendukung `npm start` untuk pengujian lokal (Localhost) maupun hosting di VPS/Docker/Railway.
- 🤖 **Integrasi Bot & Website Fleksibel**:
  - Tempat khusus di `handlers.js` untuk meletakkan logika aplikasi (tambah saldo user bot, update database order, aktivasi langganan).
  - Dilengkapi fitur opsional kirim notifikasi instan ke **Telegram Bot**.
  - Dilengkapi fitur opsional **Forward Webhook** (`FORWARD_URL`) untuk meneruskan webhook ke endpoint internal lainnya.
- 🛡️ **Kompatibel Penuh dengan PayQRIS**: Mendukung validasi HTTPS dan SSRF protection yang diwajibkan oleh server `https://payqris.id`.
- 📦 **Nol Dependensi Berat**: Hanya memerlukan Node.js bawaan (`crypto`, `http`, `fetch`).

---

## 📁 Struktur Project

```text
webhook/
├── api/
│   └── webhook.js      # Serverless function untuk Vercel (/api/webhook)
├── handlers.js         # Logika penanganan event & verifikasi signature
├── server.js           # Server standalone untuk lokal / VPS / Docker
├── vercel.json         # Konfigurasi routing Vercel
├── .env.example        # Template konfigurasi environment
├── package.json
├── test.js             # Skrip test otomatis verifikasi signature
└── README.md
```

---

## 🚀 Cara 1: Deploy ke Vercel (Paling Direkomendasikan)

1. **Upload / Push folder ini ke repository GitHub Anda.**
2. Buka dashboard [Vercel](https://vercel.com/) lalu klik **Add New Project**.
3. Import repository GitHub Anda.
4. Pada bagian **Environment Variables**, tambahkan:
   - `WEBHOOK_SECRET`: Secret webhook yang Anda dapatkan dari [Dashboard PayQRIS](https://payqris.id/dashboard) (Menu *Webhook Settings*).
   - *(Opsional)* `TELEGRAM_BOT_TOKEN`: Token bot Telegram Anda.
   - *(Opsional)* `TELEGRAM_CHAT_ID`: ID chat / channel Telegram untuk notifikasi.
   - *(Opsional)* `FORWARD_URL`: URL internal jika ingin webhook diteruskan.
5. Klik **Deploy**.
6. Selesai! URL webhook Anda akan aktif dengan format HTTPS:
   ```text
   https://project-anda.vercel.app/api/webhook
   ```
   *(atau cukup `https://project-anda.vercel.app` karena sudah di-rewrite di `vercel.json`).*

---

## 💻 Cara 2: Menjalankan di Lokal / VPS / Docker

1. **Clone repository dan masuk ke folder:**
   ```bash
   cd webhook
   ```

2. **Salin template konfigurasi:**
   ```bash
   cp .env.example .env
   ```

3. **Edit file `.env` dan masukkan secret Anda:**
   ```env
   WEBHOOK_SECRET=masukkan_webhook_secret_dari_payqris
   PORT=3000
   ```

4. **Jalankan server:**
   ```bash
   node server.js
   ```
   Server akan aktif di `http://localhost:3000/api/webhook`.

> **Catatan Penting untuk Pengujian Lokal:**  
> PayQRIS mewajibkan Callback URL menggunakan protokol **HTTPS** publik yang aman. Jika Anda menguji di localhost, gunakan tunnel seperti [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) atau [ngrok]:
> ```bash
> ngrok http 3000
> ```
> Salin URL `https://xxxx.ngrok-free.app/api/webhook` ke Dashboard PayQRIS.

---

## ⚙️ Cara Menghubungkan ke Dashboard PayQRIS

1. Masuk ke **[Dashboard Merchant PayQRIS](https://payqris.id/dashboard)**.
2. Masuk ke menu **Webhook Settings**.
3. Centang opsi **Aktifkan Webhook**.
4. Masukkan **Webhook URL** Anda:
   ```text
   https://project-anda.vercel.app/api/webhook
   ```
5. Simpan pengaturan, lalu salin **Webhook Secret** Anda.
6. Masukkan webhook secret tersebut ke Environment Variable (`WEBHOOK_SECRET`) di Vercel atau file `.env`.
7. Klik tombol **Kirim Tes Webhook** di Dashboard PayQRIS.
   - Jika berhasil, Dashboard PayQRIS akan menampilkan respon `HTTP 200` dan log status `TEST KONEKSI BERHASIL`.

---

## 🛠️ Menyesuaikan Logika Aplikasi (Custom Logic)

Buka file [`handlers.js`](./handlers.js). Anda dapat menambahkan kode untuk website atau bot Anda pada fungsi yang telah disediakan:

```javascript
// handlers.js

async function onPaymentPaid(data) {
  console.log(`Invoice ${data.invoice_id} lunas!`);

  // CONTOH 1: Update Database Website Anda (Prisma, MySQL, PostgreSQL, MongoDB, dsb)
  // await db.orders.update({
  //   where: { invoiceId: data.invoice_id },
  //   data: { status: 'PAID' }
  // });

  // CONTOH 2: Berikan produk/saldo ke pengguna Bot Telegram / Discord
  // await bot.telegram.sendMessage(userTelegramId, `Pembayaran ${formatRupiah(data.pay_amount)} berhasil! Saldo bertambah.`);
}
```

---

## 📋 Spesifikasi Payload Webhook PayQRIS

Sesuai dokumentasi resmi di [https://payqris.id/docs#webhooks](https://payqris.id/docs#webhooks):

### Headers yang Dikirimkan PayQRIS:
| Header | Keterangan |
| :--- | :--- |
| `Content-Type` | `application/json` |
| `X-Event` | Jenis event (`payment.paid`, `payment.pending`, `payment.failed`, `payment.expired`, `webhook.test`) |
| `X-Signature` | HMAC-SHA256 signature payload yang di-hash menggunakan `WEBHOOK_SECRET` Anda |

### Contoh Payload JSON (`payment.paid`):
```json
{
  "event": "payment.paid",
  "merchant_name": "Toko Anda",
  "invoice_id": "8a3f91c2b5d4e6f7",
  "reference_id": "QRIS-20261022-8A3F91",
  "merchant_reference_id": "ORDER-10023",
  "amount": 50000,
  "unique_code": 142,
  "pay_amount": 50142,
  "status": "paid",
  "created_at": "22/10/2026, 00.15.00 WIB",
  "paid_at": "22/10/2026, 00.16.20 WIB",
  "expired_at": "22/10/2026, 00.30.00 WIB"
}
```

---

## 🧪 Pengujian Sendiri

Untuk memastikan receiver Anda siap dan signature verification berjalan normal:
```bash
node test.js
```
Output:
```text
=== Testing PayQRIS Webhook Receiver ===
1. Valid Signature Test: PASSED (OK)
2. Invalid Signature Rejection Test: PASSED (OK)
3. Altered Payload Rejection Test: PASSED (OK)
4. Testing Event Dispatcher:
[PAYMENT PAID] Invoice INV-20261022-001 lunas sebesar Rp 50.321
5. Testing webhook.test Event:
[WEBHOOK TEST] Tes webhook berhasil diterima dari Toko Antigravity

>>> ALL TESTS PASSED SUCCESSFULLY! <<<
```

---

## 📄 Lisensi
Project ini berlisensi **MIT**. Bebas digunakan, dimodifikasi, dan didistribusikan untuk keperluan personal maupun komersial oleh merchant PayQRIS.
