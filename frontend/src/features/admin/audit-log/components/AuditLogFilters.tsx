import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Filter, X, Activity, Layers, Globe, Calendar } from "lucide-react";
import { DatePicker } from "./DatePicker";
import { MultiSelect, type MultiSelectOption } from "./MultiSelect";
import type { AuditFilterOptions } from "../services/auditLog.service";
import type { AuditLogQueryState } from "../schemas/auditLog.schema";

interface AuditLogFiltersProps {
  query: AuditLogQueryState;
  options?: AuditFilterOptions;
  activeCount: number;
  onChange: (patch: Partial<AuditLogQueryState>) => void;
  onClear: () => void;
}

export function AuditLogFilters({
  query,
  options,
  activeCount,
  onChange,
  onClear,
}: AuditLogFiltersProps) {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState(query.search ?? "");
  const [dateFromInput, setDateFromInput] = useState(query.dateFrom ?? "");
  const [dateToInput, setDateToInput] = useState(query.dateTo ?? "");
  const lastPublishedRange = useRef(
    `${query.dateFrom ?? ""}|${query.dateTo ?? ""}`,
  );
  const lastPublishedSearch = useRef(query.search ?? "");

  const debouncedSearch = useDebounce(searchInput, 300);

  const dateError =
    dateFromInput && dateToInput && dateToInput < dateFromInput
      ? t("audit.invalidDateRange")
      : null;

  const pushDateRange = (from: string, to: string) => {
    if (from && to) {
      if (to < from) return;
      if (query.dateFrom !== from || query.dateTo !== to) {
        lastPublishedRange.current = `${from}|${to}`;
        onChange({ dateFrom: from, dateTo: to });
      }
      return;
    }
    if (query.dateFrom || query.dateTo) {
      lastPublishedRange.current = "|";
      onChange({ dateFrom: undefined, dateTo: undefined });
    }
  };

  const handleDateFromChange = (value: string) => {
    setDateFromInput(value);
    pushDateRange(value, dateToInput);
  };

  const handleDateToChange = (value: string) => {
    setDateToInput(value);
    pushDateRange(dateFromInput, value);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setDateFromInput("");
    setDateToInput("");
    lastPublishedSearch.current = "";
    onClear();
  };

  useEffect(() => {
    const incoming = `${query.dateFrom ?? ""}|${query.dateTo ?? ""}`;
    if (incoming === lastPublishedRange.current) return;
    lastPublishedRange.current = incoming;
    setDateFromInput(query.dateFrom ?? "");
    setDateToInput(query.dateTo ?? "");
  }, [query.dateFrom, query.dateTo]);

  useEffect(() => {
    const next = debouncedSearch || undefined;
    if ((query.search ?? "") !== (next ?? "")) {
      lastPublishedSearch.current = next ?? "";
      onChange({ search: next });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    const incoming = query.search ?? "";
    if (incoming === lastPublishedSearch.current) return;
    lastPublishedSearch.current = incoming;
    setSearchInput(incoming);
  }, [query.search]);

  const actionOptions: MultiSelectOption[] = (options?.actions ?? []).map(
    (value) => ({ value, label: value }),
  );
  const entityTypeOptions: MultiSelectOption[] = (
    options?.entityTypes ?? []
  ).map((value) => ({ value, label: value }));

  return (
    <section
      className="relative z-30 rounded-xl border border-border/60 bg-card/90 shadow-2xs backdrop-blur-xs p-4 sm:p-5 space-y-4"
      aria-label={t("audit.filtersSection")}
      data-testid="audit-filters"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">{t("audit.filtersSection")}</h2>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Badge variant="secondary" className="gap-1 px-2.5 py-0.5 font-medium" data-testid="active-filters-count">
              <span>{t("audit.activeFilters", { count: activeCount })}</span>
            </Badge>
          )}
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              data-testid="btn-clear-filters"
            >
              <X className="h-3.5 w-3.5" />
              {t("audit.clearFilters")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>div]:min-w-0">
        <div className="space-y-1.5">
          <Label htmlFor="audit-search" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground/80" />
            {t("audit.search")}
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
            <Input
              id="audit-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("audit.searchPlaceholder")}
              maxLength={255}
              className="pl-9 text-sm rounded-lg"
              data-testid="audit-search"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-muted-foreground/80" />
            {t("audit.filterByAction")}
          </Label>
          <MultiSelect
            label={t("audit.filterByAction")}
            options={actionOptions}
            value={query.action ?? []}
            onChange={(value) => onChange({ action: value })}
            clearLabel={t("audit.clearSelection")}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-muted-foreground/80" />
            {t("audit.filterByEntityType")}
          </Label>
          <MultiSelect
            label={t("audit.filterByEntityType")}
            options={entityTypeOptions}
            value={query.entityType ?? []}
            onChange={(value) => onChange({ entityType: value })}
            clearLabel={t("audit.clearSelection")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="audit-ip-filter" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground/80" />
            {t("audit.filterByIp")}
          </Label>
          <Input
            id="audit-ip-filter"
            value={query.ipAddress ?? ""}
            onChange={(e) =>
              onChange({ ipAddress: e.target.value || undefined })
            }
            placeholder={t("audit.filterByIpPlaceholder")}
            maxLength={45}
            className="text-sm rounded-lg font-mono"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2 lg:col-span-4 border-t border-border/40 pt-3">
          <Label htmlFor="audit-date-from" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground/80" />
            {t("audit.filterByDate")}
          </Label>
          <div className="grid min-w-0 grid-cols-1 gap-2 max-w-xl sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
            <DatePicker
              id="audit-date-from"
              label={t("audit.dateFrom")}
              value={dateFromInput}
              onChange={handleDateFromChange}
              invalid={Boolean(dateError)}
            />
            <span className="hidden text-muted-foreground sm:inline font-medium text-center px-1">–</span>
            <DatePicker
              id="audit-date-to"
              align="right"
              label={t("audit.dateTo")}
              value={dateToInput}
              onChange={handleDateToChange}
              invalid={Boolean(dateError)}
            />
          </div>
          {dateError && (
            <p
              className="text-sm text-destructive font-medium"
              role="alert"
              aria-live="polite"
            >
              {dateError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}