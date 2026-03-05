const nodemailer = require("nodemailer");

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });
};

/**
 * Send order confirmation email to customer
 * @param {Object} order - The order document
 * @returns {Promise<boolean>} - Whether email was sent successfully
 */
const sendOrderConfirmationEmail = async (order) => {
  // Debug logging
  console.log("=== EMAIL DEBUG ===");
  console.log("SMTP_HOST:", process.env.SMTP_HOST || "(not set)");
  console.log("SMTP_PORT:", process.env.SMTP_PORT || "(not set)");
  console.log("SMTP_USER:", process.env.SMTP_USER ? "✓ set" : "✗ not set");
  console.log("SMTP_PASS:", process.env.SMTP_PASS ? "✓ set" : "✗ not set");
  console.log("Customer email:", order.customerEmail || "(no email)");
  console.log("==================");

  // Skip if no email configured or customer has no email
  if (!process.env.SMTP_USER || !order.customerEmail) {
    console.log("Email not sent: Missing SMTP config or customer email");
    return false;
  }

  try {
    const transporter = createTransporter();
    
    console.log("Sending email to:", order.customerEmail);

    // Format order items for email
    const itemsList = order.items
      .map(
        (item) =>
          `• ${item.name} x${item.quantity} - ${item.price.toLocaleString("vi-VN")}đ`
      )
      .join("\n");

    const emailContent = {
      from: `"Bông Lém" <${process.env.SMTP_USER}>`,
      to: order.customerEmail,
      subject: `Xác nhận đơn hàng #${order._id} - Bông Lém`,
      html: `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin: 0; padding: 48px 0; background-color: #e5e7eb; font-family: 'Baloo 2', 'Segoe UI', Arial, sans-serif;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#e5e7eb">
            <tr>
              <td align="center">
                <table width="672" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width: 672px; width: 100%; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td align="center" bgcolor="#f8b4c4" style="padding: 24px 32px;">
                      <h1 style="margin: 0; font-size: 30px; font-weight: bold; color: #ffffff; line-height: 36px;">Bông Lém</h1>
                      <p style="margin: 4px 0 0 0; font-size: 18px; color: #ffffff; line-height: 28px;">Cảm ơn bạn đã đặt hàng!</p>
                    </td>
                  </tr>

                  <!-- Order ID Box -->
                  <tr>
                    <td style="padding: 24px 32px 0 32px;">
                      <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#fdf2f8" style="border-radius: 14px;">
                        <tr>
                          <td align="center" style="padding: 16px 24px;">
                            <p style="margin: 0; font-size: 14px; color: #4a5565; line-height: 20px;">Mã đơn hàng của bạn</p>
                            <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; color: #f8b4c4; line-height: 28px;">#${order._id}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Customer Information -->
                  <tr>
                    <td style="padding: 24px 32px 0 32px;">
                      <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #5c433b; line-height: 28px;">Thông tin khách hàng</h2>
                      <div style="border-bottom: 1px solid #e5e7eb; margin-bottom: 16px;"></div>
                      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 16px; color: #364153; line-height: 24px;">
                        <tr>
                          <td width="120" style="font-weight: bold; padding-bottom: 8px;">Họ tên:</td>
                          <td style="padding-bottom: 8px;">${order.customerName}</td>
                        </tr>
                        <tr>
                          <td style="font-weight: bold; padding-bottom: 8px;">Số điện thoại:</td>
                          <td style="padding-bottom: 8px;">${order.customerPhone}</td>
                        </tr>
                        ${order.customerEmail ? `
                        <tr>
                          <td style="font-weight: bold; padding-bottom: 8px;">Email:</td>
                          <td style="padding-bottom: 8px;"><a href="mailto:${order.customerEmail}" style="color: #2b7fff; text-decoration: none;">${order.customerEmail}</a></td>
                        </tr>
                        ` : ''}
                        <tr>
                          <td style="font-weight: bold;">Thanh toán:</td>
                          <td>${order.paymentMethod === 'cod' ? 'Tiền mặt khi nhận hàng' : 'Chuyển khoản ngân hàng'}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Order Details -->
                  <tr>
                    <td style="padding: 24px 32px 0 32px;">
                      <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #5c433b; line-height: 28px;">Chi tiết đơn hàng</h2>
                      <div style="border-bottom: 1px solid #e5e7eb; margin-bottom: 16px;"></div>
                      <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="border: 1px solid #e5e7eb; border-radius: 10px; font-size: 16px; color: #364153; line-height: 24px;">
                        ${order.items.map((item, index) => `
                        <tr>
                          <td style="padding: 12px 16px; ${index < order.items.length - 1 ? 'border-bottom: 1px solid #d1d5dc;' : ''}">${item.name}</td>
                          <td align="center" style="padding: 12px 8px; ${index < order.items.length - 1 ? 'border-bottom: 1px solid #d1d5dc;' : ''}">x${item.quantity}</td>
                          <td align="right" style="padding: 12px 16px; ${index < order.items.length - 1 ? 'border-bottom: 1px solid #d1d5dc;' : ''}">${(item.price * item.quantity).toLocaleString("vi-VN")}đ</td>
                        </tr>
                        `).join('')}
                      </table>
                    </td>
                  </tr>

                  <!-- Total -->
                  <tr>
                    <td style="padding: 16px 32px 0 32px;">
                      <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f8b4c4" style="border-radius: 14px;">
                        <tr>
                          <td align="right" style="padding: 12px 24px;">
                            <p style="margin: 0; font-size: 20px; font-weight: bold; color: #ffffff; line-height: 28px;">Tổng cộng: ${order.total.toLocaleString("vi-VN")}đ</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  ${order.note ? `
                  <!-- Notes -->
                  <tr>
                    <td style="padding: 24px 32px 0 32px;">
                      <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #5c433b; line-height: 28px;">Ghi chú</h2>
                      <div style="border-bottom: 1px solid #e5e7eb; margin-bottom: 16px;"></div>
                      <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="border: 1px solid #fce7f3; border-radius: 10px;">
                        <tr>
                          <td style="padding: 16px; font-size: 16px; color: #364153; line-height: 24px;">${order.note}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  ` : ''}

                  <!-- Delivery Address -->
                  <tr>
                    <td style="padding: 24px 32px 0 32px;">
                      <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#fdf2f8" style="border-radius: 14px;">
                        <tr>
                          <td align="center" style="padding: 16px 24px;">
                            <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1e2939; line-height: 24px;">Địa chỉ nhận hàng:</p>
                            <p style="margin: 8px 0 0 0; font-size: 16px; color: #4a5565; line-height: 24px;">${order.deliveryAddress || 'UEH Cơ sở B, 279 Nguyễn Tri Phương, Phường Điện Hồng, Quận 10, TP. Hồ Chí Minh'}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Confirmation Message -->
                  <tr>
                    <td align="center" style="padding: 24px 32px;">
                      <p style="margin: 0; font-size: 14px; font-style: italic; color: #4a5565; line-height: 20px;">Chúng mình sẽ liên hệ xác nhận đơn hàng trong thời gian sớm nhất! 💕</p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" bgcolor="#5c433b" style="padding: 24px 32px;">
                      <p style="margin: 0; font-size: 16px; color: #ffffff; line-height: 24px;">Bông Lém - Những món quà nhỏ mang niềm vui to</p>
                      <p style="margin: 8px 0 0 0; font-size: 16px; line-height: 24px;">
                        <a href="https://bonglem.vercel.app" style="color: #f8b4c4; text-decoration: none;">bonglem.vercel.app</a>
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
BÔNG LÉM - XÁC NHẬN ĐƠN HÀNG
============================

Mã đơn hàng: #${order._id}

THÔNG TIN KHÁCH HÀNG:
- Họ tên: ${order.customerName}
- Số điện thoại: ${order.customerPhone}
${order.customerEmail ? `- Email: ${order.customerEmail}` : ''}
- Thanh toán: ${order.paymentMethod === 'cod' ? 'Tiền mặt khi nhận hàng' : 'Chuyển khoản ngân hàng'}

CHI TIẾT ĐƠN HÀNG:
${itemsList}

TỔNG CỘNG: ${order.total.toLocaleString("vi-VN")}đ

${order.note ? `GHI CHÚ: ${order.note}` : ''}

ĐỊA CHỈ NHẬN HÀNG:
${order.deliveryAddress || 'UEH Cơ sở B, 279 Nguyễn Tri Phương, Phường Điện Hồng, Quận 10, TP. Hồ Chí Minh'}

Chúng mình sẽ liên hệ xác nhận đơn hàng trong thời gian sớm nhất!

---
Bông Lém - Những món quà nhỏ mang niềm vui to
https://bonglem.vercel.app
      `.trim(),
    };

    await transporter.sendMail(emailContent);
    console.log(`Order confirmation email sent to ${order.customerEmail}`);
    return true;
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
    return false;
  }
};

