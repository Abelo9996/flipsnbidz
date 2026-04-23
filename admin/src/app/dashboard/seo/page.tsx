"use client";

import { apiUrl } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Sparkles, FileText, Copy, Download, ExternalLink, CheckCircle2, Circle, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface Article {
  _id: string;
  title: string;
  slug: string;
  keyword: string;
  content: string;
  metaDescription: string;
  wordCount: number;
  keywordDensity: number;
  status: string;
  createdAt: string;
}

// Keyword buckets: high-intent first
const KEYWORD_GROUPS = [
  {
    label: "🎯 High-Intent Local",
    keywords: [
      "liquidation auctions La Mirada CA",
      "Amazon returns auction Southern California",
      "buy liquidation pallets La Mirada",
      "flips and bidz auction",
    ],
  },
  {
    label: "📦 Product / Category",
    keywords: [
      "Amazon overstock pallets California",
      "Lowes liquidation pallets Los Angeles",
      "wholesale electronics liquidation CA",
      "furniture liquidation auction Orange County",
    ],
  },
  {
    label: "💡 Educational / Long-Tail",
    keywords: [
      "how to buy liquidation pallets California",
      "pallet flipping for beginners Southern California",
      "reselling Amazon returns profit guide",
      "liquidation auction bidding tips",
    ],
  },
  {
    label: "🏪 Competitor / Comparison",
    keywords: [
      "best liquidation auctions near Los Angeles",
      "hibid auctions La Mirada California",
      "OfferUp liquidation deals SoCal",
      "surplus auctions vs retail arbitrage",
    ],
  },
];

const ALL_KEYWORDS = KEYWORD_GROUPS.flatMap((g) => g.keywords);

// SEO score color
function scoreColor(density: number) {
  if (density >= 1.5 && density <= 3) return "text-green-400";
  if (density > 0 && density < 5) return "text-yellow-400";
  return "text-red-400";
}

