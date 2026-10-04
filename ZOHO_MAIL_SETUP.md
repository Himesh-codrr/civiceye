# Zoho Mail setup for `info@civiceye.co.in`

CivicEye now sends all transactional email (report confirmations, SLA
escalations, "report fixed" thank-yous, contact form) from
`info@civiceye.co.in`. To make this work you need to provision the mailbox
on Zoho Mail's free tier and point GoDaddy DNS at it.

Follow these steps once. The whole thing takes ~15 minutes.

## 1. Sign up for Zoho Mail Free

1. Go to https://www.zoho.com/mail/ and click **Sign Up – Free Forever Plan**.
2. Pick **Business Email** (not personal) — this lets you use your own domain.
3. Use `civiceye.co.in` as the domain.
4. Create the admin account. For the first mailbox, create `info@civiceye.co.in`
   (this is what CivicEye will send from). Set a strong password and save it
   in your password manager.

## 2. Verify your domain in Zoho

Zoho will show you a TXT record you must add at GoDaddy to prove you own the
domain (something like `zoho-verification=zbxxxxxx`.

1. Log in to https://dcc.godaddy.com → **civiceye.co.in** → **Manage DNS**.
2. Add a **TXT** record:
   - **Type**: TXT
   - **Name**: `@`
   - **Value**: the verification string Zoho gave you
   - **TTL**: 1 hour
3. Back in Zoho, click **Verify by TXT**. DNS propagation usually takes
   2–10 minutes; refresh if it fails the first time.

## 3. Add MX records at GoDaddy (so Zoho receives email)

Delete any existing MX records for `@` (if present), then add these:

| Type | Name | Priority | Value                         | TTL  |
|------|------|----------|-------------------------------|------|
| MX   | @    | 10       | mx.zoho.in                    | 1 hr |
| MX   | @    | 20       | mx2.zoho.in                   | 1 hr |
| MX   | @    | 50       | mx3.zoho.in                   | 1 hr |

(Zoho may show `.com` hosts for non-India regions — use whichever the wizard
shows during setup; the `.in` versions above are the India/APAC ones.)

## 4. Add SPF + DKIM so emails land in inboxes (not spam)

**SPF** — add a TXT record (if you already have an SPF record, merge it):

| Type | Name | Value                                                    |
|------|------|----------------------------------------------------------|
| TXT  | @    | `v=spf1 include:zoho.in ~all`                            |

**DKIM** — in Zoho Mail admin console go to **Domains → civiceye.co.in →
DKIM Setup → Add selector** (use `zoho` as the selector). Zoho will give you
a TXT record like:

| Type | Name                | Value (given by Zoho) |
|------|---------------------|------------------------|
| TXT  | `zoho._domainkey`   | (long Zoho key string) |

Add that at GoDaddy, wait a minute, then hit **Verify** in Zoho.

## 5. Generate an SMTP password for CivicEye

Zoho's free plan supports SMTP. The app uses SMTP to send alerts.

1. In Zoho Mail, go to **Settings → Mail Accounts → IMAP/POP** and enable
   **IMAP Access** (turning this on also enables SMTP sending).
2. Go to **My Account → Security → App Passwords** (if you have 2FA on,
   which you should), and **Generate New App Password** — name it
   `CivicEye app` and copy the 16-character password.
   - If App Passwords isn't visible (no 2FA), you can use your normal Zoho
     password for SMTP — enabling 2FA + app password is strongly recommended.

SMTP connection details for CivicEye:

| Setting         | Value                          |
|-----------------|--------------------------------|
| SMTP host       | `smtp.zoho.in`                 |
| SMTP port       | `587` (STARTTLS)               |
| SMTP username   | `info@civiceye.co.in`          |
| SMTP password   | the app password from step 5   |
| From address    | `CivicEye <info@civiceye.co.in>` |

## 6. Paste the SMTP vars into Vercel

Open https://vercel.com → **Crepify/civiceye** → **Settings → Environment
Variables**, and add / update these (apply to **Production, Preview, Dev**):

| Key              | Value                            |
|------------------|----------------------------------|
| `SMTP_HOST`      | `smtp.zoho.in`                   |
| `SMTP_PORT`      | `587`                            |
| `SMTP_USER`      | `info@civiceye.co.in`            |
| `SMTP_PASS`      | `<app password from step 5>`     |
| `SMTP_FROM`      | `CivicEye <info@civiceye.co.in>` |
| `EMAIL_WEBHOOK_SECRET` | choose a long random string (e.g. `openssl rand -hex 32`) — used by the "report resolved" thank-you endpoint |

Then add the matching public var (for the browser to fire the thank-you
call) — same value:

| Key                            | Value                        |
|--------------------------------|------------------------------|
| `VITE_EMAIL_WEBHOOK_SECRET`    | `<same secret as above>`     |

Hit **Save**, then trigger a redeploy (Vercel → Deployments → the latest →
Redeploy).

## 7. Test

1. Submit a test report from civiceye.co.in.
2. Use the Authorities Dashboard to send an SLA escalation email — it should
   arrive from `info@civiceye.co.in`.
3. Mark a report resolved — the original reporter should receive a green
   🎉 "Your report was fixed!" thank-you email from the same address.
4. Send a quick note to yourself from the Contact page — it should open
   your mail app pre-addressed to `info@civiceye.co.in`.

If anything lands in spam the first time, mark it "not spam" once — with
SPF + DKIM configured deliverability should improve within 24 hours.
