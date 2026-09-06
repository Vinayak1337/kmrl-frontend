"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { listDocuments } from "@/services/documents";
import { listAllActions } from "@/services/actions";
import { DocSetuDocument, DocumentAction } from "@/types/docsetu";

const discoverQueries = [
  "What policies and thresholds changed this year?",
  "What vendor contracts require action in the next 30 days?",
  "Which documents have pending sign-offs or compliance obligations?",
  "Summarize cross-department responsibilities for procurement rollout.",
];

export default function HomePage() {
  const [recentDocs, setRecentDocs] = useState<DocSetuDocument[]>([]);
  const [urgentActions, setUrgentActions] = useState<DocumentAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      setLoading(true);
      try {
        const [docsRes, actionsRes] = await Promise.all([
          listDocuments({ pageSize: 6 }),
          listAllActions(),
        ]);
        setRecentDocs(docsRes.documents);
        setUrgentActions(
          actionsRes.filter((action) => action.dueDate || action.isUrgent),
        );
      } catch (error) {
        console.error("Failed to load home data", error);
      } finally {
        setLoading(false);
      }
    };

    void loadHomeData();
  }, []);

  const distinctTeams = new Set(
    recentDocs.map((document) => document.team).filter(Boolean),
  );
  const stats = [
    {
      label: "Documents",
      value: loading ? "—" : recentDocs.length,
      note: "In this workspace",
      icon: FileText,
      iconClass: "text-text-tertiary",
    },
    {
      label: "Needs attention",
      value: loading ? "—" : urgentActions.length,
      note: "Deadlines and priorities",
      icon: AlertTriangle,
      iconClass: "text-warning",
    },
    {
      label: "Departments",
      value: loading ? "—" : Math.max(distinctTeams.size, 1),
      note: "Cross-functional scope",
      icon: Building2,
      iconClass: "text-text-tertiary",
    },
    {
      label: "Corpus",
      value: "Active",
      note: "Workspace available",
      icon: CheckCircle2,
      iconClass: "text-success",
    },
  ];

  return (
    <div className="mx-auto max-w-[1380px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-col gap-3 border-b border-border-default pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
            Workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-text-primary md:text-4xl">
            Overview
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Review current obligations and move directly into the documents
            behind them.
          </p>
        </div>
        <Link
          href="/documents"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary hover:text-docsetu-indigo"
        >
          <span>Browse all documents</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <section className="grid grid-cols-2 border-b border-border-default lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`py-6 ${index % 2 === 0 ? "pr-5" : "border-l border-border-default pl-5"} ${index >= 2 ? "border-t border-border-default lg:border-t-0" : ""} lg:border-l lg:px-7 lg:first:border-l-0 lg:first:pl-0`}
            >
              <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                <Icon className={`h-4 w-4 ${stat.iconClass}`} />
                <span>{stat.label}</span>
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">{stat.note}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-0">
        <div className="lg:pr-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
                Priority
              </p>
              <h2 className="mt-1 text-lg font-semibold text-text-primary">
                Needs attention
              </h2>
            </div>
            <Link
              href="/actions"
              className="text-xs font-semibold text-text-secondary hover:text-text-primary"
            >
              View actions
            </Link>
          </div>

          <div className="border-t border-border-strong">
            {urgentActions.slice(0, 4).map((action, index) => (
              <Link
                key={action.id || index}
                href={`/documents/${action.documentId}`}
                className="group grid gap-2 border-b border-border-default py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
              >
                <div>
                  <p className="text-sm font-semibold leading-5 text-text-primary group-hover:text-docsetu-indigo">
                    {action.action}
                  </p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    {action.team} · {action.documentTitle}
                  </p>
                </div>
                {action.dueDate ? (
                  <span className="w-fit text-xs font-semibold text-warning">
                    {action.dueDate}
                  </span>
                ) : null}
              </Link>
            ))}

            {urgentActions.length === 0 && !loading ? (
              <p className="border-b border-border-default py-8 text-sm text-text-secondary">
                Nothing requires immediate review.
              </p>
            ) : null}
          </div>
        </div>

        <div className="border-border-default lg:border-l lg:pl-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
                Repository
              </p>
              <h2 className="mt-1 text-lg font-semibold text-text-primary">
                Recently added
              </h2>
            </div>
            <Link
              href="/documents"
              className="text-xs font-semibold text-text-secondary hover:text-text-primary"
            >
              View all
            </Link>
          </div>

          <div className="border-t border-border-strong">
            {recentDocs.slice(0, 4).map((document) => (
              <Link
                key={document.id}
                href={`/documents/${document.id}`}
                className="group block border-b border-border-default py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-sm font-semibold leading-5 text-text-primary group-hover:text-docsetu-indigo">
                    {document.title}
                  </h3>
                  <span className="shrink-0 text-xs text-text-tertiary">
                    {document.type}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-xs leading-5 text-text-secondary">
                  {document.summary}
                </p>
                <p className="mt-2 text-xs text-text-tertiary">
                  {document.team} · {document.pageCount}{" "}
                  {document.pageCount === 1 ? "page" : "pages"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border-default pt-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xs">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
              Explore
            </p>
            <h2 className="mt-1 text-lg font-semibold text-text-primary">
              Start with a question
            </h2>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              Open a focused workspace query.
            </p>
          </div>
          <div className="grid flex-1 gap-x-8 sm:grid-cols-2 lg:max-w-3xl">
            {discoverQueries.map((query) => (
              <button
                key={query}
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("open-docsetu-ai", {
                      detail: { question: query },
                    }),
                  );
                }}
                className="group flex items-start justify-between gap-4 border-b border-border-default py-3 text-left text-sm text-text-primary hover:text-docsetu-indigo"
              >
                <span>{query}</span>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary group-hover:text-docsetu-indigo" />
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
