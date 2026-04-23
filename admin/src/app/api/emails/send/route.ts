import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import EmailCampaign from "@/lib/models/EmailCampaign";
import Subscriber from "@/lib/models/Subscriber";
import { google } from "googleapis";

function getGmailClient() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const redirectUri = process.env.GMAIL_REDIRECT_URI || "https://developers.google.com/oauthplayground";

  if (!clientId || !clientSecret || !refreshToken || clientId === "placeholder") {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

function createRawEmail(to: string, from: string, subject: string, htmlBody: string): string {
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
  const messageParts = [
    `From: Flips & Bidz <${from}>`,
    `To: ${to}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${utf8Subject}`,
    "",
    htmlBody,
  ];
  return Buffer.from(messageParts.join("\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { campaignId } = await req.json();

    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get target subscribers
    const filter: Record<string, unknown> = { status: "active" };
    if (campaign.recipientTags?.length) {
      filter.tags = { $in: campaign.recipientTags };
    }
    const subscribers = await Subscriber.find(filter).lean();

    if (subscribers.length === 0) {
      return NextResponse.json({ error: "No active subscribers match the campaign tags." }, { status: 400 });
    }

    // Check Gmail config
    const gmail = getGmailClient();
    const fromEmail = process.env.GMAIL_USER || "flipsnbidz@gmail.com";

    if (!gmail) {
      // Mark as sent anyway for testing (dry run)
      campaign.status = "sent";
      campaign.sentAt = new Date();
      campaign.stats.sent = subscribers.length;
      await campaign.save();

      return NextResponse.json({
        success: true,
        dryRun: true,
        sent: subscribers.length,
        message: `DRY RUN: Gmail OAuth not configured. Campaign marked as sent to ${subscribers.length} subscribers. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN to send real emails.`,
      });
    }

    // Send emails via Gmail API
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const sub of subscribers) {
      try {
        const raw = createRawEmail(
          sub.email,
          fromEmail,
          campaign.subject,
          campaign.htmlContent
        );

        await gmail.users.messages.send({
          userId: "me",
          requestBody: { raw },
        });
        successCount++;

        // Rate limit: ~1 email per second to avoid Gmail throttling
        if (subscribers.length > 10) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      } catch (e) {
        errorCount++;
        errors.push(`${sub.email}: ${String(e)}`);
        if (errorCount > 5) break; // Stop if too many failures
      }
    }

    // Update campaign
    campaign.status = "sent";
    campaign.sentAt = new Date();
    campaign.stats.sent = successCount;
    campaign.stats.bounced = errorCount;
    await campaign.save();

    // Update subscriber lastEmailedAt
    const sentIds = subscribers.slice(0, successCount).map((s) => s._id);
    await Subscriber.updateMany(
      { _id: { $in: sentIds } },
      { lastEmailedAt: new Date() }
    );

    return NextResponse.json({
      success: true,
      sent: successCount,
      errors: errorCount,
      errorDetails: errors.slice(0, 3),
      message: `Sent ${successCount}/${subscribers.length} emails via ${fromEmail}. ${errorCount} errors.`,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
