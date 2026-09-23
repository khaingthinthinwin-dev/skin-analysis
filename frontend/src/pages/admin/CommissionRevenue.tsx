// [PPH] Commission & Revenue - Manage platform fees, payouts, and revenue targets
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useCommission } from "@/features/admin/commission-revenue/hooks/useCommission";
import { CommissionTable } from "@/features/admin/commission-revenue/components/CommissionTable";
import { CommissionReportsTable } from "@/features/admin/commission-revenue/components/CommissionReportsTable";
import { ReportFilterPanel } from "@/features/admin/commission-revenue/components/ReportFilterPanel";
import { PaginationControls } from "@/features/admin/commission-revenue/components/PaginationControls";

import { ExportDialog } from "@/features/admin/commission-revenue/components/ExportDialog";
import { RevenueTab } from "@/features/admin/commission-revenue/components/RevenueTab";
import {
  CommissionReportFilter,
  CommissionGroupBy,
  ExportReportType,
} from "@/features/admin/commission-revenue/services/commission.service";

export default function CommissionAndRevenue() {
  const queryClient = useQueryClient();
  const [reportFilters, setReportFilters] = useState<CommissionReportFilter>(
    {},
  );
  const [reportPage, setReportPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportReportType>("commission");
  const groupBy: CommissionGroupBy = reportFilters.groupBy ?? "merchant";

  // Commission side only (settings, rate edit, reports). Payouts are fetched on
  // the Revenue tab and are skipped here to avoid duplicate requests.
  const { settingsQuery, reportsQuery, updateSettingsMutation } = useCommission(
    undefined,
    { ...reportFilters, page: reportPage, limit: 5 },
    { payouts: false },
  );

  const handleUpdateRate = (rate: number) => {
    updateSettingsMutation.mutate(rate, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["admin", "commission", "settings"],
        });
        queryClient.invalidateQueries({
          queryKey: ["admin", "commission", "reports"],
        });
        toast({ title: "Commission rate updated" });
      },
      onError: () => {
        toast({
          title: "Failed to update commission rate",
          variant: "destructive",
        });
      },
    });
  };

  const handleApplyReportFilters = (filters: CommissionReportFilter) => {
    setReportFilters(filters);
    setReportPage(1);
  };

  const handleResetReportFilters = () => {
    setReportFilters({});
    setReportPage(1);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-[1400px] px-4 py-6 sm:px-6 md:px-8">
        {/* [A] Page Header */}
        <div className="mb-6">
          <h1 className="text-foreground text-xl font-bold sm:text-2xl">
            Commission & Revenue
          </h1>
        </div>

        {/* [B] Error Alert (cond.) */}

        {/* [C] Tab Group */}
        <Tabs defaultValue="commission">
          <TabsList
            className="flex gap-0 border-b-2 border-border justify-start mb-7 bg-transparent rounded-none p-0"
          >
            <TabsTrigger
              value="commission"
              className="text-muted-foreground px-4 py-3 text-sm font-semibold bg-transparent border-none cursor-pointer border-b-2 border-b-transparent -mb-0.5 rounded-none data-[state=active]:text-foreground data-[state=active]:border-b-primary sm:px-6"
            >
              Commission
            </TabsTrigger>
            <TabsTrigger
              value="revenue"
              className="text-muted-foreground px-4 py-3 text-sm font-semibold bg-transparent border-none cursor-pointer border-b-2 border-b-transparent -mb-0.5 rounded-none data-[state=active]:text-foreground data-[state=active]:border-b-primary sm:px-6"
            >
              Revenue
            </TabsTrigger>
          </TabsList>

          <TabsContent value="commission" className="space-y-6">
            {/* [D] Commission rate card */}
            <CommissionTable
              settings={settingsQuery.data}
              onUpdateRate={handleUpdateRate}
            />

            {/* [E] Report filter panel */}
            <ReportFilterPanel
              groupBy={groupBy}
              onApply={handleApplyReportFilters}
              onReset={handleResetReportFilters}
            />

            {/* [F] Commission report table */}
            <div className="bg-card border border-border rounded-xl p-3 sm:p-5">
              <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-card-foreground text-[15px] font-bold">
                  Commission Report ({groupBy === "day" ? "daily" : groupBy === "order" ? "by order" : "by merchant"})
                </span>
                <Button
                  size="sm"
                  variant="default"
                  className="text-xs py-1 px-3"
                  onClick={() => {
                    setExportType("commission");
                    setExportOpen(true);
                  }}
                  disabled={!reportsQuery.data?.reports.length}
                >
                  Export
                </Button>
              </div>
              <CommissionReportsTable reports={reportsQuery.data?.reports} groupBy={groupBy} />
              {reportsQuery.data?.pagination && (
                <PaginationControls
                  page={reportsQuery.data.pagination.page}
                  totalPages={reportsQuery.data.pagination.totalPages}
                  onPageChange={setReportPage}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="revenue">
            <RevenueTab />
          </TabsContent>
        </Tabs>

        {/* [S] Shared export modal */}
        <ExportDialog
          key={`${exportType}-${reportFilters.from ?? ""}-${reportFilters.to ?? ""}-${groupBy}-${exportOpen}`}
          open={exportOpen}
          onOpenChange={setExportOpen}
          reportType={exportType}
          initialValues={
            exportType === "commission"
              ? { dateFrom: reportFilters.from, dateTo: reportFilters.to, groupBy }
              : undefined
          }
        />
      </div>
    </div>
  );
}
