/**
 * Email Utility - Resend Integration
 *
 * Handles sending emails via Resend API.
 * Used for magic link authentication, notifications, etc.
 */

import { Resend } from 'resend';

// Email configuration
// Use environment variable for from email, fallback to Resend's test domain for development
const FROM_EMAIL = process.env.FROM_EMAIL || 'NO3D Tools <onboarding@resend.dev>';
const SITE_URL = process.env.SITE_URL || 'https://no3dtools.com';

/**
 * Get Resend client instance (lazy initialization)
 * @returns {Resend} Resend client
 */
function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

/**
 * Generate HTML for magic link email
 * @param {string} email - Recipient email
 * @param {string} token - Magic link token
 * @returns {string} HTML email content
 */
export function getMagicLinkEmail(email, token) {
  const magicLink = `${SITE_URL}/account?token=${token}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to NO3D Tools</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border: 2px solid #000;
      padding: 40px;
      margin: 20px 0;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-family: monospace;
      font-size: 24px;
      font-weight: bold;
      text-transform: uppercase;
      color: #000;
      letter-spacing: 2px;
    }
    .button {
      display: inline-block;
      background-color: #f0ff00;
      color: #000;
      text-decoration: none;
      padding: 16px 32px;
      border: 2px solid #000;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 20px 0;
      text-align: center;
    }
    .button:hover {
      background-color: #e0ef00;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
    .alt-link {
      margin-top: 20px;
      padding: 15px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      word-break: break-all;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NO3D TOOLS</div>
    </div>

    <h1 style="font-size: 24px; margin-bottom: 20px;">Sign in to your account</h1>

    <p>Click the button below to sign in to your NO3D Tools account. This link will expire in 15 minutes.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${magicLink}" class="button">Sign In</a>
    </div>

    <p style="margin-top: 30px; font-size: 14px;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>

    <div class="alt-link">
      ${magicLink}
    </div>

    <div class="footer">
      <p>You received this email because someone requested a sign-in link for your NO3D Tools account.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>&copy; 2025 NO3D Tools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version of magic link email
 * @param {string} email - Recipient email
 * @param {string} token - Magic link token
 * @returns {string} Plain text email content
 */
export function getMagicLinkEmailText(email, token) {
  const magicLink = `${SITE_URL}/account?token=${token}`;

  return `
NO3D TOOLS

Sign in to your account

Click the link below to sign in to your NO3D Tools account. This link will expire in 15 minutes.

${magicLink}

If you didn't request this, you can safely ignore this email.

© 2025 NO3D Tools. All rights reserved.
  `.trim();
}

/**
 * Send magic link email
 * @param {string} email - Recipient email address
 * @param {string} token - Magic link token
 * @returns {Promise<object>} Resend response
 */
export async function sendMagicLinkEmail(email, token) {
  try {
    const resend = getResendClient();
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Sign in to NO3D Tools',
      html: getMagicLinkEmail(email, token),
      text: getMagicLinkEmailText(email, token),
    });

    console.log(`📧 Magic link email sent to ${email}`);
    return response;
  } catch (error) {
    console.error('Error sending magic link email:', error);
    throw error;
  }
}

/**
 * Send a generic email
 * @param {object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 * @returns {Promise<object>} Resend response
 */
export async function sendEmail({ to, subject, html, text }) {
  try {
    const resend = getResendClient();
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for fallback text
    });

    console.log(`📧 Email sent to ${to}: ${subject}`);
    return response;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Generate HTML for order confirmation email
 * @param {string} customerName - Customer name
 * @param {object} orderDetails - Order details
 * @returns {object} Email content
 */
export function getOrderConfirmationEmail(customerName, orderDetails) {
  const {
    orderId,
    productNames = [],
    totalAmount,
    orderDate,
  } = orderDetails;

  const productList = productNames.map(name => `<li>${name}</li>`).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - NO3D Tools</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border: 2px solid #000;
      padding: 40px;
      margin: 20px 0;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-family: monospace;
      font-size: 24px;
      font-weight: bold;
      text-transform: uppercase;
      color: #000;
      letter-spacing: 2px;
    }
    .order-id {
      background: #f0ff00;
      color: #000;
      padding: 8px 16px;
      border: 2px solid #000;
      display: inline-block;
      font-family: monospace;
      font-weight: bold;
      margin: 20px 0;
    }
    .product-list {
      background: #f5f5f5;
      border: 1px solid #ddd;
      padding: 20px;
      margin: 20px 0;
    }
    .product-list ul {
      margin: 0;
      padding-left: 20px;
    }
    .product-list li {
      margin: 8px 0;
    }
    .total {
      font-size: 20px;
      font-weight: bold;
      margin: 20px 0;
      text-align: right;
    }
    .button {
      display: inline-block;
      background-color: #f0ff00;
      color: #000;
      text-decoration: none;
      padding: 16px 32px;
      border: 2px solid #000;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NO3D TOOLS</div>
    </div>

    <h1 style="font-size: 24px; margin-bottom: 20px;">Order Confirmed!</h1>

    <p>Thank you for your purchase, ${customerName}! Your order has been confirmed and is ready for download.</p>

    <div class="order-id">Order #${orderId}</div>

    <div class="product-list">
      <h3 style="margin-top: 0;">Your Products:</h3>
      <ul>
        ${productList}
      </ul>
    </div>

    <div class="total">
      Total: ${totalAmount}
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${SITE_URL}/account" class="button">Access Your Account</a>
    </div>

    <p style="margin-top: 30px; font-size: 14px;">
      You can download your products anytime from your account page.
    </p>

    <div class="footer">
      <p>Need help? Contact us at support@no3dtools.com</p>
      <p>&copy; 2025 NO3D Tools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
NO3D TOOLS

Order Confirmed!

Thank you for your purchase, ${customerName}! Your order has been confirmed and is ready for download.

Order #${orderId}

Your Products:
${productNames.map(name => `- ${name}`).join('\n')}

Total: ${totalAmount}

Access your account: ${SITE_URL}/account

You can download your products anytime from your account page.

Need help? Contact us at support@no3dtools.com

© 2025 NO3D Tools. All rights reserved.
  `.trim();

  return {
    subject: 'Your NO3D Tools Order Confirmation',
    html,
    text,
  };
}

