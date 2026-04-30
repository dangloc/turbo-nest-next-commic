import { NovelDetail } from "../../../../../src/features/admin-novels/novel-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AuthorNovelDetailPage({ params }: Props) {
  const { id } = await params;
  const novelId = Number(id);
  return <NovelDetail novelId={novelId} backPath="/dashboard/author" />;
}
