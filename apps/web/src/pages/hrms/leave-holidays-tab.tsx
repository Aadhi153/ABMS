import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Building2, Calendar, CalendarOff, ChevronDown, ChevronUp, Globe2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  cn,
  toast,
} from "@abms/ui";
import { CARD_HOVER, BUTTON_PRESS } from "../products/form-motion";
import type { Holiday, WeeklyOff } from "./types";
import { HOLIDAY_TYPE_OPTIONS, WEEKDAY_LABELS } from "./types";
import { fmtDate } from "./hrms-helpers";

const HOLIDAYS_QUERY = gql`
  query HolidaysData($filter: HolidayFilterInput) {
    holidays(filter: $filter) {
      id
      name
      date
      type
      description
      paid
    }
    weeklyOffs {
      id
      dayOfWeek
    }
  }
`;
const CREATE_HOLIDAY = gql`
  mutation CreateHolidayTab($input: CreateHolidayInput!) {
    createHoliday(input: $input) {
      id
    }
  }
`;
const UPDATE_HOLIDAY = gql`
  mutation UpdateHolidayTab($id: String!, $input: CreateHolidayInput!) {
    updateHoliday(id: $id, input: $input) {
      id
    }
  }
`;
const DELETE_HOLIDAY = gql`
  mutation DeleteHolidayTab($id: String!) {
    deleteHoliday(id: $id)
  }
`;
const SET_WEEKLY_OFFS = gql`
  mutation SetWeeklyOffsTab($input: SetWeeklyOffsInput!) {
    setWeeklyOffs(input: $input) {
      id
    }
  }
`;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const STANDARD_HOLIDAYS = [
  { name: "Republic Day", month: 1, day: 26, type: "PUBLIC", description: "Celebrates adoption of Constitution" },
  { name: "Independence Day", month: 8, day: 15, type: "PUBLIC", description: "National Independence Day" },
  { name: "Gandhi Jayanti", month: 10, day: 2, type: "PUBLIC", description: "Birth anniversary of Mahatma Gandhi" },
  { name: "Labour Day", month: 5, day: 1, type: "OPTIONAL", description: "International Workers' Day" },
  { name: "Christmas", month: 12, day: 25, type: "PUBLIC", description: "Christmas Day" },
];

const EMPTY_FORM = { name: "", date: "", type: "PUBLIC", description: "", paid: true };

