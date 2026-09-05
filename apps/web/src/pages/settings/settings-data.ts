import {
  Bell,
  Building2,
  Contact,
  FileText,
  Inbox,
  Landmark,
  ListChecks,
  ListOrdered,
  Lock,
  Mail,
  MapPin,
  Package,
  Palette,
  Plug,
  Receipt,
  BadgePercent,
  ShieldCheck,
  Users as UsersIcon,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export type SettingBadgeTone = "accent" | "neutral";

export interface SettingCardDef {
  /** Route segment under /settings/:key */
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  badge?: { label: string; tone: SettingBadgeTone };
  /** Admin-only today by virtue of the whole Settings page being Admin-gated; flagged here so
   * the card visually signals that a future Manager-tier role still won't get in (see CLAUDE.md
   * RBAC notes) instead of just disappearing with no explanation. */
  restricted?: boolean;
  /** "ready" renders a real, data-backed view; "placeholder" renders a scaffold pending backend work. */
  status: "ready" | "placeholder";
}

export interface SettingCategoryDef {
  key: string;
  title: string;
  description: string;
  cards: SettingCardDef[];
}

export const SETTINGS_CATEGORIES: SettingCategoryDef[] = [
  {
    key: "general",
    title: "General Settings",
    description: "Configure basic system settings and organizational preferences.",
    cards: [
      {
        key: "organization",
        label: "Organization Settings",
        description: "Company name, logo, address, tax ID, and default currency.",
        icon: Building2,
        status: "ready",
      },
      {
        key: "users",
        label: "Users & Teams",
        description: "Invite teammates, manage roles, and pending invitations.",
        icon: UsersIcon,
        status: "ready",
      },
      {
        key: "permissions",
        label: "Roles & Permissions",
        description: "Module access matrix by role, and the permission audit log.",
        icon: ShieldCheck,
        restricted: true,
        status: "ready",
      },
    ],
  },
  {
    key: "business",
    title: "Business Settings",
    description: "Configure business operations, inventory, and financial configurations.",
    cards: [
      {
        key: "crm",
        label: "CRM Settings",
        description: "Default pipeline stages and lead source options.",
        icon: Contact,
        status: "placeholder",
      },
      {
        key: "approvals",
        label: "Approvals & Workflows",
        description: "Discount approval thresholds, approver groups, and rules.",
        icon: ListChecks,
        badge: { label: "NEW", tone: "accent" },
        status: "placeholder",
      },
      {
        key: "inventory-settings",
        label: "Inventory Settings",
        description: "Stock tracking defaults and reorder point rules.",
        icon: Package,
        status: "placeholder",
      },
      {
        key: "warehouses",
        label: "Warehouses",
        description: "Locations, default warehouse, and manager assignment.",
        icon: Warehouse,
        status: "ready",
      },
      {
        key: "tax-configuration",
        label: "Tax Configuration",
        description: "Tax rates and tax groups used across Products.",
        icon: Receipt,
        status: "ready",
      },
      {
        key: "pricing-discounts",
        label: "Pricing & Discounts",
        description: "Price lists, pricing tiers, and discounts.",
        icon: BadgePercent,
        status: "ready",
      },
      {
        key: "document-templates",
        label: "Document Templates",
        description: "Invoice/quote field visibility, letterhead, payment terms.",
        icon: FileText,
        status: "placeholder",
      },
      {
        key: "document-numbering",
        label: "Document Numbering",
        description: "Invoice, quote, and PO number formats and prefixes.",
        icon: ListOrdered,
        badge: { label: "NEW", tone: "accent" },
        status: "placeholder",
      },
      {
        key: "integrations",
        label: "Integrations",
        description: "WhatsApp Business API and future accounting sync.",
        icon: Plug,
        badge: { label: "API", tone: "neutral" },
        restricted: true,
        status: "placeholder",
      },
      {
        key: "bank-accounts",
        label: "Bank Accounts",
        description: "Accounts, balances, and default-for-receivables.",
        icon: Landmark,
        status: "placeholder",
      },
      {
        key: "branches",
        label: "Branches",
        description: "Company branches and locations.",
        icon: MapPin,
        status: "placeholder",
      },
    ],
  },
  {
    key: "system",
    title: "System Settings",
    description: "System-wide configurations and technical settings.",
    cards: [
      {
        key: "notifications",
        label: "Notifications",
        description: "Per-category toggles, digest options, and quiet hours.",
        icon: Bell,
        status: "placeholder",
      },
      {
        key: "email-configuration",
        label: "Email Configuration",
        description: "SMTP settings and email templates.",
        icon: Mail,
        status: "placeholder",
      },
      {
        key: "channel-inbox",
        label: "Channel Inbox Connection",
        description: "Connect email inboxes for auto-ingestion.",
        icon: Inbox,
        status: "placeholder",
      },
      {
        key: "security",
        label: "Security",
        description: "Password policy, session timeout, and two-factor auth.",
        icon: Lock,
        restricted: true,
        status: "ready",
      },
    ],
  },
  {
    key: "advanced",
    title: "Advanced Settings",
    description: "Advanced features and automation.",
    cards: [
      {
        key: "appearance",
        label: "Appearance",
        description: "Theme, branding, and accent color customization.",
        icon: Palette,
        status: "placeholder",
      },
    ],
  },
];

export const SETTINGS_CARDS_BY_KEY: Record<string, SettingCardDef> = Object.fromEntries(
  SETTINGS_CATEGORIES.flatMap((category) => category.cards.map((card) => [card.key, card])),
);
