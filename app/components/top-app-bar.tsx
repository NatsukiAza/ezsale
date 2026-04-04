import Image from "next/image";
import Link from "next/link";
import { USER_AVATAR } from "@/data";
import { SignOutButton } from "@/app/components/sign-out-button";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sales", label: "Sales" },
  { href: "/products", label: "Products" },
  { href: "/reports", label: "Reports" },
  { href: "/team", label: "Team" },
];

type TopAppBarProps = {
  title?: string;
  activeHref?: string;
};

export function TopAppBar({ title, activeHref = "/dashboard" }: TopAppBarProps) {
  return (
    <header className="fixed top-0 z-50 w-full bg-stone-50/80 shadow-sm backdrop-blur-md dark:bg-zinc-900/80">
      <div className="flex w-full items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="rounded-full p-2 text-primary transition-colors duration-200 hover:bg-stone-100 active:scale-95"
            aria-label="Abrir menú"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <Link
            href="/dashboard"
            className="font-headline text-xl font-extrabold tracking-tighter text-primary-dim"
          >
            EZSale
          </Link>
        </div>
        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => {
            const isActive = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "font-bold text-primary"
                    : "text-stone-500 transition-colors hover:text-primary"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 md:gap-3">
          {title ? (
            <span className="hidden font-headline text-xl font-bold text-primary lg:block">
              {title}
            </span>
          ) : null}
          <SignOutButton />
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-outline-variant/20 bg-surface-container-high">
            <Image
              src={USER_AVATAR}
              alt="Perfil de usuario"
              width={40}
              height={40}
              className="h-full w-full object-cover"
              unoptimized
            />
          </div>
        </div>
      </div>
      <div className="h-px bg-stone-200/50" />
    </header>
  );
}
