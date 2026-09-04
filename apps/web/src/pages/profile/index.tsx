import { useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Camera, Laptop, LogOut, Smartphone } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from "@abms/ui";
import { ROLE_LABELS } from "@abms/shared";
import { useAuth, type AuthUser } from "../../providers/auth-provider";

const UPDATE_MY_PROFILE_MUTATION = gql`
  mutation UpdateMyProfile($input: UpdateProfileInput!) {
    updateMyProfile(input: $input) {
      id
      name
      avatarUrl
      phone
      jobTitle
      bio
      notifyEmailEnabled
      notifyInAppEnabled
    }
  }
`;

const CHANGE_MY_PASSWORD_MUTATION = gql`
  mutation ChangeMyPassword($input: ChangePasswordInput!) {
    changeMyPassword(input: $input)
  }
`;

const REQUEST_AVATAR_UPLOAD_URL_MUTATION = gql`
  mutation RequestAvatarUploadUrl($contentType: String!, $fileSizeBytes: Int!) {
    requestAvatarUploadUrl(contentType: $contentType, fileSizeBytes: $fileSizeBytes) {
      uploadUrl
      publicUrl
    }
  }
`;

const MY_SESSIONS_QUERY = gql`
  query MySessions {
    mySessions {
      id
      userAgent
      ipAddress
      createdAt
      lastActiveAt
      isCurrent
    }
  }
`;

const REVOKE_SESSION_MUTATION = gql`
  mutation RevokeSession($id: String!) {
    revokeSession(id: $id)
  }
`;

const REVOKE_OTHER_SESSIONS_MUTATION = gql`
  mutation RevokeOtherSessions {
    revokeOtherSessions
  }
`;

