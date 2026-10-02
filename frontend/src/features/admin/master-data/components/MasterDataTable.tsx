import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  CategoryRow,
  DiscountTypeRow,
  MasterDataCrudType,
  OrderStatusRow,
  UserRoleRow,
} from '../services/masterData.service';

export type MasterRow = UserRoleRow | OrderStatusRow | DiscountTypeRow | CategoryRow;

interface Column {
  header: string;
  render: (row: MasterRow) => React.ReactNode;
}

const statusBadge = (active: boolean) => (
  <Badge variant={active ? 'default' : 'secondary'}>
    {active ? 'Active' : 'Inactive'}
  </Badge>
);

const columnsByType: Record<MasterDataCrudType, Column[]> = {
  'user-roles': [
    {
      header: 'Code',
      render: (row) => <code>{(row as UserRoleRow).roleCode}</code>,
    },
    { header: 'Name', render: (row) => (row as UserRoleRow).roleName },
    {
      header: 'Description',
      render: (row) => (
        <span className="text-muted-foreground">
          {(row as UserRoleRow).description || '—'}
        </span>
      ),
    },
    { header: 'Status', render: (row) => statusBadge((row as UserRoleRow).isActive) },
  ],
  'order-statuses': [
    {
      header: 'Code',
      render: (row) => <code>{(row as OrderStatusRow).statusCode}</code>,
    },
    { header: 'Name', render: (row) => (row as OrderStatusRow).statusName },
    { header: 'Order', render: (row) => (row as OrderStatusRow).displayOrder },
    {
      header: 'Terminal',
      render: (row) => statusBadge((row as OrderStatusRow).isTerminalState),
    },
    {
      header: 'Description',
      render: (row) => (
        <span className="text-muted-foreground">
          {(row as OrderStatusRow).description || '—'}
        </span>
      ),
    },
  ],
  'discount-types': [
    {
      header: 'Code',
      render: (row) => <code>{(row as DiscountTypeRow).typeCode}</code>,
    },
    { header: 'Name', render: (row) => (row as DiscountTypeRow).typeName },
    { header: 'Status', render: (row) => statusBadge((row as DiscountTypeRow).isActive) },
  ],
  categories: [
    { header: 'Name', render: (row) => (row as CategoryRow).name },
    {
      header: 'Slug',
      render: (row) => (
        <code>{(row as CategoryRow).slug}</code>
      ),
    },
  ],
};

interface MasterDataTableProps {
  type: MasterDataCrudType;
  rows?: MasterRow[];
  isLoading?: boolean;
}

export const MasterDataTable: React.FC<MasterDataTableProps> = ({
  type,
  rows = [],
  isLoading = false,
}) => {
  const columns = columnsByType[type];

  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <Table className="w-full">
        <TableHeader className="sticky top-0 z-10 bg-primary/10">
          <TableRow className="bg-primary/10 hover:bg-primary/10">
            {columns.map((column) =>
              <TableHead key={column.header} className="whitespace-nowrap font-bold">
                {column.header}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="py-6 text-center text-muted-foreground"
              >
                Loading master data...
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="py-6 text-center text-muted-foreground"
              >
                No entries found.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={String(row.id)}
                className="transition-colors duration-150 ease-in-out hover:bg-muted/40"
              >
                {columns.map((column) => (
                  <TableCell key={column.header}>{column.render(row)}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};