/**
 * Generate HTML for subscription canceled email
 * @param {string} customerName - Customer name
 * @param {object} subscriptionDetails - Subscription details
 * @returns {object} Email content
 */
export function getSubscriptionCanceledEmail(customerName, subscriptionDetails) {
  const {
    subscriptionId,
    planName,
    endDate,
  } = subscriptionDetails;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Cancellation Confirmed - NO3D Tools</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border: 2px solid #000;
      padding: 40px;
      margin: 20px 0;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-family: monospace;
      font-size: 24px;
      font-weight: bold;
      text-transform: uppercase;
      color: #000;
      letter-spacing: 2px;
    }
    .info-box {
      background: #f5f5f5;
      border: 1px solid #ddd;
      padding: 20px;
      margin: 20px 0;
    }
    .info-box strong {
      display: block;
      margin-bottom: 8px;
    }
    .button {
      display: inline-block;
      background-color: #f0ff00;
      color: #000;
      text-decoration: none;
      padding: 16px 32px;
      border: 2px solid #000;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NO3D TOOLS</div>
    </div>

    <h1 style="font-size: 24px; margin-bottom: 20px;">Subscription Cancellation Confirmed</h1>

    <p>Hi ${customerName},</p>

    <p>We've received your request to cancel your subscription. Your cancellation has been confirmed.</p>

    <div class="info-box">
      <strong>Plan:</strong> ${planName}
      <strong>Subscription ID:</strong> ${subscriptionId}
      <strong>Access until:</strong> ${endDate}
    </div>

    <p><strong>What happens next?</strong></p>
    <ul>
      <li>You'll continue to have full access until ${endDate}</li>
      <li>You won't be charged again</li>
      <li>You can resubscribe anytime</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${SITE_URL}/account" class="button">View Account</a>
    </div>

    <p style="margin-top: 30px; font-size: 14px;">
      We're sorry to see you go! If you change your mind, you can resubscribe anytime from your account page.
    </p>

    <div class="footer">
      <p>Have feedback? We'd love to hear from you at support@no3dtools.com</p>
      <p>&copy; 2025 NO3D Tools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
NO3D TOOLS

Subscription Cancellation Confirmed

Hi ${customerName},

We've received your request to cancel your subscription. Your cancellation has been confirmed.

Plan: ${planName}
Subscription ID: ${subscriptionId}
Access until: ${endDate}

What happens next?
- You'll continue to have full access until ${endDate}
- You won't be charged again
- You can resubscribe anytime

View your account: ${SITE_URL}/account

We're sorry to see you go! If you change your mind, you can resubscribe anytime from your account page.

Have feedback? We'd love to hear from you at support@no3dtools.com

© 2025 NO3D Tools. All rights reserved.
  `.trim();

  return {
    subject: 'Subscription Cancellation Confirmed - NO3D Tools',
    html,
    text,
  };
}

/**
 * Generate HTML for subscription renewal reminder email
 * @param {string} customerName - Customer name
 * @param {object} renewalDetails - Renewal details
 * @returns {object} Email content
 */
export function getSubscriptionRenewalEmail(customerName, renewalDetails) {
  const {
    planName,
    renewalDate,
    amount,
  } = renewalDetails;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Renewal Reminder - NO3D Tools</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border: 2px solid #000;
      padding: 40px;
      margin: 20px 0;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-family: monospace;
      font-size: 24px;
      font-weight: bold;
      text-transform: uppercase;
      color: #000;
      letter-spacing: 2px;
    }
    .highlight-box {
      background: #f0ff00;
      border: 2px solid #000;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }
    .highlight-box .amount {
      font-size: 28px;
      font-weight: bold;
      margin: 10px 0;
    }
    .button {
      display: inline-block;
      background-color: #f0ff00;
      color: #000;
      text-decoration: none;
      padding: 16px 32px;
      border: 2px solid #000;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NO3D TOOLS</div>
    </div>

    <h1 style="font-size: 24px; margin-bottom: 20px;">Subscription Renewal Reminder</h1>

    <p>Hi ${customerName},</p>

    <p>This is a friendly reminder that your ${planName} subscription will renew soon.</p>

    <div class="highlight-box">
      <strong>Renewal Date:</strong>
      <div style="font-size: 20px; margin: 10px 0;">${renewalDate}</div>
      <strong>Amount:</strong>
      <div class="amount">${amount}</div>
    </div>

    <p><strong>What you'll continue to enjoy:</strong></p>
    <ul>
      <li>Full access to NO3D Tools library</li>
      <li>All new products and updates</li>
      <li>Premium support</li>
      <li>Member-only features</li>
    </ul>

    <p>Your payment method will be automatically charged on the renewal date.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${SITE_URL}/account" class="button">Manage Subscription</a>
    </div>

    <p style="margin-top: 30px; font-size: 14px;">
      If you'd like to cancel or update your subscription, you can do so anytime from your account page.
    </p>

    <div class="footer">
      <p>Questions? Contact us at support@no3dtools.com</p>
      <p>&copy; 2025 NO3D Tools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
NO3D TOOLS

Subscription Renewal Reminder

Hi ${customerName},

This is a friendly reminder that your ${planName} subscription will renew soon.

Renewal Date: ${renewalDate}
Amount: ${amount}

What you'll continue to enjoy:
- Full access to NO3D Tools library
- All new products and updates
- Premium support
- Member-only features

Your payment method will be automatically charged on the renewal date.

Manage your subscription: ${SITE_URL}/account

If you'd like to cancel or update your subscription, you can do so anytime from your account page.

Questions? Contact us at support@no3dtools.com

© 2025 NO3D Tools. All rights reserved.
  `.trim();

  return {
    subject: 'Subscription Renewal Reminder - NO3D Tools',
    html,
    text,
  };
}

