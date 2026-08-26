import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AdFeeSetting } from '../services/advertisement.service';

interface AdFeeSettingsTableProps {
  feeSettings?: AdFeeSetting[];
  onUpdateRate?: (id: string, dailyRate: number) => void;
}

export const AdFeeSettingsTable: React.FC<AdFeeSettingsTableProps> = ({
  feeSettings = [],
  onUpdateRate,
}) => {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Placement Location</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Daily Rate ($)</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {feeSettings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                No fee settings configured.
              </TableCell>
            </TableRow>
          ) : (
            feeSettings.map((setting) => (
              <TableRow key={setting.id}>
                <TableCell className="font-medium capitalize">{setting.placement.replace('_', ' ')}</TableCell>
                <TableCell className="capitalize">{setting.tier}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="w-28"
                    defaultValue={setting.dailyRate}
                    id={`rate-${setting.id}`}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById(`rate-${setting.id}`) as HTMLInputElement;
                      if (input) onUpdateRate?.(setting.id, parseFloat(input.value));
                    }}
                  >
                    Update Rate
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
