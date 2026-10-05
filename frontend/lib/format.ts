export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function formatTime(value: string | null, fallback = "No activity yet") {
  if (!value) return fallback;
  return new Date(value).toLocaleString();
}