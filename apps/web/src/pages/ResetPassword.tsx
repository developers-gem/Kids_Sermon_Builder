import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { api } from "@/api/client";
import { friendlyErrorMessage } from "@/lib/errorMessages";

export function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await api.post("/auth/forgot-password", {
        email,
      });

      setSuccess(true);
    } catch (err) {
      setError(
        friendlyErrorMessage(
          err,
          "Couldn't send the password reset email. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 pb-20 pt-16 sm:px-6">
      <h1 className="text-3xl font-extrabold">
        Reset Password
      </h1>

      <p className="mt-2 text-muted-foreground">
        Enter the email address associated with your account and we'll
        send you a password reset link.
      </p>

      {success ? (
        <div className="paper-card mt-8 space-y-4 p-6">
          <div className="rounded-xl border-2 border-green-500/30 bg-green-500/10 px-4 py-4">
            <p className="font-bold">
              Password reset email sent.
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              If an account exists with this email address, you'll
              receive a password reset link shortly.
            </p>
          </div>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-display font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Login
          </Link>
        </div>
      ) : (
        <form
          onSubmit={onSubmit}
          className="paper-card mt-8 space-y-5 p-6"
        >
          <label className="block">
            <span className="font-display font-bold">
              Email
            </span>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="mt-2 w-full rounded-xl border-2 border-border bg-card px-4 py-3 outline-none focus:border-primary"
            />
          </label>

          {error && (
            <p className="rounded-xl border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-display font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Mail className="h-5 w-5" />
            )}

            {loading
              ? "Sending..."
              : "Send Reset Link"}
          </button>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-bold text-accent underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </form>
      )}
    </main>
  );
}
