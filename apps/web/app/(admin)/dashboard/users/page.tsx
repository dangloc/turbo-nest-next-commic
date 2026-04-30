import { UsersTable } from "@/features/admin-users/users-table";

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Danh sách user</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý tài khoản, vai trò, số dư ví và trạng thái VIP của user.
        </p>
      </div>
      <UsersTable />
    </div>
  );
}
