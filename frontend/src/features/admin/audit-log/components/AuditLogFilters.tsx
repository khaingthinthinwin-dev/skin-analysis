import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  // Single merged search box: user name, email, action and entity type are all
  // matched by the `search` query parameter (see the backend `buildWhere`).
  const [searchInput, setSearchInput] = useState(query.search ?? "");
  const [dateFromInput, setDateFromInput] = useState(query.dateFrom ?? "");
  const [dateToInput, setDateToInput] = useState(query.dateTo ?? "");
  // Range this panel last sent to the query, so the pickers can follow external
  // changes (Clear Filters, drill-down navigation, browser back/forward) without
  // discarding a draft the user is still editing.
  const lastPublishedRange = useRef(
    `${query.dateFrom ?? ""}|${query.dateTo ?? ""}`,
  );
  // Search term this panel last sent to the query, so an external change
  // (Clear Filters, drill-down, shared URL, back/forward) can be told apart
  // from an echo of this field's own debounced push.
  const lastPublishedSearch = useRef(query.search ?? "");

  const debouncedSearch = useDebounce(searchInput, 300);

  const dateError =
    dateFromInput && dateToInput && dateToInput < dateFromInput
      ? t("audit.invalidDateRange")
      : null;

  // BR-AUDIT-023: the date range is optional, but both ends become required as
  // soon as either one is picked. Both pickers therefore keep their own value
  // (same behaviour as the commission report filter panel) and the pair is only
  // pushed to the query once it is complete and correctly ordered — a
  // half-filled or inverted range is never sent to the API.
  const pushDateRange = (from: string, to: string) => {
    if (from && to) {
      // Wait for the user to fix an inverted range instead of querying with it.
      if (to < from) return;
      if (query.dateFrom !== from || query.dateTo !== to) {
        lastPublishedRange.current = `${from}|${to}`;
        onChange({ dateFrom: from, dateTo: to });
      }
      return;
    }
    // Clearing one end clears the range filter; the other value stays visible so
    // it can be paired with a new date.
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

  // Clear Filters also resets the drafts held by this panel.
  const handleClearFilters = () => {
    setSearchInput("");
    setDateFromInput("");
    setDateToInput("");
    lastPublishedSearch.current = "";
    onClear();
  };

  // Mirror a date range that changed outside this panel (Clear Filters,
  // drill-down navigation, browser back/forward, shared URL) into the pickers.
  useEffect(() => {
    const incoming = `${query.dateFrom ?? ""}|${query.dateTo ?? ""}`;
    if (incoming === lastPublishedRange.current) return;
    lastPublishedRange.current = incoming;
    setDateFromInput(query.dateFrom ?? "");
    setDateToInput(query.dateTo ?? "");
  }, [query.dateFrom, query.dateTo]);

  // Publish the debounced draft to the query (the one merged search box).
  useEffect(() => {
    const next = debouncedSearch || undefined;
    if ((query.search ?? "") !== (next ?? "")) {
      lastPublishedSearch.current = next ?? "";
      onChange({ search: next });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Mirror a search term that changed outside this panel (Clear Filters,
  // drill-down navigation, browser back/forward, shared URL) into the box.
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
      className="-mx-2 rounded-lg border bg-card p-4 sm:-mx-3"
      aria-label={t("audit.filtersSection")}
      data-testid="audit-filters"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t("audit.filtersSection")}</h2>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Badge variant="secondary" data-testid="active-filters-count">
              {t("audit.activeFilters", { count: activeCount })}
            </Badge>
          )}
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              data-testid="btn-clear-filters"
            >
              {t("audit.clearFilters")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>div]:min-w-0">
        <div className="space-y-1.5">
          <Label htmlFor="audit-search">{t("audit.search")}</Label>
          {/* One merged box in the old User slot: the API `search` parameter
              matches user name, email, action and entity type together. */}
          <Input
            id="audit-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("audit.searchPlaceholder")}
            maxLength={255}
            data-testid="audit-search"
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("audit.filterByAction")}</Label>
          <MultiSelect
            label={t("audit.filterByAction")}
            options={actionOptions}
            value={query.action ?? []}
            onChange={(value) => onChange({ action: value })}
            clearLabel={t("audit.clearSelection")}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("audit.filterByEntityType")}</Label>
          <MultiSelect
            label={t("audit.filterByEntityType")}
            options={entityTypeOptions}
            value={query.entityType ?? []}
            onChange={(value) => onChange({ entityType: value })}
            clearLabel={t("audit.clearSelection")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="audit-ip-filter">{t("audit.filterByIp")}</Label>
          <Input
            id="audit-ip-filter"
            value={query.ipAddress ?? ""}
            onChange={(e) =>
              onChange({ ipAddress: e.target.value || undefined })
            }
            placeholder={t("audit.filterByIpPlaceholder")}
            maxLength={45}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="audit-date-from">{t("audit.filterByDate")}</Label>
          {/* Stacked below sm so neither date input gets squeezed on narrow
              phones; side-by-side (with the dash) from sm upwards. */}
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
            <DatePicker
              id="audit-date-from"
              label={t("audit.dateFrom")}
              value={dateFromInput}
              onChange={handleDateFromChange}
              invalid={Boolean(dateError)}
            />
            <span className="hidden text-muted-foreground sm:inline">–</span>
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
              className="text-sm text-destructive"
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