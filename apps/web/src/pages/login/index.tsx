import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button, Card, CardDescription, CardTitle, Input, Label } from "@abms/ui";
import { useAuth } from "../../providers/auth-provider";
import { AuthLogo } from "../../components/auth/auth-logo";
import { isValidEmail } from "../../lib/auth-validation";

const FOCUS_RING = "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10";

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
    } catch {
      setError("Incorrect email or password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-2">
          <AuthLogo />
          <CardTitle className="text-xl font-bold text-foreground">ABMS</CardTitle>
        </div>
        <CardDescription className="mt-1 text-[13px]">Sign in to your business management console</CardDescription>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          {error && (
            <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`text-foreground bg-card placeholder:text-stone-400 ${FOCUS_RING}`}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`text-foreground bg-card placeholder:text-stone-400 ${FOCUS_RING}`}
            />
          </div>
          <Button
            type="submit"
            disabled={submitting || !canSubmit}
            className="w-full rounded-lg bg-primary font-bold text-primary-foreground shadow-[0_1px_3px_rgba(180,83,9,0.3)] hover:bg-amber-800 active:bg-amber-900"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          First time here?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create an organization
          </Link>
        </p>
      </Card>
    </div>
  );
}
