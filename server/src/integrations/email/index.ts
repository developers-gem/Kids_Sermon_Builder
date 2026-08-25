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

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
): Promise<void> {
  try {
    const info = await transporter.sendMail({
      from: env.SMTP_FROM,
      to,

      subject: "Reset your Kids Sermon Builder password",

      text: `
You requested a password reset.

Click the following link to reset your password:

${resetLink}

This link will expire in 1 hour.

If you did not request this password reset, you can safely ignore this email.
      `,

      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 30px;
        ">
          
          <h2>Reset Your Password</h2>

          <p>
            You requested a password reset for your Kids Sermon Builder account.
          </p>

          <p>
            Click the button below to create a new password.
          </p>

          <p style="margin: 30px 0;">
            <a
              href="${resetLink}"
              style="
                display: inline-block;
                padding: 14px 24px;
                background-color: #2563eb;
                color: #ffffff;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
              "
            >
              Reset Password
            </a>
          </p>

          <p>
            This link will expire in 1 hour.
          </p>

          <p>
            If you did not request this password reset, you can safely ignore this email.
          </p>

        </div>
      `,
    });

    logger.info(
      {
        to,
        messageId: info.messageId,
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