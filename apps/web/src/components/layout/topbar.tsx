import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Bell, LogOut, Menu, Moon, Sun } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@abms/ui";
import { ROLE_LABELS } from "@abms/shared";
import { useAuth } from "../../providers/auth-provider";
import { useTheme } from "../../providers/theme-provider";

const UNREAD_NOTIFICATION_COUNT_QUERY = gql`
  query UnreadNotificationCount {
    unreadNotificationCount
  }
`;

const MY_NOTIFICATIONS_QUERY = gql`
  query MyNotificationsPreview($limit: Int) {
    myNotifications(limit: $limit) {
      id
      title
      message
      isRead
      link
      createdAt
    }
  }
`;

const MARK_NOTIFICATION_READ_MUTATION = gql`
  mutation MarkNotificationRead($id: String!) {
    markNotificationRead(id: $id)
  }
`;

const MARK_ALL_NOTIFICATIONS_READ_MUTATION = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;

interface NotificationPreview {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const ICON_BUTTON = "h-8 w-8 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-700";

function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: countData, refetch: refetchCount } = useQuery<{ unreadNotificationCount: number }>(
    UNREAD_NOTIFICATION_COUNT_QUERY,
    { pollInterval: 30_000 },
  );
  const { data: listData, refetch: refetchList } = useQuery<{ myNotifications: NotificationPreview[] }>(
    MY_NOTIFICATIONS_QUERY,
    { variables: { limit: 5 }, skip: !open },
  );
  const [markRead] = useMutation(MARK_NOTIFICATION_READ_MUTATION);
  const [markAllRead] = useMutation(MARK_ALL_NOTIFICATIONS_READ_MUTATION);

  const unreadCount = countData?.unreadNotificationCount ?? 0;
  const notifications = listData?.myNotifications ?? [];

  async function handleRowClick(notification: NotificationPreview) {
    if (!notification.isRead) {
      await markRead({ variables: { id: notification.id } });
      await refetchCount();
    }
    if (notification.link) {
      navigate(notification.link);
    }
  }

  async function handleMarkAllRead() {
    await markAllRead();
    await Promise.all([refetchCount(), refetchList()]);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className={`relative flex items-center justify-center ${ICON_BUTTON}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button type="button" onClick={handleMarkAllRead} className="text-xs font-medium text-primary hover:underline">
              Mark all as read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem key={n.id} onClick={() => handleRowClick(n)} className="flex-col items-start gap-0.5">
              <div className="flex w-full items-center gap-2">
                {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                <span className={`truncate text-sm ${n.isRead ? "font-normal" : "font-semibold"}`}>{n.title}</span>
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{relativeTime(n.createdAt)}</span>
              </div>
              <p className="line-clamp-2 pl-3.5 text-xs text-muted-foreground">{n.message}</p>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/profile?tab=notifications")} className="justify-center text-sm font-medium text-primary">
          View all
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Icons only — every page already renders its own heading, so a second
 * auto-generated title here was pure duplication (see Dashboard/CRM/etc). */
export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4 sm:px-6">
      <Button variant="ghost" size="icon" aria-label="Open menu" onClick={onMenuClick} className={`${ICON_BUTTON} lg:hidden`}>
        <Menu className="h-4 w-4" />
      </Button>
      <div className="ml-auto flex items-center gap-2">
      <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggleTheme} className={ICON_BUTTON}>
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <NotificationBell />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user ? initials(user.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden flex-col items-start sm:flex">
              <span className="text-sm font-bold leading-tight text-foreground">{user?.name}</span>
              <span className="text-xs leading-tight text-muted-foreground">
                {user ? ROLE_LABELS[user.role] : ""}
              </span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{user?.name}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {user ? ROLE_LABELS[user.role] : ""}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void logout()}>
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  );
}
