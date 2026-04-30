"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminWalletTransactionRow } from "./types";

interface WalletsTableProps {
  items: AdminWalletTransactionRow[];
  search: string;
  isLoading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  total: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
  onSearchChange: (value: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

const typeLabels: Record<AdminWalletTransactionRow["type"], string> = {
  DEPOSIT: "Nạp tiền",
  PURCHASE_CHAPTER: "Mua chương",
  PURCHASE_VIP: "Mua VIP",
  COMBO_PURCHASE: "Mua combo",
};

const columns: ColumnDef<AdminWalletTransactionRow>[] = [
  {
    accessorKey: "transactionDate",
    header: "Thời gian",
    cell: ({ row }) => {
      const value = row.original.transactionDate;
      const date = value instanceof Date ? value : new Date(value);
      return <div className="text-sm">{date.toLocaleString("vi-VN")}</div>;
    },
  },
  {
    accessorKey: "username",
    header: "User",
    cell: ({ row }) => <div className="font-medium">{row.original.username}</div>,
  },
  {
    accessorKey: "amountIn",
    header: "Số tiền nạp",
    cell: ({ row }) => (
      <div className={row.original.amountIn > 0 ? "font-medium text-green-600" : ""}>
        {formatCurrency(row.original.amountIn)}
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Loại",
    cell: ({ row }) => (
      <Badge variant={row.original.type === "DEPOSIT" ? "default" : "secondary"}>
        {typeLabels[row.original.type]}
      </Badge>
    ),
  },
  {
    accessorKey: "sepayCode",
    header: "Mã SePay",
    cell: ({ row }) => <div>{row.original.sepayCode ?? "-"}</div>,
  },
  {
    accessorKey: "currentBalance",
    header: "Số dư hiện tại",
    cell: ({ row }) => <div>{formatCurrency(row.original.currentBalance)}</div>,
  },
];

export function WalletsTable(props: WalletsTableProps) {
  const {
    items,
    search,
    isLoading,
    error,
    page,
    pageSize,
    total,
    canPreviousPage,
    canNextPage,
    onSearchChange,
    onPreviousPage,
    onNextPage,
  } = props;

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = total === 0 ? 0 : Math.min(total, page * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo username, email, tên hiển thị..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Đang tải lịch sử giao dịch ví...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Chưa có giao dịch ví phù hợp.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-2">
        <div className="text-sm text-muted-foreground">
          Trang {page} • {from}-{to} / {total}
        </div>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={onPreviousPage} disabled={!canPreviousPage}>
            Trước
          </Button>
          <Button variant="outline" size="sm" onClick={onNextPage} disabled={!canNextPage}>
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}
