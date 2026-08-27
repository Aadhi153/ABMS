import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApolloError } from "@apollo/client";
import { Button, Input, Label } from "@abms/ui";
import { useAuth } from "../../providers/auth-provider";
import { AuthLayout } from "../../components/auth/auth-layout";
import { PasswordInput } from "../../components/auth/password-input";
import { isValidEmail } from "../../lib/auth-validation";

function describeLoginError(err: unknown): string {
  if (err instanceof ApolloError) {
    if (err.graphQLErrors.length > 0) {
      // Server rejected the request with a specific reason (e.g. bad credentials,
      // inactive account) — show it verbatim instead of a generic guess.
      return err.graphQLErrors[0].message;
    }
    if (err.networkError) {
      return "Can't reach the server. Check your connection and try again.";
    }
  }
  return "Something went wrong. Please try again.";
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:border-[hsl(var(--auth-primary))] focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--auth-primary)/0.15)]";
const PRIMARY_BUTTON =
  "h-11 w-full rounded-lg bg-[hsl(var(--auth-primary))] font-bold text-white shadow-sm hover:bg-[hsl(var(--auth-primary-hover))] active:bg-[hsl(var(--auth-primary-active))]";
const PRIMARY_LINK = "font-semibold text-[hsl(var(--auth-primary))] hover:underline";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = isValidEmail(email) && password.length > 0;

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(describeLoginError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to your business management console"
      footer={
        <>
          First time here?{" "}
          <Link to="/signup" className={PRIMARY_LINK}>
            Create an organization
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {error && <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`h-11 px-4 text-[15px] text-foreground bg-card placeholder:text-stone-400 ${FOCUS_RING}`}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className={`text-xs ${PRIMARY_LINK}`}>
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`h-11 px-4 text-[15px] text-foreground bg-card placeholder:text-stone-400 ${FOCUS_RING}`}
          />
        </div>
        <Button type="submit" disabled={submitting || !canSubmit} className={PRIMARY_BUTTON}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
