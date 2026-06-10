import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-safe">
      <header className="py-5">
        <Link href="/">
          <Wordmark />
        </Link>
      </header>
      <main className="flex flex-1 flex-col justify-center">{children}</main>
    </div>
  );
}
