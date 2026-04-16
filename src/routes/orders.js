const express = require("express");
const rateLimit = require("express-rate-limit");
const Order = require("../models/Order");
const Product = require("../models/Product");
const PaymentSession = require("../models/PaymentSession");
const {
  sendOrderConfirmationEmail,
  sendAdminNotificationEmail,
} = require("../services/emailService");
const {
  hasPayOSConfig,
  createPaymentLinkForSession,
  getPaymentLink,
  verifyWebhookData,
  mapPayOSStatusToPaymentStatus,
} = require("../services/payosService");

const router = express.Router();

const orderRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many orders from this IP, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.ip ||
    req.connection.remoteAddress,
});

async function checkSpam(customerPhone, customerEmail) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [recentOrdersByPhone, recentSessionsByPhone] = await Promise.all([
    Order.countDocuments({
      customerPhone,
      createdAt: { $gte: oneHourAgo },
    }),
    PaymentSession.countDocuments({
      customerPhone,
      createdAt: { $gte: oneHourAgo },
    }),
  ]);

  if (recentOrdersByPhone + recentSessionsByPhone >= 3) {
    return {
      isSpam: true,
      reason: "Too many orders from this phone number. Please wait before ordering again.",
    };
  }

  const [recentOrdersByEmail, recentSessionsByEmail] = await Promise.all([
    Order.countDocuments({
      customerEmail,
      createdAt: { $gte: oneHourAgo },
    }),
    PaymentSession.countDocuments({
      customerEmail,
      createdAt: { $gte: oneHourAgo },
    }),
  ]);

  if (recentOrdersByEmail + recentSessionsByEmail >= 3) {
    return {
      isSpam: true,
      reason: "Too many orders from this email. Please wait before ordering again.",
    };
  }

  const suspiciousPatterns = [/leagueoflegend/i, /test@test/i, /spam@/i, /fake@/i, /asdf@/i];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(customerEmail)) {
      return { isSpam: true, reason: "Invalid email address" };
    }
  }

  return { isSpam: false };
}

async function sendCustomerConfirmationIfNeeded(order) {
  if (order.customerConfirmationEmailSentAt) {
    return false;
  }

  try {
    const sent = await Promise.race([
      sendOrderConfirmationEmail(order),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Email timeout")), 8000)),
    ]);

    if (sent) {
      order.customerConfirmationEmailSentAt = new Date();
      await order.save();
    }

    return sent;
  } catch (error) {
    console.error("Email send error:", error.message);
    return false;
  }
}

async function sendAdminNotificationSafely(order) {
  try {
    await Promise.race([
      sendAdminNotificationEmail(order),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Admin email timeout")), 8000)
      ),
    ]);
  } catch (error) {
    console.error("Admin email send error:", error.message);
  }
}

