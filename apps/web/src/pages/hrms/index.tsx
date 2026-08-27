import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CalendarClock, IdCard, UserPlus, Wallet } from "lucide-react";
import { Card, CardContent, cn } from "@abms/ui";

const TABS = [
  {
    key: "employees",
    label: "Employees",
    icon: IdCard,
    description: "Employee directory — roles, departments, and contact details.",
  },
  {
    key: "attendance",
    label: "Attendance",
    icon: CalendarClock,
    description: "Daily check-in/check-out records and shift tracking.",
  },
  {
    key: "leave",
    label: "Leave",
    icon: UserPlus,
    description: "Leave requests, balances, and approvals.",
  },
  {
    key: "payroll",
    label: "Payroll",
    icon: Wallet,
    description: "Salary runs, payslips, and advances.",
  },
] as const;

export default function HrmsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.split("/")[2];
  const tab = TABS.find((t) => t.key === segment)?.key ?? "employees";

  useEffect(() => {
    if (!TABS.some((t) => t.key === segment)) {
      navigate(`/hrms/${tab}`, { replace: true });
    }
  }, [segment, tab, navigate]);

  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">HRMS</h1>
        <p className="text-sm text-muted-foreground">Employees, attendance, leave, and payroll — in one place.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            to={`/hrms/${t.key}`}
            className={cn(
              "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              t.key === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <active.icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">{active.label} — coming soon</p>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">{active.description}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
