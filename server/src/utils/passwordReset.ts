import crypto from "crypto";

export function createPasswordResetToken() {
  // Generate a secure random token.
  const token = crypto.randomBytes(32).toString("hex");

  // Only the hash will be stored in MongoDB.
  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  return {
    token,
    tokenHash,
  };
}