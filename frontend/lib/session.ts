"use client";

import type { User } from "@/types";

const USER_KEY = "kb_user";
const TOKEN_KEY = "kb_token";
const MODEL_KEY = "kb_model";
const USER_EVENT = "kb-user-updated";
const MODEL_EVENT = "kb-model-updated";

function dispatchClientEvent(eventName: string) {
  window.dispatchEvent(new Event(eventName));
}

export function saveCurrentUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  dispatchClientEvent(USER_EVENT);
}

export function saveAccessToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  dispatchClientEvent(USER_EVENT);
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function clearCurrentUser() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  dispatchClientEvent(USER_EVENT);
}

export function saveSelectedModel(model: string) {
  localStorage.setItem(MODEL_KEY, model);
  dispatchClientEvent(MODEL_EVENT);
}

export function getSelectedModel() {
  return localStorage.getItem(MODEL_KEY);
}

export function clearSelectedModel() {
  localStorage.removeItem(MODEL_KEY);
  dispatchClientEvent(MODEL_EVENT);
}

export function getUserSessionEventName() {
  return USER_EVENT;
}

export function getModelSessionEventName() {
  return MODEL_EVENT;
}
