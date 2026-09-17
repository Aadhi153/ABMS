import { useMemo, useState } from "react";
import { gql, useQuery } from "@apollo/client";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Badge, Button, Card, CardContent, cn } from "@abms/ui";
import { BUTTON_PRESS } from "../products/form-motion";
import type { Holiday, LeaveRequest } from "./types";
import { monthLabel } from "./hrms-helpers";

const CALENDAR_QUERY = gql`
  query LeaveCalendarData($filter: LeaveRequestFilterInput) {
    leaveRequests(filter: $filter) {
      id
      employeeName
      startDate
      endDate
      status
    }
    holidays {
      id
      name
      date
      type
    }
  }
`;

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function LeaveCalendarTab() {
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const { data, loading, refetch } = useQuery<{ leaveRequests: LeaveRequest[]; holidays: Holiday[] }>(CALENDAR_QUERY, {
    variables: { filter: { status: "APPROVED" } },
  });

  const leaveRequests = data?.leaveRequests ?? [];
  const holidays = data?.holidays ?? [];

  const leavesByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of leaveRequests) {
      const start = new Date(`${r.startDate.slice(0, 10)}T00:00:00`);
      const end = new Date(`${r.endDate.slice(0, 10)}T00:00:00`);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = toDateKey(d);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r.employeeName);
      }
    }
    return map;
  }, [leaveRequests]);

  const holidaysByDay = useMemo(() => {
    const map = new Map<string, Holiday>();
    for (const h of holidays) map.set(h.date.slice(0, 10), h);
    return map;
  }, [holidays]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const todayKey = toDateKey(new Date());

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startOffset + 1;
    const date = new Date(year, month, dayNum);
    return { date, inMonth: dayNum >= 1 && dayNum <= daysInMonth };
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className={BUTTON_PRESS} onClick={() => setCursor(new Date(year, month - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center text-sm font-semibold text-foreground">{monthLabel(month + 1, year)}</span>
            <Button variant="ghost" size="icon" className={BUTTON_PRESS} onClick={() => setCursor(new Date(year, month + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Badge tone="info" className={cn("cursor-pointer", BUTTON_PRESS)} onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
              Today
            </Badge>
          </div>
          <Button variant="outline" size="sm" className={cn("gap-1.5", BUTTON_PRESS)} onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-border bg-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {WEEKDAYS.map((w) => (
              <div key={w} className="bg-muted/40 px-2 py-2 text-center">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-b-md border border-t-0 border-border bg-border">
            {cells.map(({ date, inMonth }, idx) => {
              const key = toDateKey(date);
              const names = leavesByDay.get(key) ?? [];
              const holiday = holidaysByDay.get(key);
              const isToday = key === todayKey;
              return (
                <div key={idx} className={cn("min-h-[110px] bg-card p-1.5", !inMonth && "bg-muted/20 text-muted-foreground")}>
                  <div className="flex items-center justify-between">
                    <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-xs", isToday && "bg-primary font-semibold text-primary-foreground")}>
                      {date.getDate()}
                    </span>
                    {names.length > 0 && (
                      <Badge tone="info" className="px-1.5 py-0 text-[10px]">
                        {names.length} Leave{names.length === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {holiday && (
                      <div className="truncate rounded bg-success-bg px-1.5 py-0.5 text-[10px] font-medium text-success" title={holiday.name}>
                        🎉 {holiday.name}
                      </div>
                    )}
                    {names.slice(0, 3).map((n, i) => (
                      <div key={i} className="truncate rounded bg-info-bg px-1.5 py-0.5 text-[10px] font-medium text-info" title={n}>
                        {n}
                      </div>
                    ))}
                    {names.length > 3 && <p className="px-1.5 text-[10px] text-muted-foreground">+{names.length - 3} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
          {!loading && leaveRequests.length === 0 && holidays.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No approved leave or holidays to display yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
