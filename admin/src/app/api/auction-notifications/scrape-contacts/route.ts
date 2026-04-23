import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { promises as fs } from "fs";
import path from "path";
import * as XLSX from "xlsx";

export const maxDuration = 300;

const ADMIN_ROOT = process.cwd();
const DATA_DIR = path.join(ADMIN_ROOT, "data");
const CONTACTS_FILE = path.join(DATA_DIR, "contacts.json");
const HIBID_USER = process.env.HIBID_USERNAME || "flipsnbidz";
const HIBID_PASS = process.env.HIBID_PASSWORD || "Bridgestone2704388004!";
const DEBUG_DIR = path.join(DATA_DIR, "debug");

type ContactEntry = {
  name: string;
  phones: string[];
  bidder: boolean;
};

function normalizeContactEntry(value: unknown): ContactEntry {
  if (typeof value === "string") {
    return { name: value.trim(), phones: [], bidder: false };
  }

  if (value && typeof value === "object") {
    const obj = value as { name?: unknown; phones?: unknown; bidder?: unknown };
    return {
      name: typeof obj.name === "string" ? obj.name.trim() : "",
      phones: Array.isArray(obj.phones)
        ? obj.phones.map((p) => String(p).trim()).filter(Boolean)
        : [],
      bidder: obj.bidder === true,
    };
  }

  return { name: "", phones: [], bidder: false };
}

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];

  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === "," && !q) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map((v) => v.trim());
  };

  const headers = split(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = split(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });
}

function parseXlsx(buffer: Buffer): Record<string, string>[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const first = wb.SheetNames[0];
  if (!first) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[first], { defval: "" });
  return rows.map((r) => {
    const norm: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) norm[String(k).toLowerCase()] = String(v ?? "").trim();
    return norm;
  });
}

function pickEmail(row: Record<string, string>): string {
  const key = Object.keys(row).find((k) => k.includes("email"));
  const v = key ? row[key] : "";
  return String(v || "").trim().toLowerCase();
}

function pickName(row: Record<string, string>): string {
  const first = Object.keys(row).find((k) => k.includes("first"));
  const last = Object.keys(row).find((k) => k.includes("last"));
  const full = Object.keys(row).find((k) => k.includes("name") || k.includes("bidder"));

  if (first || last) {
    const f = first ? row[first] : "";
    const l = last ? row[last] : "";
    const name = `${f} ${l}`.trim();
    if (name) return name;
  }

  return (full ? row[full] : "").trim() || "Unknown";
}

function isValidEmail(email: string): boolean {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function saveDebugSnapshot(page: import("playwright").Page, tag: string) {
  await fs.mkdir(DEBUG_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const base = path.join(DEBUG_DIR, `${ts}-${tag}`);
  try { await page.screenshot({ path: `${base}.png`, fullPage: true }); } catch {}
  try { await fs.writeFile(`${base}.html`, await page.content(), "utf-8"); } catch {}
  return base;
}

async function inspectUi(page: import("playwright").Page) {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const h = el as HTMLElement;
      const style = window.getComputedStyle(h);
      return style.display !== "none" && style.visibility !== "hidden" && h.offsetParent !== null;
    };
    const buttons = Array.from(document.querySelectorAll("button, a, [role='button']"))
      .filter(visible)
      .map((el) => ({
        text: ((el.textContent || "").trim() || "").slice(0, 120),
        title: (el.getAttribute("title") || "").slice(0, 120),
        aria: (el.getAttribute("aria-label") || "").slice(0, 120),
        href: (el as HTMLAnchorElement).href || "",
      }))
      .filter((x) => x.text || x.title || x.aria)
      .slice(0, 120);
    return { url: location.href, controls: buttons };
  });
}

async function clickAndDownload(page: import("playwright").Page, clicker: () => Promise<void>) {
  const downloadPromise = page.waitForEvent("download", { timeout: 45000 });
  await clicker();
  const dl = await downloadPromise;
  const filePath = await dl.path();
  if (!filePath) throw new Error("Download path unavailable");
  return { filePath, suggested: dl.suggestedFilename() };
}

