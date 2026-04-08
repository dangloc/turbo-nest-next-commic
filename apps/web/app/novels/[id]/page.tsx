import { NovelDetailView } from "../../../src/features/reader/reader";
import { normalizeChapterId } from "../../../src/features/reader/types";

export default function NovelDetailPage({ params }: { params: { id: string } }) {
  const novelId = normalizeChapterId(params.id);

  if (!novelId) {
    return <main className="reader-shell"><p className="discovery-state discovery-state--error">Invalid novel id.</p></main>;
  }

  return <NovelDetailView novelId={novelId} />;
}
