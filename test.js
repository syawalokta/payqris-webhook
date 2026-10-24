"use strict";

const crypto = require("crypto");
const { verifySignature, processWebhookEvent } = require("./handlers");

async function runTests() {
  console.log("=== Testing PayQRIS Webhook Receiver ===");

  const secret = "test_secret_key_123456";
  const payload = {
    event: "payment.paid",
    merchant_name: "Toko Antigravity",
    invoice_id: "INV-20261022-001",
    reference_id: "QRIS-20261022-ABCD1234",
    merchant_reference_id: "ORDER-9999",
    amount: 50000,
    unique_code: 321,
    pay_amount: 50321,
    status: "paid",
    created_at: new Date().toISOString(),
    paid_at: new Date().toISOString(),
    expired_at: new Date(Date.now() + 900000).toISOString(),
  };

  // Generate valid signature as sent by PayQRIS backend
  const validSignature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");

  // 1. Test signature verification success
  const isMatch = verifySignature(payload, validSignature, secret);
  console.log("1. Valid Signature Test:", isMatch ? "PASSED (OK)" : "FAILED");
  if (!isMatch) throw new Error("Signature verification should have passed");

  // 2. Test invalid signature rejection
  const isRejected = verifySignature(payload, "invalid_signature_hex", secret);
  console.log(
    "2. Invalid Signature Rejection Test:",
    !isRejected ? "PASSED (OK)" : "FAILED",
  );
  if (isRejected)
    throw new Error("Invalid signature should have been rejected");

  // 3. Test altered payload rejection
  const alteredPayload = { ...payload, amount: 1000 };
  const isAlteredRejected = verifySignature(
    alteredPayload,
    validSignature,
    secret,
  );
  console.log(
    "3. Altered Payload Rejection Test:",
    !isAlteredRejected ? "PASSED (OK)" : "FAILED",
  );
  if (isAlteredRejected)
    throw new Error("Altered payload should have been rejected");

  // 4. Test event dispatcher
  console.log("4. Testing Event Dispatcher:");
  await processWebhookEvent(payload, "payment.paid", validSignature);

  // 5. Test webhook test event
  console.log("5. Testing webhook.test Event:");
  await processWebhookEvent(
    {
      event: "webhook.test",
      merchant_name: "Toko Antigravity",
      invoice_id: "TEST-WEBHOOK",
      status: "test",
    },
    "webhook.test",
    validSignature,
  );

  console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<");
}

runTests().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
