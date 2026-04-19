import { TermsPage } from "../../../../src/features/admin-terms/terms-page";

export default function AdminTermsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Quản lý phân loại</h1>
        <p className="text-sm text-muted-foreground">Thêm, chỉnh sửa và xóa các term taxonomy.</p>
      </div>
      <TermsPage />
    </div>
  );
}
