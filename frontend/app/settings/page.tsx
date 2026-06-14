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

import { useAuthedUser } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
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
    return null;
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
        <div className="border-b border-black/8 bg-white px-5 py-6">
          <p className="text-xs uppercase tracking-[0.28em] text-black/45">
            Settings
          </p>
          <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-ink">
                Account and model controls
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-black/60">
                Manage your profile, rotate your password, and choose which Groq model powers your chats.
              </p>
            </div>
            <div className="rounded-[28px] border border-[#d8e4dc] bg-[#f5fbf8] px-4 py-3 text-sm text-[#173d31]">
              Current chat model:{" "}
              <span className="font-semibold">
                {selectedModel || modelsQuery.data?.current_model || "Loading..."}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <form
              className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm"
              onSubmit={handleProfileSubmit}
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-[#d8e4dc] p-2.5 text-[#173d31]">
                  <UserCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">Profile</h3>
                  <p className="text-sm text-black/55">
                    Update how your account appears across the workspace.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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

              <div className="mt-5 flex items-center justify-between rounded-3xl bg-[#f7f7f8] px-4 py-4 text-sm text-black/55">
                <span>Changes are saved to your active local session immediately.</span>
                <Button
                  className="gap-2 rounded-2xl px-4"
                  type="submit"
                  disabled={profileMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                  {profileMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>

            <form
              className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm"
              onSubmit={handlePasswordSubmit}
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-[#efe4d6] p-2.5 text-[#8a4b14]">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">Password</h3>
                  <p className="text-sm text-black/55">
                    Change your password without leaving the workspace.
                  </p>
                </div>
              </div>

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

              <div className="mt-5 flex items-center justify-between rounded-3xl bg-[#f7f7f8] px-4 py-4 text-sm text-black/55">
                <span>Use a new password you are not already using for this account.</span>
                <Button
                  className="gap-2 rounded-2xl px-4"
                  type="submit"
                  disabled={passwordMutation.isPending}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {passwordMutation.isPending ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          </div>

          <div className="space-y-5">
            <div className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-[#171717] p-2.5 text-white">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">Model selection</h3>
                  <p className="text-sm text-black/55">
                    Choose the Groq model your chat requests should use.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-black/8 bg-[#f7f7f8] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-black/40">
                  Available Groq models
                </p>
                <div className="mt-3">
                  <select
                    className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-black/20"
                    value={selectedModel}
                    onChange={(event) => setSelectedModel(event.target.value)}
                    disabled={modelsQuery.isLoading || availableModels.length === 0}
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
                    <div className="rounded-2xl bg-white px-4 py-4 text-sm text-black/55">
                      Loading Groq models...
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
                        className="rounded-[24px] bg-white px-4 py-4 text-sm text-black/65"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-ink">{model.id}</span>
                          {model.active ? (
                            <span className="rounded-full bg-[#d8e4dc] px-2.5 py-1 text-xs font-medium text-[#173d31]">
                              Active
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2">Owner: {model.owned_by ?? "Groq"}</p>
                        <p className="mt-1">
                          Context window: {model.context_window ?? "Not provided"}
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
            </div>

            <div className="rounded-[32px] border border-black/8 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-[#171717] p-2.5 text-white">
                  <LogOut className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">Session</h3>
                  <p className="text-sm text-black/55">
                    Clear the current local session and model preference.
                  </p>
                </div>
              </div>

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
            </div>

            <div className="rounded-[32px] border border-[#d8e4dc] bg-[#f5fbf8] p-6 text-sm leading-7 text-[#173d31]">
              Model choices are fetched live from Groq and your selected model is saved in this browser, so chat starts using it immediately on the next message.
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
