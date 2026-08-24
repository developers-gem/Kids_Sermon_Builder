import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Loader2, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { friendlyErrorMessage } from "@/lib/errorMessages";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/my-lessons";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't log in. Please try again."));
    } finally {
      setLoading(false);
    }
  };


  return (
    <main className="mx-auto max-w-md px-4 pb-20 pt-16 sm:px-6">
      <h1 className="text-3xl font-extrabold">Log in</h1>
      <p className="mt-2 text-muted-foreground">
        Log in to save lessons, favorite stories, and pick up where you left off.
      </p>

      <form onSubmit={onSubmit} className="paper-card mt-8 space-y-5 p-6">
        <label className="block">
          <span className="font-display font-bold">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="mt-2 w-full rounded-xl border-2 border-border bg-card px-4 py-3 outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="font-display font-bold">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="mt-2 w-full rounded-xl border-2 border-border bg-card px-4 py-3 outline-none focus:border-primary"
          />
          <div className="mt-2 text-right"> <Link to="/reset-password" className="text-sm font-bold text-accent underline hover:opacity-80" > Forgot Password? </Link> </div>
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
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
          {loading ? "Logging in…" : "Log in"}
        </button>
        
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/register" className="font-bold text-accent underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}
