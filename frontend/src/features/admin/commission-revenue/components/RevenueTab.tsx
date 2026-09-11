import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

// [G]-[M] Revenue tab orchestration (DD_02 §2). Revenue data fetches only
// while this tab is mounted (Radix Tabs unmounts inactive content).
export const RevenueTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [range, setRange] = useState<TrendRange>("30d");
  const [period, setPeriod] = useState<TargetPeriod>("monthly");
  const [payoutPage, setPayoutPage] = useState(1);
  const [confirmPayout, setConfirmPayout] = useState<Payout | null>(null);
  const [detailPayout, setDetailPayout] = useState<Payout | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportReportType>("revenue");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [merchantFilter, setMerchantFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedPayoutIds, setSelectedPayoutIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const {
    kpisQuery,
    trendsQuery,
    forecastQuery,
    targetQuery,
    paymentStatusQuery,
    adFeeQuery,
    saveTargetMutation,
    payoutMerchantsQuery,
  } = useRevenue(range, period);

  // Payouts reuse the shared commission service; skip the commission-only
  // queries here to avoid duplicate settings/reports requests.
  const { payoutsQuery, processPayoutMutation, deletePayoutMutation } = useCommission(
    {
      page: payoutPage,
      limit: 10,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(merchantFilter ? { merchantId: merchantFilter } : {}),
      ...(dateFrom ? { from: dateFrom } : {}),
      ...(dateTo ? { to: dateTo } : {}),
    },
    undefined,
    { settings: false, reports: false },
  );

  const handleSaveTarget = (payload: SaveRevenueTargetPayload) => {
    saveTargetMutation.mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["admin", "revenue", "target"],
        });
        queryClient.invalidateQueries({
          queryKey: ["admin", "revenue", "kpis"],
        });
        toast({ title: "Revenue target updated" });
      },
      onError: (err: Error) => {
        const axiosError = err as AxiosError<{ message?: string }>;
        const msg = axiosError.response?.data?.message || "Failed to save revenue target";
        toast({
          title: "Failed to save target",
          description: msg,
          variant: "destructive",
        });
      },
    });
  };

  const handleProcessConfirm = (id: string) => {
    processPayoutMutation.mutate(id, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["admin", "commission", "payouts"],
        });
        queryClient.invalidateQueries({
          queryKey: ["admin", "revenue", "kpis"],
        });
        toast({ title: "Payout processed" });
        setConfirmPayout(null);
      },
      onError: (err: Error) => {
        const status = (err as AxiosError).response?.status;
        if (status === 409) {
          toast({ title: "Payout already processed", variant: "destructive" });
        } else if (status === 404) {
          toast({ title: "Payout not found", variant: "destructive" });
        } else {
          toast({ title: "Failed to process payout", variant: "destructive" });
        }
      },
    });
  };

  const handleDeletePayouts = () => {
    if (selectedPayoutIds.length === 0) return;
    setDeleteDialogOpen(true);
  };

  const confirmDeletePayouts = () => {
    deletePayoutMutation.mutate(selectedPayoutIds, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin", "commission", "payouts"] });
        toast({ title: "Payouts deleted" });
        setSelectedPayoutIds([]);
        setDeleteDialogOpen(false);
      },
      onError: (err: Error) => {
        const axiosError = err as AxiosError<{ message?: string | string[] }>;
        const status = axiosError.response?.status;
        const message = axiosError.response?.data?.message;
        toast({
          title: status === 409 ? "Payout cannot be deleted" : "Failed to delete payout",
          description: Array.isArray(message) ? message.join(", ") : message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* [O] Export buttons */}
      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          onClick={() => {
            setExportType("revenue");
            setExportOpen(true);
          }}
        >
          Export Revenue
        </Button>
      </div>

      {/* [G] KPI cards */}
      <RevenueKPICards
        kpis={kpisQuery.data}
        loading={kpisQuery.isLoading}
        range={range}
      />

      {/* [H] Trend chart */}
      <RevenueTrendChart
        trendPoints={trendsQuery.data ?? []}
        forecast={forecastQuery.data}
        range={range}
        onRangeChange={setRange}
      />

      {/* [I] Revenue Target (own row) */}
      <RevenueTargetCard
        target={targetQuery.data}
        period={period}
        onPeriodChange={setPeriod}
        onSaveTarget={handleSaveTarget}
        saving={saveTargetMutation.isPending}
      />

      {/* [J] Payment Status | [K] Ad Payment Status | [L] Ad Fee Summary (one row) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <PaymentStatusPanel
          payments={paymentStatusQuery.data}
          loading={paymentStatusQuery.isLoading}
        />
        <AdPaymentStatusPanel
          status={adFeeQuery.data?.adFeePaymentStatus}
          loading={adFeeQuery.isLoading}
        />
        <AdFeeSummaryCard
          kpis={adFeeQuery.data?.adFeeKpis}
          loading={adFeeQuery.isLoading}
        />
      </div>

      {/* [M] Payout table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Merchant Payouts</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setExportType("payout");
              setExportOpen(true);
            }}
          >
            Export Payout
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select
              className="flex h-9 w-[140px] items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPayoutPage(1);
              }}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Merchant</label>
            <select
              className="flex h-9 w-[180px] items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={merchantFilter}
              onChange={(e) => {
                setMerchantFilter(e.target.value);
                setPayoutPage(1);
              }}
            >
              <option value="">All</option>
              {payoutMerchantsQuery.data?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <Input
              type="date"
              className="w-[150px]"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPayoutPage(1);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <Input
              type="date"
              className="w-[150px]"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPayoutPage(1);
              }}
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setStatusFilter("");
              setMerchantFilter("");
              setDateFrom("");
              setDateTo("");
              setPayoutPage(1);
            }}
          >
            Reset
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto border-red-300 bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800 disabled:opacity-50"
            disabled={selectedPayoutIds.length === 0 || deletePayoutMutation.isPending}
            title="Delete selected payouts"
            onClick={handleDeletePayouts}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete selected payouts</span>
          </Button>
        </div>
        <PayoutTable
          payouts={payoutsQuery.data?.items}
          onProcessPayout={(id) => {
            const p = payoutsQuery.data?.items.find((pp) => pp.payoutId === id);
            setConfirmPayout(p ?? null);
          }}
          onViewDetail={(id) => {
            const p = payoutsQuery.data?.items.find((pp) => pp.payoutId === id);
            setDetailPayout(p ?? null);
          }}
          selectedPayoutIds={selectedPayoutIds}
          onSelectionChange={setSelectedPayoutIds}
        />
        {payoutsQuery.data && (
          <PaginationControls
            page={payoutsQuery.data.page}
            totalPages={payoutsQuery.data.totalPages}
            onPageChange={setPayoutPage}
          />
        )}
      </div>

      {/* [Q] Payout confirmation dialog */}
      <PayoutConfirmationDialog
        open={confirmPayout !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmPayout(null);
        }}
        payout={confirmPayout}
        onConfirm={handleProcessConfirm}
        processing={processPayoutMutation.isPending}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletePayoutMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeletePayouts}
              disabled={deletePayoutMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              {deletePayoutMutation.isPending ? "Deleting..." : "Confirm delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payout detail dialog */}
      <PayoutDetailDialog
        open={detailPayout !== null}
        onOpenChange={(open) => {
          if (!open) setDetailPayout(null);
        }}
        payout={detailPayout}
      />

      {/* [S] Export modal */}
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        reportType={exportType}
      />
    </div>
  );
};
