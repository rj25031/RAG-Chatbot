"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Bot,
  KeyRound,
  LogOut,
  Save,
  ShieldCheck,
  Sparkles,
  UserCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { useAuthedUser } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card-header";
import { Input } from "@/components/ui/input";
import {
  fetchGroqModels,
  updateUserPassword,
  updateUserProfile,
} from "@/lib/api";
import {
  clearCurrentUser,
  clearSelectedModel,
  getSelectedModel,
  saveCurrentUser,
  saveSelectedModel,
} from "@/lib/session";
import { InlineLoader, PageLoader } from "@/components/ui/loader";

export default function SettingsPage() {
  const { user, ready } = useAuthedUser();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const modelsQuery = useQuery({
    queryKey: ["groq-models"],
    queryFn: fetchGroqModels,
    enabled: ready && Boolean(user),
  });

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name);
  }, [user]);

  useEffect(() => {
    if (!modelsQuery.data) return;
    const storedModel = getSelectedModel();
    const knownModels = new Set(modelsQuery.data.models.map((model) => model.id));
    if (storedModel && knownModels.has(storedModel)) {
      setSelectedModel(storedModel);
      return;
    }

    setSelectedModel(modelsQuery.data.current_model);
  }, [modelsQuery.data]);

  const profileMutation = useMutation({
    mutationFn: () =>
      updateUserProfile(user!.id, {
        full_name: fullName.trim(),
      }),
    onSuccess: (updatedUser) => {
      saveCurrentUser(updatedUser);
      toast.success("Profile updated.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      updateUserPassword(user!.id, {
        current_password: currentPassword,
        new_password: newPassword,
      }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const availableModels = useMemo(
    () => modelsQuery.data?.models ?? [],
    [modelsQuery.data],
  );

  if (!ready || !user) {
    return <PageLoader label="Loading settings..." />;
  }

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fullName.trim()) {
      toast.error("Name is required.");
      return;
    }
    profileMutation.mutate();
  };

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Fill in both password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    passwordMutation.mutate();
  };

  const handleModelSave = () => {
    if (!selectedModel) {
      toast.error("Choose a model first.");
      return;
    }
    saveSelectedModel(selectedModel);
    toast.success("Chat model updated.");
  };

  return (
    <AppShell>
      <section className="min-h-0 overflow-y-auto bg-[#f7f7f8]">
        <div className="border-b border-black/8 bg-white px-3 py-4 sm:px-5 sm:py-6">
          <p className="text-[10px] uppercase tracking-[0.28em] text-black/45 sm:text-xs">
            Settings
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-ink sm:text-3xl">
                Account and model controls
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-black/60 sm:leading-7">
                Manage your profile, rotate your password, and choose which Groq
                model powers your chats.
              </p>
            </div>
            <div className="shrink-0 rounded-2xl border border-[#d8e4dc] bg-[#f5fbf8] px-3 py-3 text-sm text-[#173d31] sm:rounded-[28px] sm:px-4">
              Current chat model:{" "}
              <span className="break-all font-semibold">
                {selectedModel || modelsQuery.data?.current_model || "Loading..."}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-3 sm:gap-5 sm:p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div className="space-y-4 sm:space-y-5">
            <form
              className="rounded-2xl border border-black/8 bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6"
              onSubmit={handleProfileSubmit}
            >
              <CardHeader
                icon={<UserCircle2 className="h-5 w-5" />}
                className="sm:mb-6"
                title="Profile"
                description="Update how your account appears across the workspace."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-black/40">
                    Full name
                  </p>
                  <Input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-black/40">
                    Email
                  </p>
                  <Input
                    value={user.email}
                    disabled
                    className="rounded-2xl bg-[#f7f7f8]"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-[#f7f7f8] px-3 py-3 text-sm text-black/55 sm:flex-row sm:items-center sm:justify-between sm:rounded-3xl sm:px-4 sm:py-4">
                <span>
                  Changes are saved to your active local session immediately.
                </span>
                <Button
                  className="w-full shrink-0 gap-2 rounded-2xl px-4 sm:w-auto"
                  type="submit"
                  loading={profileMutation.isPending}
                >
                  {!profileMutation.isPending ? <Save className="h-4 w-4" /> : null}
                  {profileMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>

            <form
              className="rounded-2xl border border-black/8 bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6"
              onSubmit={handlePasswordSubmit}
            >
              <CardHeader
                icon={<KeyRound className="h-5 w-5" />}
                iconClassName="bg-[#efe4d6] text-[#8a4b14]"
                className="sm:mb-6"
                title="Password"
                description="Change your password without leaving the workspace."
              />

              <div className="grid gap-4">
                <Input
                  type="password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="rounded-2xl"
                />
                <Input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="rounded-2xl"
                />
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="rounded-2xl"
                />
              </div>

              <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-[#f7f7f8] px-3 py-3 text-sm text-black/55 sm:flex-row sm:items-center sm:justify-between sm:rounded-3xl sm:px-4 sm:py-4">
                <span>
                  Use a new password you are not already using for this account.
                </span>
                <Button
                  className="w-full shrink-0 gap-2 rounded-2xl px-4 sm:w-auto"
                  type="submit"
                  loading={passwordMutation.isPending}
                >
                  {!passwordMutation.isPending ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : null}
                  {passwordMutation.isPending
                    ? "Updating..."
                    : "Update Password"}
                </Button>
              </div>
            </form>
          </div>

          <div className="space-y-4 sm:space-y-5">
            <Card>
              <CardHeader
                icon={<Bot className="h-5 w-5" />}
                iconClassName="bg-[#171717] text-white"
                className="sm:mb-6"
                title="Model selection"
                description="Choose the Groq model your chat requests should use."
              />

              <div className="rounded-2xl border border-black/8 bg-[#f7f7f8] p-3 sm:rounded-3xl sm:p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-black/40">
                  Available Groq models
                </p>
                <div className="mt-3">
                  <select
                    className="h-12 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-black/20 sm:px-4"
                    value={selectedModel}
                    onChange={(event) => setSelectedModel(event.target.value)}
                    disabled={
                      modelsQuery.isLoading || availableModels.length === 0
                    }
                  >
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-4 grid gap-3">
                  {modelsQuery.isLoading ? (
                    <div className="rounded-2xl bg-white px-4 py-6">
                      <InlineLoader label="Loading Groq models..." />
                    </div>
                  ) : null}

                  {modelsQuery.isError ? (
                    <div className="rounded-2xl bg-white px-4 py-4 text-sm text-[#b42318]">
                      {modelsQuery.error.message}
                    </div>
                  ) : null}

                  {!modelsQuery.isLoading && availableModels.length === 0 ? (
                    <div className="rounded-2xl bg-white px-4 py-4 text-sm text-black/55">
                      No models were returned from Groq for this API key.
                    </div>
                  ) : null}

                  {availableModels
                    .filter((model) => model.id === selectedModel)
                    .map((model) => (
                      <div
                        key={model.id}
                        className="rounded-2xl bg-white px-3 py-3 text-sm text-black/65 sm:rounded-[24px] sm:px-4 sm:py-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                          <span className="break-all font-medium text-ink">
                            {model.id}
                          </span>
                          {model.active ? (
                            <span className="rounded-full bg-[#d8e4dc] px-2.5 py-1 text-xs font-medium text-[#173d31]">
                              Active
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2">Owner: {model.owned_by ?? "Groq"}</p>
                        <p className="mt-1">
                          Context window:{" "}
                          {model.context_window ?? "Not provided"}
                        </p>
                      </div>
                    ))}
                </div>
                <Button
                  className="mt-4 w-full justify-center gap-2 rounded-2xl"
                  onClick={handleModelSave}
                  type="button"
                  disabled={!selectedModel}
                >
                  <Sparkles className="h-4 w-4" />
                  Save Chat Model
                </Button>
              </div>
            </Card>

            <Card>
              <CardHeader
                icon={<LogOut className="h-5 w-5" />}
                iconClassName="bg-[#171717] text-white"
                title="Session"
                description="Clear the current local session and model preference."
              />

              <Button
                className="w-full justify-center gap-2 rounded-2xl"
                onClick={() => {
                  clearCurrentUser();
                  clearSelectedModel();
                  router.push("/login");
                }}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </Card>

            <div className="rounded-2xl border border-[#d8e4dc] bg-[#f5fbf8] p-4 text-sm leading-6 text-[#173d31] sm:rounded-[32px] sm:p-6 sm:leading-7">
              Model choices are fetched live from Groq and your selected model
              is saved in this browser, so chat starts using it immediately on
              the next message.
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
