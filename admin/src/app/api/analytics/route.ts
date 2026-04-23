import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import AuctionLot from "@/lib/models/AuctionLot";
import SocialPost from "@/lib/models/SocialPost";
import Subscriber from "@/lib/models/Subscriber";
import EmailCampaign from "@/lib/models/EmailCampaign";
import SEOArticle from "@/lib/models/SEOArticle";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const range = req.nextUrl.searchParams.get("range") || "30d";
    const daysBack = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    // ── Overview counts ──
    const [
      activeAuctions,
      totalListings,
      subscribers,
      subscribersThisPeriod,
      scheduledPosts,
      totalPostsDraft,
      totalPostsPublished,
      totalCampaignsDraft,
      totalCampaignsSent,
      seoArticlesDraft,
      seoArticlesPublished,
    ] = await Promise.all([
      AuctionLot.countDocuments({ status: "active", source: "hibid" }),
      AuctionLot.countDocuments(),
      Subscriber.countDocuments({ status: "active" }),
      Subscriber.countDocuments({ subscribedAt: { $gte: since } }),
      SocialPost.countDocuments({ status: "scheduled" }),
      SocialPost.countDocuments({ status: "draft" }),
      SocialPost.countDocuments({ status: "published" }),
      EmailCampaign.countDocuments({ status: "draft" }),
      EmailCampaign.countDocuments({ status: "sent" }),
      SEOArticle.countDocuments({ status: "draft" }),
      SEOArticle.countDocuments({ status: "published" }),
    ]);

    // ── Email campaign aggregate stats ──
    const emailAgg = await EmailCampaign.aggregate([
      { $match: { status: "sent" } },
      {
        $group: {
          _id: null,
          totalSent: { $sum: "$stats.sent" },
          totalOpened: { $sum: "$stats.opened" },
          totalClicked: { $sum: "$stats.clicked" },
          totalBounced: { $sum: "$stats.bounced" },
        },
      },
    ]);
    const emailStats = emailAgg[0] || { totalSent: 0, totalOpened: 0, totalClicked: 0, totalBounced: 0 };

    // ── Auction category breakdown ──
    const categoryBreakdown = await AuctionLot.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 }, avgBid: { $avg: "$currentBid" }, totalBids: { $sum: "$numberOfBids" } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // ── Social posts by platform ──
    const socialByPlatform = await SocialPost.aggregate([
      { $group: { _id: "$platform", total: { $sum: 1 }, published: { $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] } } } },
    ]);

    // ── Auction lots over time (group by week) ──
    const auctionTimeline = await AuctionLot.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          lots: { $sum: 1 },
          avgBid: { $avg: "$currentBid" },
          totalBids: { $sum: "$numberOfBids" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ── Subscriber growth over time ──
    const subscriberTimeline = await Subscriber.aggregate([
      { $match: { subscribedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$subscribedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ── Campaigns over time ──
    const campaignTimeline = await EmailCampaign.aggregate([
      { $match: { status: "sent", sentAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$sentAt" } },
          campaigns: { $sum: 1 },
          sent: { $sum: "$stats.sent" },
          opened: { $sum: "$stats.opened" },
          clicked: { $sum: "$stats.clicked" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ── Top performing auction lots ──
    const topLots = await AuctionLot.find()
      .sort({ numberOfBids: -1 })
      .limit(5)
      .select("lotNumber title currentBid numberOfBids category")
      .lean();

    // ── Recent activity ──
    const [recentCampaigns, recentPosts] = await Promise.all([
      EmailCampaign.find().sort({ createdAt: -1 }).limit(5).lean(),
      SocialPost.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const recentActivity = [
      ...recentCampaigns.map((c) => ({
        type: "email" as const,
        text: `Email campaign "${c.name}" — ${c.status}`,
        time: c.createdAt,
      })),
      ...recentPosts.map((p) => ({
        type: "social" as const,
        text: `${p.platform} post — ${p.status}`,
        time: p.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10);

    return NextResponse.json({
      overview: {
        activeAuctions,
        totalListings,
        subscribers,
        subscribersThisPeriod,
        scheduledPosts,
        totalPostsDraft,
        totalPostsPublished,
        totalCampaignsDraft,
        totalCampaignsSent,
        seoArticlesDraft,
        seoArticlesPublished,
      },
      email: {
        totalSent: emailStats.totalSent,
        totalOpened: emailStats.totalOpened,
        totalClicked: emailStats.totalClicked,
        totalBounced: emailStats.totalBounced,
        openRate: emailStats.totalSent > 0 ? ((emailStats.totalOpened / emailStats.totalSent) * 100).toFixed(1) : "0",
        clickRate: emailStats.totalSent > 0 ? ((emailStats.totalClicked / emailStats.totalSent) * 100).toFixed(1) : "0",
      },
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c._id || "uncategorized",
        count: c.count,
        avgBid: Math.round((c.avgBid || 0) * 100) / 100,
        totalBids: c.totalBids,
      })),
      socialByPlatform: socialByPlatform.map((s) => ({
        platform: s._id,
        total: s.total,
        published: s.published,
      })),
      timelines: {
        auctions: auctionTimeline.map((a) => ({ date: a._id, lots: a.lots, avgBid: Math.round((a.avgBid || 0) * 100) / 100, totalBids: a.totalBids })),
        subscribers: subscriberTimeline.map((s) => ({ date: s._id, count: s.count })),
        campaigns: campaignTimeline.map((c) => ({ date: c._id, campaigns: c.campaigns, sent: c.sent, opened: c.opened, clicked: c.clicked })),
      },
      topLots,
      recentActivity,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
