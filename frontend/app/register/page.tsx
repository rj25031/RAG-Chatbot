import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
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
