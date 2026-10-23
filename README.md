# Joel Academy

A lean SvelteKit + MySQL LMS using @nahu/admin-kit, Better Auth and Superforms.

## Local setup

1. `npm install --install-links` (keep the sibling `admin-kit` checkout available).
2. Copy `.env.example` to `.env`. Set a dedicated MySQL database, a random auth secret, and the app origin.
3. `npm run db:migrate` to apply committed migrations. During schema development, use `npm run db:generate` first.
4. `npm run admin:create -- --email you@example.com --name "Your Name"` creates an administrator and prints a generated password once.
5. Optional: `npm run db:seed` loads the original LMS's demo catalog (15 categories, 61 courses with curricula, instructors, testimonials). It only runs on an empty catalog, and everything it adds is ordinary data you can edit or unpublish.
6. In the dashboard, add at least one payment method before selling paid courses.
7. `npm run dev`.

Anyone can register at `/register` as a student. Staff grants live in `staff_role`; login alone never grants dashboard access. Editors manage the catalog; only administrators review payments, certificates, messages and subscribers. Dashboard requests, including form POSTs, are guarded in the server hook.

## Email and Google sign-in

- **Email** is optional. Set `SMTP_HOST`, `SMTP_PORT` (465 = TLS; 587 or a local catcher's port use STARTTLS), `SMTP_USER`, `SMTP_PASSWORD` and `MAIL_FROM`. Without `SMTP_HOST` nothing is delivered, but every email is still written to the log, so in development open **Dashboard → Email log** (admins only), preview the email and follow its link. Staff notifications (payment receipts to review, contact messages) go to `ADMIN_NOTIFY_EMAIL` (comma-separated) or, if unset, to every administrator.
- **What is sent:** a confirmation link after sign-up, a welcome email, password reset links (`/forgot-password`, valid one hour; resetting signs out every other session), enrollment approved / payment rejected / enrolled by staff, certificate issued, and new contact messages to staff. Confirming the email is encouraged, not required: unconfirmed students see a notice with a resend button on My Courses. Resends and reset requests are limited per address (one a minute, five an hour).
- **Google sign-in** appears on the sign-in and register pages only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (or `GOOGLE_ID` and `GOOGLE_SECRET`) are set. In Google Cloud Console create an OAuth client of type "Web application" with the authorised redirect URI `<ORIGIN>/api/auth/callback/google` (for example `https://academy.example.com/api/auth/callback/google`; `ORIGIN` must match the public URL exactly). Google accounts are ordinary students. Someone who already has a password account with the same email gets Google added to that account once their email is confirmed; before that, Google sign-in asks them to sign in with their password and confirm first.

## SMS

- **Provider:** GeezSMS. Set `SMS_KEY` (the GeezSMS token). Without it nothing is sent, but every text is still written to **Dashboard → SMS log** as Skipped, so in development read verification codes there. Optional `SMS_SHORTCODE_ID` sends from a sender id registered with GeezSMS (passed as `shortcode_id`); without it texts come from the account's default sender. Optional `ADMIN_NOTIFY_PHONE` (comma-separated) gets a text for each new receipt to review and each contact message.
- **Only verified numbers get texts.** Students add an Ethiopian mobile (09…, 07…, +251…; stored as 2519…/2517…) at sign-up or on `/account`; it is saved only after they enter the 6-digit code texted to it (valid 5 minutes, 3 tries). One account per number. The number is never used to sign in.
- **What is sent:** the verification code, and, alongside the matching email, enrolled / payment confirmed, payment not approved, certificate issued and password reset link. Texts start with the academy name and stay within GeezSMS's 335 characters.
- **Limits** protect the balance, counted from the SMS log: codes one a minute and five an hour per number (and six code requests an hour per account), other kinds ten an hour per number, twenty texts a day per number, three hundred a day in total. A refused text is logged as Skipped with "Rate limited".
- **Checking the key:** Dashboard → SMS log → *Send a test SMS* sends one real text to the number you enter (limited to a few per number per hour). A failure shows GeezSMS's own message, e.g. "API Not found" for a wrong token.

## Languages (English and Amharic)

- **Addresses:** English is at `/`, Amharic under `/am` (`/am/courses`, `/am/my-courses`, …), via [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs). `ROUTES` in `src/lib/site.ts` returns paths in the current page's language, so links and redirects stay in it; `localizePath()` in `src/lib/i18n.ts` does the same for any other path. The dashboard, APIs and files have no `/am` twin (`src/hooks.ts` refuses `/am/dashboard`, so the dashboard's access rules cannot be bypassed).
- **Text:** every visible string lives in `messages/en.json` and `messages/am.json` (the same keys in both), used as `m.key()` from `$lib/paraglide/messages`. `src/lib/paraglide/` is generated (vite compiles it on dev and build; `npm run check` compiles it too) and not committed. Never call `m.*()` at module level: the language is per request.
- **Database content** (course titles, descriptions, instructors, testimonials) is shown as entered. The home page CMS has a document per language: **Dashboard → Landing page** has an English / አማርኛ switch at the top; the Amharic copy starts from a translation of the defaults.
- **Emails, texts and notifications** go out in the language the recipient last used the site in (`user.locale`, kept up to date as they browse); staff emails stay English. Legal pages keep their English text, with a note on the Amharic site that the English version governs.
- **Search engines:** each page lists its other-language twin (`hreflang`), and the sitemap lists both.

