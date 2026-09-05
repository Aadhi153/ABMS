/**
 * User-facing notification categories shown on the Profile > Notifications
 * tab, each with its own in-app/email toggle nested under the channel's
 * master switch. `hrOnly` categories are only shown to roles with HRMS
 * module access (see hasModuleAccess in permissions.ts).
 */
export interface NotificationCategoryDef {
  key: string;
  label: string;
  hrOnly?: boolean;
}

export const NOTIFICATION_CATEGORIES: NotificationCategoryDef[] = [
  { key: "newLead", label: "New lead / customer added" },
  { key: "quoteUpdates", label: "Quote sent / accepted / rejected" },
  { key: "lowStock", label: "Low stock alert" },
  { key: "paymentReceived", label: "Payment received" },
  { key: "leaveRequest", label: "Employee leave request", hrOnly: true },
];

export type NotificationCategoryKey = (typeof NOTIFICATION_CATEGORIES)[number]["key"];

export interface NotificationChannelPref {
  inApp: boolean;
  email: boolean;
}

export type NotificationCategoryPrefs = Partial<Record<NotificationCategoryKey, NotificationChannelPref>>;
