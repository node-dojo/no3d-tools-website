/**
 * Gift Card Email Service
 *
 * Sends beautiful gift card emails using Resend
 * The code is a Polar discount code that works at checkout
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email sender configuration
const FROM_EMAIL = process.env.EMAIL_FROM || 'gifts@no3d.tools';
const FROM_NAME = 'NO3D TOOLS';

/**
 * Send gift card email to purchaser
 * @param {object} giftCard - Gift card details (code, value, name, type, months)
 * @param {string} recipientEmail - Email to send to (purchaser)
 * @returns {object} Email send result
 */
export async function sendGiftCardEmail(giftCard, recipientEmail) {
  const { code, value, name, type, months } = giftCard;

  // Use different email template for membership gifts
  if (type === 'membership') {
    return sendMembershipGiftEmail(giftCard, recipientEmail);
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your NO3D TOOLS Gift Card</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Courier New', monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 3px solid #000000;">

          <!-- Header -->
          <tr>
            <td style="background-color: #f0ff00; padding: 30px; text-align: center; border-bottom: 3px solid #000000;">
              <h1 style="margin: 0; font-size: 32px; color: #000000; text-transform: uppercase; letter-spacing: 4px;">
                MERRY CHRISTMAS
              </h1>
            </td>
          </tr>

          <!-- Gift Card Visual -->
          <tr>
            <td style="padding: 40px; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666; text-transform: uppercase; letter-spacing: 2px;">
                You purchased a
              </p>
              <h2 style="margin: 0 0 30px 0; font-size: 28px; color: #000000; text-transform: uppercase;">
                ${name}
              </h2>

              <!-- Value Badge -->
              <div style="display: inline-block; background-color: #f0ff00; border: 3px solid #000000; padding: 20px 40px; margin-bottom: 30px;">
                <span style="font-size: 48px; font-weight: bold; color: #000000;">
                  $${value}
                </span>
              </div>
            </td>
          </tr>

          <!-- Gift Card Code -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <p style="margin: 0 0 15px 0; font-size: 14px; color: #666666; text-transform: uppercase; letter-spacing: 2px;">
                Give this discount code to your gift recipient:
              </p>

              <!-- THE CODE - Big and Bold -->
              <div style="background-color: #000000; padding: 25px; margin-bottom: 20px;">
                <span style="font-size: 36px; font-weight: bold; color: #f0ff00; letter-spacing: 6px; font-family: 'Courier New', monospace;">
                  ${code}
                </span>
              </div>

              <p style="margin: 0; font-size: 12px; color: #999999;">
                Copy this code and share it with the lucky recipient!
              </p>
            </td>
          </tr>

          <!-- Instructions -->
          <tr>
            <td style="background-color: #f5f5f5; padding: 30px 40px; border-top: 2px solid #000000;">
              <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #000000; text-transform: uppercase;">
                How to Redeem
              </h3>
              <ol style="margin: 0; padding-left: 20px; color: #333333; font-size: 14px; line-height: 1.8;">
                <li>Visit <a href="https://no3d.tools" style="color: #000000; font-weight: bold;">no3d.tools</a></li>
                <li>Add any product to checkout</li>
                <li>Enter the discount code above at checkout</li>
                <li>The $${value} discount will be applied!</li>
              </ol>
              <p style="margin: 15px 0 0 0; font-size: 13px; color: #666666;">
                Works for individual products or subscriptions.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #000000; padding: 25px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #888888;">
                NO3D TOOLS — Raw Geometry Power
              </p>
              <p style="margin: 10px 0 0 0; font-size: 11px; color: #666666;">
                This gift card never expires. Questions? Contact support@no3d.tools
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
MERRY CHRISTMAS!

You purchased a ${name}

═══════════════════════════════════════
       GIFT CARD VALUE: $${value}
═══════════════════════════════════════

Give this discount code to your gift recipient:

    ╔═══════════════════════════════╗
    ║                               ║
    ║         ${code}          ║
    ║                               ║
    ╚═══════════════════════════════╝

HOW TO REDEEM:
1. Visit no3d.tools
2. Add any product to checkout
3. Enter the discount code above at checkout
4. The $${value} discount will be applied!

Works for individual products or subscriptions.

This gift card never expires.
Questions? Contact support@no3d.tools

═══════════════════════════════════════
NO3D TOOLS — Raw Geometry Power
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: recipientEmail,
      subject: `Your NO3D TOOLS Gift Card - $${value}`,
      html,
      text,
    });

    if (error) {
      console.error('Failed to send gift card email:', error);
      return { success: false, error };
    }

    console.log(`Gift card email sent to ${recipientEmail}. Email ID: ${data.id}`);
    return { success: true, emailId: data.id };
  } catch (error) {
    console.error('Error sending gift card email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send membership gift email to purchaser
 * Different from credit gift cards - recipient gets X months free subscription
 * @param {object} giftCard - Gift card details (code, name, months)
 * @param {string} recipientEmail - Email to send to (purchaser)
 * @returns {object} Email send result
 */
async function sendMembershipGiftEmail(giftCard, recipientEmail) {
  const { code, name, months } = giftCard;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your NO3D TOOLS Membership Gift</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Courier New', monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 3px solid #000000;">

          <!-- Header -->
          <tr>
            <td style="background-color: #f0ff00; padding: 30px; text-align: center; border-bottom: 3px solid #000000;">
              <h1 style="margin: 0; font-size: 32px; color: #000000; text-transform: uppercase; letter-spacing: 4px;">
                MERRY CHRISTMAS
              </h1>
            </td>
          </tr>

          <!-- Gift Card Visual -->
          <tr>
            <td style="padding: 40px; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666; text-transform: uppercase; letter-spacing: 2px;">
                You purchased a
              </p>
              <h2 style="margin: 0 0 30px 0; font-size: 28px; color: #000000; text-transform: uppercase;">
                ${name}
              </h2>

              <!-- Months Badge -->
              <div style="display: inline-block; background-color: #f0ff00; border: 3px solid #000000; padding: 20px 40px; margin-bottom: 30px;">
                <span style="font-size: 48px; font-weight: bold; color: #000000;">
                  ${months} MONTHS FREE
                </span>
              </div>
            </td>
          </tr>

          <!-- Gift Card Code -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <p style="margin: 0 0 15px 0; font-size: 14px; color: #666666; text-transform: uppercase; letter-spacing: 2px;">
                Give this gift code to your recipient:
              </p>

              <!-- THE CODE - Big and Bold -->
              <div style="background-color: #000000; padding: 25px; margin-bottom: 20px;">
                <span style="font-size: 36px; font-weight: bold; color: #f0ff00; letter-spacing: 6px; font-family: 'Courier New', monospace;">
                  ${code}
                </span>
              </div>

              <p style="margin: 0; font-size: 12px; color: #999999;">
                Copy this code and share it with the lucky recipient!
              </p>
            </td>
          </tr>

          <!-- Instructions -->
          <tr>
            <td style="background-color: #f5f5f5; padding: 30px 40px; border-top: 2px solid #000000;">
              <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #000000; text-transform: uppercase;">
                How to Redeem
              </h3>
              <ol style="margin: 0; padding-left: 20px; color: #333333; font-size: 14px; line-height: 1.8;">
                <li>Visit <a href="https://no3d.tools/account.html" style="color: #000000; font-weight: bold;">no3d.tools/account</a></li>
                <li>Enter the gift code above in the "Redeem Gift Card" section</li>
                <li>You'll receive a discount code for ${months} months free</li>
                <li>Use that code when subscribing to NO3D Membership</li>
              </ol>
              <p style="margin: 15px 0 0 0; font-size: 13px; color: #666666;">
                The ${months}-month free trial applies to the NO3D Membership subscription.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #000000; padding: 25px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #888888;">
                NO3D TOOLS — Raw Geometry Power
              </p>
              <p style="margin: 10px 0 0 0; font-size: 11px; color: #666666;">
                This gift never expires. Questions? Contact support@no3d.tools
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
MERRY CHRISTMAS!

You purchased a ${name}

═══════════════════════════════════════
       ${months} MONTHS FREE MEMBERSHIP
═══════════════════════════════════════

Give this gift code to your recipient:

    ╔═══════════════════════════════╗
    ║                               ║
    ║         ${code}          ║
    ║                               ║
    ╚═══════════════════════════════╝

HOW TO REDEEM:
1. Visit no3d.tools/account
2. Enter the gift code above in the "Redeem Gift Card" section
3. You'll receive a discount code for ${months} months free
4. Use that code when subscribing to NO3D Membership

The ${months}-month free trial applies to the NO3D Membership subscription.

This gift never expires.
Questions? Contact support@no3d.tools

═══════════════════════════════════════
NO3D TOOLS — Raw Geometry Power
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: recipientEmail,
      subject: `Your NO3D TOOLS ${months}-Month Membership Gift`,
      html,
      text,
    });

    if (error) {
      console.error('Failed to send membership gift email:', error);
      return { success: false, error };
    }

    console.log(`Membership gift email sent to ${recipientEmail}. Email ID: ${data.id}`);
    return { success: true, emailId: data.id };
  } catch (error) {
    console.error('Error sending membership gift email:', error);
    return { success: false, error: error.message };
  }
}

export default { sendGiftCardEmail, sendMembershipGiftEmail };
