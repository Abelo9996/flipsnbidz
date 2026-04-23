#!/usr/bin/env python3
"""
Batch email sender using Brevo (formerly Sendinblue) API.

Config:
  - BREVO_API_KEY: Your Brevo API key
  - SENDER_EMAIL: Verified sender email address

Usage:
  python3 email_sender.py --test          # Send to test recipient only
  python3 email_sender.py --send          # Send to entire list (with confirmation)
  python3 email_sender.py --send --yes    # Send to entire list without stdin prompt
  python3 email_sender.py --dry-run       # Preview what would be sent
"""

import requests
import time
import sys
import os
import json
from datetime import datetime

# ── CONFIG ──────────────────────────────────────────────────────────────────
BREVO_API_KEY = os.environ.get("BREVO_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "marketing@flipsandbidz.com")
SENDER_NAME = "Flips & Bidz Team"  # Display name for the sender

TEST_RECIPIENT = "abelyagubyan@berkeley.edu"
SCRIPT_DIR = os.path.dirname(__file__)
CONTACTS_FILE = os.path.join(os.path.dirname(SCRIPT_DIR), "data", "contacts.json")

# Rate limiting: Brevo free tier = 300 emails/day, paid varies
BATCH_SIZE = 50       # emails per batch
BATCH_DELAY_SEC = 2   # seconds between batches
# ────────────────────────────────────────────────────────────────────────────

# ── EMAIL CONTENT ───────────────────────────────────────────────────────────
AUCTION_URL = os.environ.get("AUCTION_URL", "https://flipsandbidz.hibid.com")

def get_evening_phrase() -> str:
    # Sunday -> "this evening"; other days -> "Sunday evening"
    return "this evening" if datetime.now().strftime("%A") == "Sunday" else "Sunday evening"

EVENING_PHRASE = get_evening_phrase()
SUBJECT = f"Reminder: Auction Ends {EVENING_PHRASE.title()} at 6 PM"

HTML_BODY_TEMPLATE = f"""\
<html>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding: 30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:4px; overflow:hidden;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 10px 40px;">
              <img src="https://www.flipsandbidz.com/images/flipsnbidz.png" alt="Flips & Bidz" width="180" style="display:block;" />
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding: 10px 40px;">
              <hr style="border:none; border-top: 2px solid #e0a800; margin:0;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 25px 40px 10px 40px; font-size:15px; line-height:1.6; color:#333333;">
              <p style="margin:0 0 15px 0;">Hi {{{{FIRST_NAME}}}},</p>
              <p style="margin:0 0 15px 0;">Just a quick heads-up that bidding for the current Flips &amp; Bidz sale wraps up <b><u>{EVENING_PHRASE}</u> at 6 PM</b>. If you haven't placed your bids yet, there's still a bit of time left!</p>
              <p style="margin:0 0 15px 0;">Check out the full selection of items here: <a href="{AUCTION_URL}" style="color:#1a73e8;">Browse the Catalogue</a></p>
              <p style="margin:0 0 15px 0;">We appreciate you being part of our community. Let us know if there's anything we can help with.</p>
              <p style="margin:0 0 5px 0;">All the best,<br/>The Team at Flips &amp; Bidz</p>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding: 10px 40px;">
              <hr style="border:none; border-top: 2px solid #e0a800; margin:0;" />
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 20px 40px 30px 40px; font-size:12px; color:#888888;">
              Flips &amp; Bidz &bull; 15300 Valley View Ave., La Mirada, CA 90638 &bull; <a href="https://www.flipsandbidz.com" style="color:#888888;">flipsandbidz.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

TEXT_BODY_TEMPLATE = f"""\
Hi {{{{FIRST_NAME}}}},

Just a quick heads-up that bidding for the current Flips & Bidz sale wraps up {EVENING_PHRASE} at 6 PM. If you haven't placed your bids yet, there's still a bit of time left!

Check out the full selection of items here: {AUCTION_URL}

We appreciate you being part of our community. Let us know if there's anything we can help with.

All the best,
The Team at Flips & Bidz

---
Flips & Bidz - 15300 Valley View Ave., La Mirada, CA 90638 - flipsandbidz.com
"""
# ────────────────────────────────────────────────────────────────────────────


API_URL = "https://api.brevo.com/v3/smtp/email"


def load_recipients(filepath):
    """Load contacts from JSON. Returns list of dicts with 'email' and 'first_name'."""
    with open(filepath) as f:
        contacts = json.load(f)
    results = []
    for c in contacts:
        email = c.strip()
        if not email or "@" not in email:
            continue
        full_name = contacts[c]['name'].strip()
        # Extract first name (first word), handle titles like "Mr."
        first_name = "there"
        if full_name:
            parts = full_name.split()
            # Skip common titles
            for part in parts:
                if part.rstrip(".").lower() not in ("mr", "mrs", "ms", "dr", "prof"):
                    first_name = part.title()
                    break
        # Handle "Joseph and Nicolette" style — use first person's name
        if " and " in first_name.lower():
            first_name = first_name.split(" and ")[0].split(" And ")[0]
        results.append({"email": email, "first_name": first_name})
    return results


def send_email(to_email, first_name="there"):
    """Send a single email via Brevo. Returns (success: bool, detail: str)."""
    html_body = HTML_BODY_TEMPLATE.replace("{{FIRST_NAME}}", first_name)
    text_body = TEXT_BODY_TEMPLATE.replace("{{FIRST_NAME}}", first_name)
    headers = {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = {
        "sender": {"name": SENDER_NAME, "email": SENDER_EMAIL},
        "to": [{"email": to_email, "name": first_name}],
        "subject": SUBJECT,
        "htmlContent": html_body,
        "textContent": text_body,
    }
    try:
        r = requests.post(API_URL, json=payload, headers=headers, timeout=30)
        if r.status_code == 201:
            return True, r.json().get("messageId", "ok")
        else:
            return False, f"HTTP {r.status_code}: {r.text}"
    except Exception as e:
        return False, str(e)


def send_batch(recipients, dry_run=False):
    total = len(recipients)
    sent = 0
    failed = 0
    errors = []

    for i, contact in enumerate(recipients, 1):
        email = contact["email"]
        first_name = contact["first_name"]

        if dry_run:
            print(f"  [{i}/{total}] Would send to: {email} (Hi {first_name})")
            continue

        ok, detail = send_email(email, first_name)
        if ok:
            sent += 1
            print(f"  ✓ [{i}/{total}] {email}")
        else:
            failed += 1
            errors.append((email, detail))
            print(f"  ✗ [{i}/{total}] {email} — {detail}")

        # Rate limit between batches
        if i % BATCH_SIZE == 0 and i < total:
            print(f"  … pausing {BATCH_DELAY_SEC}s (batch limit)…")
            time.sleep(BATCH_DELAY_SEC)

    if not dry_run:
        print(f"\nDone: {sent} sent, {failed} failed out of {total}")
        if errors:
            print("\nFailed addresses:")
            for email, detail in errors:
                print(f"  {email}: {detail}")


def main():
    args = sys.argv[1:]
    if not args or args[0] not in ("--test", "--send", "--dry-run"):
        print(__doc__)
        sys.exit(1)

    mode = args[0]
    skip_confirm = "--yes" in args

    if not BREVO_API_KEY and mode != "--dry-run":
        print("❌ Set BREVO_API_KEY in the environment before sending")
        sys.exit(1)

    if mode == "--test":
        print(f"Sending test email to {TEST_RECIPIENT}…")
        ok, detail = send_email(TEST_RECIPIENT)
        if ok:
            print(f"✓ Sent! Message ID: {detail}")
        else:
            print(f"✗ Failed: {detail}")

    elif mode == "--dry-run":
        recipients = load_recipients(CONTACTS_FILE)
        print(f"Dry run — {len(recipients)} recipients:\n")
        send_batch(recipients, dry_run=True)

    elif mode == "--send":
        recipients = load_recipients(CONTACTS_FILE)
        print(f"\n⚠️  About to send to {len(recipients)} recipients.")
        if not skip_confirm:
            confirm = input("Type 'YES' to proceed: ")
            if confirm.strip() != "YES":
                print("Aborted.")
                sys.exit(0)
        else:
            print("Skipping interactive confirmation because --yes was provided.")
        print()
        send_batch(recipients)


if __name__ == "__main__":
    main()