async function clickExportSmart(page: import("playwright").Page) {
  // Strategy 1: direct visible Export controls
  const direct = [
    page.getByRole("button", { name: /export/i }).first(),
    page.getByRole("link", { name: /export/i }).first(),
    page.locator('button:visible[title*="Export" i], a:visible[title*="Export" i], [role="button"]:visible[title*="Export" i]').first(),
    page.locator('button:visible[aria-label*="Export" i], a:visible[aria-label*="Export" i], [role="button"]:visible[aria-label*="Export" i]').first(),
    page.getByText(/export/i).first(),
  ];

  for (const loc of direct) {
    if (await loc.count()) {
      await loc.click({ timeout: 4000 });
      return;
    }
  }

  // Strategy 2: open actions/overflow menu then click Export
  const menuBtns = [
    page.getByRole("button", { name: /actions|more|menu|options/i }).first(),
    page.locator('button:visible[aria-label*="more" i], button:visible[title*="more" i]').first(),
  ];
  for (const b of menuBtns) {
    if (await b.count()) {
      await b.click({ timeout: 4000 }).catch(() => {});
      const exportInMenu = page.getByRole("menuitem", { name: /export/i }).first();
      if (await exportInMenu.count()) {
        await exportInMenu.click({ timeout: 4000 });
        return;
      }
      const exportFallback = page.getByText(/export/i).first();
      if (await exportFallback.count()) {
        await exportFallback.click({ timeout: 4000 });
        return;
      }
    }
  }

  const ui = await inspectUi(page);
  const snap = await saveDebugSnapshot(page, "export-not-found");
  throw new Error(`Could not find clickable Export control. URL=${ui.url} debug=${snap} controls=${JSON.stringify(ui.controls.slice(0, 40))}`);
}

