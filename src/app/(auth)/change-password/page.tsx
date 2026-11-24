import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { sanitizeShareCallback } from "@/lib/share-token";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const callbackUrl = sanitizeShareCallback(params.callbackUrl);
  return (
    <ChangePasswordForm
      isFirstLogin={user.mustChangePassword}
      callbackUrl={callbackUrl}
    />
  );
}
