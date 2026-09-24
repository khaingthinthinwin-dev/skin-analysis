import React, { useReducer, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RevenueKPICards } from "./RevenueKPICards";
import { RevenueTrendChart } from "./RevenueTrendChart";
import { RevenueTargetCard } from "./RevenueTargetCard";
import { PaymentStatusPanel } from "./PaymentStatusPanel";
import { AdPaymentStatusPanel } from "./AdPaymentStatusPanel";
import { AdFeeSummaryCard } from "./AdFeeSummaryCard";
import { PayoutTable } from "./PayoutTable";
import { PayoutConfirmationDialog } from "./PayoutConfirmationDialog";
import { PayoutDetailDialog } from "./PayoutDetailDialog";
import { ExportDialog } from "./ExportDialog";
import { PaginationControls } from "./PaginationControls";

import { useRevenue } from "../hooks/useRevenue";
import { useCommission } from "../hooks/useCommission";
import {
  Payout,
  TrendRange,
  TargetPeriod,
  SaveRevenueTargetPayload,
  ExportReportType,
} from "../services/commission.service";

// --- Payout filter state ---
type PayoutFilterState = {
  status: string;
  merchantId: string;
  period: string;
  searchInput: string;
  searchTerm: string;
  page: number;
};

type PayoutFilterAction =
  | { type: "SET_STATUS"; value: string }
  | { type: "SET_MERCHANT"; value: string }
  | { type: "SET_PERIOD"; value: string }
  | { type: "SET_SEARCH_INPUT"; value: string }
  | { type: "APPLY_SEARCH"; value: string }
  | { type: "SET_PAGE"; value: number }
  | { type: "RESET" };

const initialPayoutFilter: PayoutFilterState = {
  status: "",
  merchantId: "",
  period: "",
  searchInput: "",
  searchTerm: "",
  page: 1,
};

function payoutFilterReducer(state: PayoutFilterState, action: PayoutFilterAction): PayoutFilterState {
  switch (action.type) {
    case "SET_STATUS":
      return { ...state, status: action.value, page: 1 };
    case "SET_MERCHANT":
      return { ...state, merchantId: action.value, page: 1 };
    case "SET_PERIOD":
      return { ...state, period: action.value, page: 1 };
    case "SET_SEARCH_INPUT":
      return { ...state, searchInput: action.value };
    case "APPLY_SEARCH":
      return { ...state, searchTerm: action.value, page: 1 };
    case "SET_PAGE":
      return { ...state, page: action.value };
    case "RESET":
      return initialPayoutFilter;
  }
}

// --- Dialog state ---
type DialogState = {
  confirmPayout: Payout | null;
  detailPayout: Payout | null;
  exportOpen: boolean;
  exportType: ExportReportType;
  deleteDialogOpen: boolean;
  deleteError: { title: string; message?: string } | null;
};

type DialogAction =
  | { type: "SET_CONFIRM"; payout: Payout | null }
  | { type: "SET_DETAIL"; payout: Payout | null }
  | { type: "OPEN_EXPORT"; reportType: ExportReportType }
  | { type: "CLOSE_EXPORT" }
  | { type: "OPEN_DELETE_DIALOG" }
  | { type: "CLOSE_DELETE_DIALOG" }
  | { type: "SET_DELETE_ERROR"; error: { title: string; message?: string } | null };

const initialDialog: DialogState = {
  confirmPayout: null,
  detailPayout: null,
  exportOpen: false,
  exportType: "revenue",
  deleteDialogOpen: false,
  deleteError: null,
};

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case "SET_CONFIRM":
      return { ...state, confirmPayout: action.payout };
    case "SET_DETAIL":
      return { ...state, detailPayout: action.payout };
    case "OPEN_EXPORT":
      return { ...state, exportType: action.reportType, exportOpen: true };
    case "CLOSE_EXPORT":
      return { ...state, exportOpen: false };
    case "OPEN_DELETE_DIALOG":
      return { ...state, deleteDialogOpen: true };
    case "CLOSE_DELETE_DIALOG":
      return { ...state, deleteDialogOpen: false };
    case "SET_DELETE_ERROR":
      return { ...state, deleteError: action.error, deleteDialogOpen: false };
  }
}

