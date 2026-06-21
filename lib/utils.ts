import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(address: string, chars = 6): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

export function truncateHash(hash: string, chars = 8): string {
  if (!hash) return "";
  return `${hash.slice(0, chars + 2)}…${hash.slice(-chars)}`;
}

export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const absDiffMs = Math.abs(diffMs);
  const future = diffMs < 0;

  const diffSec = Math.floor(absDiffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  let label: string;
  if (diffSec < 60) label = `${diffSec}s`;
  else if (diffMin < 60) label = `${diffMin}m`;
  else if (diffHr < 24) label = `${diffHr}h`;
  else label = `${diffDay}d`;

  return future ? `in ${label}` : `${label} ago`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateKey(prefix: string): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  const body = Array.from(arr)
    .map((b) => chars[b % chars.length])
    .join("");
  return `${prefix}${body}`;
}
