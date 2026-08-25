import nodemailer from "nodemailer";
import { logger } from "../../config/logger.js";
import { env } from "../../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,

  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

// SMTP connection verification
transporter.verify((error, success) => {
  if (error) {
    logger.error(
      { error },
      "SMTP connection failed",
    );
  } else {
    logger.info(
      "SMTP server is ready to send emails",
    );
  }
});

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
): Promise<void> {
  try {
    const info = await transporter.sendMail({
      from: env.SMTP_FROM,
      to,

      subject: "Reset Your Password - Kids Sermon Builder",

      text: `
You requested a password reset.

Click this link to reset your password:

${resetLink}

This link expires in 1 hour.

If you did not request this password reset, you can ignore this email.
      `,

      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2>Reset Your Password</h2>

          <p>You requested a password reset for your Kids Sermon Builder account.</p>

          <p>
            <a
              href="${resetLink}"
              style="
                display: inline-block;
                padding: 12px 24px;
                background: #2563eb;
                color: white;
                text-decoration: none;
                border-radius: 6px;
              "
            >
              Reset Password
            </a>
          </p>

          <p>This link will expire in 1 hour.</p>

          <p>If you did not request this password reset, please ignore this email.</p>
        </div>
      `,
    });

    logger.info(
      {
        to,
        messageId: info.messageId,
        response: info.response,
      },
      "Password reset email sent successfully",
    );
  } catch (error) {
    logger.error(
      {
        error,
        to,
      },
      "Failed to send password reset email",
    );

    throw error;
  }
}