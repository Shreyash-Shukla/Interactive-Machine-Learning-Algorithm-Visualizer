import type { ClusterTraining, Point, Training } from "../types";

const base = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function call<T>(
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(`${base}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail =
        typeof payload.detail === "string"
          ? payload.detail
          : "Request failed. Please try again.";
      throw new ApiError(detail, response.status);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        "The server took too long to respond. Please retry.",
        0,
      );
    }
    throw new ApiError(
      "Could not reach the backend. The free server may be starting; please retry shortly.",
      0,
    );
  } finally {
    window.clearTimeout(timer);
  }
}

export const login = (password: string) =>
  call<{ access_token: string; expires_in: number }>("/api/auth/login", {
    password,
  });
export const train = (
  points: Point[],
  learning_rate: number,
  epochs: number,
  token: string,
) => call<Training>("/api/train", { points, learning_rate, epochs }, token);
export const trainKMeans = (
  points: Point[],
  clusters: number,
  max_iterations: number,
  token: string,
) => call<ClusterTraining>("/api/kmeans/train", { points, clusters, max_iterations }, token);
