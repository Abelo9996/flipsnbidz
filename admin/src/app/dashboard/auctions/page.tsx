"use client";

import { apiUrl } from "@/lib/api";
import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Search, Loader2, Eye, Heart } from "lucide-react";
import { toast } from "sonner";

interface Lot {
  _id: string;
  lotNumber: string;
  title: string;
  currentBid: number;
  numberOfBids: number;
  views: number;
  watches: number;
  timeLeft: string;
  category: string;
  status: string;
  imageUrl: string;
  url: string;
  scrapedAt: string;
}

const CATEGORIES = [
  "all", "electronics", "furniture", "tools", "appliances", "kitchen",
  "outdoor", "clothing", "toys", "sports", "home-decor", "automotive",
  "office", "health-beauty", "uncategorized",
];
const STALE_MS = 6 * 60 * 60 * 1000;

function LotImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className="bg-gray-800 rounded-t-lg flex items-center justify-center"
        style={{ width: "100%", height: 60 }}
      >
        <span className="text-gray-600 text-xs">No image</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-full h-36 object-cover rounded-t-lg"
    />
  );
}

export default function AuctionsPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [total, setTotal] = useState(0);
  const [lastScraped, setLastScraped] = useState<string | null>(null);
  const autoScrapedRef = useRef(false);

  const fetchLots = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category !== "all") params.set("category", category);
      params.set("limit", "500");
      const res = await fetch(apiUrl(`/api/auctions?${params.toString()}`));
      const data = await res.json();
      const sorted = (data.lots || []).slice().sort((a: Lot, b: Lot) => {
        const na = parseInt(a.lotNumber) || 0;
        const nb = parseInt(b.lotNumber) || 0;
        return na - nb;
      });
      setLots(sorted);
      setTotal(data.total || 0);
      setLastScraped(data.lastScrapedAt || null);
      return data;
    } catch {
      toast.error("Failed to load auctions");
      return null;
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  const triggerScrape = useCallback(async () => {
    if (scraping) return;
    setScraping(true);
    toast.info("Refreshing live auction data from HiBid...", { duration: 5000 });
    try {
      const kickRes = await fetch(apiUrl("/api/auctions/scrape"), { method: "POST" });
      const kickData = await kickRes.json();
      const jobId: string | undefined = kickData.jobId;
      if (!jobId) {
        toast.error(kickData.message || "Failed to start scrape");
        setScraping(false);
        return;
      }

      const deadline = Date.now() + 5 * 60 * 1000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 4000));
        try {
          const pollRes = await fetch(apiUrl(`/api/auctions/scrape?jobId=${jobId}`));
          const pollData = await pollRes.json();
          if (pollData.status === "done") {
            toast.success(`${pollData.scraped} lots scraped & classified from HiBid`, { duration: 4000 });
            await fetchLots();
            return;
          }
          if (pollData.status === "error") {
            toast.error(pollData.error || "Scrape failed");
            return;
          }
        } catch {
          // transient, keep trying
        }
      }
      toast.error("Scrape timed out — check back in a moment");
    } catch {
      toast.error("Scrape request failed");
    } finally {
      setScraping(false);
    }
  }, [scraping, fetchLots]);

  useEffect(() => {
    fetchLots().then((data) => {
      if (!autoScrapedRef.current && data) {
        const scraped = data.lastScrapedAt ? new Date(data.lastScrapedAt).getTime() : 0;
        const stale = Date.now() - scraped > STALE_MS;
        const empty = (data.total || 0) === 0;
        if (stale || empty) {
          autoScrapedRef.current = true;
          triggerScrape();
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) fetchLots();
    else mounted.current = true;
  }, [search, category, fetchLots]);

  const staleText = lastScraped
    ? `Last updated ${new Date(lastScraped).toLocaleString()}`
    : "Never scraped";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Auction Monitor</h1>
          <p className="mt-1 text-sm text-gray-400">
            {total} lots · {staleText}
            {scraping && <span className="text-blue-400 ml-2">· Scraping live...</span>}
          </p>
        </div>
        <Button onClick={triggerScrape} disabled={scraping} className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto">
          {scraping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {scraping ? "Scraping HiBid..." : "Refresh Live"}
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search lots..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-gray-900 border-gray-800"
          />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v ?? "all")}>
          <SelectTrigger className="w-full bg-gray-900 border-gray-800 sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-800">
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-52 bg-gray-800 rounded-lg" />
          ))}
        </div>
      ) : lots.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="py-12 text-center text-gray-400">
            {scraping
              ? "Scraping live auction data... this takes about a minute."
              : "No lots found."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lots.map((lot) => (
            <a
              key={lot._id}
              href={lot.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card
                className="bg-gray-900 border-gray-800 hover:border-gray-600 hover:bg-gray-800/80 transition-colors cursor-pointer h-full"
              >
                <LotImage src={lot.imageUrl} alt={lot.title} />
                <CardContent className="space-y-3 pt-3 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium line-clamp-2 flex-1">{lot.title}</p>
                    <Badge variant="outline" className="shrink-0 text-xs border-gray-700">
                      #{lot.lotNumber}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400 block text-xs">Current Bid</span>
                      <span className="font-bold text-green-400">
                        ${lot.currentBid.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-xs">Bids</span>
                      <span className="font-medium">{lot.numberOfBids}</span>
                    </div>
                  </div>

                  {(lot.views > 0 || lot.watches > 0) && (
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {lot.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {lot.watches} watching
                      </span>
                    </div>
                  )}

                  {lot.timeLeft && (
                    <p className="text-xs text-gray-500">⏱ {lot.timeLeft}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <Badge className="bg-blue-600/20 text-blue-400 text-xs capitalize">
                      {lot.category}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
