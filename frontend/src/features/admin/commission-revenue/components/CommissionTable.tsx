import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CommissionSettings } from "../services/commission.service";

interface CommissionTableProps {
  settings?: CommissionSettings;
  onUpdateRate?: (rate: number) => void;
}

const parseRate = (value: string): number => {
  const n = parseFloat(value);
  return Number.isNaN(n) ? NaN : n;
};

export const CommissionTable: React.FC<CommissionTableProps> = ({
  settings,
  onUpdateRate,
}) => {
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<string>(settings?.rate ?? "10.00");

  const draftNum = parseRate(draft);
  const canSave = !Number.isNaN(draftNum) && draftNum > 0;

  const handleOpenEdit = () => {
    setDraft(settings?.rate ?? "10.00");
    setEditOpen(true);
  };

  const handleCancel = () => {
    setDraft(settings?.rate ?? "10.00");
    setEditOpen(false);
  };

  const handleSave = () => {
    if (!canSave) return;
    onUpdateRate?.(draftNum);
    setEditOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold">
            Commission Rate
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Platform fee applied to each completed transaction
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs font-medium"
          onClick={handleOpenEdit}
        >
          Edit Rate
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-3xl font-extrabold text-primary">
            {settings?.rate ? Number(settings.rate) : "—"}%
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Applied to all new orders from the moment saved
          </p>
        </div>

        {/* Edit Rate dialog with plain text input (no up/down stepper) */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit Commission Rate</DialogTitle>
              <DialogDescription>
                Set the platform fee percentage. Applies to all new transactions
                from the moment saved.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2 py-2">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="text-center"
                aria-label="Commission rate"
              />
              <span className="font-semibold">%</span>
            </div>

            {!canSave && (
              <p className="text-sm text-destructive" role="alert">
                Commission rate must be between 0 and 100
              </p>
            )}

            <DialogFooter>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button size="sm" disabled={!canSave} onClick={handleSave}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
