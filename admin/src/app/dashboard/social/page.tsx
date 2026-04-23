"use client";

import { apiUrl } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Sparkles, Copy, Save, ExternalLink, RefreshCw, Trash2,
  MessageSquare, ArrowUpRight, Search, PenLine, ClipboardList, CheckCircle2, Check,
} from "lucide-react";
import { toast } from "sonner";

interface Lot {
  _id: string;
  lotNumber: string;
  title: string;
  currentBid: number;
  category: string;
  imageUrl: string;
}

interface Post {
  _id: string;
  platform: string;
  content: string;
  hashtags: string[];
  status: string;
  scheduledFor?: string;
  createdAt: string;
  generatedImageUrl?: string;
}

interface RedditPost {
  id: string;
  subreddit: string;
  subreddit_tier?: "safe" | "caution" | "risky";
  title: string;
  selftext: string;
  author: string;
  score: number;
  num_comments: number;
  url: string;
  created_utc: number;
  flair: string;
  is_relevant: boolean;
  relevance_score?: number;
}

const PLATFORMS = [
  {
    value: "instagram",
    label: "Instagram",
    emoji: "📸",
    color: "border-pink-500 bg-pink-600/20 text-pink-300",
    dimColor: "border-gray-700 text-gray-400 hover:border-pink-700",
    hint: "Post to @flipsnbidz · include image",
  },
  {
    value: "facebook",
    label: "Facebook",
    emoji: "📘",
    color: "border-blue-500 bg-blue-600/20 text-blue-300",
    dimColor: "border-gray-700 text-gray-400 hover:border-blue-700",
    hint: "Post to Flips & Bidz page or Marketplace",
  },
  {
    value: "reddit",
    label: "Reddit",
    emoji: "🤖",
    color: "border-orange-500 bg-orange-600/20 text-orange-300",
    dimColor: "border-gray-700 text-gray-400 hover:border-orange-700",
    hint: "r/Flipping · r/liquidation · r/deals",
  },
  {
    value: "nextdoor",
    label: "Nextdoor",
    emoji: "🏘️",
    color: "border-green-500 bg-green-600/20 text-green-300",
    dimColor: "border-gray-700 text-gray-400 hover:border-green-700",
    hint: "Local La Mirada / Santa Fe Springs",
  },
];

function TierBadge({ tier }: { tier?: "safe" | "caution" | "risky" }) {
  if (!tier) return null;
  if (tier === "safe") return <span className="text-[11px]">🟢</span>;
  if (tier === "caution") return <span className="text-[11px]">🟡</span>;
  return <span className="text-[11px]">🔴</span>;
}

