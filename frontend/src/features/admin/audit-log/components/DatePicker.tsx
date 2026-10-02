import { useMemo, useState } from "react";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  invalid?: boolean;
  /** Which edge the calendar popup opens from (keeps it inside the viewport). */
  align?: "left" | "right";
  className?: string;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Fixed Japanese calendar text to match the native picker design exactly.
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;
const REIWA_START_YEAR = 2019;
const HEISEI_START_YEAR = 1989;

function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** e.g. "2026年(令和8年) 9月" — matches the native picker header. */
function formatMonthLabel(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (year >= REIWA_START_YEAR) {
    const reiwa = year - REIWA_START_YEAR + 1;
    return `${year}年(令和${reiwa}年) ${month}月`;
  }
  if (year >= HEISEI_START_YEAR) {
    const heisei = year - HEISEI_START_YEAR + 1;
    return `${year}年(平成${heisei}年) ${month}月`;
  }
  return `${year}年 ${month}月`;
}

/** e.g. "2026年9月15日" */
function formatDayLabel(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

interface DayCell {
  date: Date;
  iso: string;
  day: number;
  inCurrentMonth: boolean;
}

export function DatePicker({
  id,
  value,
  onChange,
  label,
  invalid,
  align = "left",
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => new Date());

  const openPicker = () => {
    const base = parseIsoDate(value) ?? new Date();
    setViewMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setOpen(true);
  };

  // Month navigation only changes the visible month. Unlike the native browser
  // picker it must never rewrite the selected date until a day is clicked.
  const goToPreviousMonth = () => {
    setViewMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
    );
  };

  const goToNextMonth = () => {
    setViewMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
    );
  };

  const monthLabel = formatMonthLabel(viewMonth);

  // Full six-week grid including leading/trailing adjacent-month days, matching
  // the native browser picker layout.
  const dayCells = useMemo<DayCell[]>(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const cells: DayCell[] = [];

    for (let i = firstWeekday - 1; i >= 0; i -= 1) {
      const day = daysInPrevMonth - i;
      const date = new Date(year, month - 1, day);
      cells.push({ date, iso: toIsoDate(date), day, inCurrentMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      cells.push({ date, iso: toIsoDate(date), day, inCurrentMonth: true });
    }
    let trailing = 1;
    while (cells.length < 42) {
      const date = new Date(year, month + 1, trailing);
      cells.push({
        date,
        iso: toIsoDate(date),
        day: trailing,
        inCurrentMonth: false,
      });
      trailing += 1;
    }
    return cells;
  }, [viewMonth]);

  const todayIso = toIsoDate(new Date());

  // Every day stays selectable; an inverted range is only reported via the
  // inline error message on the filter panel (no calendar day disabling).
  const handleDayClick = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    onChange(toIsoDate(today));
    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setOpen(false);
  };

  return (
    <div className={cn("relative min-w-0", className)}>
      {/* Icon sits at the trailing edge so the yyyy/mm/dd text is read first,
          exactly like the commission report's native date inputs. */}
      <button
        type="button"
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 p-1 text-muted-foreground"
        onClick={openPicker}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Calendar className="h-4 w-4" aria-hidden="true" />
      </button>
      <Input
        id={id}
        type="date"
        readOnly
        className="min-w-0 w-full pr-9 text-left [&::-webkit-calendar-picker-indicator]:hidden"
        value={value}
        onClick={openPicker}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        aria-invalid={invalid}
      />
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label={label}
            className={cn(
              "absolute top-full z-40 mt-1 w-[300px] max-w-[calc(100vw-2rem)] rounded-md border bg-background shadow-lg",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            {/* Header: era month label + prev/next arrows */}
            <div className="flex items-center justify-between px-3 pt-3 pb-1">
              <span
                className="text-sm font-bold"
                data-testid="date-picker-month-label"
              >
                {monthLabel}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  className="rounded p-1 text-foreground hover:bg-accent"
                  onClick={goToPreviousMonth}
                  aria-label="前の月"
                  data-testid="date-picker-prev-month"
                >
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-foreground hover:bg-accent"
                  onClick={goToNextMonth}
                  aria-label="次の月"
                  data-testid="date-picker-next-month"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Weekday header: Sunday red, Saturday blue */}
            <div className="grid grid-cols-7 px-2 pb-1">
              {WEEKDAYS.map((weekday, index) => (
                <span
                  key={weekday}
                  className={cn(
                    "py-1 text-center text-xs font-semibold",
                    index === 0 && "text-red-600",
                    index === 6 && "text-blue-600",
                    index !== 0 && index !== 6 && "text-foreground",
                  )}
                >
                  {weekday}
                </span>
              ))}
            </div>

            {/* Day grid with adjacent-month days shown muted */}
            <div className="grid grid-cols-7 justify-items-center gap-y-1 px-2 pb-2">
              {dayCells.map((cell) => {
                const selected = cell.iso === value;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    data-day={cell.day}
                    onClick={() => handleDayClick(cell.iso)}
                    aria-label={formatDayLabel(cell.date)}
                    aria-pressed={selected}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md text-sm",
                      !cell.inCurrentMonth && "text-muted-foreground/40",
                      cell.inCurrentMonth &&
                        !selected &&
                        "text-foreground hover:bg-accent",
                      cell.iso === todayIso &&
                        !selected &&
                        cell.inCurrentMonth &&
                        "font-semibold",
                      selected &&
                        "rounded-md bg-neutral-700 font-medium text-white hover:bg-neutral-700 hover:text-white",
                    )}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Footer: Clear / Today links */}
            <div className="flex items-center justify-between border-t px-3 py-2">
              <button
                type="button"
                onClick={handleClear}
                className="text-sm text-blue-600 hover:underline"
                data-testid="date-picker-clear"
              >
                クリア
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="text-sm text-blue-600 hover:underline"
                data-testid="date-picker-today"
              >
                今日
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
