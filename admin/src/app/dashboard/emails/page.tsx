"use client";

import { apiUrl } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Sparkles, Send, Plus, Trash2, Mail, Users, Eye } from "lucide-react";
import { toast } from "sonner";

interface Campaign {
  _id: string;
  name: string;
  subject: string;
  htmlContent: string;
  templateType: string;
  status: string;
  recipientTags: string[];
  stats: { sent: number; opened: number; clicked: number; bounced: number };
  createdAt: string;
}

interface Sub {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  tags: string[];
  status: string;
  subscribedAt: string;
}

const TEMPLATES = [
  {
    value: "new-auction",
    label: "🔨 New Auction Alert",
    desc: "Announce upcoming auction with featured lots. Best for Sunday night before Monday auction.",
  },
  {
    value: "win-back",
    label: "💌 Win-Back",
    desc: "Re-engage subscribers who haven't bid in 30+ days. Include a special offer.",
  },
  {
    value: "contractor",
    label: "🔧 Contractor Special",
    desc: "Highlight tools, hardware, Lowes/Home Depot lots. Target contractor segment.",
  },
  {
    value: "reseller",
    label: "📦 Reseller Deal Alert",
    desc: "Amazon returns, overstock electronics. Target resellers and flippers.",
  },
];

const TAGS = ["reseller", "contractor", "small-business", "general"];

const TAG_DESC: Record<string, string> = {
  reseller: "Flippers & eBay/Amazon sellers",
  contractor: "Contractors & tradespeople",
  "small-business": "Local small business owners",
  general: "General subscribers",
};

