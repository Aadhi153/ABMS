import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { gql, useQuery } from "@apollo/client";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@abms/ui";
import { useAuth } from "../../providers/auth-provider";

const INVITE_INFO_QUERY = gql`
  query InviteInfo($token: String!) {
    inviteInfo(token: $token) {
      valid
      expired
      email
      organizationName
      role
    }
  }
`;

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading, acceptInvite } = useAuth();
  const navigate = useNavigate();
  const { data, loading: infoLoading } = useQuery(INVITE_INFO_QUERY, {
    variables: { token },
    skip: !token,
    fetchPolicy: "network-only",
  });
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!authLoading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      await acceptInvite({ token, name, password });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept this invite");
    } finally {
      setSubmitting(false);
    }
  }

  const info = data?.inviteInfo as
    | { valid: boolean; expired: boolean; email: string | null; organizationName: string | null; role: string | null }
    | undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            <span className="text-primary">ABMS</span>
          </CardTitle>
          <CardDescription>
            {infoLoading
              ? "Checking your invite…"
              : info?.valid
                ? `Join ${info.organizationName} as ${info.role}`
                : "This invite link is no longer valid"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {infoLoading ? null : info?.valid ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={info.email ?? ""} disabled />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Set a password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Joining…" : "Accept invite"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                {info?.expired
                  ? "This invite has expired. Ask your admin to send a new one."
                  : "This invite link is invalid or has already been used."}
              </p>
              <Link to="/login" className="text-primary hover:underline">
                Back to sign in
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
