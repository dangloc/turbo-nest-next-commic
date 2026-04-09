"use client";

import { AuthorProfileView } from "../../../src/features/author-profile/author-profile";

interface AuthorPageProps {
  params: {
    id: string;
  };
}

export default function AuthorPage({ params }: AuthorPageProps) {
  const authorId = Number(params.id);

  if (!Number.isFinite(authorId) || authorId <= 0) {
    return <main className="discovery-shell"><p className="discovery-state discovery-state--error">Invalid author ID.</p></main>;
  }

  return <AuthorProfileView authorId={authorId} />;
}