async function buildOrderItems(items) {
  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    if (product.status !== "active") {
      throw new Error(`Product not available: ${product.name}`);
    }

    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`);
    }

    subtotal += product.price * item.quantity;

    orderItems.push({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      imageUrl: product.imageUrl,
    });
  }

  return { orderItems, subtotal, total: subtotal };
}

function mapPaymentInfo(source) {
  return {
    status: source.paymentStatus,
    checkoutUrl: source.payos?.checkoutUrl || null,
    qrCode: source.payos?.qrCode || null,
    paymentLinkId: source.payos?.paymentLinkId || null,
    orderCode: source.payos?.orderCode || null,
  };
}

function getOrderResponse(order) {
  return {
    message: "Order created successfully",
    sessionId: null,
    orderId: order._id,
    order,
    payment: order.paymentMethod === "bank_transfer" ? mapPaymentInfo(order) : null,
  };
}

function getSessionResponse(session) {
  return {
    message: "Payment session created successfully",
    sessionId: session._id,
    orderId: null,
    order: null,
    payment: mapPaymentInfo(session),
  };
}

function updateSessionFromPaymentLink(session, paymentLink, webhookData) {
  const payosData = session.payos || {};
  const nextStatus = paymentLink?.status || payosData.status || "PENDING";

  session.payos = {
    ...payosData,
    orderCode: payosData.orderCode || paymentLink?.orderCode,
    paymentLinkId: paymentLink?.id || payosData.paymentLinkId,
    checkoutUrl: payosData.checkoutUrl,
    qrCode: payosData.qrCode,
    status: nextStatus,
    expiredAt:
      typeof paymentLink?.expiredAt === "number"
        ? paymentLink.expiredAt
        : payosData.expiredAt || null,
    amountPaid:
      typeof paymentLink?.amountPaid === "number"
        ? paymentLink.amountPaid
        : payosData.amountPaid || 0,
    paidAt: nextStatus === "PAID" ? payosData.paidAt || new Date() : payosData.paidAt || null,
    webhookReceivedAt: webhookData ? new Date() : payosData.webhookReceivedAt || null,
    lastWebhookCode: webhookData?.code || payosData.lastWebhookCode,
    lastWebhookDesc: webhookData?.desc || payosData.lastWebhookDesc,
  };

  session.paymentStatus = mapPayOSStatusToPaymentStatus(nextStatus);
}

async function createOrderFromPaidSession(session) {
  if (session.createdOrderId) {
    return Order.findById(session.createdOrderId);
  }

  const order = new Order({
    customerName: session.customerName,
    customerPhone: session.customerPhone,
    customerEmail: session.customerEmail,
    facebookLink: session.facebookLink,
    items: session.items,
    subtotal: session.subtotal,
    total: session.total,
    note: session.note,
    paymentMethod: "bank_transfer",
    paymentStatus: "paid",
    status: "pending",
    payos: session.payos,
  });

  await order.save();

  session.createdOrderId = order._id;
  session.orderCreatedAt = new Date();
  await session.save();

  await sendCustomerConfirmationIfNeeded(order);
  await sendAdminNotificationSafely(order);

  return order;
}

async function syncPaymentSessionStatus(session, webhookData) {
  if (!session?.payos?.orderCode || !hasPayOSConfig()) {
    return { session, order: null };
  }

  const paymentLink = await getPaymentLink(session.payos.orderCode);
  updateSessionFromPaymentLink(session, paymentLink, webhookData);
  await session.save();

  let order = null;
  if (session.paymentStatus === "paid") {
    order = await createOrderFromPaidSession(session);
  }

  return { session, order };
}

async function getPaymentSessionPayload(sessionId, syncPayment = false) {
  const session = await PaymentSession.findById(sessionId);
  if (!session) {
    return null;
  }

  let order = session.createdOrderId ? await Order.findById(session.createdOrderId) : null;

  if (syncPayment) {
    const synced = await syncPaymentSessionStatus(session);
    order = synced.order || order;
  }

  return {
    sessionId: session._id,
    paymentStatus: session.paymentStatus,
    orderId: session.createdOrderId || null,
    order,
    payment: mapPaymentInfo(session),
  };
}

function deriveManualPaymentStatus(status, total) {
  if (status === "cancelled") {
    return "cancelled";
  }

  if (["confirmed", "shipping", "completed"].includes(status) || total === 0) {
    return "paid";
  }

  return "unpaid";
}

router.post("/payos/webhook", async (req, res) => {
  try {
    const webhookData = await verifyWebhookData(req.body);
    const session = await PaymentSession.findOne({ "payos.orderCode": webhookData.orderCode });

    if (!session) {
      console.warn(`payOS session not found for orderCode ${webhookData.orderCode}`);
      return res.json({ error: 0, message: "ok" });
    }

    await syncPaymentSessionStatus(session, webhookData);
    res.json({ error: 0, message: "ok" });
  } catch (error) {
    console.error("Error processing payOS webhook:", error);
    res.status(400).json({ error: -1, message: error.message || "Webhook failed" });
  }
});

router.get("/payment-session/:id", async (req, res) => {
  try {
    const payload = await getPaymentSessionPayload(req.params.id, req.query.syncPayment === "true");
    if (!payload) {
      return res.status(404).json({ message: "Payment session not found" });
    }

    res.json(payload);
  } catch (error) {
    console.error("Error fetching payment session:", error);
    res.status(500).json({ message: "Failed to fetch payment session" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;

    const filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      items: orders,
      total,
      hasMore: Number(skip) + orders.length < total,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

async function createManualOrder(req, res) {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      facebookLink,
      note,
      total = 0,
      status = "completed",
      paymentMethod = "cod",
      orderDate,
    } = req.body || {};

    const normalizedName = String(customerName || "").trim();
    const normalizedPhone = String(customerPhone || "").trim();
    const normalizedEmail = String(customerEmail || "").trim().toLowerCase();
    const normalizedStatus = String(status || "completed").trim();
    const normalizedPaymentMethod = String(paymentMethod || "cod").trim();
    const numericTotal = Number(total ?? 0);

    if (!normalizedName || !normalizedPhone || !normalizedEmail) {
      return res.status(400).json({
        message: "Missing required fields: customerName, customerPhone, customerEmail",
      });
    }

    if (!Number.isFinite(numericTotal) || numericTotal < 0) {
      return res.status(400).json({ message: "Total must be a number greater than or equal to 0" });
    }

    if (!["pending", "confirmed", "shipping", "completed", "cancelled"].includes(normalizedStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (!["cod", "bank_transfer"].includes(normalizedPaymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    let manualOrderDate = null;
    if (orderDate) {
      manualOrderDate = new Date(orderDate);
      if (Number.isNaN(manualOrderDate.getTime())) {
        return res.status(400).json({ message: "Invalid order date" });
      }

      if (manualOrderDate > new Date()) {
        return res.status(400).json({ message: "Order date cannot be in the future" });
      }
    }

    const order = new Order({
      customerName: normalizedName,
      customerPhone: normalizedPhone,
      customerEmail: normalizedEmail,
      facebookLink: String(facebookLink || "").trim(),
      orderKind: "manual",
      items: [],
      subtotal: numericTotal,
      total: numericTotal,
      note: String(note || "").trim(),
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: deriveManualPaymentStatus(normalizedStatus, numericTotal),
      status: normalizedStatus,
      createdAt: manualOrderDate || undefined,
      updatedAt: manualOrderDate || undefined,
    });

    await order.save();

    res.status(201).json(getOrderResponse(order));
  } catch (error) {
    console.error("Error creating manual order:", error);
    res.status(400).json({ message: error.message || "Failed to create manual order" });
  }
}

router.post("/manual", createManualOrder);
router.post("/manual/customer", createManualOrder);

router.post("/", orderRateLimiter, async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      facebookLink,
      items,
      note,
      paymentMethod = "cod",
      _hp,
    } = req.body;

    const normalizedPaymentMethod = String(paymentMethod || "cod").trim();

    if (_hp) {
      console.log("[Spam] Honeypot triggered");
      return res.status(201).json({
        message: "Order created successfully",
        orderId: "fake-" + Date.now(),
      });
    }

    if (!customerName || !customerPhone || !customerEmail || !String(customerEmail).trim()) {
      return res.status(400).json({
        message: "Missing required fields: customerName, customerPhone, customerEmail",
      });
    }

    if (!["cod", "bank_transfer"].includes(normalizedPaymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    if (normalizedPaymentMethod === "bank_transfer" && !hasPayOSConfig()) {
      return res.status(500).json({ message: "payOS configuration is missing" });
    }

    const spamCheck = await checkSpam(
      customerPhone.trim(),
      customerEmail.trim().toLowerCase()
    );

    if (spamCheck.isSpam) {
      console.log(`[Spam] Blocked: ${spamCheck.reason} - ${customerPhone} / ${customerEmail}`);
      return res.status(429).json({ message: spamCheck.reason });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order must have at least one item" });
    }

    const { orderItems, subtotal, total } = await buildOrderItems(items);

    if (normalizedPaymentMethod === "bank_transfer") {
      const session = new PaymentSession({
        customerName,
        customerPhone,
        customerEmail,
        facebookLink,
        items: orderItems,
        subtotal,
        total,
        note,
        paymentMethod: "bank_transfer",
        paymentStatus: "pending",
      });

      const { orderCode, paymentLink } = await createPaymentLinkForSession(session);

      session.payos = {
        orderCode,
        paymentLinkId: paymentLink.paymentLinkId,
        checkoutUrl: paymentLink.checkoutUrl,
        qrCode: paymentLink.qrCode,
        status: paymentLink.status,
        expiredAt: paymentLink.expiredAt || null,
        amountPaid: 0,
      };
      session.paymentStatus = mapPayOSStatusToPaymentStatus(paymentLink.status);

      await session.save();
      return res.status(201).json(getSessionResponse(session));
    }

    const order = new Order({
      customerName,
      customerPhone,
      customerEmail,
      facebookLink,
      items: orderItems,
      subtotal,
      total,
      note,
      paymentMethod: "cod",
      paymentStatus: "unpaid",
      status: "pending",
    });

    await order.save();
    await sendCustomerConfirmationIfNeeded(order);
    await sendAdminNotificationSafely(order);

    res.status(201).json(getOrderResponse(order));
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(400).json({ message: error.message });
  }
});

const isStaged = (status) => ["confirmed", "shipping", "completed"].includes(status);

router.patch("/:id", async (req, res) => {
  try {
    const {
      status,
      note,
      customerName,
      customerPhone,
      customerEmail,
      facebookLink,
    } = req.body;
    console.log(
      `Updating order ${req.params.id}: status=${status}, customerName=${customerName}, customerPhone=${customerPhone}, customerEmail=${customerEmail}`
    );

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const oldStatus = order.status;
    const newStatus = status || oldStatus;
    const wasStaged = isStaged(oldStatus);
    const willBeStaged = isStaged(newStatus);

    if (!wasStaged && willBeStaged) {
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(400).json({ message: `Product not found: ${item.name}` });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${item.name}. Available: ${product.stock}`,
          });
        }
      }

      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity },
        });
      }
    } else if (wasStaged && !willBeStaged) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity },
        });
      }
    }

    if (status) order.status = status;
    if (note !== undefined) order.note = note;
    if (customerName !== undefined) order.customerName = String(customerName).trim();
    if (customerPhone !== undefined) order.customerPhone = String(customerPhone).trim();
    if (customerEmail !== undefined) {
      order.customerEmail = String(customerEmail).trim().toLowerCase();
    }
    if (facebookLink !== undefined) {
      order.facebookLink = String(facebookLink || "").trim();
    }

    await order.save();
    res.json(order);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(400).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (isStaged(order.status)) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity },
        });
      }
    }

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ message: "Failed to delete order" });
  }
});

router.delete("/bulk/spam", async (req, res) => {
  try {
    const { customerName, customerEmail, dryRun = false } = req.body;

    if (!customerName && !customerEmail) {
      return res.status(400).json({
        message: "Provide 'customerName' or 'customerEmail' pattern to match spam orders",
      });
    }

    const filter = { status: "pending" };

    if (customerName) {
      filter.customerName = { $regex: customerName, $options: "i" };
    }
    if (customerEmail) {
      filter.customerEmail = { $regex: customerEmail, $options: "i" };
    }

    const matchingOrders = await Order.find(filter);

    if (dryRun) {
      return res.json({
        message: `Dry run: Would delete ${matchingOrders.length} orders`,
        count: matchingOrders.length,
        sample: matchingOrders.slice(0, 5).map((order) => ({
          id: order._id,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
        })),
      });
    }

    const result = await Order.deleteMany(filter);

    res.json({
      message: `Deleted ${result.deletedCount} spam orders`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting spam orders:", error);
    res.status(500).json({ message: "Failed to delete spam orders" });
  }
});

module.exports = router;
