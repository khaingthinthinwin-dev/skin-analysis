import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RevenueTarget,
  TargetPeriod,
  SaveRevenueTargetPayload,
} from "../services/commission.service";
import { EditTargetDialog } from "./EditTargetDialog";

interface RevenueTargetCardProps {
  target?: RevenueTarget | null;
  period: TargetPeriod;
  onPeriodChange: (period: TargetPeriod) => void;
  onSaveTarget: (payload: SaveRevenueTargetPayload) => void;
  saving?: boolean;
}

const PERIOD_LABELS: { value: TargetPeriod; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

// [I] Revenue target progress card (DD_02). Period toggle, target amount,
// linear progress bar, progress %, and an Edit Target button that opens the dialog.
export const RevenueTargetCard: React.FC<RevenueTargetCardProps> = ({
  target,
  period,
  onPeriodChange,
  onSaveTarget,
  saving,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const actual = target?.actualRevenue ?? "0.00";
  const progress = target ? parseFloat(target.progressPercent) : 0;
  const clamped = Math.min(Math.max(progress, 0), 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Revenue Target</CardTitle>
          <div className="inline-flex items-center gap-1 rounded-md border p-1">
            {PERIOD_LABELS.map((p) => (
              <Button
                key={p.value}
                type="button"
                size="sm"
                variant={period === p.value ? "default" : "ghost"}
                className="h-6 px-2 text-xs"
                onClick={() => onPeriodChange(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        <CardDescription className="text-xs">
          {period === "monthly" ? "Monthly" : "Quarterly"} target vs. actual
          revenue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {target ? (
          <>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                Target Amount
              </span>
              <p className="text-xl font-semibold">${target.targetAmount}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                Actual Revenue
              </span>
              <p className="text-xl font-semibold">${actual}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className="text-xs font-medium">
                  {clamped.toFixed(0)}%
                </span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-in-out"
                  style={{ width: `${clamped}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No target set for this period.
          </p>
        )}
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          Edit Target
        </Button>

        <EditTargetDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          target={target}
          period={period}
          onSave={(payload) => {
            onSaveTarget(payload);
            setDialogOpen(false);
          }}
          saving={saving}
        />
      </CardContent>
    </Card>
  );
};
