"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useMutation } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { toast } from "react-toastify";

import { loginUser, registerUser } from "@/lib/api";
import { saveAccessToken, saveCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthForm({
  mode,
  title,
  description,
  submitLabel,
  alternateHref,
  alternateLabel,
  alternateText,
}: {
  mode: "login" | "register";
  title: string;
  description: string;
  submitLabel: string;
  alternateHref: Route;
  alternateLabel: string;
  alternateText: string;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "register") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        return registerUser({ full_name: fullName, email, password });
      }

      return loginUser({ email, password });
    },
    onSuccess: ({ user, access_token }) => {
      toast.success(mode === "register" ? "Account created successfully." : "Logged in successfully.");
      saveAccessToken(access_token);
      saveCurrentUser(user);
      router.push("/folders");
    },
    onError: (mutationError) => {
      toast.error(mutationError.message);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-[32px] border border-black/10 bg-white/88 p-8 shadow-panel">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-black/55">{description}</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <Input
            placeholder="Full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        ) : null}
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {mode === "register" ? (
          <Input
            placeholder="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        ) : null}

        <Button
          className="w-full justify-center"
          type="submit"
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? mode === "register"
              ? "Creating account..."
              : "Signing in..."
            : submitLabel}
        </Button>
      </form>

      <p className="mt-6 text-sm text-black/55">
        {alternateText}{" "}
        <Link className="font-medium text-spruce" href={alternateHref}>
          {alternateLabel}
        </Link>
      </p>
    </div>
  );
}
