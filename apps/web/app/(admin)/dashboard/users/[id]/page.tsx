import { notFound } from "next/navigation";

import { UserAccessPage } from "@/features/admin-users/user-access-page";

interface UserAccessRouteProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DashboardUserAccessPage({
  params,
}: UserAccessRouteProps) {
  const { id } = await params;
  const userId = Number.parseInt(id, 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    notFound();
  }

  return <UserAccessPage userId={userId} />;
}
