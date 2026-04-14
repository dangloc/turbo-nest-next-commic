import { ChapterReaderView } from "../../../../src/features/reader/reader";
import { normalizeChapterId } from "../../../../src/features/reader/types";

interface ChapterReaderPageProps {
  params: Promise<{
    chapterId: string;
  }>;
}

export default async function ChapterReaderPage({ params }: ChapterReaderPageProps) {
  const { chapterId: rawChapterId } = await params;
  const chapterId = normalizeChapterId(rawChapterId);

  if (!chapterId) {
    return (
      <main className="reader-shell">
        <p className="discovery-state discovery-state--error">Invalid chapter id.</p>
      </main>
    );
  }

  return <ChapterReaderView chapterId={chapterId} />;
}