/**
 * Send notification email to admin about new order
 * @param {Object} order - The order document
 * @returns {Promise<boolean>} - Whether email was sent successfully
 */
const sendAdminNotificationEmail = async (order) => {
  if (!process.env.SMTP_USER || !process.env.ADMIN_EMAIL) {
    return false;
  }

  try {
    const transporter = createTransporter();

    const itemsList = order.items
      .map((item) => `• ${item.name} x${item.quantity}`)
      .join("\n");

    await transporter.sendMail({
      from: `"Bông Lém System" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `🔔 Đơn hàng mới #${order._id} - ${order.customerName}`,
      text: `
ĐƠN HÀNG MỚI!

Mã đơn: #${order._id}
Khách hàng: ${order.customerName}
SĐT: ${order.customerPhone}
Email: ${order.customerEmail || 'Không có'}
Facebook: ${order.facebookLink || 'Không có'}

Sản phẩm:
${itemsList}

Tổng: ${order.total.toLocaleString("vi-VN")}đ
Thanh toán: ${order.paymentMethod === 'cod' ? 'COD' : 'Chuyển khoản'}

${order.note ? `Ghi chú: ${order.note}` : ''}
      `.trim(),
    });

    console.log("Admin notification email sent");
    return true;
  } catch (error) {
    console.error("Failed to send admin notification:", error);
    return false;
  }
};

module.exports = {
  sendOrderConfirmationEmail,
  sendAdminNotificationEmail,
};
