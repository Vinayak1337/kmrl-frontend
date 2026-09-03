"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
} from "lucide-react";
import { DocSetuLogo } from "@/components/brand/DocSetuBrand";

const useCases = {
  procurement: {
    label: "Procurement",
    query:
      "Which purchase orders are waiting for approval and what limits apply?",
    answer:
      "Two purchase requisitions require dual sign-off because they exceed ₹25 Lakhs. Unit managers can approve requisitions up to ₹2.5 Lakhs.",
    source: "Procurement Policy FY26 · Section 2 · Pages 5–11",
    action: "Dual sign-off required before vendor onboarding",
  },
  legal: {
    label: "Legal",
    query: "Which agreements contain automatic renewal clauses this quarter?",
    answer:
      "The Facility Management Agreement expires on 15 November 2026. Written notice is required at least 60 days in advance.",
    source: "Facility Management Agreement · Clause 4 · Pages 6–8",
    action: "Dispatch renewal notice by 18 September",
  },
  government: {
    label: "Government",
    query: "Which circulars introduce compliance deadlines this month?",
    answer:
      "The compliance circular requires quarterly environmental and occupational safety filings before 30 September.",
    source: "Statutory Compliance Circular · Section 3 · Pages 2–4",
    action: "Submit the verified Q2 declaration",
  },
  finance: {
    label: "Finance",
    query: "What capital expenditure thresholds require board sanction?",
    answer:
      "Capital acquisitions exceeding ₹25 Lakhs require Managing Committee and Board sanction.",
    source: "Financial Delegation Matrix FY26 · Schedule B · Page 4",
    action: "Update ERP delegation rules by 30 September",
  },
  hr: {
    label: "HR",
    query: "What are the deprovisioning timelines for separated personnel?",
    answer:
      "Enterprise credentials and badge access must be revoked within four hours of formal separation notification.",
    source: "Information Security SOP · Section 3 · Page 5",
    action: "Verify the HR offboarding trigger",
  },
  operations: {
    label: "Operations",
    query: "What protocols apply during scheduled electrical outages?",
    answer:
      "Secondary generator banks must synchronize within 12 seconds of mains isolation, verified by two technicians.",
    source: "Electrical Substation SOP · Section 4 · Pages 9–12",
    action: "Complete the generator load-test certificate",
  },
} as const;

const pipeline = [
  ["01", "Capture", "Upload contracts, policies, SOPs, and circulars."],
  ["02", "Parse", "Extract text and retain document structure."],
  ["03", "Index", "Create a searchable representation of each source."],
  ["04", "Verify", "Return answers with exact page and clause citations."],
  ["05", "Act", "Turn obligations and deadlines into accountable work."],
] as const;

const safeguards = [
  [
    Lock,
    "Controlled access",
    "People only retrieve documents their role and team permit.",
  ],
  [
    BookOpen,
    "Source citations",
    "Every answer can lead back to the relevant page and clause.",
  ],
  [
    Clock,
    "Audit trail",
    "Administrative and document activity remains attributable.",
  ],
] as const;

type UseCase = keyof typeof useCases;

