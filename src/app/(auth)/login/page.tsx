import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordChanged?: string }>;
}) {
  const user = await getSessionUser();
  if (user) {
    redirect(user.mustChangePassword ? "/change-password" : "/dashboard");
  }
  const params = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      {params.passwordChanged ? (
        <Alert tone="info" title="Password berhasil diubah">
          <p>Silakan masuk dengan password baru.</p>
        </Alert>
      ) : null}
      <LoginForm />
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Tidak punya akun? Hubungi admin — tidak ada pendaftaran publik.
      </p>
    </div>
  );
}
