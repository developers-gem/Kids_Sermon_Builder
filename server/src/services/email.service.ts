import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Reset your password",

    text: `
You requested a password reset.

Click the link below to reset your password:

${resetUrl}

This link will expire in 30 minutes.

If you did not request this password reset, you can safely ignore this email.
`,

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px;">
        
        <h2>Reset your password</h2>

        <p>
          You requested a password reset for your account.
        </p>

        <p>
          Click the button below to create a new password.
        </p>

        <p style="margin: 30px 0;">
          <a
            href="${resetUrl}"
            style="
              display: inline-block;
              padding: 12px 24px;
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
          This password reset link will expire in 30 minutes.
        </p>

        <p>
          If you did not request this password reset, you can safely ignore this email.
        </p>

      </div>
    `,
  });
}