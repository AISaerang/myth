import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { getSessionUser } from "@/lib/auth";
import { sanitizeShareCallback } from "@/lib/share-token";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordChanged?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = sanitizeShareCallback(params.callbackUrl);
  const user = await getSessionUser();
  if (user) {
    if (user.mustChangePassword) {
      redirect(
        callbackUrl
          ? `/change-password?callbackUrl=${encodeURIComponent(callbackUrl)}`
          : "/change-password",
      );
    }
    redirect(callbackUrl ?? "/dashboard");
  }

  return (
    <div className="flex flex-col gap-4">
      {params.passwordChanged ? (
        <Alert tone="info" title="Password berhasil diubah">
          <p>Silakan masuk dengan password baru.</p>
        </Alert>
      ) : null}
      <LoginForm callbackUrl={callbackUrl} />
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Tidak punya akun? Hubungi admin — tidak ada pendaftaran publik.
      </p>
    </div>
  );
}
