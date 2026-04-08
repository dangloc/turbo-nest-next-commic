import { ChapterReaderView } from "../../../../src/features/reader/reader";
import { normalizeChapterId } from "../../../../src/features/reader/types";

export default function ChapterReaderPage({ params }: { params: { chapterId: string } }) {
  const chapterId = normalizeChapterId(params.chapterId);

  if (!chapterId) {
    return <main className="reader-shell"><p className="discovery-state discovery-state--error">Invalid chapter id.</p></main>;
  }

  return <ChapterReaderView chapterId={chapterId} />;
}
