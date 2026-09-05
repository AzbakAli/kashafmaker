# KashafMake

Transport management and Kashaf (كشف الركاب) PDF generation for a Saudi transport operator. Records are entered once and reused across drivers, vehicles, rides, and generated manifests.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite (switch `DATABASE_URL` to PostgreSQL for production)
- NextAuth credentials (Admin / Manager / Operator)
- pdf-lib overlays on uploaded Kashaf PDF templates

## Setup

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo logins (password `admin123`):

- `admin@kashafmake.com` — full access
- `manager@kashafmake.com` — operations + templates
- `operator@kashafmake.com` — rides, passengers, Kashaf generation

## Workflow

1. Save company profile (used automatically on Kashaf PDFs).
2. Create a driver and a vehicle, then assign the vehicle to the driver.
3. Upload a Kashaf PDF template and map fields in the visual editor.
4. Create a ride, select the driver (vehicle fills in), add passengers, save.
5. Generate Kashaf — the PDF is stored with a snapshot so later profile edits do not change history.

Generated files live under `uploads/` and are never written back to the original template.
