// Local replacement for the missing "@workspace/api-client-react" package.
// Talks to whatever REST API you point it at via VITE_API_BASE_URL
// (e.g. a Flask/FastAPI server running on the Raspberry Pi, or a
// Cloudflare Tunnel URL pointing at it).
//
// Expected backend endpoints:
//   GET    /api/dashboard/summary        -> DashboardSummary
//   GET    /api/trees                    -> Tree[]
//   GET    /api/trees/alerts             -> Tree[] (only trees with alertActive)
//   POST   /api/trees            {name}  -> Tree
//   GET    /api/trees/:id                -> Tree
//   PATCH  /api/trees/:id        {name}  -> Tree
//   DELETE /api/trees/:id                -> {}
//   GET    /api/trees/:id/readings       -> Reading[]

import { useQuery, useMutation, type UseMutationResult } from "@tanstack/react-query";
import { getToken, setToken, clearToken } from "@/lib/auth";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export interface Reading {
  id: number;
  timestamp: string;
  moistureValue: number;
  soilStatus: string;
  soilMessage?: string;
  tempC?: number;
  pressureHpa?: number;
  plantStatus?: "healthy" | "stressed" | "uncertain";
  plantMessage?: string;
  photoUrl?: string;
}

export interface Tree {
  id: number;
  name: string;
  createdAt: string;
  alertActive: boolean;
  latestReading?: Reading;
}

export interface DashboardSummary {
  totalTrees: number;
  healthyCount: number;
  stressedCount: number;
  alertCount: number;
  lastSyncAt?: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401 && path !== "/api/auth/login") {
    clearToken();
    window.location.href = `${import.meta.env.BASE_URL}login`;
    throw new Error("Not authenticated");
  }
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useGetDeviceStatus() {
  return useQuery({
    queryKey: ["device-status"],
    queryFn: () => request<{ batteryPercent: number | null; batteryVoltage: number | null; lastSeenAt: string | null }>("/api/device/status"),
    refetchInterval: 30_000,
  });
}

// --- Auth ---
export function useLogin(): UseMutationResult<
  { token: string },
  Error,
  { username: string; password: string }
> {
  return useMutation({
    mutationFn: async (credentials) => {
      const data = await request<{ token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      setToken(data.token);
      return data;
    },
  });
}

export function logout() {
  clearToken();
  window.location.href = `${import.meta.env.BASE_URL}login`;
}

// --- Query keys (kept as functions to match the old package's API) ---
export const getGetDashboardSummaryQueryKey = () => ["dashboard-summary"];
export const getListTreesQueryKey = () => ["trees"];
export const getGetTreeQueryKey = (treeId: number) => ["tree", treeId];
export const getListAlertsQueryKey = () => ["alerts"];
export const getListTreeReadingsQueryKey = (treeId: number) => ["tree-readings", treeId];

// --- Queries ---
export function useGetDashboardSummary() {
  return useQuery({
    queryKey: getGetDashboardSummaryQueryKey(),
    queryFn: () => request<DashboardSummary>("/api/dashboard/summary"),
    refetchInterval: 30_000,
  });
}

export function useListTrees() {
  return useQuery({
    queryKey: getListTreesQueryKey(),
    queryFn: () => request<Tree[]>("/api/trees"),
    refetchInterval: 30_000,
  });
}

export function useListAlerts() {
  return useQuery({
    queryKey: getListAlertsQueryKey(),
    queryFn: () => request<Tree[]>("/api/trees/alerts"),
    refetchInterval: 30_000,
  });
}

export function useGetTree(treeId: number) {
  return useQuery({
    queryKey: getGetTreeQueryKey(treeId),
    queryFn: () => request<Tree>(`/api/trees/${treeId}`),
    enabled: Number.isFinite(treeId),
  });
}

export function useListTreeReadings(treeId: number) {
  return useQuery({
    queryKey: getListTreeReadingsQueryKey(treeId),
    queryFn: () => request<Reading[]>(`/api/trees/${treeId}/readings`),
    enabled: Number.isFinite(treeId),
  });
}

// --- Mutations ---
export function useCreateTree(): UseMutationResult<Tree, Error, { data: { name: string } }> {
  return useMutation({
    mutationFn: ({ data }) =>
      request<Tree>("/api/trees", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useUpdateTree(): UseMutationResult<
  Tree,
  Error,
  { treeId: number; data: { name: string } }
> {
  return useMutation({
    mutationFn: ({ treeId, data }) =>
      request<Tree>(`/api/trees/${treeId}`, { method: "PATCH", body: JSON.stringify(data) }),
  });
}

export function useDeleteTree(): UseMutationResult<void, Error, { treeId: number }> {
  return useMutation({
    mutationFn: ({ treeId }) => request<void>(`/api/trees/${treeId}`, { method: "DELETE" }),
  });
}
