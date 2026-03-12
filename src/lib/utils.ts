import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeParseJson(jsonString: string | null | undefined, fallback: any = []) {
  if (!jsonString) return fallback;
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed === 'string') {
      return safeParseJson(parsed, fallback);
    }
    return parsed;
  } catch (e) {
    return fallback;
  }
}

export async function fetchApi(url: string, options: any = {}) {
  const token = localStorage.getItem('spas_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await res.text();
    const snippet = text.substring(0, 100).replace(/</g, '&lt;');
    throw new Error(`Server error (${res.status}): Received HTML instead of JSON. Preview: ${snippet}...`);
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
  }
  
  return data;
}
