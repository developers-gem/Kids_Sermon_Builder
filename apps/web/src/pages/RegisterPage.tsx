import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { friendlyErrorMessage } from "@/lib/errorMessages";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(name, email, password);
      navigate("/my-lessons", { replace: true });
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't create your account. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 pb-20 pt-16 sm:px-6">
      <h1 className="text-3xl font-extrabold">Create an account</h1>
      <p className="mt-2 text-muted-foreground">
        Save lessons, favorite stories, and build up your own library of Sunday lessons.
      </p>

      <form onSubmit={onSubmit} className="paper-card mt-8 space-y-5 p-6">
        <label className="block">
          <span className="font-display font-bold">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="mt-2 w-full rounded-xl border-2 border-border bg-card px-4 py-3 outline-none focus:border-primary"
          />
        </label>
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
            minLength={8}
            autoComplete="new-password"
            className="mt-2 w-full rounded-xl border-2 border-border bg-card px-4 py-3 outline-none focus:border-primary"
          />
          <span className="mt-1 block text-xs text-muted-foreground">At least 8 characters.</span>
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
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-bold text-accent underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