export async function POST() {
  let browser: import("playwright").Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    // Login
    await page.goto("https://my.hibid.com", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1500);

    const userInput = page.locator('input[type="text"], input[type="email"], input[name*="user" i], input[name*="email" i]').first();
    const passInput = page.locator('input[type="password"]').first();

    await userInput.fill(HIBID_USER);
    await passInput.fill(HIBID_PASS);

    const loginBtn = page.getByRole("button", { name: /log ?in|sign ?in/i }).first();
    if (await loginBtn.count()) await loginBtn.click();
    else await page.keyboard.press("Enter");

    await page.waitForLoadState("networkidle", { timeout: 60000 });

    // Go to Current Auctions (prefer visible controls only)
    let openedCurrent = false;
    const currentLink = page.getByRole("link", { name: /current auctions/i }).first();
    if (await currentLink.count() && await currentLink.isVisible().catch(() => false)) {
      await currentLink.click();
      openedCurrent = true;
    }
    if (!openedCurrent) {
      const currentButton = page.getByRole("button", { name: /current auctions/i }).first();
      if (await currentButton.count() && await currentButton.isVisible().catch(() => false)) {
        await currentButton.click();
        openedCurrent = true;
      }
    }
    if (!openedCurrent) {
      const currentText = page.getByText(/current auctions/i).first();
      if (await currentText.count()) {
        await currentText.click();
        openedCurrent = true;
      }
    }
    if (!openedCurrent) {
      throw new Error("Could not find visible 'Current Auctions' navigation item after login.");
    }

    await page.waitForLoadState("networkidle", { timeout: 60000 });
    await page.waitForTimeout(1200);

    // Open latest auction stats page directly (this is where Export/Watches lives)
    // IMPORTANT: avoid broad /auction/ selectors because /auctioneer/auctions/current matches them.
    const lotStatsLink = page.locator('a[href*="/auctioneer/lotstats/index/"]:visible').first();

    if (await lotStatsLink.count()) {
      await lotStatsLink.click();
      await page.waitForLoadState("networkidle", { timeout: 60000 });
    } else {
      // Fallback: open catalog link for latest auction, then continue.
      const catalogLink = page.locator('a[href*="/catalog/"]:visible').first();
      if (!(await catalogLink.count())) {
        const sample = await page.evaluate(() => {
          return Array.from(document.querySelectorAll("a"))
            .map((a) => ({ text: (a.textContent || "").trim(), href: (a as HTMLAnchorElement).href || "" }))
            .filter((x) => x.href)
            .slice(0, 30);
        });
        throw new Error(`No lotstats/catalog link found on Current Auctions page. URL: ${page.url()} Sample links: ${JSON.stringify(sample)}`);
      }
      await catalogLink.click();
      await page.waitForLoadState("networkidle", { timeout: 60000 });
    }

    // Export bidder/contact file (robust + instrumented)
    const exportDownload = await clickAndDownload(page, async () => {
      await clickExportSmart(page);
    });

    // Download watches file (icon/button near Watches)
    const watchesDownload = await clickAndDownload(page, async () => {
      // Strategy 1: HiBid lotstats-specific watchers export icon
      const lotWatchersExport = page.locator('a.lot-watchers[data-export-only="true"]:visible').first();
      if (await lotWatchersExport.count()) {
        await lotWatchersExport.click({ timeout: 4000 });
        return;
      }

      // Strategy 2: direct link/button containing Watches + download cue
      const directCandidates = [
        page.locator('a:visible[href*="watch" i][href*="export" i], a:visible[href*="watch" i][href*="download" i]').first(),
        page.getByRole("link", { name: /watches/i }).first(),
        page.getByRole("button", { name: /watches/i }).first(),
      ];

      for (const c of directCandidates) {
        if (await c.count()) {
          await c.click({ timeout: 4000 });
          return;
        }
      }

      // Strategy 3: find row containing "Watches" and click nearest link/button/icon
      const watchesText = page.getByText(/watches/i).first();
      if (await watchesText.count()) {
        const row = watchesText.locator("xpath=ancestor::*[1]");
        const near = row.locator("a, button, [role='button']").last();
        if (await near.count()) {
          await near.click({ timeout: 4000 });
          return;
        }
      }

      // Strategy 4: generic visible download control
      const genericDl = page.locator('button:visible[title*="download" i], a:visible[title*="download" i], [aria-label*="download" i]:visible').first();
      if (await genericDl.count()) {
        await genericDl.click({ timeout: 4000 });
        return;
      }

      const ui = await inspectUi(page);
      const snap = await saveDebugSnapshot(page, "watches-not-found");
      throw new Error(`Could not find clickable Watches download control. URL=${ui.url} debug=${snap} controls=${JSON.stringify(ui.controls.slice(0, 40))}`);
    });

    const files = [exportDownload, watchesDownload];
    const extracted = new Map<string, { name: string; bidder: boolean }>();

    for (const f of files) {
      const lower = (f.suggested || f.filePath).toLowerCase();
      let rows: Record<string, string>[] = [];
      let bidderFromSource = false;
      if (lower.endsWith(".csv")) {
        const text = await fs.readFile(f.filePath, "utf-8");
        rows = parseCsv(text);
        bidderFromSource = true;
      } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        const buf = await fs.readFile(f.filePath);
        rows = parseXlsx(buf);
      }

      for (const row of rows) {
        const email = pickEmail(row);
        if (!isValidEmail(email)) continue;
        const name = pickName(row);
        const existing = extracted.get(email);
        extracted.set(email, {
          name: existing?.name && existing.name !== "Unknown" ? existing.name : name,
          bidder: existing?.bidder === true || bidderFromSource,
        });
      }
    }

    // Load existing contacts
    let contacts: Record<string, ContactEntry> = {};
    try {
      const raw = await fs.readFile(CONTACTS_FILE, "utf-8");
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      contacts = Object.fromEntries(
        Object.entries(parsed).map(([email, value]) => [email, normalizeContactEntry(value)])
      );
    } catch {
      contacts = {};
    }

    const before = Object.keys(contacts).length;
    let added = 0;

    for (const [email, scraped] of Array.from(extracted.entries())) {
      const existing = contacts[email];
      if (!existing) {
        contacts[email] = {
          name: scraped.name || "Unknown",
          phones: [],
          bidder: scraped.bidder === true,
        };
        added++;
        continue;
      }

      if ((!existing.name || existing.name.trim().toLowerCase() === "unknown") && scraped.name) {
        existing.name = scraped.name;
      }

      if (scraped.bidder === true) {
        existing.bidder = true;
      }
    }

    // Keep keys unique (object map) and sorted
    const sorted = Object.fromEntries(Object.entries(contacts).sort((a, b) => a[0].localeCompare(b[0])));
    await fs.writeFile(CONTACTS_FILE, JSON.stringify(sorted, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      stats: {
        extracted: extracted.size,
        before,
        added,
        after: Object.keys(sorted).length,
      },
      message: `Contacts updated. Added ${added} new unique emails.`,
    });
  } catch (error) {
    try {
      if (browser) {
        const pages = browser.contexts().flatMap((c) => c.pages());
        if (pages[0]) await saveDebugSnapshot(pages[0], "scrape-failure");
      }
    } catch {}
    return NextResponse.json({ error: String(error), debugDir: DEBUG_DIR }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