const MY_AUDIT_ACTIVITY_QUERY = gql`
  query MyAuditActivity($limit: Int) {
    myAuditActivity(limit: $limit) {
      id
      action
      entityType
      entityId
      before
      after
      createdAt
    }
  }
`;

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function browserLabel(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Browser";
  const os = /Windows/.test(userAgent)
    ? "Windows"
    : /Mac OS/.test(userAgent)
      ? "macOS"
      : /Android/.test(userAgent)
        ? "Android"
        : /iPhone|iPad/.test(userAgent)
          ? "iOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

function isMobileUserAgent(userAgent: string | null): boolean {
  return !!userAgent && /Mobile|Android|iPhone/.test(userAgent);
}

const TABS = ["overview", "security", "notifications", "activity"] as const;
type TabKey = (typeof TABS)[number];

export default function ProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = TABS.includes(searchParams.get("tab") as TabKey) ? (searchParams.get("tab") as TabKey) : "overview";
  const [tab, setTab] = useState<TabKey>(initialTab);

  function handleTabChange(next: string) {
    setTab(next as TabKey);
    setSearchParams(next === "overview" ? {} : { tab: next }, { replace: true });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account, security, notifications, and activity.</p>
      </div>
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
          <AvatarUploadCard />
          <ProfileDetailsCard />
        </TabsContent>
        <TabsContent value="security" className="space-y-6">
          <ChangePasswordCard />
          <SessionsCard />
        </TabsContent>
        <TabsContent value="notifications" className="space-y-6">
          <NotificationPrefsCard />
        </TabsContent>
        <TabsContent value="activity" className="space-y-6">
          <MyActivityCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AvatarUploadCard() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [requestUploadUrl] = useMutation(REQUEST_AVATAR_UPLOAD_URL_MUTATION);
  const [updateMyProfile] = useMutation(UPDATE_MY_PROFILE_MUTATION);

  if (!user) return null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please choose a PNG, JPEG, or WEBP image");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const { data } = await requestUploadUrl({
        variables: { contentType: file.type, fileSizeBytes: file.size },
      });
      const { uploadUrl, publicUrl } = data.requestAvatarUploadUrl;
      const putResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putResponse.ok) throw new Error("Upload to storage failed");

      await updateMyProfile({ variables: { input: { name: user.name, avatarUrl: publicUrl } } });
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Photo</CardTitle>
        <CardDescription>Shown across the app in the sidebar, topbar, and anywhere your name appears.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed"
            aria-label="Change profile photo"
          >
            <Avatar className="h-16 w-16">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
              <AvatarFallback className="text-base font-semibold">{initials(user.name)}</AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-5 w-5" />
            </span>
          </button>
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : "Change photo"}
            </Button>
            <p className="mt-1.5 text-xs text-muted-foreground">PNG, JPEG, or WEBP. Max 5MB.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileDetailsCard() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [updateMyProfile] = useMutation(UPDATE_MY_PROFILE_MUTATION);

  if (!user) return null;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateMyProfile({
        variables: { input: { name, phone: phone || undefined, jobTitle: jobTitle || undefined, bio: bio || undefined } },
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account details</CardTitle>
        <CardDescription>Your name is shown across the app; your email and role are managed by an admin.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-3">
          <Badge tone="info">{ROLE_LABELS[user.role]}</Badge>
        </div>
        <Separator />
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">Job title</Label>
              <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short note about yourself (optional)" />
          </div>
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [changeMyPassword] = useMutation(CHANGE_MY_PASSWORD_MUTATION);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }
    setSubmitting(true);
    try {
      await changeMyPassword({ variables: { input: { currentPassword, newPassword } } });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>You'll stay signed in on this device after changing your password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={submitting || !currentPassword || !newPassword}>
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface SessionRow {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

function SessionsCard() {
  const { data, loading, refetch } = useQuery<{ mySessions: SessionRow[] }>(MY_SESSIONS_QUERY);
  const [revokeSession] = useMutation(REVOKE_SESSION_MUTATION);
  const [revokeOtherSessions] = useMutation(REVOKE_OTHER_SESSIONS_MUTATION);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  async function handleRevoke(session: SessionRow) {
    setBusyId(session.id);
    try {
      await revokeSession({ variables: { id: session.id } });
      toast.success("Session signed out");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign out session");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRevokeOthers() {
    setRevokingOthers(true);
    try {
      await revokeOtherSessions();
      toast.success("Signed out of all other sessions");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign out other sessions");
    } finally {
      setRevokingOthers(false);
    }
  }

  const sessions = data?.mySessions ?? [];
  const hasOtherSessions = sessions.some((s) => !s.isCurrent);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>Devices currently signed in to your account.</CardDescription>
        </div>
        {hasOtherSessions && (
          <Button variant="outline" size="sm" onClick={handleRevokeOthers} disabled={revokingOthers}>
            {revokingOthers ? "Signing out…" : "Sign out all other sessions"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => {
              const Icon = isMobileUserAgent(session.userAgent) ? Smartphone : Laptop;
              return (
                <div key={session.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{browserLabel(session.userAgent)}</p>
                        {session.isCurrent && <Badge tone="success">This device</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {session.ipAddress ? `${session.ipAddress} · ` : ""}
                        Active {relativeTime(session.lastActiveAt)}
                      </p>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(session)}
                      disabled={busyId === session.id}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NotificationPrefsCard() {
  const { user } = useAuth();
  const [updateMyProfile] = useMutation(UPDATE_MY_PROFILE_MUTATION);
  const [savingKey, setSavingKey] = useState<keyof Pick<AuthUser, "notifyEmailEnabled" | "notifyInAppEnabled"> | null>(null);

  if (!user) return null;

  async function handleToggle(key: "notifyEmailEnabled" | "notifyInAppEnabled", value: boolean) {
    if (!user) return;
    setSavingKey(key);
    try {
      await updateMyProfile({ variables: { input: { name: user.name, [key]: value } } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update preference");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
        <CardDescription>Choose how you're notified about activity relevant to you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">In-app notifications</p>
            <p className="text-xs text-muted-foreground">Show a badge and list in the notification bell.</p>
          </div>
          <Switch
            checked={user.notifyInAppEnabled}
            onCheckedChange={(v) => handleToggle("notifyInAppEnabled", v)}
            disabled={savingKey === "notifyInAppEnabled"}
            aria-label="Toggle in-app notifications"
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Email notifications</p>
            <p className="text-xs text-muted-foreground">Also send an email for the same events.</p>
          </div>
          <Switch
            checked={user.notifyEmailEnabled}
            onCheckedChange={(v) => handleToggle("notifyEmailEnabled", v)}
            disabled={savingKey === "notifyEmailEnabled"}
            aria-label="Toggle email notifications"
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface AuditLogRow {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityType: string;
  entityId: string;
  before: string | null;
  after: string | null;
  createdAt: string;
}

const ACTION_TONE: Record<AuditLogRow["action"], "success" | "info" | "danger"> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "danger",
};

function MyActivityCard() {
  const { data, loading } = useQuery<{ myAuditActivity: AuditLogRow[] }>(MY_AUDIT_ACTIVITY_QUERY, {
    variables: { limit: 50 },
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = data?.myAuditActivity ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>My activity</CardTitle>
        <CardDescription>A record of changes you've made across the app.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="space-y-1">
            {rows.map((row) => {
              const expanded = expandedId === row.id;
              return (
                <div key={row.id} className="rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : row.id)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Badge tone={ACTION_TONE[row.action]}>{row.action}</Badge>
                      <span className="text-sm">
                        {row.entityType} <span className="text-muted-foreground">#{row.entityId.slice(0, 8)}</span>
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(row.createdAt)}</span>
                  </button>
                  {expanded && (row.before || row.after) && (
                    <div className="grid gap-3 border-t border-border px-3 py-3 sm:grid-cols-2">
                      {row.before && (
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">Before</p>
                          <pre className="max-h-48 overflow-auto rounded-md bg-muted p-2 text-xs">{row.before}</pre>
                        </div>
                      )}
                      {row.after && (
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">After</p>
                          <pre className="max-h-48 overflow-auto rounded-md bg-muted p-2 text-xs">{row.after}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
