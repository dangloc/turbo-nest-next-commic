import { NovelDetailView } from "../../../../src/features/reader/reader";
import { normalizeNovelId } from "../../../../src/features/reader/types";

interface NovelPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function NovelDetailPage({ params }: NovelPageProps) {
  const { id } = await params;
  const novelId = normalizeNovelId(id);

  if (!novelId) {
    return (
      <main className="reader-shell">
        <p className="discovery-state discovery-state--error">Invalid novel id.</p>
      </main>
    );
  }

  return <NovelDetailView novelId={novelId} />;
}
