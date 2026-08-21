import { logger } from "../../config/logger.js";
import { isProd } from "../../config/env.js";

/**
 * No email provider is actually integrated here — this codebase has no
 * SMTP/SendGrid/Resend/SES credentials configured, and none were available
 * to wire up and test. This function is the single, clearly-marked seam
 * where a real one goes: swap the body of this function for an actual API
 * call, keep the same signature, and every caller (just password reset for
 * now) keeps working unchanged.
 *
 * Until that's done, this only logs the link server-side — which means
 * password reset is genuinely non-functional in any deployment where
 * nobody has server log access. That's a real, current limitation, not a
 * cosmetic one; see README "Not yet built."
 */
export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  if (isProd) {
    logger.warn(
      { to },
      "EMAIL NOT CONFIGURED: password reset link was generated but no email provider is integrated, so nothing was actually sent. See server/src/integrations/email/index.ts.",
    );
  } else {
    // Dev/test convenience only — never do this in production, it's the
    // same information disclosure the prod branch above is warning about.
    logger.info({ to, resetLink }, "Password reset link (dev only — no email provider configured)");
  }
}
