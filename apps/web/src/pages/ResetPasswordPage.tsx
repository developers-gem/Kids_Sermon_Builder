import { useState, type FormEvent } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, LockKeyhole, ArrowLeft } from "lucide-react";
import { api } from "@/api/client";
import { friendlyErrorMessage } from "@/lib/errorMessages";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError(null);

    if (!token) {
      setError(
        "This password reset link is invalid or missing a token."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/reset-password", {
        token,
        password,
      });

      setSuccess(true);
    } catch (err) {
      setError(
        friendlyErrorMessage(
          err,
          "This reset link is invalid or has expired. Please request a new one."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="mx-auto max-w-md px-4 pb-20 pt-16 sm:px-6">
        <div className="paper-card space-y-5 p-6">
          <h1 className="text-3xl font-extrabold">
            Invalid Reset Link
          </h1>

          <p className="text-muted-foreground">
            This password reset link is missing or invalid.
            Please request a new password reset link.
          </p>

          <Link
            to="/forgot-password"
            className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-display font-bold text-primary-foreground"
          >
            Request New Reset Link
          </Link>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="mx-auto max-w-md px-4 pb-20 pt-16 sm:px-6">
        <div className="paper-card space-y-5 p-6">
          <h1 className="text-3xl font-extrabold">
            Password Reset
          </h1>

          <div className="rounded-xl border-2 border-green-500/30 bg-green-500/10 px-4 py-4">
            <p className="font-bold">
              Your password has been reset successfully.
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              You can now log in using your new password.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-display font-bold text-primary-foreground"
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-20 pt-16 sm:px-6">
      <h1 className="text-3xl font-extrabold">
        Create New Password
      </h1>

      <p className="mt-2 text-muted-foreground">
        Enter your new password below.
      </p>

      <form
        onSubmit={onSubmit}
        className="paper-card mt-8 space-y-5 p-6"
      >
        <label className="block">
          <span className="font-display font-bold">
            New Password
          </span>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-2 w-full rounded-xl border-2 border-border bg-card px-4 py-3 outline-none focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="font-display font-bold">
            Confirm New Password
          </span>

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            required
            minLength={8}
            autoComplete="new-password"
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
            <LockKeyhole className="h-5 w-5" />
          )}

          {loading
            ? "Resetting Password..."
            : "Reset Password"}
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
    </main>
  );
}