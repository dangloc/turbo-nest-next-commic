import { AdminNovelsTable } from "../../../../src/features/admin-novels/novels-table";

export default function AdminNovelsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Quản lý truyện</h1>
        <p className="text-sm text-muted-foreground">
          Danh sách tất cả truyện trong hệ thống.
        </p>
      </div>
      <AdminNovelsTable />
    </div>
  );
}
