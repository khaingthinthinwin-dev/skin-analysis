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

  // Commission side only (settings, rate edit, reports). Payouts are fetched on
  // the Revenue tab and are skipped here to avoid duplicate requests.
  const { settingsQuery, reportsQuery, updateSettingsMutation } = useCommission(
    undefined,
    { ...reportFilters, page: reportPage, limit: 10 },
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
      <div className="max-w-[1400px]" style={{ padding: "28px 32px" }}>
        {/* [A] Page Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="text-foreground" style={{ fontSize: 24, fontWeight: 700 }}>
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
              className="text-muted-foreground px-6 py-3 text-sm font-semibold bg-transparent border-none cursor-pointer border-b-2 border-b-transparent -mb-0.5 rounded-none data-[state=active]:text-foreground data-[state=active]:border-b-primary"
            >
              Commission
            </TabsTrigger>
            <TabsTrigger
              value="revenue"
              className="text-muted-foreground px-6 py-3 text-sm font-semibold bg-transparent border-none cursor-pointer border-b-2 border-b-transparent -mb-0.5 rounded-none data-[state=active]:text-foreground data-[state=active]:border-b-primary"
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
              onApply={handleApplyReportFilters}
              onReset={handleResetReportFilters}
            />

            {/* [F] Commission report table */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-card-foreground text-[15px] font-bold">
                  Commission Report
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-muted text-muted-foreground border-border text-xs py-1 px-3"
                  onClick={() => {
                    setExportType("commission");
                    setExportOpen(true);
                  }}
                  disabled={!reportsQuery.data?.reports.length}
                >
                  Export
                </Button>
              </div>
              <CommissionReportsTable reports={reportsQuery.data?.reports} />
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
          open={exportOpen}
          onOpenChange={setExportOpen}
          reportType={exportType}
        />
      </div>
    </div>
  );
}
