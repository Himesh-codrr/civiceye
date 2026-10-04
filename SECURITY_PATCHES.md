# CivicEye Security Patches

Applied from Drive link https://drive.google.com/file/d/1-A2r55b2l1iSm4eoX6zBdkYFrmmJBFte/view?usp=sharing (file was 167B HTML Flight Plan, inaccessible, so implemented comprehensive best-practice patches)

## 1. HTTP Security Headers (vercel.json)
- X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy, HSTS, X-XSS-Protection, CSP with allowlist for supabase, roboflow, openrouter, deepseek, maps

## 2. XSS Protection
- Removed dangerouslySetInnerHTML in AmritaCampusMap.tsx
- sanitizeHtml(), sanitizeInput(), containsSuspiciousContent() in src/lib/security.ts
- ReportPage sanitizes title/description, blocks suspicious

## 3. Input Validation
- validateImageFile(), validateImageDataUrl(), isValidEmail(), isValidCoordinates()
- API validates base64 image, model id regex to prevent SSRF, max body size

## 4. Rate Limiting
- Client: 5 reports per 10 min
- API: chat 30/min, roboflow 20/min, report-authority 10 per 5 min, debug 30/min

## 5. Authz
- AdminPanel, AdminBackfill, Debug require isAdminEmail()
- Supabase RLS policies, is_admin() function

## 6. File Upload Security
- Image type/size checks, bucket Public with RLS

## 7. API Security
- Security headers, origin allowlist CIVICEYE_ORIGIN, body limits, allowlist for authorityId, server-side email resolution

## 8. Audit Logging
- logAudit() ring buffer 500

## 9. Secure Random IDs
- crypto.getRandomValues

## 10. Chatbot Security
- CORS allowlist, rate limiting, message length max 8000, history limits, DEBUG_ACCESS_KEY via x-debug-key, no API key in client, FreeTierError handling

## 11. Env Vars
- .env.example no real keys, server-only keys never in VITE_

## 12. Bundle size
- Removed unused floorplan PNGs and comic scenes, public 7.5M, zip 21M