export default function SEOPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [tab, setTab] = useState("keywords");

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/seo/articles"));
      const data = await res.json();
      setArticles(data.articles || []);
    } catch { toast.error("Failed to load articles"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  async function handleGenerate(kw?: string) {
    const target = kw || keyword.trim();
    if (!target) { toast.error("Enter a keyword"); return; }
    setGenerating(true);
    setKeyword(target);
    try {
      const res = await fetch(apiUrl("/api/seo/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: target }),
      });
      const data = await res.json();
      if (data.success) {
        const saveRes = await fetch(apiUrl("/api/seo/articles"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            slug: data.slug,
            keyword: target,
            content: data.content,
            metaDescription: data.metaDescription,
            wordCount: data.wordCount,
            keywordDensity: data.keywordDensity,
          }),
        });
        const saveData = await saveRes.json();
        if (saveData.success) {
          toast.success("Article generated and saved!");
          setKeyword("");
          await fetchArticles();
          setTab("articles");
        }
      } else {
        toast.error(data.error || "Generation failed");
      }
    } catch { toast.error("Generation failed"); }
    finally { setGenerating(false); }
  }

  async function handlePublish(id: string) {
    try {
      const res = await fetch(apiUrl("/api/seo/articles"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "published" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Marked as published!");
        fetchArticles();
      }
    } catch { toast.error("Update failed"); }
  }

  function exportHTML(article: Article) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${article.metaDescription}">
  <title>${article.title}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 760px; margin: 40px auto; padding: 0 20px; line-height: 1.7; color: #222; }
    h1 { font-size: 2em; margin-bottom: 0.5em; }
    h2 { font-size: 1.4em; margin-top: 2em; }
    p { margin: 1em 0; }
  </style>
</head>
<body>
  <article>
    <h1>${article.title}</h1>
    ${article.content}
  </article>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${article.slug}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("HTML exported!");
  }

  const writtenKeywords = new Set(articles.map((a) => a.keyword.toLowerCase()));
  const publishedCount = articles.filter((a) => a.status === "published").length;
  const coverage = Math.round((writtenKeywords.size / ALL_KEYWORDS.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">SEO Manager</h1>
          <p className="text-gray-400 text-sm mt-1">
            {articles.length} articles · {publishedCount} published · {coverage}% keyword coverage
          </p>
        </div>
        <div className="flex gap-2">
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="border-gray-700 text-gray-400">
              <ExternalLink className="h-3 w-3 mr-1" /> Search Console
            </Button>
          </a>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{articles.length}</p>
            <p className="text-xs text-gray-400 mt-1">Total Articles</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-green-400">{publishedCount}</p>
            <p className="text-xs text-gray-400 mt-1">Published</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-purple-400">{coverage}%</p>
            <p className="text-xs text-gray-400 mt-1">Keyword Coverage</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => v && setTab(v)}>
        <TabsList className="bg-gray-900 border border-gray-800">
          <TabsTrigger value="keywords">
            <TrendingUp className="mr-2 h-4 w-4" />Keywords
          </TabsTrigger>
          <TabsTrigger value="generate">
            <Sparkles className="mr-2 h-4 w-4" />Generate
          </TabsTrigger>
          <TabsTrigger value="articles">
            <FileText className="mr-2 h-4 w-4" />Articles ({articles.length})
          </TabsTrigger>
        </TabsList>

        {/* ── KEYWORDS TAB ─────────────────────────────────────────────── */}
        <TabsContent value="keywords" className="space-y-4">
          <p className="text-sm text-gray-400">
            These are target keywords for Flips &amp; Bidz. Click <strong>Write</strong> to generate an SEO article for any keyword that doesn&apos;t have one yet.
          </p>
          {KEYWORD_GROUPS.map((group) => (
            <Card key={group.label} className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">{group.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.keywords.map((kw) => {
                  const written = writtenKeywords.has(kw.toLowerCase());
                  const article = articles.find((a) => a.keyword.toLowerCase() === kw.toLowerCase());
                  return (
                    <div key={kw} className="flex flex-col gap-3 rounded-lg bg-gray-800/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {written
                          ? <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                          : <Circle className="h-4 w-4 text-gray-600 shrink-0" />
                        }
                        <span className={`text-sm ${written ? "text-gray-300" : "text-gray-400"}`}>{kw}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {article && (
                          <Badge variant="outline" className={
                            article.status === "published"
                              ? "border-green-600 text-green-400 text-xs"
                              : "border-gray-600 text-gray-400 text-xs"
                          }>
                            {article.status}
                          </Badge>
                        )}
                        {!written ? (
                          <Button
                            size="sm"
                            onClick={() => handleGenerate(kw)}
                            disabled={generating}
                            className="h-7 bg-blue-600 hover:bg-blue-700 text-xs"
                          >
                            {generating && keyword === kw
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <><Sparkles className="h-3 w-3 mr-1" />Write</>
                            }
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setTab("articles"); }}
                            className="h-7 text-gray-400 text-xs"
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ── GENERATE TAB ─────────────────────────────────────────────── */}
        <TabsContent value="generate" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-base">Custom Keyword</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  placeholder="e.g. 'Amazon returns La Mirada auction'"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                />
                <Button onClick={() => handleGenerate()} disabled={generating || !keyword.trim()} className="shrink-0 bg-blue-600 hover:bg-blue-700 sm:w-auto">
                  {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate
                </Button>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 text-sm text-gray-400 space-y-2">
                <p className="font-medium text-gray-300">What gets generated:</p>
                <ul className="space-y-1 list-disc list-inside text-xs">
                  <li>~1,800 word SEO-optimized blog post</li>
                  <li>Meta description (150-160 chars)</li>
                  <li>Keyword density report</li>
                  <li>Exportable HTML ready for your website</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">💡 Use the Keywords tab to write articles for pre-planned target keywords.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ARTICLES TAB ─────────────────────────────────────────────── */}
        <TabsContent value="articles" className="space-y-3">
          {loading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-24 bg-gray-800 rounded animate-pulse" />)}</div>
          ) : articles.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-12 text-center text-gray-400">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No articles yet. Use the Keywords tab to get started.</p>
              </CardContent>
            </Card>
          ) : (
            articles.map((article) => (
              <Card key={article._id} className="bg-gray-900 border-gray-800">
                <CardContent className="py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className={
                          article.status === "published"
                            ? "border-green-600 text-green-400 text-xs"
                            : "border-gray-600 text-gray-400 text-xs"
                        }>
                          {article.status}
                        </Badge>
                        <span className="text-xs text-gray-500">{new Date(article.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h3 className="font-semibold text-sm leading-snug">{article.title}</h3>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{article.metaDescription}</p>
                      <div className="flex gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                        <span>Keyword: <span className="text-blue-400">{article.keyword}</span></span>
                        <span>{article.wordCount} words</span>
                        <span className={scoreColor(article.keywordDensity)}>
                          Density: {article.keywordDensity?.toFixed(1)}%
                          {article.keywordDensity >= 1.5 && article.keywordDensity <= 3 ? " ✓" : " ⚠"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Dialog>
                        <DialogTrigger>
                          <Button size="sm" variant="outline" className="border-gray-700 h-8 text-xs">
                            <FileText className="h-3 w-3 mr-1" /> Preview
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto bg-gray-950 border-gray-800">
                          <DialogHeader>
                            <DialogTitle className="text-base">{article.title}</DialogTitle>
                          </DialogHeader>
                          <div className="mt-2 text-sm text-gray-400 italic border-b border-gray-800 pb-3 mb-4">
                            {article.metaDescription}
                          </div>
                          <div
                            className="prose prose-invert prose-sm max-w-none text-gray-200"
                            dangerouslySetInnerHTML={{ __html: article.content }}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button size="sm" variant="outline" className="border-gray-700 h-8 text-xs"
                        onClick={() => { navigator.clipboard.writeText(article.content); toast.success("HTML copied!"); }}>
                        <Copy className="h-3 w-3 mr-1" /> Copy HTML
                      </Button>
                      <Button size="sm" variant="outline" className="border-gray-700 h-8 text-xs" onClick={() => exportHTML(article)}>
                        <Download className="h-3 w-3 mr-1" /> Export
                      </Button>
                      {article.status !== "published" && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8 text-xs" onClick={() => handlePublish(article._id)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Publish
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
