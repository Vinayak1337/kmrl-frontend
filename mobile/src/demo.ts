import type { Action, Document, History, User } from "./domain";
export const demoUser: User = {
  sub: "demo",
  name: "Vinayak",
  email: "sample@docsetu.local",
  role: "ADMIN",
  grants: [],
};
export const demoDocs: Document[] = [
  {
    id: "sample-procurement",
    title: "Procurement policy FY26",
    department: "PROCUREMENT",
    documentType: "policy",
    totalPages: 31,
    language: "English",
    nodeCount: 2,
    summary: "Updated purchasing limits and approval rules for FY26.",
    createdAt: "2026-09-15T10:00:00Z",
    nodes: [
      {
        uid: "sample-procurement#node-1",
        docId: "sample-procurement",
        nodeId: "node-1",
        order: 1,
        title: "Purpose & scope",
        pageRange: { start: 1, end: 4 },
        summary: "Purchasing standards across all business units.",
        content:
          "SAMPLE DOCUMENT\n\n1.1 This framework governs procurement across the organization. Three independent vendor quotes are required for new purchases. Registered suppliers are reviewed each year.",
        keyPoints: [
          "Three quotes for new purchases",
          "Supplier review every year",
        ],
        actionableItems: [],
      },
      {
        uid: "sample-procurement#node-2",
        docId: "sample-procurement",
        nodeId: "node-2",
        order: 2,
        title: "Approval thresholds",
        pageRange: { start: 5, end: 11 },
        summary: "Dual approval is required for purchases above ₹25 lakh.",
        content:
          "SAMPLE DOCUMENT\n\n2.1 Purchases up to ₹2,50,000 may be approved by the Unit Manager.\n\n2.2 Purchases between ₹2,50,000 and ₹10,00,000 require Department Head approval.\n\n2.3 Purchases exceeding ₹25,00,000 require dual authorization by the CFO and the Managing Committee. Update the approval workflow by 30 September 2026.",
        keyPoints: ["Dual approval above ₹25 lakh"],
        actionableItems: ["Update the approval workflow by 30 September 2026"],
        criticalFlags: ["New approval limits take effect on 1 October 2026."],
      },
    ],
  },
  {
    id: "sample-facility",
    title: "Facility management agreement",
    department: "LEGAL",
    documentType: "contract",
    totalPages: 42,
    language: "English",
    summary:
      "Service schedules and renewal requirements for building maintenance.",
    nodeCount: 1,
    createdAt: "2026-09-14T10:00:00Z",
    nodes: [
      {
        uid: "sample-facility#node-1",
        docId: "sample-facility",
        nodeId: "node-1",
        order: 1,
        title: "Renewal notice",
        pageRange: { start: 1, end: 8 },
        summary: "Give written notice sixty days before expiry.",
        content:
          "SAMPLE DOCUMENT\n\nThe agreement may be renewed by written notice at least sixty calendar days before expiry. Review the renewal notice before 18 September 2026.",
        keyPoints: ["Give 60 days’ written notice"],
        actionableItems: ["Review the renewal notice before 18 September 2026"],
      },
    ],
  },
  {
    id: "sample-security",
    title: "Information security SOP",
    department: "COMPLIANCE",
    documentType: "sop",
    totalPages: 18,
    language: "English",
    summary: "Access reviews and offboarding responsibilities.",
    nodeCount: 1,
    createdAt: "2026-09-13T10:00:00Z",
    nodes: [
      {
        uid: "sample-security#node-1",
        docId: "sample-security",
        nodeId: "node-1",
        order: 1,
        title: "Access reviews",
        pageRange: { start: 1, end: 6 },
        summary: "Review privileged access each quarter.",
        content:
          "SAMPLE DOCUMENT\n\nComplete the quarterly privileged access review by 25 September 2026. Disable departing employees’ accounts within four hours of formal HR notice.",
        keyPoints: [
          "Quarterly access reviews",
          "Disable accounts within four hours",
        ],
        actionableItems: [
          "Complete the quarterly privileged access review by 25 September 2026",
        ],
      },
    ],
  },
  {
    id: "sample-operations",
    title: "Operations weekly report",
    department: "OPERATIONS",
    documentType: "report",
    totalPages: 8,
    language: "English",
    summary: "Routine operations and inspection records.",
    nodeCount: 1,
    createdAt: "2026-09-12T10:00:00Z",
    nodes: [
      {
        uid: "sample-operations#node-1",
        docId: "sample-operations",
        nodeId: "node-1",
        order: 1,
        title: "Weekly review",
        pageRange: { start: 1, end: 8 },
        summary: "Inspections are complete for the reporting period.",
        content:
          "SAMPLE DOCUMENT\n\nThe scheduled inspections are complete for the reporting period. No follow-up actions were recorded.",
        keyPoints: ["Scheduled inspections complete"],
        actionableItems: [],
      },
    ],
  },
];
export const demoActions: Action[] = demoDocs.flatMap((d) =>
  (d.nodes || []).flatMap((n) =>
    n.actionableItems.map((action, i) => ({
      id: `${d.id}-${n.nodeId}-${i}`,
      documentId: d.id,
      documentTitle: d.title,
      action,
      team: d.department!,
      sectionId: n.nodeId,
      sectionTitle: n.title,
    })),
  ),
);
export function demoAnswer(
  docId?: string,
): History & { reply: string; generation: string } {
  const doc = demoDocs.find((d) => d.id === docId) || demoDocs[0];
  const node = doc.nodes![doc.id === "sample-procurement" ? 1 : 0];
  const reply = `Sample answer: ${node.summary}`;
  return {
    messages: [],
    sessionId: "sample-conversation",
    reply,
    generation: "demo",
    citations: [
      {
        index: 1,
        docId: doc.id,
        nodeId: node.nodeId,
        uid: node.uid,
        title: node.title,
        pageRange: node.pageRange,
      },
    ],
  };
}