export default function LandingPage() {
  const [activeUseCase, setActiveUseCase] = useState<UseCase>("procurement");
  const example = useCases[activeUseCase];

  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border-default bg-canvas/95 px-5 backdrop-blur sm:px-10 lg:px-14">
        <DocSetuLogo size="md" />
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            Sign in
          </Link>
          <Link
            href="/home"
            className="rounded-lg bg-docsetu-indigo px-4 py-2 text-sm font-semibold text-white hover:bg-[#3B4BBF]"
          >
            Open workspace
          </Link>
        </div>
      </nav>

      <main>
        <section className="mx-auto grid max-w-7xl gap-14 px-5 py-16 sm:px-10 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-14 lg:py-28">
          <div className="max-w-2xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              Document intelligence, grounded in source
            </p>
            <h1 className="text-4xl font-semibold leading-[1.06] tracking-[-0.045em] text-text-primary sm:text-6xl">
              Find the rule. Verify the source. Move the work forward.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-text-secondary sm:text-lg">
              DocSetu connects contracts, policies, SOPs, and circulars so teams
              can search decisions, trace obligations, and act with confidence.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link
                href="/home"
                className="inline-flex items-center gap-2 rounded-lg bg-docsetu-indigo px-5 py-3 text-sm font-semibold text-white hover:bg-[#3B4BBF]"
              >
                Open workspace <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="text-sm font-semibold text-text-primary hover:text-docsetu-indigo"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="border-y border-border-strong bg-white">
            <div className="border-b border-border-default px-5 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
                Ask DocSetu
              </p>
              <div className="flex items-center justify-between gap-4 text-sm font-medium text-text-primary">
                <span>Which vendor agreements require action this month?</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-text-primary text-white">
                  <ArrowUp className="h-4 w-4" />
                </span>
              </div>
            </div>
            <div className="px-5 py-2">
              <p className="flex items-center gap-2 border-b border-border-default py-3 text-xs font-semibold text-warning">
                <CheckCircle2 className="h-4 w-4" /> 3 items require attention
              </p>
              {[
                [
                  "Facility Management Agreement",
                  "Renewal notice required at least 60 days before expiry.",
                  "Due 18 Sep",
                ],
                [
                  "Hardware Annual Maintenance Contract",
                  "Price revision awaits Procurement and Finance sign-off.",
                  "Approval pending",
                ],
              ].map((item) => (
                <div
                  key={item[0]}
                  className="grid gap-1 border-b border-border-default py-4 sm:grid-cols-[1fr_auto]"
                >
                  <p className="text-sm font-semibold text-text-primary">
                    {item[0]}
                  </p>
                  <p className="text-xs font-semibold text-text-secondary sm:text-right">
                    {item[2]}
                  </p>
                  <p className="text-xs leading-5 text-text-secondary">
                    {item[1]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-y border-border-default bg-white"
        >
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-10 lg:px-14 lg:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-text-primary sm:text-4xl">
                One continuous path from source to action.
              </h2>
            </div>
            <div className="mt-12 grid border-t border-border-strong sm:grid-cols-2 lg:grid-cols-5">
              {pipeline.map(([number, title, description], index) => (
                <div
                  key={number}
                  className={`border-b border-border-default py-6 sm:px-6 lg:border-b-0 ${index > 0 ? "lg:border-l" : ""} lg:first:pl-0`}
                >
                  <p className="font-mono text-xs text-text-tertiary">
                    {number}
                  </p>
                  <h3 className="mt-5 text-sm font-semibold text-text-primary">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-10 lg:grid-cols-[0.75fr_1.25fr] lg:px-14 lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              Across departments
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-text-primary">
              Ask specific questions, without losing context.
            </h2>
            <p className="mt-4 text-sm leading-6 text-text-secondary">
              Move between functions while keeping the answer, source, and next
              action visibly distinct.
            </p>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 lg:flex-col lg:items-start">
              {(Object.keys(useCases) as UseCase[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveUseCase(key)}
                  className={`border-l-2 py-1 pl-3 text-sm font-semibold transition-colors ${activeUseCase === key ? "border-docsetu-indigo text-text-primary" : "border-transparent text-text-tertiary hover:text-text-primary"}`}
                >
                  {useCases[key].label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-y border-border-strong bg-white">
            <div className="px-6 py-6 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
                Question
              </p>
              <p className="mt-2 text-lg font-semibold leading-7 text-text-primary">
                &ldquo;{example.query}&rdquo;
              </p>
            </div>
            <div className="border-t border-border-default px-6 py-6 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
                Answer
              </p>
              <p className="mt-2 text-sm leading-6 text-text-primary">
                {example.answer}
              </p>
            </div>
            <div className="grid border-t border-border-default sm:grid-cols-2">
              <div className="px-6 py-5 sm:px-8">
                <p className="text-xs text-text-tertiary">Source</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-text-primary">
                  {example.source}
                </p>
              </div>
              <div className="border-t border-border-default px-6 py-5 sm:border-l sm:border-t-0 sm:px-8">
                <p className="text-xs text-text-tertiary">Next action</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-warning">
                  {example.action}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border-default bg-white">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-10 lg:px-14 lg:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              Trust by design
            </p>
            <div className="mt-8 grid border-t border-border-strong md:grid-cols-3">
              {safeguards.map(([Icon, title, description], index) => (
                <div
                  key={title}
                  className={`border-b border-border-default py-7 md:border-b-0 md:px-8 ${index > 0 ? "md:border-l" : ""} md:first:pl-0`}
                >
                  <Icon className="h-5 w-5 text-text-secondary" />
                  <h3 className="mt-5 text-base font-semibold text-text-primary">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-16 sm:px-10 lg:flex-row lg:items-end lg:justify-between lg:px-14 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              Start with your corpus
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-text-primary sm:text-4xl">
              Turn scattered documents into accountable knowledge.
            </h2>
          </div>
          <Link
            href="/home"
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-text-primary px-5 py-3 text-sm font-semibold text-white hover:bg-docsetu-indigo"
          >
            Open workspace <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-border-default px-5 py-8 sm:px-10 lg:px-14">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-xs text-text-tertiary sm:flex-row sm:items-center sm:justify-between">
          <DocSetuLogo size="sm" />
          <p>&copy; {new Date().getFullYear()} DocSetu</p>
          <div className="flex gap-5 font-medium">
            <Link href="/login">Sign in</Link>
            <Link href="/home">Workspace</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
