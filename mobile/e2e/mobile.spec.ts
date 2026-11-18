import { expect, test } from "@playwright/test";
import { demoDocs } from "../src/demo";

test("sample browse → save → reader → ask → exact source; themes and actions", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Explore sample workspace" }).click();
  await expect(
    page.getByRole("button", { name: "Open Procurement policy FY26" }),
  ).toBeVisible();
  await page.screenshot({ path: "design/screenshots/documents-light.png" });
  await page.getByRole("tab", { name: /^Ask/ }).click();
  await expect(
    page.getByText("Find the answer. Keep the source."),
  ).toBeVisible();
  await page.screenshot({ path: "design/screenshots/ask-start-light.png" });
  await page.getByRole("tab", { name: /Documents/ }).click();
  await page
    .getByRole("button", { name: "Save Procurement policy FY26", exact: true })
    .click();
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Procurement policy FY26" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open Procurement policy FY26" })
    .click();
  await expect(page.getByText("AT A GLANCE")).toBeVisible();
  await page.screenshot({ path: "design/screenshots/reader-light.png" });
  await page
    .getByRole("button", { name: "Ask this document", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Your question" })
    .fill("Who approves purchases above ₹25 lakh?");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    page.getByText(
      "Sample answer: Dual approval is required for purchases above ₹25 lakh.",
    ),
  ).toBeVisible();
  await page.screenshot({ path: "design/screenshots/ask-light.png" });
  await page.getByRole("button", { name: /Approval thresholds/ }).click();
  await expect(page.getByText(/2.3 Purchases exceeding/)).toBeVisible();
  await page.goBack();
  await page.goBack();
  await page.goBack();
  await page.getByRole("tab", { name: /Actions/ }).click();
  await page.getByRole("button", { name: "To do", exact: true }).click();
  const check = page.getByRole("checkbox").first();
  await check.click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await page.getByRole("tab", { name: /Workspace/ }).click();
  await page.getByRole("button", { name: /Use device setting/ }).click();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Close choices" }),
  ).toBeHidden();
  await page.getByRole("tab", { name: /Documents/ }).click();
  await page.screenshot({ path: "design/screenshots/documents-dark.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("narrow search empty state and protected upload draft", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore sample workspace" }).click();
  await page
    .getByRole("textbox", { name: "Find a document" })
    .fill("no-such-record");
  await expect(page.getByText("No matches", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("button", { name: "Add document", exact: true }).click();
  await page.getByRole("button", { name: "Paste", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Document text" })
    .fill("A new source document for review.");
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Review note");
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "Cancel upload" }).click();
  await expect(
    page.getByRole("textbox", { name: "Title", exact: true }),
  ).toHaveValue("Review note");
  await page.getByRole("button", { name: "Add document", exact: true }).click();
  await expect(
    page.getByText(/Sign in to a live workspace to add/),
  ).toBeVisible();
  await page.screenshot({ path: "design/screenshots/upload-narrow.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("HTTP contract: sign-in, bearer, upload retry, grounded source, expiry", async ({
  page,
}) => {
  // Controlled HTTP responses test the real client. This is not a live database/provider test.
  let attempts = 0;
  let expired = false;
  const user = {
    sub: "fixture-user",
    name: "Test Reader",
    email: "reader@example.test",
    role: "ADMIN",
    grants: [],
  };
  await page.route("https://trydocsetu.vercel.app/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const respond = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (url.pathname === "/api/mobile/auth")
      return respond({
        token: "test-session",
        user,
        expiresAt: Date.now() + 60000,
      });
    expect(req.headers().authorization).toBe("Bearer test-session");
    if (expired) return respond({ error: "Unauthorized" }, 401);
    if (url.pathname === "/api/auth/session") return respond({ user });
    if (url.pathname === "/api/actions") return respond({ actions: [] });
    if (url.pathname === "/api/documents/ingest" && method === "POST") {
      attempts++;
      expect(req.postDataJSON().documents[0].content).toBe(
        "Staff must review access each quarter.",
      );
      return attempts === 1
        ? respond({ error: "Temporary ingestion failure" }, 503)
        : respond({ documentId: "sample-procurement" }, 201);
    }
    if (url.pathname === "/api/documents/ingest" && url.searchParams.has("id"))
      return respond(demoDocs[0]);
    if (url.pathname === "/api/documents/ingest")
      return respond({
        documents: demoDocs,
        totalCount: 4,
        page: 0,
        pageSize: 20,
      });
    if (url.pathname === "/api/chat" && method === "GET")
      return respond({ messages: [], sessionId: null });
    if (url.pathname === "/api/chat")
      return respond({
        reply: "The CFO and Managing Committee.",
        sessionId: "test-chat",
        generation: "model",
        citations: [
          {
            index: 1,
            docId: "sample-procurement",
            nodeId: "node-2",
            title: "Approval thresholds",
            pageRange: { start: 5, end: 11 },
          },
        ],
      });
    if (url.pathname.startsWith("/api/nodes/"))
      return respond({ node: demoDocs[0].nodes![1] });
    return respond({ error: "Unexpected fixture request" }, 500);
  });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("reader@example.test");
  await page
    .getByRole("textbox", { name: "Password", exact: true })
    .fill("temporary-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Procurement policy FY26" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add document", exact: true }).click();
  await page.getByRole("button", { name: "Paste", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Document text" })
    .fill("Staff must review access each quarter.");
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Access note");
  await page.getByRole("button", { name: "Add document", exact: true }).click();
  await expect(page.getByText("Temporary ingestion failure")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Title", exact: true }),
  ).toHaveValue("Access note");
  await page.getByRole("button", { name: "Add document", exact: true }).click();
  await expect(page.getByText("AT A GLANCE")).toBeVisible();
  expect(attempts).toBe(2);
  await page
    .getByRole("button", { name: "Ask this document", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Your question" })
    .fill("Who approves this?");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText("The CFO and Managing Committee.")).toBeVisible();
  await page.getByRole("button", { name: /Approval thresholds/ }).click();
  await expect(page.getByText(/2.3 Purchases exceeding/)).toBeVisible();
  expired = true;
  await page.getByRole("button", { name: "Summary", exact: true }).click();
  await page.getByRole("button", { name: "Translate", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Your session expired. Sign in again."),
  ).toBeVisible();
});

test("native web client tracks a background file and saves a classification correction", async ({
  page,
}) => {
  const user = {
    sub: "release-admin",
    name: "Release Reader",
    role: "ADMIN",
    grants: [],
  };
  const initial = {
    department: "OPERATIONS",
    documentType: "report",
    tags: [],
  };
  const suggestion = {
    department: "PROCUREMENT",
    documentType: "invoice",
    tags: ["invoice", "INR 18,250"],
  };
  let created = 0;
  let polls = 0;
  let correction = false;
  await page.route("https://trydocsetu.vercel.app/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const respond = (json: unknown, status = 200) =>
      route.fulfill({ json, status });
    if (path === "/api/mobile/auth")
      return respond({
        token: "fixture-token",
        user,
        expiresAt: Date.now() + 60000,
      });
    expect(request.headers().authorization).toBe("Bearer fixture-token");
    if (path === "/api/auth/session") return respond({ user });
    if (path === "/api/alerts") return respond({ alerts: [] });
    if (path === "/api/documents/ingest/jobs") {
      expect(request.postDataJSON().documents[0]).toEqual({
        type: "text",
        content: "Fixture invoice.",
        filename: "invoice.txt",
      });
      created++;
      return respond({ id: "native-queue" }, 202);
    }
    if (path === "/api/documents/ingest/jobs/native-queue") {
      polls++;
      return respond({
        id: "native-queue",
        status: polls > 1 ? "completed" : "processing",
        documentId: polls > 1 ? demoDocs[0].id : undefined,
      });
    }
    if (path.endsWith("/classification")) {
      const update = request.method() === "PATCH";
      if (update) {
        expect(request.postDataJSON()).toEqual({ ...suggestion, note: "" });
        correction = true;
      }
      return respond({
        canEdit: true,
        effective: update ? suggestion : initial,
        suggestion,
        history: update
          ? [
              {
                at: new Date().toISOString(),
                before: initial,
                after: suggestion,
              },
            ]
          : [],
      });
    }
    if (path === "/api/documents/ingest") {
      return respond(
        new URL(request.url()).searchParams.has("id")
          ? demoDocs[0]
          : { documents: demoDocs, totalCount: 4 },
      );
    }
    return respond({}, 404);
  });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("release@example.test");
  await page
    .getByRole("textbox", { name: "Password", exact: true })
    .fill("fixture-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Add document", exact: true }).click();
  const [picker] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Choose a file" }).click(),
  ]);
  await picker.setFiles({
    name: "invoice.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Fixture invoice."),
  });
  await page.getByRole("button", { name: "Process in background" }).click();
  await page.getByRole("button", { name: "Add document", exact: true }).click();
  await expect(page.getByText("Upload status", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close upload status" }).click();
  await page.getByRole("button", { name: "Add document", exact: true }).click();
  await page
    .getByRole("button", { name: "Open document", exact: true })
    .click();
  await page.getByRole("button", { name: /^Classification/ }).click();
  await page.getByRole("button", { name: "Use suggestion" }).click();
  await page.getByRole("button", { name: "Save classification" }).click();
  await expect(page.getByText("Classification saved.")).toBeVisible();
  await expect(page.getByText("Correction history")).toBeVisible();
  expect(created).toBe(1);
  expect(correction).toBe(true);
});
