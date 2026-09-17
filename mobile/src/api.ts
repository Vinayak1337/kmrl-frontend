import { QueryClient } from "@tanstack/react-query";
import { useApp } from "./store";
import { demoDocs, demoActions, demoAnswer } from "./demo";
import type {
  Action,
  Audit,
  Document,
  History,
  Ingest,
  Person,
  Section,
  User,
} from "./domain";

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (count, error) =>
        count < 1 &&
        !(error instanceof ApiError && error.status < 500 && error.status > 0),
    },
    mutations: { retry: false },
  },
});
export async function request<T>(
  path: string,
  options: RequestInit = {},
  anonymous = false,
): Promise<T> {
  const { session, baseUrl } = useApp.getState();
  if (session?.demo && !anonymous)
    throw new ApiError("This action needs a live workspace.");
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timeout = setTimeout(
    onAbort,
    options.method === "POST" ? 150_000 : 25_000,
  );
  try {
    const headers = new Headers(options.headers);
    if (options.body) headers.set("Content-Type", "application/json");
    if (!anonymous && session?.token)
      headers.set("Authorization", `Bearer ${session.token}`);
    const response = await fetch(
      `${anonymous ? baseUrl : session?.baseUrl || baseUrl}${path}`,
      { ...options, headers, signal: controller.signal, credentials: "omit" },
    );
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && !anonymous) {
      if (useApp.getState().session === session) {
        queryClient.clear();
        await useApp.getState().signOut("Your session expired. Sign in again.");
      }
      throw new ApiError("Your session expired. Sign in again.", 401);
    }
    if (!response.ok)
      throw new ApiError(
        data.error ||
          data.errors?.join(". ") ||
          (response.status === 403
            ? "You do not have access to this action."
            : "Could not complete the request. Try again."),
        response.status,
      );
    if (!anonymous && useApp.getState().session !== session) {
      throw new ApiError("The account changed. Please try again.", 401);
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted)
      throw new ApiError(
        options.method === "POST"
          ? "The request timed out. Check the workspace before trying again."
          : "The request timed out. Try again.",
      );
    throw new ApiError(
      "Could not connect. Check your connection and workspace address.",
    );
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onAbort);
  }
}
const isDemo = () => !!useApp.getState().session?.demo;
export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User; expiresAt: number }>(
      "/api/mobile/auth",
      { method: "POST", body: JSON.stringify({ email, password }) },
      true,
    ),
  session: (signal?: AbortSignal) =>
    request<{ user: User | null }>("/api/auth/session", { signal }),
  documents: async (
    page: number,
    search = "",
    type = "",
    signal?: AbortSignal,
  ) => {
    if (isDemo()) {
      const docs = demoDocs.filter(
        (d) =>
          (!search ||
            `${d.title} ${d.summary}`
              .toLowerCase()
              .includes(search.toLowerCase())) &&
          (!type || d.documentType === type),
      );
      return {
        documents: page === 0 ? docs : [],
        totalCount: docs.length,
        page,
        pageSize: 20,
      };
    }
    return request<{
      documents: Document[];
      totalCount: number;
      page: number;
      pageSize: number;
    }>(
      `/api/documents/ingest?${new URLSearchParams({ page: String(page), pageSize: "20", q: search, type })}`,
      { signal },
    );
  },
  document: async (id: string, signal?: AbortSignal): Promise<Document> => {
    if (isDemo()) {
      const doc = demoDocs.find((d) => d.id === id);
      if (!doc) throw new ApiError("Document not found.", 404);
      return doc;
    }
    return request(`/api/documents/ingest?id=${encodeURIComponent(id)}`, {
      signal,
    });
  },
  section: async (
    uid: string,
    signal?: AbortSignal,
  ): Promise<{ node: Section }> => {
    if (isDemo()) {
      const node = demoDocs
        .flatMap((d) => d.nodes || [])
        .find((n) => n.uid === uid);
      if (!node) throw new ApiError("Source not found.", 404);
      return { node };
    }
    return request(`/api/nodes/${encodeURIComponent(uid)}`, { signal });
  },
  actions: async (signal?: AbortSignal): Promise<{ actions: Action[] }> =>
    isDemo()
      ? { actions: demoActions }
      : request("/api/actions?limit=200", { signal }),
  history: async (docId?: string, signal?: AbortSignal): Promise<History> =>
    isDemo()
      ? { messages: [], sessionId: null }
      : request(
          `/api/chat${docId ? `?docId=${encodeURIComponent(docId)}` : ""}`,
          { signal },
        ),
  ask: async (query: string, docId?: string, sessionId?: string | null) =>
    isDemo()
      ? demoAnswer(docId)
      : request<ReturnType<typeof demoAnswer>>("/api/chat", {
          method: "POST",
          body: JSON.stringify({
            messages: [{ role: "user", content: query }],
            docId,
            sessionId: sessionId || undefined,
          }),
        }),
  ingest: (input: Ingest) =>
    request<{ documentId: string; results?: unknown[] }>(
      "/api/documents/ingest",
      { method: "POST", body: JSON.stringify(input) },
    ),
  remove: (id: string) =>
    request(`/api/documents/${encodeURIComponent(id)}`, { method: "DELETE" }),
  feedback: (id: string, message: string) =>
    request(`/api/documents/${encodeURIComponent(id)}/feedback`, {
      method: "POST",
      body: JSON.stringify({ message, type: "correction", reprocess: false }),
    }),
  translate: (summary: string, language: string) =>
    request<{ summary: string; keyPoints: string[] }>("/api/translate", {
      method: "POST",
      body: JSON.stringify({ summary, language }),
    }),
  people: (signal?: AbortSignal) =>
    request<{ users: Person[] }>("/api/users", { signal }),
  person: (id: string, signal?: AbortSignal) =>
    request<{ user: Person }>(`/api/users/${encodeURIComponent(id)}`, {
      signal,
    }),
  savePerson: (person: Partial<Person> & { password?: string }, id?: string) =>
    request(`/api/users${id ? `/${encodeURIComponent(id)}` : ""}`, {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(person),
    }),
  deletePerson: (id: string) =>
    request(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
  audit: (page: number, signal?: AbortSignal) =>
    request<{ logs: Audit[]; total: number }>(
      `/api/audit?page=${page}&pageSize=25`,
      { signal },
    ),
};
