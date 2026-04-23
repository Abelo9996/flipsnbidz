import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Subscriber from "@/lib/models/Subscriber";
import { spawn } from "child_process";
import path from "path";

const ADMIN_ROOT = process.cwd();
const HIBID_DIR = ADMIN_ROOT;
const EMAIL_SENDER_SCRIPT = path.join(ADMIN_ROOT, "scripts", "email_sender.py");

async function runEmailSender(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("python3", [EMAIL_SENDER_SCRIPT, ...args], {
      cwd: HIBID_DIR,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });

    // hard timeout for safety
    setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
    }, 10 * 60 * 1000);
  });
}

async function sendTwilioSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) throw new Error("Twilio not configured");

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Twilio ${res.status}: ${txt.slice(0, 300)}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action as string;

    if (action === "email_test") {
      const result = await runEmailSender(["--test"]);
      if (result.code !== 0) {
        return NextResponse.json({ error: result.stderr || result.stdout || "Test email failed" }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: "Test email triggered successfully.", logs: result.stdout.slice(-2000) });
    }

    if (action === "email_all") {
      // Safety gate: require explicit confirmation phrase from UI
      const confirmationText = String(body?.confirmationText || "").trim();
      if (confirmationText !== "SEND TO ALL") {
        return NextResponse.json({ error: "Confirmation phrase mismatch. Bulk send aborted." }, { status: 400 });
      }

      const result = await runEmailSender(["--send", "--yes"]);
      if (result.code !== 0) {
        return NextResponse.json({ error: result.stderr || result.stdout || "Bulk email failed" }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: "Bulk email send executed.", logs: result.stdout.slice(-4000) });
    }

    if (action === "sms_send") {
      await dbConnect();
      const smsBody = String(body?.smsBody || "").trim();
      if (!smsBody) {
        return NextResponse.json({ error: "SMS body is required." }, { status: 400 });
      }

      const subscribers = await Subscriber.find({ status: "active" }).select("phone").lean();
      const smsTargets = subscribers.map((s) => String(s.phone || "").trim()).filter(Boolean);

      let smsSent = 0;
      let smsErrors = 0;

      for (const to of smsTargets) {
        try {
          await sendTwilioSms(to, smsBody);
          smsSent++;
          if (smsTargets.length > 20) await new Promise((r) => setTimeout(r, 250));
        } catch {
          smsErrors++;
        }
      }

      return NextResponse.json({
        success: true,
        totals: { smsTargets: smsTargets.length, smsSent, smsErrors },
        message: `SMS done. ${smsSent}/${smsTargets.length} sent.`,
      });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
