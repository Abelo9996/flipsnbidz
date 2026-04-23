import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const ADMIN_ROOT = process.cwd();
const CONTACTS_FILE = path.join(ADMIN_ROOT, "data", "contacts.json");

type ContactEntry = {
  name?: string;
  phones?: string[];
  bidder?: boolean;
};

function csvEscape(value: string): string {
  const normalized = String(value ?? "").replace(/"/g, '""');
  return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export async function GET() {
  try {
    const raw = await fs.readFile(CONTACTS_FILE, "utf-8");
    const contacts = JSON.parse(raw) as Record<string, ContactEntry | string>;

    const rows = Object.entries(contacts)
      .flatMap(([email, value]) => {
        const entry = typeof value === "string" ? { name: value, phones: [], bidder: false } : value || {};
        const phones = Array.isArray(entry.phones)
          ? entry.phones.map((phone) => String(phone || "").trim()).filter(Boolean)
          : [];

        if (entry.bidder !== true || phones.length === 0) return [];

        const { firstName, lastName } = splitName(String(entry.name || ""));
        return phones.map((phone) => ({
          phone,
          firstName,
          lastName,
          email: String(email || "").trim(),
        }));
      })
      .filter((row) => row.phone);

    const csv = [
      ["Phone", "First Name", "Last Name", "Email"].join(","),
      ...rows.map((row) => [row.phone, row.firstName, row.lastName, row.email].map(csvEscape).join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sms-contacts.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
