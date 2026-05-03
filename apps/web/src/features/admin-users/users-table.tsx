"use client";

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  KeyRound,
  MoreHorizontal,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserCheck,
  User as UserIcon,
  Wallet,
  X,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AppContext } from "@/providers/app-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAdminUsers } from "./api";
import type {
  AdminUserRole,
  AdminUserRoleFilter,
  AdminUserRow,
  AdminUsersSummary,
} from "./types";

const EMPTY_SUMMARY: AdminUsersSummary = {
  totalUsers: 0,
  adminUsers: 0,
  authorUsers: 0,
  readerUsers: 0,
  usersWithBalance: 0,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("vi-VN");
}

function getInitials(user: AdminUserRow) {
  const source = user.name || user.username || user.email;
  return source.slice(0, 1).toUpperCase();
}

function getRoleLabel(role: AdminUserRole) {
  switch (role) {
    case "ADMIN":
      return "Quản trị";
    case "AUTHOR":
      return "Tác giả";
    case "USER":
      return "Độc giả";
  }
}

function getRoleIcon(role: AdminUserRole) {
  switch (role) {
    case "ADMIN":
      return <ShieldCheck className="mr-2 h-4 w-4" />;
    case "AUTHOR":
      return <UserCheck className="mr-2 h-4 w-4" />;
    case "USER":
      return <UserIcon className="mr-2 h-4 w-4" />;
  }
}

function buildColumns(options: {
  canManageUsers: boolean;
  onManageUser: (userId: number) => void;
}): ColumnDef<AdminUserRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Chọn tất cả"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Chọn user"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Tài khoản",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex min-w-[220px] items-center gap-3">
            <Avatar
              fallback={getInitials(user)}
              src={user.avatar}
              alt={user.name}
              className="h-9 w-9"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="truncate font-medium">{user.name}</div>
                {user.isSuperAdmin ? (
                  <Badge variant="secondary">Super Admin</Badge>
                ) : null}
              </div>
              <div className="text-xs text-muted-foreground">
                ID {user.id}
                {user.username ? ` • ${user.username}` : ""}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "role",
      header: "Vai trò",
      cell: ({ row }) => (
        <div className="flex items-center">
          {getRoleIcon(row.original.role)}
          <span>{getRoleLabel(row.original.role)}</span>
        </div>
      ),
    },
    {
      accessorKey: "balance",
      header: "Số dư ví",
      cell: ({ row }) => (
        <div className="font-medium">{formatCurrency(row.original.balance)}</div>
      ),
    },
    {
      accessorKey: "kimTe",
      header: "Kim tệ",
      cell: ({ row }) => row.original.kimTe.toLocaleString("vi-VN"),
    },
    {
      accessorKey: "vipLevelName",
      header: "VIP",
      cell: ({ row }) =>
        row.original.vipLevelName ? (
          <Badge variant="secondary">{row.original.vipLevelName}</Badge>
        ) : (
          <span className="text-muted-foreground">Chưa có</span>
        ),
    },
    {
      accessorKey: "providerNames",
      header: "Đăng nhập",
      cell: ({ row }) => {
        const providers = row.original.providerNames;
        return providers.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {providers.map((provider) => (
              <Badge key={provider} variant="outline">
                {provider}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">Local</span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Ngày tạo",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: "actions",
      header: "Hành động",
      cell: ({ row }) => {
        const user = row.original;

        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!options.canManageUsers}
              onClick={() => options.onManageUser(user.id)}
            >
              Chỉnh sửa
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                <span className="sr-only">Mở menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  {user.transactionCount.toLocaleString("vi-VN")} giao dịch ví
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  {user.purchasedChapterCount.toLocaleString("vi-VN")} chương đã mua
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!options.canManageUsers}
                  onClick={() => options.onManageUser(user.id)}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Chỉnh sửa user
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

export function UsersTable() {
  const router = useRouter();
  const { user } = useContext(AppContext);
  const [rowSelection, setRowSelection] = useState({});
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AdminUserRoleFilter>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [summary, setSummary] = useState<AdminUsersSummary>(EMPTY_SUMMARY);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const canManageUsers = user?.id === 1;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      setIsLoading(true);
      setError(null);

      const result = await fetchAdminUsers(
        { page, pageSize, search, role },
        undefined,
        controller.signal,
      );

      if (controller.signal.aborted) {
        return;
      }

      if (!result.ok) {
        setItems([]);
        setSummary(EMPTY_SUMMARY);
        setTotal(0);
        setTotalPages(1);
        setError(result.error.message || "Không tải được danh sách user");
        setIsLoading(false);
        return;
      }

      setItems(result.data.items);
      setSummary(result.data.summary);
      setTotal(result.data.total);
      setTotalPages(result.data.totalPages);
      setPage(result.data.page);
      setIsLoading(false);
    }

    run();

    return () => {
      controller.abort();
    };
  }, [page, pageSize, refreshTick, role, search]);

  const refresh = useCallback(() => {
    setRefreshTick((value) => value + 1);
  }, []);

  const onSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const onRoleChange = useCallback((value: string) => {
    setRole(value as AdminUserRoleFilter);
    setPage(1);
  }, []);

  const columns = useMemo(
    () =>
      buildColumns({
        canManageUsers,
        onManageUser: (userId) => router.push(`/dashboard/users/${userId}`),
      }),
    [canManageUsers, router],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  });

  const canPreviousPage = page > 1;
  const canNextPage = page < totalPages;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = total === 0 ? 0 : Math.min(total, page * pageSize);

  const summaryCards = useMemo(
    () => [
      {
        title: "Tổng user",
        value: summary.totalUsers.toLocaleString("vi-VN"),
      },
      {
        title: "Độc giả",
        value: summary.readerUsers.toLocaleString("vi-VN"),
      },
      {
        title: "Tác giả",
        value: summary.authorUsers.toLocaleString("vi-VN"),
      },
      {
        title: "Có số dư ví",
        value: summary.usersWithBalance.toLocaleString("vi-VN"),
      },
    ],
    [summary],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle>{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-2xl font-semibold">
                <Wallet className="h-5 w-5 text-muted-foreground" />
                {card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row">
          <div className="relative w-full">
            <Input
              placeholder="Tìm theo ID, username, email, tên hiển thị..."
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
              className="pl-9 pr-9 w-4"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-2.5 top-2.5 inline-flex h-4 w-2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Xóa tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <Select
            aria-label="Lọc vai trò"
            value={role}
            onValueChange={onRoleChange}
            className="sm:w-40"
            options={[
              { value: "ALL", label: "Tất cả vai trò" },
              { value: "USER", label: "Độc giả" },
              { value: "AUTHOR", label: "Tác giả" },
              { value: "ADMIN", label: "Quản trị" },
            ]}
          />
        </div>
        <Button variant="outline" className="gap-2" onClick={refresh}>
          <RefreshCcw className="h-4 w-4" />
          Làm mới
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        {search
          ? `Đang tìm "${search}" trong danh sách user.`
          : "Dùng thanh search để lọc nhanh theo ID, username, email hoặc tên hiển thị."}
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
                  Đang tải danh sách user...
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
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
                  Không có user phù hợp.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-2">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} đã chọn • {from}-{to} / {total}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Trang {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={!canPreviousPage}
          >
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((value) => value + 1)}
            disabled={!canNextPage}
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}