export default function EmailsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subscribers, setSubscribers] = useState<Sub[]>([]);
  const [subTotal, setSubTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [templateType, setTemplateType] = useState("new-auction");
  const [preview, setPreview] = useState<{ subject: string; htmlContent: string; textContent: string } | null>(null);
  const [tab, setTab] = useState("campaigns");
  const [addOpen, setAddOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newTags, setNewTags] = useState<string[]>(["general"]);

  const fetchAll = useCallback(async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        fetch(apiUrl("/api/emails/campaigns")),
        fetch(apiUrl("/api/subscribers")),
      ]);
      const cData = await cRes.json();
      const sData = await sRes.json();
      setCampaigns(cData.campaigns || []);
      setSubscribers(sData.subscribers || []);
      setSubTotal(sData.total || 0);
    } catch { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleCompose() {
    setComposing(true);
    try {
      const res = await fetch(apiUrl("/api/emails/compose"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateType, subscriberCount: subTotal }),
      });
      const data = await res.json();
      if (data.success !== false) {
        setPreview(data);
        toast.success("Email composed!");
        setTab("compose");
      } else {
        toast.error(data.error);
      }
    } catch { toast.error("Compose failed"); }
    finally { setComposing(false); }
  }

  async function handleSaveCampaign() {
    if (!preview) return;
    try {
      const tmpl = TEMPLATES.find((t) => t.value === templateType);
      const res = await fetch(apiUrl("/api/emails/campaigns"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${tmpl?.label.replace(/^[^\w]+/, "")} — ${new Date().toLocaleDateString()}`,
          subject: preview.subject,
          htmlContent: preview.htmlContent,
          textContent: preview.textContent,
          templateType,
          recipientTags: TAGS,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Campaign saved!");
        setPreview(null);
        fetchAll();
        setTab("campaigns");
      }
    } catch { toast.error("Save failed"); }
  }

  async function handleSend(id: string) {
    setSending(id);
    try {
      const res = await fetch(apiUrl("/api/emails/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Sent to ${data.sent} subscribers!`);
        fetchAll();
      } else {
        toast.error(data.error || "Send failed");
      }
    } catch { toast.error("Send failed"); }
    finally { setSending(null); }
  }

  async function handleAddSubscriber() {
    if (!newEmail) return;
    try {
      const res = await fetch(apiUrl("/api/subscribers"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, firstName: newFirst, lastName: newLast, tags: newTags }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Subscriber added!");
        setNewEmail(""); setNewFirst(""); setNewLast(""); setNewTags(["general"]);
        setAddOpen(false);
        fetchAll();
      } else {
        toast.error(data.error || "Add failed");
      }
    } catch { toast.error("Add failed"); }
  }

  async function handleBulkImport() {
    const emails = bulkText
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));
    if (emails.length === 0) { toast.error("No valid emails found"); return; }
    try {
      const res = await fetch(apiUrl("/api/subscribers"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: emails.map((email) => ({ email, tags: ["general"] })) }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Imported ${data.saved} subscribers!`);
        setBulkText("");
        fetchAll();
      }
    } catch { toast.error("Bulk import failed"); }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(apiUrl("/api/subscribers"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      toast.success("Removed");
      fetchAll();
    } catch { toast.error("Delete failed"); }
  }

  // Segment counts
  const segCounts = TAGS.reduce((acc, tag) => {
    acc[tag] = subscribers.filter((s) => s.tags.includes(tag)).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Campaigns</h1>
          <p className="text-gray-400 text-sm mt-1">
            {subTotal} subscribers · {campaigns.filter((c) => c.status === "sent").length} campaigns sent
          </p>
        </div>
        <Button onClick={() => { setTab("compose"); handleCompose(); }} disabled={composing} className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto">
          {composing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          New Campaign
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => v && setTab(v)}>
        <TabsList className="bg-gray-900 border border-gray-800">
          <TabsTrigger value="campaigns"><Mail className="mr-2 h-4 w-4" />Campaigns ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="compose"><Sparkles className="mr-2 h-4 w-4" />Compose</TabsTrigger>
          <TabsTrigger value="subscribers"><Users className="mr-2 h-4 w-4" />Subscribers ({subTotal})</TabsTrigger>
        </TabsList>

        {/* ── CAMPAIGNS TAB ─────────────────────────────────────────────── */}
        <TabsContent value="campaigns" className="space-y-4">
          {loading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-24 bg-gray-800 rounded animate-pulse" />)}</div>
          ) : campaigns.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-12 text-center text-gray-400">
                <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium mb-1">No campaigns yet</p>
                <p className="text-sm text-gray-500">Pick a template and click <strong>New Campaign</strong> to get started.</p>
              </CardContent>
            </Card>
          ) : (
            campaigns.map((c) => (
              <Card key={c._id} className="bg-gray-900 border-gray-800">
                <CardContent className="py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{c.name}</h3>
                        <Badge variant="outline" className={
                          c.status === "sent" ? "border-green-600 text-green-400" :
                          c.status === "scheduled" ? "border-yellow-600 text-yellow-400" :
                          "border-gray-600 text-gray-400"
                        }>{c.status}</Badge>
                        <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{c.subject}</p>
                      {c.status === "sent" && c.stats && (
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>📤 {c.stats.sent} sent</span>
                          <span>👁 {c.stats.opened} opened ({c.stats.sent ? Math.round(c.stats.opened / c.stats.sent * 100) : 0}%)</span>
                          <span>🖱 {c.stats.clicked} clicked</span>
                        </div>
                      )}
                    </div>
                    <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:shrink-0">
                      <Dialog>
                        <DialogTrigger>
                          <Button size="sm" variant="outline" className="h-8 border-gray-700">
                            <Eye className="h-3 w-3 mr-1" /> Preview
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-gray-900 border-gray-800">
                          <DialogHeader><DialogTitle>{c.subject}</DialogTitle></DialogHeader>
                          <div className="bg-white text-black p-4 rounded max-h-[70vh] overflow-auto text-sm"
                            dangerouslySetInnerHTML={{ __html: c.htmlContent }} />
                        </DialogContent>
                      </Dialog>
                      {c.status === "draft" && (
                        <Button size="sm" onClick={() => handleSend(c._id)} disabled={sending === c._id}
                          className="h-8 bg-blue-600 hover:bg-blue-700">
                          {sending === c._id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <><Send className="h-3 w-3 mr-1" /> Send to {subTotal}</>
                          }
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── COMPOSE TAB ───────────────────────────────────────────────── */}
        <TabsContent value="compose" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTemplateType(t.value)}
                className={`text-left p-4 rounded-lg border transition-all ${
                  templateType === t.value
                    ? "border-blue-500 bg-blue-600/10"
                    : "border-gray-800 hover:border-gray-700 bg-gray-900"
                }`}
              >
                <p className="font-medium text-sm">{t.label}</p>
                <p className="text-xs text-gray-400 mt-1">{t.desc}</p>
              </button>
            ))}
          </div>

          <Button onClick={handleCompose} disabled={composing} className="bg-blue-600 hover:bg-blue-700">
            {composing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Compose with AI
          </Button>

          {preview && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="flex flex-col gap-3 text-base sm:flex-row sm:items-center sm:justify-between">
                  <span>📧 {preview.subject}</span>
                  <Button onClick={handleSaveCampaign} className="bg-green-600 hover:bg-green-700">
                    <Save className="mr-2 h-4 w-4" /> Save Campaign
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white text-black p-4 rounded max-h-[60vh] overflow-auto text-sm"
                  dangerouslySetInnerHTML={{ __html: preview.htmlContent }} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── SUBSCRIBERS TAB ───────────────────────────────────────────── */}
        <TabsContent value="subscribers" className="space-y-4">
          {/* Segment overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TAGS.map((tag) => (
              <Card key={tag} className="bg-gray-900 border-gray-800">
                <CardContent className="py-3">
                  <p className="text-xl font-bold">{segCounts[tag] || 0}</p>
                  <p className="text-xs font-medium text-gray-300 capitalize mt-0.5">{tag}</p>
                  <p className="text-xs text-gray-500">{TAG_DESC[tag]}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-2">
            {/* Add single */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-1" /> Add Subscriber
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800">
                <DialogHeader><DialogTitle>Add Subscriber</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Email *" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="bg-gray-800 border-gray-700" />
                  <div className="flex gap-2">
                    <Input placeholder="First Name" value={newFirst} onChange={(e) => setNewFirst(e.target.value)} className="bg-gray-800 border-gray-700" />
                    <Input placeholder="Last Name" value={newLast} onChange={(e) => setNewLast(e.target.value)} className="bg-gray-800 border-gray-700" />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Segments</Label>
                    <div className="flex flex-wrap gap-2">
                      {TAGS.map((tag) => (
                        <Badge key={tag} className={`cursor-pointer ${newTags.includes(tag) ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                          onClick={() => setNewTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleAddSubscriber} className="w-full bg-blue-600 hover:bg-blue-700">Add</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Bulk import */}
            <Dialog>
              <DialogTrigger>
                <Button size="sm" variant="outline" className="border-gray-700">Bulk Import</Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800">
                <DialogHeader><DialogTitle>Bulk Import Emails</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">Paste emails separated by newlines, commas, or semicolons. All imported as &quot;general&quot; segment.</p>
                  <textarea
                    className="w-full h-40 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-white resize-none"
                    placeholder="john@example.com&#10;jane@example.com&#10;..."
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                  />
                  <Button onClick={handleBulkImport} className="w-full bg-blue-600 hover:bg-blue-700">Import</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Subscriber list */}
          {loading ? (
            <div className="space-y-2">{[1,2,3,4,5].map((i) => <div key={i} className="h-12 bg-gray-800 rounded animate-pulse" />)}</div>
          ) : subscribers.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-12 text-center text-gray-400">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No subscribers yet. Add individuals or bulk import.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">Email</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">Name</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">Segments</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-400 font-medium">Added</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((s) => (
                      <tr key={s._id} className="border-b border-gray-800/60 hover:bg-gray-800/30">
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-300">{s.email}</td>
                        <td className="px-4 py-2.5 text-gray-300">{[s.firstName, s.lastName].filter(Boolean).join(" ") || "—"}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1 flex-wrap">
                            {s.tags.map((t) => <Badge key={t} className="bg-blue-600/20 text-blue-400 text-[10px]">{t}</Badge>)}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(s.subscribedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-2.5">
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(s._id)} className="h-6 w-6 p-0 text-gray-600 hover:text-red-400">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Save({ className, ...props }: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg className={className} {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  );
}