/**
 * Generate HTML for Welcome & Account Setup email
 */
export function getWelcomeEmail(customerName, token) {
  const setupLink = `${SITE_URL}/account?token=${token}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to NO3D Tools</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border: 2px solid #000;
      padding: 40px;
      margin: 20px 0;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-family: monospace;
      font-size: 24px;
      font-weight: bold;
      text-transform: uppercase;
      color: #000;
      letter-spacing: 2px;
    }
    .button {
      display: inline-block;
      background-color: #f0ff00;
      color: #000;
      text-decoration: none;
      padding: 16px 32px;
      border: 2px solid #000;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NO3D TOOLS</div>
    </div>

    <h1 style="font-size: 24px; margin-bottom: 20px;">Welcome, ${customerName}!</h1>

    <p>Thank you for joining NO3D Tools. We've secured your purchased assets in your new digital library.</p>
    
    <p>Use the button below to access your account instantly and set a password for permanent access.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${setupLink}" class="button">Claim Your Assets</a>
    </div>

    <p style="margin-top: 30px; font-size: 14px;">
      <strong>Why set up an account?</strong><br>
      • Lifetime access to your purchases<br>
      • Instant access to all future updates<br>
      • Manage your library from any device
    </p>

    <div class="footer">
      <p>Questions? We're here to help at support@no3dtools.com</p>
      <p>&copy; 2025 NO3D Tools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send welcome & setup email
 */
export async function sendWelcomeEmail(email, name, token) {
  try {
    const resend = getResendClient();
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to NO3D Tools - Access Your Assets',
      html: getWelcomeEmail(name || 'Initiate', token),
    });

    console.log(`📧 Welcome email sent to ${email}`);
    return response;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
}

/**
 * Generate HTML for license key email (Stripe invoice.paid).
 * @param {string} licenseKey
 * @param {string} addonDownloadUrl
 */
export function getLicenseKeyEmail(licenseKey, addonDownloadUrl) {
  const url = addonDownloadUrl || `${SITE_URL}/no3d-tools-addon`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your No3D Link License Key</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border: 2px solid #000;
      padding: 40px;
      margin: 20px 0;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-family: monospace;
      font-size: 24px;
      font-weight: bold;
      text-transform: uppercase;
      color: #000;
      letter-spacing: 2px;
    }
    .key {
      font-family: monospace;
      font-size: 20px;
      font-weight: bold;
      border: 2px solid #000;
      padding: 14px 18px;
      display: inline-block;
      background: #f0ff00;
      word-break: break-all;
      margin: 10px 0 20px;
      letter-spacing: 1px;
    }
    .button {
      display: inline-block;
      background-color: #f0ff00;
      color: #000;
      text-decoration: none;
      padding: 16px 32px;
      border: 2px solid #000;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 20px 0;
      text-align: center;
      cursor: pointer;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NO3D TOOLS</div>
    </div>

    <h1 style="font-size: 24px; margin-bottom: 10px;">Your No3D Link License Key</h1>
    <p style="margin-top: 0;">Use this key in Blender preferences to activate full library access.</p>

    <div class="key">${licenseKey}</div>

    <p>Download the subscriber add-on here:</p>
    <div style="text-align:center; margin: 20px 0;">
      <a href="${url}" class="button">Download Add-on</a>
    </div>

    <div class="footer">
      <p>If you did not make this purchase, you can safely ignore this email.</p>
      <p>&copy; 2025 NO3D Tools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version of license key email.
 * @param {string} licenseKey
 * @param {string} addonDownloadUrl
 */
export function getLicenseKeyEmailText(licenseKey, addonDownloadUrl) {
  const url = addonDownloadUrl || `${SITE_URL}/no3d-tools-addon`;

  return `
NO3D TOOLS

Your No3D Link License Key:
${licenseKey}

Download the subscriber add-on:
${url}

If you did not make this purchase, you can safely ignore this email.
  `.trim();
}

/**
 * Send license key email.
 * @param {string} email
 * @param {string} licenseKey
 * @param {string=} addonDownloadUrl
 */
export async function sendLicenseKeyEmail(email, licenseKey, addonDownloadUrl) {
  const addonUrl = addonDownloadUrl || `${SITE_URL}/no3d-tools-addon`;

  return sendEmail({
    to: email,
    subject: 'Your No3D Link License Key',
    html: getLicenseKeyEmail(licenseKey, addonUrl),
    text: getLicenseKeyEmailText(licenseKey, addonUrl),
  });
}

/**
 * Send payment failure notification email.
 * @param {string} email - Recipient email
 * @param {string|Date} graceUntil - Grace period end date
 * @returns {Promise<object>} Resend response
 */
export async function sendPaymentFailedEmail(email, graceUntil) {
  const graceDate = new Date(graceUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const html = `
    <div style="font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="text-transform: uppercase; letter-spacing: 2px;">Payment Failed</h1>
      <p>Your No3d Tools subscription payment could not be processed.</p>
      <p>You have until <strong>${graceDate}</strong> to update your payment method before access is revoked.</p>
      <div style="margin: 20px 0;">
        <a href="https://no3dtools.com/account.html" style="background: #f0ff00; color: #222; padding: 10px 24px; text-decoration: none; font-family: monospace; text-transform: uppercase; font-weight: bold;">UPDATE PAYMENT METHOD</a>
      </div>
      <p style="color: #666; font-size: 12px;">If you believe this is an error, please contact support.</p>
    </div>
  `;

  const text = `Payment Failed\n\nYour No3d Tools subscription payment could not be processed.\nYou have until ${graceDate} to update your payment method.\n\nUpdate payment: https://no3dtools.com/account.html`;

  return sendEmail({
    to: email,
    subject: 'No3d Tools — Payment Failed',
    html,
    text,
  });
}

