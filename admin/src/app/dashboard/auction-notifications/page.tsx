"use client";

import { apiUrl } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, MessageSquare, Send, FlaskConical, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";

export default function AuctionNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [scrapingEmails, setScrapingEmails] = useState(false);

  const [activeLots, setActiveLots] = useState(0);
  const [offerupLots, setOfferupLots] = useState(0);
  const [contactsCount, setContactsCount] = useState(0);
  const [smsBody, setSmsBody] = useState("");
  const [scrapeResult, setScrapeResult] = useState<{ extracted: number; before: number; added: number; after: number; at: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");

  async function loadContext() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auction-notifications/context"));
      const data = await res.json();
      if (res.ok) {
        setActiveLots(data.activeLots || 0);
        setOfferupLots(data.offerupLots || 0);
        setContactsCount(data.contactsCount || 0);
        setSmsBody(data.defaults?.smsBody || "");
      } else {
        toast.error(data.error || "Failed to load auction notification context");
      }
    } catch {
      toast.error("Failed to load auction notification context");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContext();
  }, []);

  async function sendEmailTest() {
    setSendingTest(true);
    try {
      const res = await fetch(apiUrl("/api/auction-notifications/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "email_test" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test email failed");
      toast.success(data.message || "Test email sent");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSendingTest(false);
    }
  }

  async function sendEmailAll() {
    if (confirmationText !== "SEND TO ALL") {
      toast.error("Confirmation phrase did not match. Bulk send canceled.");
      return;
    }

    setSendingAll(true);
    try {
      const res = await fetch(apiUrl("/api/auction-notifications/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "email_all", confirmationText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk email failed");
      toast.success(data.message || "Bulk email started");
      setConfirmOpen(false);
      setConfirmationText("");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSendingAll(false);
    }
  }

  async function sendSmsAll() {
    if (!smsBody.trim()) {
      toast.error("SMS body is required");
      return;
    }

    const ok = window.confirm("Send this SMS message to all active SMS subscribers?");
    if (!ok) return;

    setSendingSms(true);
    try {
      const res = await fetch(apiUrl("/api/auction-notifications/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sms_send", smsBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "SMS send failed");
      toast.success(data.message || "SMS sent");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSendingSms(false);
    }
  }

  async function scrapeEmails() {
    setScrapingEmails(true);
    try {
      const res = await fetch(apiUrl("/api/auction-notifications/scrape-contacts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Email scrape failed");
      toast.success(data.message || "Email scrape complete");
      if (data?.stats) {
        setScrapeResult({
          extracted: data.stats.extracted || 0,
          before: data.stats.before || 0,
          added: data.stats.added || 0,
          after: data.stats.after || 0,
          at: new Date().toISOString(),
        });
      }
      await loadContext();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setScrapingEmails(false);
    }
  }

  function downloadSmsContacts() {
    window.open(apiUrl("/api/auction-notifications/export-sms-contacts"), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Auction Notifications</h1>
        <p className="text-gray-400 text-sm mt-1">Send auction notifications to customers via email or SMS.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Badge className="bg-blue-600/20 text-blue-300 h-8 px-3">Live auction lots: {loading ? "..." : activeLots}</Badge>
        <Badge className="bg-violet-600/20 text-violet-300 h-8 px-3">OfferUp listings: {loading ? "..." : offerupLots}</Badge>
        <Badge className="bg-purple-600/20 text-purple-300 h-8 px-3">Email contacts (contacts.json): {loading ? "..." : contactsCount}</Badge>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(open) => {
        setConfirmOpen(open);
        if (!open && !sendingAll) setConfirmationText("");
      }}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-300">
              <AlertTriangle className="h-5 w-5" /> Confirm bulk email send
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              You are about to send an auction email to all contacts in <span className="font-medium text-gray-200">contacts.json</span>.
              This can reach about <span className="font-semibold text-white">{contactsCount}</span> people and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-red-900/40 bg-red-950/30 p-3 text-sm text-red-100">
              Type <span className="font-semibold text-white">SEND TO ALL</span> to enable the send button.
            </div>
            <Input
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="SEND TO ALL"
              className="bg-gray-950 border-gray-800 text-white"
              disabled={sendingAll}
            />
          </div>

          <DialogFooter className="bg-gray-900 border-gray-800">
            <Button variant="outline" className="border-gray-700 text-gray-200 hover:bg-gray-800" onClick={() => setConfirmOpen(false)} disabled={sendingAll}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={sendEmailAll}
              disabled={sendingAll || confirmationText !== "SEND TO ALL"}
            >
              <AlertTriangle className="h-4 w-4 mr-2" /> {sendingAll ? "Sending..." : "Confirm and Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-blue-400" /> Email Customers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="flex flex-wrap gap-2">
            <Button onClick={scrapeEmails} disabled={scrapingEmails || sendingTest || sendingAll} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Download className="h-4 w-4 mr-2" /> {scrapingEmails ? "Scraping emails..." : "Scrape Emails"}
            </Button>

            <Button onClick={sendEmailTest} disabled={sendingTest || sendingAll || scrapingEmails} className="bg-blue-600 hover:bg-blue-700">
              <FlaskConical className="h-4 w-4 mr-2" /> {sendingTest ? "Sending test..." : "Send Test Email"}
            </Button>

            <Button onClick={() => setConfirmOpen(true)} disabled={sendingTest || sendingAll || scrapingEmails} className="bg-red-600 hover:bg-red-700 text-white">
              <AlertTriangle className="h-4 w-4 mr-2" /> {sendingAll ? "Sending to all..." : "Send to Everyone"}
            </Button>
          </div>

          {scrapeResult && (
            <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-3 text-xs text-gray-300 space-y-1">
              <p className="font-medium text-gray-200">Last scrape result</p>
              <p>Extracted rows: <span className="text-white">{scrapeResult.extracted}</span></p>
              <p>Added new contacts: <span className="text-green-300">{scrapeResult.added}</span></p>
              <p>Total contacts: <span className="text-white">{scrapeResult.before}</span> → <span className="text-white">{scrapeResult.after}</span></p>
              <p className="text-gray-500">Updated {new Date(scrapeResult.at).toLocaleString()}</p>
            </div>
          )}


        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-green-400" /> SMS Customers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={smsBody} onChange={(e) => setSmsBody(e.target.value)} rows={4} className="bg-gray-950 border-gray-800" />
          <p className="text-xs text-gray-500">{smsBody.length} chars</p>
          <div className="flex justify-between gap-2 flex-wrap">
            <Button onClick={downloadSmsContacts} variant="outline" className="border-gray-700 text-gray-200 hover:bg-gray-800">
              <Download className="h-4 w-4 mr-2" /> Download CSV Contacts
            </Button>
            <Button onClick={sendSmsAll} disabled={sendingSms} className="bg-green-600 hover:bg-green-700">
              <Send className="h-4 w-4 mr-2" /> {sendingSms ? "Sending SMS..." : "Send SMS"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
