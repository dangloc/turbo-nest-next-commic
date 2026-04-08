"use client";

import { DiscoveryFeed } from "../../../src/features/discovery/discovery";

export default function CategoryPage({ params }: { params: { slug: string } }) {
  return (
    <DiscoveryFeed
      title={"Category: " + params.slug}
      eyebrow="Novel Discovery"
      intro="Browse novels within a specific taxonomy filter and keep the state shareable through the URL."
      category={params.slug}
      categoryLabel={params.slug}
      backHref="/"
    />
  );
}
