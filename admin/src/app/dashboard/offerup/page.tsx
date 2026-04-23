"use client";

import { apiUrl } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  RefreshCw, Loader2, ExternalLink, Star, ShoppingBag,
  Users, DollarSign, Package, Search, TrendingUp,
  MessageCircle, ThumbsUp, Clock,
} from "lucide-react";
import { toast } from "sonner";

interface Listing {
  _id: string;
  lotNumber: string;
  title: string;
  currentBid: number;
  views: number;
  watches: number;
  imageUrl: string;
  url: string;
  status: string;
  category: string;
  description: string;
}

interface Profile {
  name: string;
  url: string;
  location: string;
  joined: string;
  rating: number;
  reviews: number;
  sold: number;
  followers: number;
  compliments: {
    itemAsDescribed: number;
    friendly: number;
    onTime: number;
    reliable: number;
    communicative: number;
  };
}

function ListingImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className="bg-gray-800 rounded-lg flex items-center justify-center shrink-0"
        style={{ width: 60, height: 60 }}
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
      className="rounded-lg object-cover shrink-0"
      style={{ width: 60, height: 60 }}
    />
  );
}

export default function OfferUpPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/offerup"));
      const data = await res.json();
      setListings(data.lots || []);
      if (data.profile) setProfile(data.profile);
    } catch {
      toast.error("Failed to load OfferUp data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch(apiUrl("/api/offerup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.profile) setProfile(data.profile);
      toast.success(data.message || "Synced");
      fetchData();
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  const filtered = search
    ? listings.filter((l) => l.title.toLowerCase().includes(search.toLowerCase()))
    : listings;
  const active = listings.filter((l) => l.status === "active");
  const sold = listings.filter((l) => l.status === "sold");
  const totalValue = active.reduce((s, l) => s + l.currentBid, 0);
  const avgPrice = active.length > 0 ? totalValue / active.length : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">OfferUp</h1>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-gray-900 border-gray-800">
              <CardContent className="py-6">
                <Skeleton className="h-8 w-20 bg-gray-800" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 bg-gray-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">OfferUp</h1>
          <p className="text-gray-400 text-sm mt-1">
            {active.length} active · {sold.length} sold · ${totalValue.toLocaleString()} inventory
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="https://offerup.com/p/158714750" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-300">
              <ExternalLink className="h-4 w-4 mr-1" /> Profile
            </Button>
          </a>
          <Button
            onClick={handleSync}
            disabled={syncing}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Sync
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      {profile && (
        <Card className="bg-gradient-to-r from-gray-900 to-gray-900/80 border-gray-800">
          <CardContent className="py-5">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{profile.name}</p>
                  <p className="text-gray-400 text-sm">
                    {profile.location} · Joined {profile.joined}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="font-semibold">{profile.rating}</span>
                <span className="text-gray-400 text-sm">({profile.reviews})</span>
              </div>
              <div className="flex items-center gap-1.5 text-green-400">
                <TrendingUp className="h-4 w-4" />
                <span className="font-semibold">{profile.sold}</span>
                <span className="text-gray-400 text-sm">sold</span>
              </div>
              <div className="flex items-center gap-1.5 text-purple-400">
                <Users className="h-4 w-4" />
                <span className="font-semibold">{profile.followers}</span>
                <span className="text-gray-400 text-sm">followers</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {[
                { label: "As Described", count: profile.compliments.itemAsDescribed, icon: ThumbsUp },
                { label: "Friendly", count: profile.compliments.friendly, icon: MessageCircle },
                { label: "On Time", count: profile.compliments.onTime, icon: Clock },
                { label: "Reliable", count: profile.compliments.reliable, icon: Star },
                { label: "Communicative", count: profile.compliments.communicative, icon: MessageCircle },
              ].map((c) => (
                <div
                  key={c.label}
                  className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800/60 rounded-full px-3 py-1.5"
                >
                  <c.icon className="h-3 w-3" />
                  <span>{c.count}</span>
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Active</p>
              <p className="text-2xl font-bold">{active.length}</p>
            </div>
            <Package className="h-8 w-8 text-blue-400/30" />
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Avg Price</p>
              <p className="text-2xl font-bold">${avgPrice.toFixed(0)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400/30" />
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Total Sold</p>
              <p className="text-2xl font-bold">{profile?.sold || sold.length}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-400/30" />
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Inventory Value</p>
              <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
            </div>
            <ShoppingBag className="h-8 w-8 text-yellow-400/30" />
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search listings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-gray-900 border-gray-800"
        />
      </div>

      {/* Listings */}
      {filtered.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="py-12 text-center text-gray-400">
            {listings.length === 0
              ? "No listings yet. Click Sync to pull from OfferUp."
              : "No listings match your search."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <a
              key={item._id}
              href={item.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-600 hover:bg-gray-800/80 transition-colors cursor-pointer block"
            >
              <ListingImage src={item.imageUrl} alt={item.title} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <Badge className="bg-blue-600/20 text-blue-400 text-[10px] capitalize">
                    {item.category}
                  </Badge>
                  {item.description && <span>{item.description}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-green-400">${item.currentBid}</p>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    item.status === "active"
                      ? "border-green-600 text-green-400"
                      : "border-gray-600 text-gray-400"
                  }`}
                >
                  {item.status}
                </Badge>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