## Analytics

**Dashboard → Analytics** (administrators): visitors, page views, the funnel from course page to approved payment, course interest, referring sites, `utm_source` campaigns, countries (from Cloudflare), devices, browsers and the Amharic/English split. The site counts this itself (`src/lib/components/analytics-beacon.svelte` → `src/routes/api/v` → table `page_view`): no cookies and no third-party script. A visitor is a salted hash of address, browser and day, so people count once a day and are not followed across days; staff, the dashboard, bots and audit tools are left out, and rows older than 400 days are dropped. Tag links you share, e.g. `https://ethioaischool.com/am?utm_source=telegram`, to see campaigns.

## Images and performance

Shipped pictures under `static/images` have WebP copies at 480/640/800 px (`bash scripts/optimize-images.sh` after adding one), offered through `srcset` by `responsiveSrcset()` in `src/lib/media.ts`. Public pages load only their own stylesheet; the dashboard adds `src/routes/dashboard/dashboard.css`.

## Commands

`npm run check`, `npm test`, `npm run build`, `npm start`.

## cPanel

Build using a compatible Node version (Node 22.12+ recommended). Upload the build, package files, and installed production dependencies, or install on the server with the sibling admin-kit package available. Use the Node application's startup file `build/index.js`, set DATABASE_URL, BETTER_AUTH_SECRET and ORIGIN, and use the port supplied by the host. Set `BODY_SIZE_LIMIT=11M` too: adapter-node refuses request bodies over 512K by default, which would block payment receipts and course images (the app accepts up to 10 MB). Uploads are stored in `.tempFiles` (or `FILES_DIR`); keep that directory across deploys and back it up. Apply migrations once before starting. No PostgreSQL or Redis service is required. Never commit `.env` or deploy an example secret.

## What the app does

- **Public site** (`src/routes/(public)`), a faithful port of the Next.js LMS design: home, course catalog with filters, course detail, categories, instructors, about, pricing, contact, FAQ, help center, legal pages, certificate verification. Everything is read from the database through `src/lib/server/public-catalog.ts` (a 30-second process cache, dropped after any dashboard write).
- **Students** (`src/routes/(auth)`, `src/routes/(public)/(student)`): register and sign in; enroll in free courses instantly; pay for a course by bank transfer with a receipt upload at `/checkout/<course>`; learn at `/my-courses/<course>` (YouTube lessons, text lessons, resources, progress); a certificate is issued automatically when every mandatory lesson is complete, viewable at `/my-certificates` and verifiable by anyone at `/certificates/verify`.
- **Dashboard** (`src/routes/dashboard`): courses with pricing, thumbnails and a curriculum editor (sections, lessons, resources); categories; instructors; testimonials; payment methods; enrollment review (approve or reject receipts, enroll a student manually); certificates (issue, revoke, restore); contact messages; newsletter subscribers with export.
- Thumbnails and instructor photos are public at `/media/<file>`; receipts are readable by staff only.

## Installable app (PWA)

The site installs as an app on phones and desktops (manifest: `static/manifest.webmanifest`, icons in `static/icons`, worker: `src/service-worker.ts`).

- **Install:** Chrome, Edge and Android show an install button in the header and the phone menu; on iPhone/iPad the same button explains Share → Add to Home Screen.
- **Offline:** the app shell, fonts and images are cached; public pages (catalog, course details, about, FAQ…) keep their last copy for offline reading. Anything behind sign-in, auth, checkout, payments, the dashboard and certificate checks always goes to the network, and pages rendered for a signed-in person are sent `Cache-Control: private` so they are never stored. Offline navigation to anything else shows `/offline`.
- **Updates:** a new deploy is offered as "A new version is available — Reload"; installed apps check hourly.
- **Native feel:** a bottom tab bar on phones when installed, short page transitions (skipped for reduced motion), the theme colour follows light/dark, safe-area padding for notched screens.
- Production must be served over **HTTPS** for installation and the service worker (localhost is exempt).



A lesson's video link can be YouTube, Vimeo, Bunny Stream or a direct https `.mp4`/`.webm` file. In every case "Complete & Next" unlocks only once the video has been watched (95%, or to the end), and skipping ahead past what has played is sent back. This is a nudge in the browser, not proof of watching.

- **YouTube** plays in the academy's own controls: YouTube's controls, shortcuts and fullscreen are off, and the academy's cover hides YouTube's title, share and suggestion overlays whenever the video is not playing. This hides the link from casual viewers only: the video id is still in the page, and an unlisted video plays for anyone with its link.
- **Vimeo** (paid plans): set the video's embed privacy to this domain only, so it will not play anywhere else. Unlisted links (`vimeo.com/<id>/<hash>`) work too.
- **Bunny Stream**: turn on "Token authentication" for the library and set `BUNNY_STREAM_TOKEN_KEY`; the app then signs each link for six hours, so a copied link stops working.



- Course reviews and ratings: none, so the site shows no ratings rather than invented ones.
- Online payment gateways and promo codes: payments are manual receipt review.
- QR codes on certificates (the verification link is printed instead).
# joel_academy
