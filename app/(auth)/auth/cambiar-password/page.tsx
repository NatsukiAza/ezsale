import { ChangePasswordForm } from "@/app/components/change-password-form";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { BrandMark } from "@/components/app/brand-mark";

export default function CambiarPasswordPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center justify-between border-b border-border px-6">
        <BrandMark href="/" />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <ChangePasswordForm />
      </main>
    </div>
  );
}
