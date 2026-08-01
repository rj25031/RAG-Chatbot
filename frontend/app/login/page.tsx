import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-3 py-6 sm:px-4 sm:py-8">
      <AuthForm
        mode="login"
        title="Login"
        description="Access your folders, documents, and conversations."
        submitLabel="Sign in"
        alternateHref="/register"
        alternateLabel="Create an account"
        alternateText="New here?"
      />
    </main>
  );
}
