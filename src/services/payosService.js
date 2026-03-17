const { PayOS } = require("@payos/node");

const PAYMENT_LINK_STATUSES = [
  "PENDING",
  "CANCELLED",
  "UNDERPAID",
  "PAID",
  "EXPIRED",
  "PROCESSING",
  "FAILED",
];

let payosClient;

function hasPayOSConfig() {
  return Boolean(
    process.env.PAYOS_CLIENT_ID &&
      process.env.PAYOS_API_KEY &&
      process.env.PAYOS_CHECKSUM_KEY
  );
}

function getPayOSClient() {
  if (!hasPayOSConfig()) {
    throw new Error("Missing payOS configuration");
  }

  if (!payosClient) {
    payosClient = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY,
      timeout: 15000,
      maxRetries: 1,
    });
  }

  return payosClient;
}

function getFrontendBaseUrl() {
  return (
    process.env.FRONTEND_URL ||
    process.env.CORS_ORIGIN ||
    "http://localhost:5173"
  );
}

function buildFrontendCheckoutUrl(sessionId, paymentState) {
  const url = new URL(getFrontendBaseUrl());
  url.searchParams.set("page", "checkout");
  url.searchParams.set("sessionId", String(sessionId));
  url.searchParams.set("payos", paymentState);
  return url.toString();
}

function buildPaymentDescription(referenceId) {
  return `BONGLEM-${String(referenceId).slice(-8)}`.slice(0, 25);
}

function generateOrderCode() {
  return Number(`${Date.now()}${Math.floor(Math.random() * 90 + 10)}`);
}

function sanitizeItems(entity) {
  return entity.items.map((item) => ({
    name: String(item.name || "San pham").slice(0, 80),
    quantity: item.quantity,
    price: item.price,
  }));
}

async function createPaymentLinkForSession(session) {
  const payos = getPayOSClient();
  const orderCode = generateOrderCode();

  const paymentLink = await payos.paymentRequests.create({
    orderCode,
    amount: Math.round(session.total),
    description: buildPaymentDescription(session._id),
    returnUrl: buildFrontendCheckoutUrl(session._id, "return"),
    cancelUrl: buildFrontendCheckoutUrl(session._id, "cancelled"),
    buyerName: session.customerName,
    buyerEmail: session.customerEmail,
    buyerPhone: session.customerPhone,
    items: sanitizeItems(session),
  });

  return {
    orderCode,
    paymentLink,
  };
}

async function getPaymentLink(orderCode) {
  const payos = getPayOSClient();
  return payos.paymentRequests.get(orderCode);
}

async function verifyWebhookData(payload) {
  const payos = getPayOSClient();
  return payos.webhooks.verify(payload);
}

async function confirmWebhookUrl() {
  if (!process.env.PAYOS_WEBHOOK_URL) {
    return null;
  }

  const payos = getPayOSClient();
  return payos.webhooks.confirm(process.env.PAYOS_WEBHOOK_URL);
}

function mapPayOSStatusToPaymentStatus(status) {
  switch (status) {
    case "PAID":
      return "paid";
    case "CANCELLED":
      return "cancelled";
    case "EXPIRED":
      return "expired";
    case "FAILED":
      return "failed";
    default:
      return "pending";
  }
}

module.exports = {
  PAYMENT_LINK_STATUSES,
  hasPayOSConfig,
  getPayOSClient,
  createPaymentLinkForSession,
  getPaymentLink,
  verifyWebhookData,
  confirmWebhookUrl,
  mapPayOSStatusToPaymentStatus,
};
