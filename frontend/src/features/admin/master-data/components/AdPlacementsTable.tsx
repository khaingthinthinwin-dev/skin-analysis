import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ADMIN_AD_PLACEMENTS } from '@/types/admin-ad-management';
import { PLACEMENT_LABELS } from '@/features/admin/advertisement-management/utils/labels';

const HEAD_CLASS = 'whitespace-nowrap font-bold';

export const AdPlacementsTable: React.FC = () => {
  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <Table className="w-full">
        <TableHeader className="sticky top-0 z-10 bg-primary/10">
          <TableRow className="bg-primary/10 hover:bg-primary/10">
            <TableHead className={HEAD_CLASS}>Placement Code</TableHead>
            <TableHead className={HEAD_CLASS}>Placement Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ADMIN_AD_PLACEMENTS.map((placement) => (
            <TableRow
              key={placement}
              className="transition-colors duration-150 ease-in-out hover:bg-muted/40"
            >
              <TableCell className="font-mono text-xs">{placement}</TableCell>
              <TableCell>{PLACEMENT_LABELS[placement]}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};