/**
 * Send subscription cancelled notification email.
 * @param {string} email - Recipient email
 * @param {string|Date} expiresAt - Date access expires
 * @returns {Promise<object>} Resend response
 */
/**
 * Internal signup alerts — comma-separated recipient list (e.g. you@domain.com).
 * Sent via Resend; no-op if unset or RESEND_API_KEY missing.
 * Not gated by LICENSE_EMAIL_DRY_RUN (customer dry-run still alerts you).
 */
export async function notifyAdminAcquisition({ type, subscriberEmail, detail = {} }) {
  const raw = process.env.ADMIN_NOTIFY_EMAIL || '';
  const recipients = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!recipients.length || !process.env.RESEND_API_KEY) {
    return;
  }

  const labels = {
    free_license: 'New free No3D account (license issued)',
    email_list: 'New email list signup (join)',
    newsletter: 'New newsletter subscriber',
    paid_subscriber: 'New No3D Tools paid subscriber',
  };

  const title = labels[type] || type;
  const safeEmail = String(subscriberEmail || '').trim();
  const lines = [
    title,
    '',
    `Subscriber: ${safeEmail}`,
    ...Object.entries(detail).map(([k, v]) => `${k}: ${v}`),
    '',
    `Time (UTC): ${new Date().toISOString()}`,
  ];
  const text = lines.join('\n');
  const html = `<pre style="font-family:ui-monospace,monospace;font-size:14px;line-height:1.5">${text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')}</pre>`;

  try {
    for (const to of recipients) {
      await sendEmail({
        to,
        subject: `[NO3D] ${title}`,
        html,
        text,
      });
    }
  } catch (err) {
    console.error('notifyAdminAcquisition failed:', err?.message || err);
  }
}

