import { AuthForm } from "@/components/auth/auth-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-3 py-6 sm:px-4 sm:py-8">
      <AuthForm
        mode="register"
        title="Register"
        description="Create your workspace account to manage documents and chats."
        submitLabel="Create account"
        alternateHref="/login"
        alternateLabel="Sign in"
        alternateText="Already have an account?"
      />
    </main>
  );
}
