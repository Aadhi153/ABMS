import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  Bell,
  Calendar,
  Camera,
  ChevronDown,
  History,
  KeyRound,
  Laptop,
  Loader2,
  LogOut,
  Mail,
  MonitorSmartphone,
  Smartphone,
  User,
  type LucideIcon,
} from "lucide-react";
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
  cn,
  toast,
} from "@abms/ui";
import {
  hasModuleAccess,
  NOTIFICATION_CATEGORIES,
  ROLE_LABELS,
  type NotificationCategoryPrefs,
} from "@abms/shared";
import { useAuth } from "../../providers/auth-provider";

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
      notificationCategoryPrefs
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
      location
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
  query MyAuditActivity($limit: Int, $offset: Int, $action: AuditAction, $from: DateTime, $to: DateTime) {
    myAuditActivity(limit: $limit, offset: $offset, action: $action, from: $from, to: $to) {
      items {
        id
        action
        entityType
        entityId
        entityName
        before
        after
        createdAt
      }
      hasMore
    }
  }
`;

const ACTIVITY_PAGE_SIZE = 25;

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function IconTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-bg text-primary">
        <Icon className="h-4 w-4" />
      </span>
      {children}
    </CardTitle>
  );
}

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

function exactDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** Returns null when the user-agent is missing entirely — legacy sessions
 * created before this column existed have no UA to parse, ever, so callers
 * fall back to location/first-seen context instead of a bare "Unknown device". */
function browserLabel(userAgent: string | null): string | null {
  if (!userAgent) return null;
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

const TAB_ITEMS = [
  { key: "overview", label: "Overview", icon: User },
  { key: "security", label: "Security", icon: KeyRound },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "activity", label: "Activity", icon: History },
] as const satisfies ReadonlyArray<{ key: string; label: string; icon: LucideIcon }>;

const TABS = TAB_ITEMS.map((t) => t.key);
type TabKey = (typeof TAB_ITEMS)[number]["key"];

const TAB_CONTENT_ANIMATION = "animate-in fade-in-0 slide-in-from-bottom-1 duration-300";

export default function ProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = TABS.includes(searchParams.get("tab") as TabKey) ? (searchParams.get("tab") as TabKey) : "overview";
  const [tab, setTab] = useState<TabKey>(initialTab);

  function handleTabChange(next: string) {
    setTab(next as TabKey);
    setSearchParams(next === "overview" ? {} : { tab: next }, { replace: true });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account, security, notifications, and activity.</p>
      </div>
      <ProfileHeroCard />
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="h-auto w-full flex-wrap gap-1 rounded-xl border-0 bg-muted/60 p-1.5 sm:w-fit sm:flex-nowrap">
          {TAB_ITEMS.map(({ key, label, icon: Icon }) => (
            <TabsTrigger
              key={key}
              value={key}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted-foreground after:hidden data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className={cn("space-y-6", TAB_CONTENT_ANIMATION)}>
          <ProfileDetailsCard />
        </TabsContent>
        <TabsContent value="security" className={cn("space-y-6", TAB_CONTENT_ANIMATION)}>
          <ChangePasswordCard />
          <SessionsCard />
        </TabsContent>
        <TabsContent value="notifications" className={cn("space-y-6", TAB_CONTENT_ANIMATION)}>
          <NotificationPrefsCard />
        </TabsContent>
        <TabsContent value="activity" className={cn("space-y-6", TAB_CONTENT_ANIMATION)}>
          <MyActivityCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileHeroCard() {
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
    <Card className="overflow-hidden py-0 transition-shadow duration-200 hover:shadow-md">
      <div className="h-20 bg-gradient-to-r from-primary via-primary/85 to-info sm:h-24" />
      <CardContent className="relative px-6 pb-6 pt-0">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="-mt-10 flex items-end gap-4 sm:-mt-12">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="group relative shrink-0 rounded-full outline-none ring-4 ring-card transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed"
              aria-label="Change profile photo"
            >
              <Avatar className="h-20 w-20 shadow-lg sm:h-24 sm:w-24">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                <AvatarFallback className="text-xl font-semibold sm:text-2xl">{initials(user.name)}</AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100",
                  uploading && "opacity-100",
                )}
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              </span>
            </button>
            <div className="pb-1 sm:pb-2">
              <h2 className="text-xl font-bold leading-tight sm:text-2xl">{user.name}</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {user.email}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:pb-2">
            <Badge tone="info">{ROLE_LABELS[user.role]}</Badge>
            {user.jobTitle && <Badge tone="muted">{user.jobTitle}</Badge>}
          </div>
        </div>
        <Separator className="my-4" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : "Change photo"}
            </Button>
            <p className="mt-1.5 text-xs text-muted-foreground">PNG, JPEG, or WEBP. Max 5MB.</p>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Member since {shortDate(user.createdAt)}
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </CardContent>
    </Card>
  );
}

const BIO_MAX_LENGTH = 280;

function ProfileDetailsCard() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [updateMyProfile] = useMutation(UPDATE_MY_PROFILE_MUTATION);

  if (!user) return null;

  const isDirty =
    name !== (user.name ?? "") ||
    phone !== (user.phone ?? "") ||
    jobTitle !== (user.jobTitle ?? "") ||
    bio !== (user.bio ?? "");

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
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <IconTitle icon={User}>Account details</IconTitle>
        <CardDescription>Your name is shown across the app; your email and role are managed by an admin.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled title="Managed by an admin" />
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
            <div className="flex items-center justify-between">
              <Label htmlFor="bio">Bio</Label>
              <span className="text-xs text-muted-foreground">
                {bio.length}/{BIO_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              id="bio"
              value={bio}
              maxLength={BIO_MAX_LENGTH}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short note about yourself (optional)"
            />
          </div>
          <Button type="submit" disabled={submitting || !name.trim() || !isDirty}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
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
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <IconTitle icon={KeyRound}>Change password</IconTitle>
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
          {(() => {
            const disabledReason = !currentPassword || !newPassword || !confirmPassword
              ? "Fill in all fields to update your password"
              : null;
            return (
              <div className="space-y-1.5">
                <Button type="submit" disabled={submitting || !!disabledReason} title={disabledReason ?? undefined}>
                  {submitting ? "Updating…" : "Update password"}
                </Button>
                {disabledReason && <p className="text-xs text-muted-foreground">{disabledReason}.</p>}
              </div>
            );
          })()}
        </form>
      </CardContent>
    </Card>
  );
}

interface SessionRow {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  location: string | null;
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
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <IconTitle icon={MonitorSmartphone}>Active sessions</IconTitle>
          <CardDescription>Devices currently signed in to your account.</CardDescription>
        </div>
        {hasOtherSessions && (
          <Button variant="outline" size="sm" onClick={handleRevokeOthers} disabled={revokingOthers} className="shrink-0">
            {revokingOthers ? "Signing out…" : "Sign out all other sessions"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-1.5">
            {sessions.map((session) => {
              const Icon = isMobileUserAgent(session.userAgent) ? Smartphone : Laptop;
              const label = browserLabel(session.userAgent);
              const metaParts = [
                session.location,
                session.ipAddress,
                !label ? `First seen ${shortDate(session.createdAt)}` : null,
                `Active ${relativeTime(session.lastActiveAt)}`,
              ].filter(Boolean);
              return (
                <div
                  key={session.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-150",
                    session.isCurrent ? "border-primary/30 bg-primary-bg/40" : "border-border hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        session.isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{label ?? "Unknown device"}</p>
                        {session.isCurrent && <Badge tone="success">This device</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{metaParts.join(" · ")}</p>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(session)}
                      disabled={busyId === session.id}
                      className="hover:bg-danger-bg hover:text-danger"
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

function parseCategoryPrefs(raw: string | null): NotificationCategoryPrefs {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as NotificationCategoryPrefs;
  } catch {
    return {};
  }
}

type NotificationChannel = "inApp" | "email";

function NotificationPrefsCard() {
  const { user } = useAuth();
  const [updateMyProfile] = useMutation(UPDATE_MY_PROFILE_MUTATION);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  if (!user) return null;

  const categoryPrefs = parseCategoryPrefs(user.notificationCategoryPrefs);
  const visibleCategories = NOTIFICATION_CATEGORIES.filter((c) => !c.hrOnly || hasModuleAccess(user.role, "hrms"));

  async function persist(
    key: string,
    input: Partial<{ notifyInAppEnabled: boolean; notifyEmailEnabled: boolean; notificationCategoryPrefs: NotificationCategoryPrefs }>,
  ) {
    if (!user) return;
    setSavingKey(key);
    try {
      await updateMyProfile({
        variables: {
          input: {
            name: user.name,
            ...input,
            ...(input.notificationCategoryPrefs
              ? { notificationCategoryPrefs: JSON.stringify(input.notificationCategoryPrefs) }
              : {}),
          },
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update preference");
    } finally {
      setSavingKey(null);
    }
  }

  function handleCategoryToggle(categoryKey: string, channel: NotificationChannel, value: boolean) {
    const current = categoryPrefs[categoryKey] ?? { inApp: true, email: true };
    const next: NotificationCategoryPrefs = { ...categoryPrefs, [categoryKey]: { ...current, [channel]: value } };
    void persist(`${categoryKey}-${channel}`, { notificationCategoryPrefs: next });
  }

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <IconTitle icon={Bell}>Notification preferences</IconTitle>
        <CardDescription>Choose how you're notified about activity relevant to you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <NotificationChannelSection
          title="In-app notifications"
          description="Show a badge and list in the notification bell."
          channel="inApp"
          masterChecked={user.notifyInAppEnabled}
          masterSaving={savingKey === "notifyInAppEnabled"}
          onMasterChange={(v) => void persist("notifyInAppEnabled", { notifyInAppEnabled: v })}
          categories={visibleCategories}
          categoryPrefs={categoryPrefs}
          savingKey={savingKey}
          onCategoryChange={handleCategoryToggle}
        />
        <Separator />
        <NotificationChannelSection
          title="Email notifications"
          description="Also send an email for the same events."
          channel="email"
          masterChecked={user.notifyEmailEnabled}
          masterSaving={savingKey === "notifyEmailEnabled"}
          onMasterChange={(v) => void persist("notifyEmailEnabled", { notifyEmailEnabled: v })}
          categories={visibleCategories}
          categoryPrefs={categoryPrefs}
          savingKey={savingKey}
          onCategoryChange={handleCategoryToggle}
        />
      </CardContent>
    </Card>
  );
}

function NotificationChannelSection({
  title,
  description,
  channel,
  masterChecked,
  masterSaving,
  onMasterChange,
  categories,
  categoryPrefs,
  savingKey,
  onCategoryChange,
}: {
  title: string;
  description: string;
  channel: NotificationChannel;
  masterChecked: boolean;
  masterSaving: boolean;
  onMasterChange: (value: boolean) => void;
  categories: typeof NOTIFICATION_CATEGORIES;
  categoryPrefs: NotificationCategoryPrefs;
  savingKey: string | null;
  onCategoryChange: (categoryKey: string, channel: NotificationChannel, value: boolean) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-transparent p-2 transition-colors duration-150 hover:border-border hover:bg-muted/30">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Switch
          checked={masterChecked}
          onCheckedChange={onMasterChange}
          disabled={masterSaving}
          aria-label={`Toggle ${title}`}
        />
      </div>
      <div className="ml-1 space-y-1 border-l-2 border-border pl-3.5">
        {categories.map((cat) => {
          const pref = categoryPrefs[cat.key] ?? { inApp: true, email: true };
          const key = `${cat.key}-${channel}`;
          return (
            <div
              key={cat.key}
              className={cn(
                "flex items-center justify-between gap-4 rounded-md px-1.5 py-1 transition-colors duration-150",
                !masterChecked ? "opacity-50" : "hover:bg-card",
              )}
            >
              <p className="text-xs text-muted-foreground">{cat.label}</p>
              <Switch
                checked={pref[channel]}
                onCheckedChange={(v) => onCategoryChange(cat.key, channel, v)}
                disabled={!masterChecked || savingKey === key}
                aria-label={`Toggle ${cat.label} ${channel === "inApp" ? "in-app" : "email"} notifications`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AuditLogRow {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityType: string;
  entityId: string;
  entityName: string | null;
  before: string | null;
  after: string | null;
  createdAt: string;
}

const ACTION_TONE: Record<AuditLogRow["action"], "success" | "info" | "danger"> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "danger",
};

const ACTION_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
] as const;

/** "SalesOrder" -> "Sales Order", "GoodsReceivedNote" -> "Goods Received Note" */
function humanizeEntityType(entityType: string): string {
  return entityType.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function MyActivityCard() {
  const [actionFilter, setActionFilter] = useState<(typeof ACTION_FILTERS)[number]["value"]>("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const variables = {
    limit: ACTIVITY_PAGE_SIZE,
    action: actionFilter === "ALL" ? undefined : actionFilter,
    from: fromDate ? new Date(fromDate).toISOString() : undefined,
    to: toDate ? new Date(`${toDate}T23:59:59.999`).toISOString() : undefined,
  };

  const { data, loading, fetchMore } = useQuery<{ myAuditActivity: { items: AuditLogRow[]; hasMore: boolean } }>(
    MY_AUDIT_ACTIVITY_QUERY,
    {
      variables: { ...variables, offset: 0 },
      onCompleted: (d) => {
        setRows(d.myAuditActivity.items);
        setHasMore(d.myAuditActivity.hasMore);
      },
    },
  );

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const { data: more } = await fetchMore({ variables: { ...variables, offset: rows.length } });
      setRows((prev) => [...prev, ...more.myAuditActivity.items]);
      setHasMore(more.myAuditActivity.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }

  const displayRows = data ? rows : [];

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <IconTitle icon={History}>My activity</IconTitle>
        <CardDescription>A record of changes you've made across the app.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
            {ACTION_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setActionFilter(f.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150 ${
                  actionFilter === f.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <Label htmlFor="activityFrom" className="text-xs">
              From
            </Label>
            <Input id="activityFrom" type="date" className="h-8 w-36" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="activityTo" className="text-xs">
              To
            </Label>
            <Input id="activityTo" type="date" className="h-8 w-36" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          {(fromDate || toDate) && (
            <Button variant="ghost" size="sm" onClick={() => { setFromDate(""); setToDate(""); }}>
              Clear dates
            </Button>
          )}
        </div>

        {loading && displayRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : displayRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity found for this filter.</p>
        ) : (
          <div className="space-y-1.5">
            {displayRows.map((row) => {
              const expanded = expandedId === row.id;
              const expandable = !!(row.before || row.after);
              return (
                <div
                  key={row.id}
                  className={cn(
                    "overflow-hidden rounded-lg border border-border transition-colors duration-150",
                    expanded ? "border-primary/30" : "hover:bg-muted/40",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => expandable && setExpandedId(expanded ? null : row.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left",
                      !expandable && "cursor-default",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Badge tone={ACTION_TONE[row.action]}>{row.action}</Badge>
                      <span className="truncate text-sm">
                        {humanizeEntityType(row.entityType)}:{" "}
                        <span className={row.entityName ? "" : "text-muted-foreground"}>
                          {row.entityName ?? `#${row.entityId.slice(0, 8)}`}
                        </span>
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-muted-foreground" title={exactDateTime(row.createdAt)}>
                        {relativeTime(row.createdAt)}
                      </span>
                      {expandable && (
                        <ChevronDown
                          className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", expanded && "rotate-180")}
                        />
                      )}
                    </div>
                  </button>
                  {expanded && expandable && (
                    <div className="grid animate-in fade-in-0 slide-in-from-top-1 gap-3 border-t border-border px-3 py-3 duration-200 sm:grid-cols-2">
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
            {hasMore && (
              <div className="pt-2 text-center">
                <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