export default function LeaveHolidaysTab() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [showSummary, setShowSummary] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [weeklyOffOpen, setWeeklyOffOpen] = useState(false);
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);

  const { data, loading, refetch } = useQuery<{ holidays: Holiday[]; weeklyOffs: WeeklyOff[] }>(HOLIDAYS_QUERY, { variables: { filter: { year } } });
  const [createHoliday] = useMutation(CREATE_HOLIDAY);
  const [updateHoliday] = useMutation(UPDATE_HOLIDAY);
  const [deleteHoliday] = useMutation(DELETE_HOLIDAY);
  const [setWeeklyOffs] = useMutation(SET_WEEKLY_OFFS);

  const holidays = data?.holidays ?? [];
  const weeklyOffs = data?.weeklyOffs ?? [];

  const filtered = useMemo(
    () =>
      holidays.filter((h) => {
        if (typeFilter !== "ALL" && h.type !== typeFilter) return false;
        if (search && !h.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [holidays, typeFilter, search],
  );

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(h: Holiday) {
    setEditingId(h.id);
    setForm({ name: h.name, date: h.date.slice(0, 10), type: h.type, description: h.description ?? "", paid: h.paid });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.date) {
      toast.error("Name and date are required");
      return;
    }
    setSubmitting(true);
    try {
      const input = { name: form.name, date: form.date, type: form.type, description: form.description || undefined, paid: form.paid };
      if (editingId) {
        await updateHoliday({ variables: { id: editingId, input } });
        toast.success("Holiday updated");
      } else {
        await createHoliday({ variables: { input } });
        toast.success("Holiday added");
      }
      setDialogOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save holiday");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteHoliday({ variables: { id: deleteTarget.id } });
      toast.success("Holiday removed");
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove holiday");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSyncHolidays() {
    setSubmitting(true);
    try {
      const existingKeys = new Set(holidays.map((h) => h.name));
      const toCreate = STANDARD_HOLIDAYS.filter((h) => !existingKeys.has(h.name));
      for (const h of toCreate) {
        const date = `${year}-${String(h.month).padStart(2, "0")}-${String(h.day).padStart(2, "0")}`;
        await createHoliday({ variables: { input: { name: h.name, date, type: h.type, description: h.description, paid: true } } });
      }
      toast.success(toCreate.length ? `Synced ${toCreate.length} standard holiday${toCreate.length === 1 ? "" : "s"}` : "Standard holidays already present");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync holidays");
    } finally {
      setSubmitting(false);
    }
  }

  function openWeeklyOffs() {
    setWeeklyOffDays(weeklyOffs.map((w) => w.dayOfWeek));
    setWeeklyOffOpen(true);
  }

  function toggleDay(day: number) {
    setWeeklyOffDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function handleSaveWeeklyOffs() {
    setSubmitting(true);
    try {
      await setWeeklyOffs({ variables: { input: { daysOfWeek: weeklyOffDays } } });
      toast.success("Weekly offs updated");
      setWeeklyOffOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update weekly offs");
    } finally {
      setSubmitting(false);
    }
  }

  const stats = [
    { label: "Total Holidays", sub: `for ${year}`, value: holidays.length, icon: Calendar, color: "text-primary" },
    { label: "Public / National", sub: "gazetted holidays", value: holidays.filter((h) => h.type === "PUBLIC").length, icon: Globe2, color: "text-success" },
    { label: "Company Leaves", sub: "organisation-declared", value: holidays.filter((h) => h.type === "COMPANY").length, icon: Building2, color: "text-info" },
    { label: "Optional", sub: "restricted holidays", value: holidays.filter((h) => h.type === "OPTIONAL" || h.type === "RESTRICTED").length, icon: CalendarOff, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Holiday Calendar</h2>
          <p className="text-sm text-muted-foreground">Holidays and company leaves for {year}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSummary((s) => !s)} className={cn("gap-1.5", BUTTON_PRESS)}>
            {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showSummary ? "Hide Summary" : "Show Summary"}
          </Button>
          <Button variant="outline" size="sm" onClick={openWeeklyOffs} className={cn("gap-1.5", BUTTON_PRESS)}>
            <CalendarOff className="h-3.5 w-3.5" />
            Weekly Offs
          </Button>
          <Button variant="outline" size="sm" disabled={submitting} onClick={handleSyncHolidays} className={cn("gap-1.5", BUTTON_PRESS)}>
            <RefreshCw className="h-3.5 w-3.5" />
            Sync Holidays
          </Button>
          <Button onClick={openCreate} className={cn("gap-1.5", BUTTON_PRESS)}>
            <Plus className="h-4 w-4" />
            Add Holiday
          </Button>
        </div>
      </div>

      {showSummary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((w) => (
            <Card key={w.label} className={CARD_HOVER}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{w.label}</p>
                  <w.icon className={cn("h-4 w-4 shrink-0", w.color)} />
                </div>
                <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{w.value}</p>
                <p className="text-xs text-muted-foreground">{w.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input placeholder="Search holidays…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <div className="flex items-center gap-2">
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {HOLIDAY_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className={BUTTON_PRESS} onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Holiday</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Description</th>
                  <th className="px-4 py-2.5 font-medium">Paid</th>
                  <th className="px-4 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No holidays found.
                    </td>
                  </tr>
                )}
                {filtered.map((h) => (
                  <tr key={h.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">{fmtDate(h.date)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(h.date).toLocaleDateString(undefined, { weekday: "short" })}</p>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{h.name}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={h.type === "PUBLIC" ? "success" : h.type === "COMPANY" ? "info" : "muted"}>{h.type}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{h.description ?? "—"}</td>
                    <td className="px-4 py-2.5">{h.paid ? <span className="text-success">Yes</span> : <span className="text-muted-foreground">No</span>}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className={cn("h-7 w-7", BUTTON_PRESS)} onClick={() => openEdit(h)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className={cn("h-7 w-7", BUTTON_PRESS)} onClick={() => setDeleteTarget(h)}>
                          <Trash2 className="h-3.5 w-3.5 text-danger" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
          </DialogHeader>
          <p className="-mt-2 text-sm text-muted-foreground">Add a new holiday or company leave.</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Holiday Name *</Label>
              <Input placeholder="e.g. Republic Day" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public / National</SelectItem>
                  <SelectItem value="COMPANY">Company Leave</SelectItem>
                  <SelectItem value="OPTIONAL">Optional</SelectItem>
                  <SelectItem value="RESTRICTED">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input placeholder="e.g. National holiday" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.paid} onCheckedChange={(v) => setForm({ ...form, paid: v })} />
              Paid Holiday
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : editingId ? "Save Changes" : "Add Holiday"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={weeklyOffOpen} onOpenChange={setWeeklyOffOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Weekly Offs</DialogTitle>
          </DialogHeader>
          <p className="-mt-2 text-sm text-muted-foreground">Choose the days of the week that are non-working for the organisation.</p>
          <div className="space-y-1.5">
            {WEEKDAY_LABELS.map((label, idx) => (
              <label key={label} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                {label}
                <Switch checked={weeklyOffDays.includes(idx)} onCheckedChange={() => toggleDay(idx)} />
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWeeklyOffOpen(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleSaveWeeklyOffs} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove holiday?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove <span className="font-medium text-foreground">{deleteTarget?.name}</span> from the holiday calendar.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
