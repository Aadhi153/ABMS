import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button, cn, Input, Label } from "@abms/ui";
import { useAuth } from "../../providers/auth-provider";
import { AuthLayout } from "../../components/auth/auth-layout";
import { PasswordInput } from "../../components/auth/password-input";
import { StepProgress } from "../../components/auth/step-progress";
import { getPasswordStrength, isValidEmail, PASSWORD_STRENGTH_LABEL } from "../../lib/auth-validation";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:border-[hsl(var(--auth-primary))] focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--auth-primary)/0.15)]";
const ERROR_RING = "border-danger focus-visible:border-danger focus-visible:ring-danger/10";
const PRIMARY_BUTTON =
  "h-11 w-full rounded-lg bg-[hsl(var(--auth-primary))] font-bold text-white shadow-sm hover:bg-[hsl(var(--auth-primary-hover))] active:bg-[hsl(var(--auth-primary-active))]";
const PRIMARY_LINK = "font-semibold text-[hsl(var(--auth-primary))] hover:underline";

const STRENGTH_BAR_COLOR = ["bg-border", "bg-danger", "bg-warning", "bg-success"];
const STRENGTH_TEXT_COLOR = ["text-muted-foreground", "text-danger", "text-warning", "text-success"];

function fieldClass(hasError: boolean) {
  return cn("h-11 px-4 text-[15px] text-foreground bg-card placeholder:text-stone-400", hasError ? ERROR_RING : FOCUS_RING);
}

export default function SignupPage() {
  const { user, loading, signup } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ organizationName: "", fullName: "", email: "", password: "" });
  const [touched, setTouched] = useState({ fullName: false, email: false, password: false });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const emailValid = isValidEmail(form.email);
  const passwordValid = form.password.length >= 8;
  const strength = getPasswordStrength(form.password);
  const step2Valid = form.fullName.trim().length > 0 && emailValid && passwordValid;

  function handleContinue(e: FormEvent) {
    e.preventDefault();
    if (!form.organizationName.trim()) return;
    setStep(2);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setTouched({ fullName: true, email: true, password: true });
    if (!step2Valid) return;
    setError(null);
    setSubmitting(true);
    try {
      await signup(form);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={step === 1 ? "Create your organization" : "Create your admin account"}
      description={
        step === 1
          ? "Set up your company's workspace to get started."
          : `You'll be the first admin for ${form.organizationName.trim() || "your organization"}.`
      }
      stepIndicator={<StepProgress step={step} />}
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className={PRIMARY_LINK}>
            Sign in
          </Link>
        </>
      }
    >
      {step === 1 ? (
        <form className="space-y-5" onSubmit={handleContinue} noValidate>
          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization name</Label>
            <Input
              id="organizationName"
              required
              autoFocus
              value={form.organizationName}
              onChange={(e) => setForm((f) => ({ ...f, organizationName: e.target.value }))}
              className={fieldClass(false)}
            />
            <p className="text-xs text-muted-foreground">This is your company's workspace name</p>
          </div>
          <Button type="submit" disabled={!form.organizationName.trim()} className={PRIMARY_BUTTON}>
            Continue
          </Button>
        </form>
      ) : (
        <form className="space-y-5" onSubmit={handleCreate} noValidate>
          <button type="button" onClick={() => setStep(1)} className={cn("inline-flex items-center gap-1 text-xs", PRIMARY_LINK)}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <div className="space-y-2">
            <Label htmlFor="fullName">Your name</Label>
            <Input
              id="fullName"
              required
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
              className={fieldClass(touched.fullName && !form.fullName.trim())}
            />
            {touched.fullName && !form.fullName.trim() && <p className="text-xs text-danger">Enter your name</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              className={fieldClass(touched.email && !emailValid)}
            />
            {touched.email && !emailValid && <p className="text-xs text-danger">Enter a valid email address</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              className={fieldClass(touched.password && !passwordValid)}
            />
            {touched.password && !passwordValid ? (
              <p className="text-xs text-danger">Password must be at least 8 characters</p>
            ) : (
              form.password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((segment) => (
                      <span
                        key={segment}
                        className={cn("h-1 flex-1 rounded-full", segment <= strength ? STRENGTH_BAR_COLOR[strength] : "bg-border")}
                      />
                    ))}
                  </div>
                  {strength > 0 && <p className={cn("text-xs", STRENGTH_TEXT_COLOR[strength])}>{PASSWORD_STRENGTH_LABEL[strength]}</p>}
                </div>
              )
            )}
          </div>

          {error && <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

          <Button type="submit" disabled={submitting || !step2Valid} className={PRIMARY_BUTTON}>
            {submitting ? "Creating…" : "Create organization"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
