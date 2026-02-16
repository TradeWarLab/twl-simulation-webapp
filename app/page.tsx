import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold text-slate-900 dark:text-white">
          Trade War Lab
        </h1>

        <p className="mt-3 text-2xl text-slate-700 dark:text-slate-300">
          U.S. - China Relations Simulation
        </p>

        <div className="flex flex-wrap items-center justify-around max-w-4xl mt-6 sm:w-full">
          <div className="flex gap-4 mt-8">
            <Button asChild size="lg" className="text-lg">
              <Link href="/auth/login">Log In</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg">
              <Link href="/auth/sign-up">Sign Up</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="flex items-center justify-center w-full h-24 border-t">
      </footer>
    </div>
  );
}
