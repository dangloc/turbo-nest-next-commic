import { NovelDetail } from "../../../../../src/features/admin-novels/novel-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminNovelDetailPage({ params }: Props) {
  const { id } = await params;
  const novelId = Number(id);

  if (Number.isNaN(novelId)) {
    return (
      <div className="py-16 text-center text-muted-foreground text-sm">
        ID truyện không hợp lệ.
      </div>
    );
  }

  return <NovelDetail novelId={novelId} />;
}