function RelevanceBadge({ score }: { score?: number }) {
  if (score === undefined || score === null || score < 20) return null;
  const color =
    score >= 70
      ? "bg-green-600/20 text-green-400 border-green-700"
      : score >= 40
      ? "bg-yellow-600/20 text-yellow-400 border-yellow-700"
      : "bg-gray-600/20 text-gray-400 border-gray-600";
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${color}`}>
      {score}% match
    </Badge>
  );
}

export default function SocialPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [platform, setPlatform] = useState("instagram");
  const [selectedLots, setSelectedLots] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
  const [tab, setTab] = useState("create");

  const [redditPosts, setRedditPosts] = useState<RedditPost[]>([]);
  const [redditLoading, setRedditLoading] = useState(false);
  const [redditLastFetched, setRedditLastFetched] = useState("");
  const [redditSubFilter, setRedditSubFilter] = useState("all");
  const [redditSort, setRedditSort] = useState<"score" | "new" | "comments">("score");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyType, setReplyType] = useState<"helpful" | "promotional" | "question">("helpful");
  const [generatedReply, setGeneratedReply] = useState("");
  const [replyGenerating, setReplyGenerating] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/social"));
      const data = await res.json();
      setPosts(data.posts || []);
    } catch {
      toast.error("Failed to load posts");
    }
  }, []);

  const fetchLots = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/auctions?limit=100&status=active"));
      const data = await res.json();
      setLots(data.lots || []);
    } catch {
      /* non-critical */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchLots();
  }, [fetchPosts, fetchLots]);

  const fetchRedditPosts = useCallback(async (refresh = false) => {
    setRedditLoading(true);
    try {
      const res = await fetch(
        apiUrl(`/api/social/reddit-discover${refresh ? "?refresh=true" : ""}`)
      );
      const data = await res.json();
      setRedditPosts(data.posts || []);
      setRedditLastFetched(data.lastFetched || "");
    } catch {
      toast.error("Failed to fetch Reddit posts");
    } finally {
      setRedditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "reddit" && redditPosts.length === 0 && !redditLoading) {
      fetchRedditPosts();
    }
  }, [tab, redditPosts.length, redditLoading, fetchRedditPosts]);

  async function handleGenerateReply(post: RedditPost) {
    setReplyGenerating(true);
    setGeneratedReply("");
    try {
      const res = await fetch(apiUrl("/api/social/reddit-reply"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postTitle: post.title,
          postContent: post.selftext,
          subreddit: post.subreddit,
          replyType,
          subredditTier: post.subreddit_tier ?? "caution",
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setGeneratedReply(data.reply);
        if (data.tierOverridden) {
          toast.info("Reply tone set to Helpful — risky sub detected");
        } else {
          toast.success("Reply generated!");
        }
      } else {
        toast.error(data.error || "Failed to generate reply");
      }
    } catch {
      toast.error("Failed to generate reply");
    } finally {
      setReplyGenerating(false);
    }
  }

  const filteredRedditPosts = redditPosts
    .filter(
      (p) =>
        redditSubFilter === "all" ||
        p.subreddit.toLowerCase() === redditSubFilter.toLowerCase()
    )
    .sort((a, b) => {
      if (redditSort === "score") return b.score - a.score;
      if (redditSort === "comments") return b.num_comments - a.num_comments;
      return b.created_utc - a.created_utc;
    });

  const redditSubreddits = Array.from(new Set(redditPosts.map((p) => p.subreddit))).sort();
  const relevantCount = redditPosts.filter((p) => p.is_relevant).length;

  function toggleLot(id: string) {
    setSelectedLots((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= 5
        ? prev
        : [...prev, id]
    );
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const items =
        selectedLots.length > 0
          ? lots
              .filter((l) => selectedLots.includes(l._id))
              .map((l) => ({ title: l.title, currentBid: l.currentBid }))
          : lots.slice(0, 3).map((l) => ({ title: l.title, currentBid: l.currentBid }));

      const res = await fetch(apiUrl("/api/social/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, items, customNote }),
      });
      const data = await res.json();
      if (data.success) {
        if (platform === "reddit") {
          setGeneratedContent(`${data.content.title}\n\n${data.content.content}`);
          setGeneratedHashtags(data.content.subreddits || []);
        } else {
          setGeneratedContent(data.content.caption || data.content.content || "");
          setGeneratedHashtags(data.content.hashtags || []);
        }
        toast.success("Content generated!");
      } else {
        toast.error(data.error || "Generation failed");
      }
    } catch {
      toast.error("Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!generatedContent) return;
    try {
      const res = await fetch(apiUrl("/api/social"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          content: generatedContent,
          hashtags: generatedHashtags,
          status: "draft",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Saved to queue!");
        setGeneratedContent("");
        setGeneratedHashtags([]);
        fetchPosts();
        setTab("queue");
      }
    } catch {
      toast.error("Save failed");
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(apiUrl("/api/social"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setPosts((prev) => prev.filter((p) => p._id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  }

  const drafted = posts.filter((p) => p.status === "draft");
  const published = posts.filter((p) => p.status === "published");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Social Media</h1>
          <p className="text-gray-400 text-sm mt-1">
            Generate captions for your live auction lots · copy &amp; post manually
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="border-gray-700 text-gray-400">
              <ExternalLink className="h-3 w-3 mr-1" />Instagram
            </Button>
          </a>
          <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="border-gray-700 text-gray-400">
              <ExternalLink className="h-3 w-3 mr-1" />Facebook
            </Button>
          </a>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => v && setTab(v)}>
        <TabsList className="bg-gray-900 border border-gray-800 h-auto p-1 gap-1">
          <TabsTrigger
            value="create"
            className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-md transition-all"
          >
            <PenLine className="h-4 w-4" />
            <span className="hidden sm:inline">Create</span>
          </TabsTrigger>
          <TabsTrigger
            value="reddit"
            className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-orange-600/20 data-[state=active]:text-orange-300 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-md transition-all"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Reddit</span>
            {relevantCount > 0 && (
              <Badge className="ml-1 bg-orange-600 text-white text-[10px] px-1.5 py-0">
                {relevantCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="queue"
            className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-300 data-[state=active]:border-b-2 data-[state=active]:border-purple-500 rounded-md transition-all"
          >
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Queue</span>
            {drafted.length > 0 && (
              <Badge className="ml-1 bg-purple-600 text-white text-[10px] px-1.5 py-0">
                {drafted.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="published"
            className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-green-600/20 data-[state=active]:text-green-300 data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-md transition-all"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">Published</span>
            {published.length > 0 && (
              <span className="text-[11px] text-gray-500 ml-1">({published.length})</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── CREATE TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="create" className="space-y-4">
          <div className="pt-1">
            <p className="text-sm text-gray-500">
              Pick a platform, select lots, and generate a ready-to-post caption.
            </p>
          </div>

          {/* Platform selector — 2x2 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PLATFORMS.map((p) => {
              const isSelected = platform === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value)}
                  className={`relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected ? p.color : p.dimColor + " bg-gray-900"
                  }`}
                >
                  <span className="text-2xl leading-none mt-0.5">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${isSelected ? "" : "text-gray-300"}`}>
                      {p.label}
                    </p>
                    <p className={`text-xs mt-0.5 ${isSelected ? "opacity-80" : "text-gray-500"}`}>
                      {p.hint}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="absolute top-3 right-3">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Lot picker */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-300">
                Pick lots to feature
                <span className="text-gray-500 font-normal ml-2">
                  (up to 5 · leave empty for top items)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 bg-gray-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : lots.length === 0 ? (
                <p className="text-gray-500 text-sm">No active lots — scrape HiBid first.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
                  {lots.slice(0, 40).map((lot) => (
                    <button
                      key={lot._id}
                      onClick={() => toggleLot(lot._id)}
                      className={`text-left p-2 rounded-lg border text-xs transition-all ${
                        selectedLots.includes(lot._id)
                          ? "border-blue-500 bg-blue-600/20 text-blue-300"
                          : "border-gray-800 hover:border-gray-700 text-gray-400"
                      }`}
                    >
                      <p className="font-medium truncate">{lot.title}</p>
                      <p className="text-green-400 mt-0.5">
                        ${lot.currentBid} · #{lot.lotNumber}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              {selectedLots.length > 0 && (
                <button
                  className="text-xs text-gray-500 mt-2 hover:text-gray-300"
                  onClick={() => setSelectedLots([])}
                >
                  Clear selection
                </button>
              )}
            </CardContent>
          </Card>

          {/* Optional note */}
          <div className="flex gap-3">
            <Input
              placeholder="Optional note (e.g. 'auction this Sunday 6pm', 'pickup only')"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="bg-gray-900 border-gray-800"
            />
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-blue-600 hover:bg-blue-700 shrink-0"
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate
            </Button>
          </div>

          {/* Generated output */}
          {generatedContent && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-300 flex items-center justify-between">
                  Generated Caption
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copy(
                          generatedContent +
                            (generatedHashtags.length
                              ? "\n\n" +
                                generatedHashtags
                                  .map((t) => (platform === "reddit" ? `r/${t}` : `#${t}`))
                                  .join(" ")
                              : "")
                        )
                      }
                    >
                      <Copy className="h-4 w-4 mr-1" /> Copy all
                    </Button>
                    <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                      <Save className="h-4 w-4 mr-1" /> Save to queue
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  rows={8}
                  className="bg-gray-800 border-gray-700 font-mono text-sm"
                />
                {generatedHashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {generatedHashtags.map((tag, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-xs border-gray-700 text-blue-400 cursor-pointer hover:bg-gray-800"
                        onClick={() =>
                          copy(platform === "reddit" ? `r/${tag}` : `#${tag}`)
                        }
                      >
                        {platform === "reddit" ? `r/${tag}` : `#${tag}`}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-800">
                  <span className="text-xs text-gray-500">Post to:</span>
                  {platform === "instagram" && (
                    <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-gray-700">
                        Open Instagram <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </a>
                  )}
                  {platform === "facebook" && (
                    <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-gray-700">
                        Open Facebook <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </a>
                  )}
                  {platform === "reddit" && (
                    <a
                      href="https://www.reddit.com/r/flipping/submit"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline" className="h-7 text-xs border-gray-700">
                        Post to Reddit <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </a>
                  )}
                  {platform === "nextdoor" && (
                    <a href="https://nextdoor.com" target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-gray-700">
                        Open Nextdoor <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── REDDIT OPPORTUNITIES TAB ────────────────────────────────── */}
        <TabsContent value="reddit" className="space-y-4">
          <div className="pt-1">
            <p className="text-sm text-gray-500">
              Monitor relevant subreddits and reply to posts where you can add value or promote
              naturally.
            </p>
          </div>

          {/* Controls */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => fetchRedditPosts(true)}
                  disabled={redditLoading}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {redditLoading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  {redditLoading ? "Scanning..." : "Refresh"}
                </Button>
                <Select value={redditSubFilter} onValueChange={(value) => setRedditSubFilter(value ?? "all")}>
                  <SelectTrigger className="h-9 w-full bg-gray-800 border-gray-700 text-sm sm:w-44">
                    <SelectValue placeholder="Subreddit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subreddits</SelectItem>
                    {redditSubreddits.map((s) => {
                      const post = redditPosts.find((p) => p.subreddit === s);
                      const tier = post?.subreddit_tier;
                      const icon =
                        tier === "safe" ? "🟢" : tier === "risky" ? "🔴" : "🟡";
                      return (
                        <SelectItem key={s} value={s}>
                          {icon} r/{s}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Select
                  value={redditSort}
                  onValueChange={(v) => setRedditSort(v as "score" | "new" | "comments")}
                >
                  <SelectTrigger className="h-9 w-full bg-gray-800 border-gray-700 text-sm sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Top Score</SelectItem>
                    <SelectItem value="new">Newest</SelectItem>
                    <SelectItem value="comments">Most Comments</SelectItem>
                  </SelectContent>
                </Select>
                <div className="hidden flex-1 lg:block" />
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span>🟢 Safe 🟡 Caution 🔴 Risky</span>
                  <span>·</span>
                  <span>
                    {redditPosts.length} posts · {relevantCount} relevant
                  </span>
                  {redditLastFetched && (
                    <span>· updated {new Date(redditLastFetched).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Post List */}
          {redditLoading && redditPosts.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-16 text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-orange-400" />
                <p className="text-gray-400">Scanning subreddits for opportunities...</p>
                <p className="text-xs text-gray-600 mt-1">
                  This may take 30–60 seconds on first load
                </p>
              </CardContent>
            </Card>
          ) : filteredRedditPosts.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-12 text-center text-gray-400">
                <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
                No posts found. Try refreshing or changing the filter.
              </CardContent>
            </Card>
          ) : (
            filteredRedditPosts.slice(0, 50).map((post) => {
              const timeAgoStr = (() => {
                const mins = Math.floor((Date.now() / 1000 - post.created_utc) / 60);
                if (mins < 60) return `${mins}m`;
                const hrs = Math.floor(mins / 60);
                if (hrs < 24) return `${hrs}h`;
                return `${Math.floor(hrs / 24)}d`;
              })();
              const isRisky = post.subreddit_tier === "risky";
              const isReplying = replyingTo === post.id;

              return (
                <Card
                  key={post.id}
                  className={`bg-gray-900 border-gray-800 ${
                    post.is_relevant ? "border-l-2 border-l-orange-500" : ""
                  }`}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <Badge className="bg-orange-600/20 text-orange-400 text-[10px] flex items-center gap-1">
                            <TierBadge tier={post.subreddit_tier} />
                            r/{post.subreddit}
                          </Badge>
                          <RelevanceBadge score={post.relevance_score} />
                          {post.flair && (
                            <Badge
                              variant="outline"
                              className="border-gray-700 text-gray-500 text-[10px]"
                            >
                              {post.flair}
                            </Badge>
                          )}
                          <span className="text-[11px] text-gray-500">
                            u/{post.author} · {timeAgoStr} ago
                          </span>
                        </div>
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-200 hover:text-blue-400 transition-colors"
                        >
                          {post.title}
                        </a>
                        {post.selftext && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {post.selftext.slice(0, 200)}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3" />
                            {post.score}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {post.num_comments}
                          </span>
                        </div>

                        {/* Risky sub warning */}
                        {isRisky && isReplying && (
                          <div className="mt-3 px-3 py-2 rounded-lg bg-red-900/20 border border-red-800 text-xs text-red-300">
                            ⚠️ r/{post.subreddit} has strict self-promotion rules. Keep replies
                            helpful and avoid direct promotion. Reply tone has been set to Helpful
                            automatically.
                          </div>
                        )}

                        {/* Inline Reply Composer */}
                        {isReplying && (
                          <div className="mt-3 p-3 rounded-lg bg-gray-800/60 border border-gray-700 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-gray-400">Tone:</span>
                              {(["helpful", "promotional", "question"] as const).map((t) => {
                                const locked = isRisky && t !== "helpful";
                                return (
                                  <button
                                    key={t}
                                    onClick={() => !locked && setReplyType(t)}
                                    disabled={locked}
                                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all border ${
                                      (isRisky ? "helpful" : replyType) === t
                                        ? "border-orange-500 bg-orange-600/20 text-orange-300"
                                        : locked
                                        ? "border-gray-800 text-gray-600 cursor-not-allowed opacity-50"
                                        : "border-gray-700 text-gray-400 hover:border-gray-600"
                                    }`}
                                  >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                    {locked && " 🔒"}
                                  </button>
                                );
                              })}
                              <div className="flex-1" />
                              <Button
                                size="sm"
                                onClick={() => handleGenerateReply(post)}
                                disabled={replyGenerating}
                                className="bg-orange-600 hover:bg-orange-700 h-7 text-xs"
                              >
                                {replyGenerating ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Sparkles className="h-3 w-3 mr-1" />
                                )}
                                Generate
                              </Button>
                            </div>
                            {generatedReply && (
                              <>
                                <Textarea
                                  value={generatedReply}
                                  onChange={(e) => setGeneratedReply(e.target.value)}
                                  rows={4}
                                  className="bg-gray-900 border-gray-700 text-sm"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-gray-700"
                                    onClick={() => copy(generatedReply)}
                                  >
                                    <Copy className="h-3 w-3 mr-1" /> Copy
                                  </Button>
                                  <a href={post.url} target="_blank" rel="noopener noreferrer">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs border-gray-700"
                                    >
                                      Open on Reddit <ExternalLink className="h-3 w-3 ml-1" />
                                    </Button>
                                  </a>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-8 text-xs ${
                            isRisky
                              ? "border-red-800 text-red-400 hover:border-red-700"
                              : "border-gray-700"
                          }`}
                          onClick={() => {
                            if (isReplying) {
                              setReplyingTo(null);
                              setGeneratedReply("");
                            } else {
                              setReplyingTo(post.id);
                              setGeneratedReply("");
                              if (isRisky) setReplyType("helpful");
                            }
                          }}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {isReplying ? "Close" : "Reply"}
                        </Button>
                        <a href={post.url} target="_blank" rel="noopener noreferrer">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-gray-500 w-full"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" /> View
                          </Button>
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ── QUEUE TAB ──────────────────────────────────────────────────── */}
        <TabsContent value="queue" className="space-y-3">
          <div className="pt-1">
            <p className="text-sm text-gray-500">
              Saved drafts ready to copy and post. Delete after posting or mark as published.
            </p>
          </div>
          {drafted.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-12 text-center text-gray-400">
                No drafts yet. Generate a post and save it here.
              </CardContent>
            </Card>
          ) : (
            drafted.map((post) => (
              <Card key={post._id} className="bg-gray-900 border-gray-800">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className={
                            PLATFORMS.find((p) => p.value === post.platform)?.color ??
                            "bg-gray-700 text-gray-300"
                          }
                        >
                          {PLATFORMS.find((p) => p.value === post.platform)?.emoji}{" "}
                          {post.platform}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap line-clamp-4">
                        {post.content}
                      </p>
                      {post.hashtags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {post.hashtags.slice(0, 8).map((t, i) => (
                            <span key={i} className="text-xs text-blue-400">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700 h-8"
                        onClick={() =>
                          copy(
                            post.content +
                              (post.hashtags?.length
                                ? "\n\n" + post.hashtags.map((t) => `#${t}`).join(" ")
                                : "")
                          )
                        }
                      >
                        <Copy className="h-3 w-3 mr-1" /> Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 h-8"
                        onClick={() => handleDelete(post._id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── PUBLISHED TAB ──────────────────────────────────────────────── */}
        <TabsContent value="published" className="space-y-3">
          <div className="pt-1">
            <p className="text-sm text-gray-500">
              History of posts you&apos;ve already published across platforms.
            </p>
          </div>
          {published.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-12 text-center text-gray-400">
                No published posts yet. Mark drafts as published after posting.
              </CardContent>
            </Card>
          ) : (
            published.map((post) => (
              <Card key={post._id} className="bg-gray-900 border-gray-800 opacity-75">
                <CardContent className="py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      className={
                        PLATFORMS.find((p) => p.value === post.platform)?.color ??
                        "bg-gray-700 text-gray-300"
                      }
                    >
                      {PLATFORMS.find((p) => p.value === post.platform)?.emoji} {post.platform}
                    </Badge>
                    <Badge className="bg-green-600/20 text-green-400">published</Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2">{post.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
