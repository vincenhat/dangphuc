import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · Đăng Phúc" };

export default function LoginPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-6 py-12 md:py-24">
      <div className="w-full max-w-md">
        <p className="text-xs uppercase tracking-[0.2em] ink-muted">Đăng Phúc · Study</p>
        <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          Welcome back
        </h1>
        <p className="mt-3 text-base ink-muted">
          Enter your passcode to open the study workspace.
        </p>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
