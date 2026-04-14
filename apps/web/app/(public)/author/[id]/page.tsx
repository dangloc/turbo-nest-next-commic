import { notFound } from "next/navigation";
import { fetchAuthorProfile } from "../../../src/features/author-profile/api";
import { AuthorProfileView } from "../../../src/features/author-profile/author-profile";

interface AuthorPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { id } = await params;
  const authorId = Number(id);

  if (!Number.isInteger(authorId) || authorId <= 0) {
    notFound();
  }

  const preflight = await fetchAuthorProfile(authorId, {
    page: 1,
    limit: 12,
    sortBy: "updatedAt",
    sortDir: "desc",
  });

  if (!preflight.ok && preflight.error.status === 404) {
    notFound();
  }

  return <AuthorProfileView authorId={authorId} />;
}