// [G]-[M] Revenue tab orchestration (DD_02 §2). Revenue data fetches only
// while this tab is mounted (Radix Tabs unmounts inactive content).
export const RevenueTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [range, setRange] = useState<TrendRange>("30d");
  const [period, setPeriod] = useState<TargetPeriod>("monthly");
  const [selectedPayoutIds, setSelectedPayoutIds] = useState<string[]>([]);
  const [filter, dispatchFilter] = useReducer(payoutFilterReducer, initialPayoutFilter);
  const [dialog, dispatchDialog] = useReducer(dialogReducer, initialDialog);

  const {
    kpisQuery,
    trendsQuery,
    forecastQuery,
    targetQuery,
    adFeeQuery,
    saveTargetMutation,
    payoutMerchantsQuery,
  } = useRevenue(range, period);

  const { payoutsQuery, processPayoutMutation, reviewPayoutMutation, deletePayoutMutation } = useCommission(
    {
      page: filter.page,
      limit: 5,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.merchantId ? { merchantId: filter.merchantId } : {}),
      ...(filter.period ? { period: filter.period } : {}),
      ...(filter.searchTerm.trim() ? { search: filter.searchTerm.trim() } : {}),
    },
    undefined,
    { settings: false, reports: false },
  );

  const handleSaveTarget = (payload: SaveRevenueTargetPayload) => {
    saveTargetMutation.mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin", "revenue", "target"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "revenue", "kpis"] });
        toast({ title: "Revenue target updated" });
      },
      onError: (err: Error) => {
        const axiosError = err as AxiosError<{ message?: string }>;
        const msg = axiosError.response?.data?.message || "Failed to save revenue target";
        toast({ title: "Failed to save target", description: msg, variant: "destructive" });
      },
    });
  };

  const handleProcessConfirm = (id: string) => {
    const payout = payoutsQuery.data?.items.find((item) => item.payoutId === id);
    const payoutIds = payout?.payoutIds ?? [id];
    Promise.allSettled(payoutIds.map((payoutId) => processPayoutMutation.mutateAsync(payoutId))).then((results) => {
      const failed = results.filter((r) => r.status === "rejected");
      const succeeded = results.length - failed.length;
      queryClient.invalidateQueries({ queryKey: ["admin", "commission", "payouts"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "revenue", "kpis"] });
      if (failed.length === 0) {
        toast({ title: "Payout processed" });
      } else if (succeeded > 0) {
        toast({ title: "Payout partially processed", description: `${succeeded} succeeded, ${failed.length} skipped (already processed).` });
      } else {
        toast({ title: "Payout already processed", variant: "destructive" });
      }
      dispatchDialog({ type: "SET_CONFIRM", payout: null });
    });
  };

  const handleDeletePayouts = () => {
    if (selectedPayoutIds.length === 0) return;
    dispatchDialog({ type: "OPEN_DELETE_DIALOG" });
  };

  const selectedPayouts = payoutsQuery.data?.items.filter((payout) => selectedPayoutIds.includes(payout.payoutId)) ?? [];
  const selectedUnderlyingPayoutIds = [...new Set(selectedPayouts.flatMap((payout) => payout.payoutIds ?? [payout.payoutId]))];

  const allPeriods = payoutsQuery.data?.periods;
  const periodOptions = getPayoutPeriodOptions(allPeriods, 6);

  // Search runs server-side (merchant name/email or period); rows come from the API.
  const visiblePayouts = payoutsQuery.data?.items ?? [];

  const applyPayoutSearch = () => {
    dispatchFilter({ type: "APPLY_SEARCH", value: filter.searchInput });
  };

  const confirmDeletePayouts = () => {
    deletePayoutMutation.mutate(selectedUnderlyingPayoutIds, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin", "commission", "payouts"] });
        toast({ title: "Payouts deleted" });
        setSelectedPayoutIds([]);
        dispatchDialog({ type: "CLOSE_DELETE_DIALOG" });
      },
      onError: (err: Error) => {
        const axiosError = err as AxiosError<{ message?: string | string[] }>;
        const status = axiosError.response?.status;
        const message = axiosError.response?.data?.message;
        dispatchDialog({
          type: "SET_DELETE_ERROR",
          error: {
            title: status === 409 ? "Payout cannot be deleted" : "Failed to delete payout",
            message: Array.isArray(message) ? message.join(", ") : message,
          },
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" onClick={() => dispatchDialog({ type: "OPEN_EXPORT", reportType: "revenue" })}>
          Export Revenue
        </Button>
      </div>

      <RevenueKPICards kpis={kpisQuery.data} loading={kpisQuery.isLoading} range={range} />

      <RevenueTrendChart
        trendPoints={trendsQuery.data ?? []}
        forecast={forecastQuery.data}
        range={range}
        onRangeChange={setRange}
      />

      <RevenueTargetCard
        target={targetQuery.data}
        period={period}
        onPeriodChange={setPeriod}
        onSaveTarget={handleSaveTarget}
        saving={saveTargetMutation.isPending}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <PaymentStatusPanel statusCounts={payoutsQuery.data?.statusCounts} loading={payoutsQuery.isLoading} />
        <AdPaymentStatusPanel status={adFeeQuery.data?.adFeePaymentStatus} loading={adFeeQuery.isLoading} />
        <AdFeeSummaryCard kpis={adFeeQuery.data?.adFeeKpis} loading={adFeeQuery.isLoading} />
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-medium">Merchant Payouts</h3>
          <Button size="sm" onClick={() => dispatchDialog({ type: "OPEN_EXPORT", reportType: "payout" })}>
            Export Payout
          </Button>
        </div>
        <div className="flex flex-col gap-3 rounded-md border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="payout-status-filter" className="text-xs font-medium text-muted-foreground">Status</label>
            <select
              id="payout-status-filter"
              className="flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:w-[140px]"
              value={filter.status}
              onChange={(e) => dispatchFilter({ type: "SET_STATUS", value: e.target.value })}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="payout-merchant-filter" className="text-xs font-medium text-muted-foreground">Merchant</label>
            <select
              id="payout-merchant-filter"
              className="flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:w-[180px]"
              value={filter.merchantId}
              onChange={(e) => dispatchFilter({ type: "SET_MERCHANT", value: e.target.value })}
            >
              <option value="">All</option>
              {payoutMerchantsQuery.data?.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="payout-period-filter" className="text-xs font-medium text-muted-foreground">Period</label>
            <select
              id="payout-period-filter"
              className="flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:w-[170px]"
              value={filter.period}
              onChange={(e) => dispatchFilter({ type: "SET_PERIOD", value: e.target.value })}
            >
              <option value="">All periods</option>
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="flex min-w-[220px] flex-1 flex-col gap-1">
            <label htmlFor="payout-search" className="text-xs font-medium text-muted-foreground">Search</label>
            <div className="relative flex h-9 w-full items-center">
              <Input
                id="payout-search"
                value={filter.searchInput}
                onChange={(e) => dispatchFilter({ type: "SET_SEARCH_INPUT", value: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") applyPayoutSearch(); }}
                placeholder="Search merchant or period"
                className="h-9 pr-10 text-sm"
              />
              <button
                type="button"
                aria-label="Search payouts"
                title="Search"
                onClick={applyPayoutSearch}
                className="absolute right-0 flex h-9 w-9 items-center justify-center rounded-r-md border-l border-input text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="ml-auto flex items-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => dispatchFilter({ type: "RESET" })}
            >
              Reset
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800 disabled:opacity-50"
              disabled={selectedUnderlyingPayoutIds.length === 0 || deletePayoutMutation.isPending}
              title="Delete selected payouts"
              onClick={handleDeletePayouts}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete selected payouts</span>
            </Button>
          </div>
        </div>
        <PayoutTable
          payouts={visiblePayouts}
          onProcessPayout={(id) => {
            const p = payoutsQuery.data?.items.find((pp) => pp.payoutId === id);
            dispatchDialog({ type: "SET_CONFIRM", payout: p ?? null });
          }}
          onViewDetail={(id) => {
            const p = payoutsQuery.data?.items.find((pp) => pp.payoutId === id);
            if (p && p.status === "pending") {
              reviewPayoutMutation.mutate(id);
            }
            dispatchDialog({ type: "SET_DETAIL", payout: p ?? null });
          }}
          selectedPayoutIds={selectedPayoutIds}
          onSelectionChange={setSelectedPayoutIds}
        />
        {payoutsQuery.data && (
          <PaginationControls
            page={payoutsQuery.data.page}
            totalPages={payoutsQuery.data.totalPages}
            onPageChange={(p) => dispatchFilter({ type: "SET_PAGE", value: p })}
          />
        )}
      </div>

      <PayoutConfirmationDialog
        open={dialog.confirmPayout !== null}
        onOpenChange={(open) => { if (!open) dispatchDialog({ type: "SET_CONFIRM", payout: null }); }}
        payout={dialog.confirmPayout}
        onConfirm={handleProcessConfirm}
        onCancel={() => {
          if (dialog.confirmPayout && dialog.confirmPayout.status === "pending") {
            reviewPayoutMutation.mutate(dialog.confirmPayout.payoutId);
          }
          dispatchDialog({ type: "SET_CONFIRM", payout: null });
        }}
        processing={processPayoutMutation.isPending}
      />

      <Dialog open={dialog.deleteDialogOpen} onOpenChange={(open) => { if (!open) dispatchDialog({ type: "CLOSE_DELETE_DIALOG" }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Are you sure want to delete that rows
            </DialogTitle>
            <DialogDescription>
              You selected {selectedPayoutIds.length} payout row
              {selectedPayoutIds.length === 1 ? "" : "s"}. Only completed payouts
              that are at least three months old can be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => dispatchDialog({ type: "CLOSE_DELETE_DIALOG" })} disabled={deletePayoutMutation.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeletePayouts} disabled={deletePayoutMutation.isPending}>
              <Trash2 className="h-4 w-4" />
              {deletePayoutMutation.isPending ? "Deleting..." : "Confirm delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PayoutDetailDialog
        open={dialog.detailPayout !== null}
        onOpenChange={(open) => { if (!open) dispatchDialog({ type: "SET_DETAIL", payout: null }); }}
        payout={dialog.detailPayout}
      />

      <ExportDialog
        key={`${dialog.exportType}-${filter.period}-${dialog.exportOpen}`}
        open={dialog.exportOpen}
        onOpenChange={(open) => { if (!open) dispatchDialog({ type: "CLOSE_EXPORT" }); }}
        reportType={dialog.exportType}
        initialValues={dialog.exportType === "payout" ? getPayoutExportDates(filter.period, payoutsQuery.data?.periods) : undefined}
        merchants={dialog.exportType === "payout" ? payoutMerchantsQuery.data : undefined}
      />

      <AlertDialog open={dialog.deleteError !== null} onOpenChange={() => dispatchDialog({ type: "SET_DELETE_ERROR", error: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">{dialog.deleteError?.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialog.deleteError?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => dispatchDialog({ type: "SET_DELETE_ERROR", error: null })}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function getPayoutPeriodOptions(periods?: string[], limit?: number) {
  const values = periods && periods.length > 0 ? periods : (() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    });
  })();
  const seen = new Set<string>();
  const unique = values.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
  const limited = limit ? unique.slice(0, limit) : unique;
  return limited.map((value) => {
    const [year, month] = value.split("-").map(Number);
    return { value, label: new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "numeric" }) };
  });
}

function getPayoutExportDates(period: string, periods?: string[]) {
  const options = getPayoutPeriodOptions(periods);
  if (options.length === 0) return undefined;
  const monthEnd = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  };
  if (period) {
    const selected = options.find((option) => option.value === period);
    if (!selected) return { dateFrom: `${period}-01`, dateTo: monthEnd(period) };
    return { dateFrom: `${selected.value}-01`, dateTo: monthEnd(selected.value) };
  }
  const newest = options[0];
  const oldest = options[options.length - 1];
  return { dateFrom: `${oldest.value}-01`, dateTo: monthEnd(newest.value) };
}