export async function sendSubscriptionCancelledEmail(email, expiresAt) {
  const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const html = `
    <div style="font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="text-transform: uppercase; letter-spacing: 2px;">Subscription Cancelled</h1>
      <p>Your No3d Tools subscription has been cancelled.</p>
      <p>You will have access until <strong>${expiryDate}</strong>.</p>
      <p>If you change your mind, you can re-subscribe at any time.</p>
      <div style="margin: 20px 0;">
        <a href="https://no3dtools.com/subscribe.html" style="background: #f0ff00; color: #222; padding: 10px 24px; text-decoration: none; font-family: monospace; text-transform: uppercase; font-weight: bold;">RE-SUBSCRIBE</a>
      </div>
    </div>
  `;

  const text = `Subscription Cancelled\n\nYour No3d Tools subscription has been cancelled.\nYou will have access until ${expiryDate}.\n\nRe-subscribe: https://no3dtools.com/subscribe.html`;

  return sendEmail({
    to: email,
    subject: 'No3d Tools — Subscription Cancelled',
    html,
    text,
  });
}

export default {
  sendMagicLinkEmail,
  sendWelcomeEmail,
  sendLicenseKeyEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCancelledEmail,
  notifyAdminAcquisition,
  sendEmail,
  getMagicLinkEmail,
  getMagicLinkEmailText,
  getOrderConfirmationEmail,
  getSubscriptionCanceledEmail,
  getSubscriptionRenewalEmail,
};
