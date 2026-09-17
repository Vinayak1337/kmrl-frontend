export type Grant = { dept: string; type: string; actions: string[] };
export type User = {
  sub: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER";
  department?: string | null;
  grants: Grant[];
};
export type Section = {
  uid: string;
  docId: string;
  nodeId: string;
  order: number;
  title?: string;
  content: string;
  summary: string;
  summaryMd?: string;
  keyPoints: string[];
  actionableItems: string[];
  criticalFlags?: string[];
  pageRange?: { start: number; end: number };
};
export type Document = {
  id: string;
  title: string;
  summary?: string;
  fullSummary?: string;
  overallMd?: string;
  department?: string;
  documentType?: string;
  language?: string;
  totalPages?: number;
  nodeCount?: number;
  createdAt?: string;
  metadata?: {
    department?: string;
    documentType?: string;
    createdAt?: string;
    tags?: string[];
  };
  nodes?: Section[];
  raw?: { type?: string; content?: string; text?: string; url?: string };
};
export type Citation = {
  index: number;
  docId: string;
  nodeId?: string;
  uid?: string;
  title?: string;
  pageRange?: { start?: number; end?: number };
};
export type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  generation?: string;
};
export type History = {
  messages: Message[];
  citations?: Citation[];
  sessionId: string | null;
};
export type Action = {
  id: string;
  documentId: string;
  documentTitle: string;
  action: string;
  team: string;
  dueDate?: string;
  isUrgent?: boolean;
  sectionId?: string;
  sectionTitle?: string;
  type?: string;
};
export type Person = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER";
  department?: string;
  grants?: Grant[];
};
export type Audit = {
  actorName?: string;
  id: string;
  action: string;
  createdAt: string;
  actor?: { name?: string; email?: string };
  targetUser?: { name?: string; email?: string };
  details?: Record<string, unknown>;
};
export type Ingest = {
  title: string;
  department: string;
  documentType: string;
  language: string;
  documents: {
    type: "text" | "pdf" | "image";
    content: string;
    filename: string;
  }[];
};
export const teams = [
  "ENGINEERING",
  "OPERATIONS",
  "PROCUREMENT",
  "HR",
  "SAFETY",
  "FINANCE",
  "LEGAL",
  "COMPLIANCE",
  "IT",
  "ADMINISTRATION",
  "OTHER",
];
export const docTypes = [
  "policy",
  "circular",
  "contract",
  "report",
  "invoice",
  "tender",
  "sop",
  "manual",
  "notice",
  "minutes",
  "form",
  "correspondence",
  "technical_document",
  "maintenance",
  "incident_report",
  "vendor_invoice",
  "safety_circular",
  "other",
];
export const languages = [
  "English",
  "Hindi",
  "Malayalam",
  "Tamil",
  "Telugu",
  "Kannada",
  "Marathi",
  "Bengali",
];
export const humanize = (value?: string) =>
  value
    ? value
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .replace(/^Hr$/, "HR")
        .replace(/^It$/, "IT")
        .replace(/^Sop$/, "SOP")
    : "Unassigned";
export const departmentOf = (doc: Document) =>
  doc.metadata?.department || doc.department;
export const typeOf = (doc: Document) =>
  doc.metadata?.documentType || doc.documentType;
export const summaryOf = (doc: Document) =>
  doc.fullSummary || doc.summary || "";
export function pageLabel(range?: { start?: number; end?: number }) {
  if (!range?.start) return "Read source";
  return range.end && range.end !== range.start
    ? `Pages ${range.start}–${range.end}`
    : `Page ${range.start}`;
}
export function citationUid(citation: Citation): string | null {
  return (
    citation.uid ||
    (citation.docId && citation.nodeId
      ? `${citation.docId}#${citation.nodeId}`
      : null)
  );
}
export function validateIngest(input: Ingest): string | null {
  if (!input.title.trim()) return "Add a document title.";
  if (!input.department || !input.documentType)
    return "Choose a team and document type.";
  const source = input.documents[0];
  if (!source?.content.trim())
    return "Choose a file, take a photo, or paste text.";
  // Base64 costs 4/3 of the binary size; stay below typical server request limits.
  if (source.content.length > 3_500_000)
    return "Use a file smaller than 2.5 MB.";
  return null;
}
export function normalizeApiUrl(value: string, development: boolean): string {
  const url = new URL(value.trim());
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "/" && url.pathname !== "")
  )
    throw new Error("Use a workspace URL without a path or credentials.");
  if (url.protocol !== "https:" && !(development && url.protocol === "http:"))
    throw new Error("Use a secure https:// workspace URL.");
  return url.origin;
}
