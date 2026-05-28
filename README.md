# Presence

Presence is a smart attendance system that runs face detection and recognition directly in the browser. Admins can enroll members through a webcam capture flow, while the public attendance scanner continuously detects faces, matches them against registered descriptors, and records daily check-ins automatically.

The recognition pipeline uses `face-api.js` on top of TensorFlow.js, so no Python service or cloud ML API is required.

## Features

- Browser-based face detection and recognition
- Webcam member enrollment with face descriptor capture
- Public attendance scanner with live canvas overlays
- One check-in per member per day
- Admin authentication with Supabase Auth
- Member management, attendance logs, and dashboard metrics
- Supabase database, storage, and row-level security
- Dark dashboard UI inspired by Linear and Vercel

## Tech Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- face-api.js / TensorFlow.js
- Supabase Auth, Database, and Storage
- Recharts
- Sonner
- Lucide React
- Geist fonts

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.local.example .env.local
```

Fill in your Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/attendance
```

## Supabase Setup

Create a Supabase project, then run the SQL in:

```text
supabase/schema.sql
```

The schema creates:

- `departments`
- `members`
- `attendance_logs`
- Storage bucket `member-photos`
- Row-level security policies

## Face Recognition Models

The app expects model files in:

```text
public/models/
```

Required files:

- `ssd_mobilenetv1_model-weights_manifest.json`
- `ssd_mobilenetv1_model.bin`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model.bin`
- `face_recognition_model-weights_manifest.json`
- `face_recognition_model.bin`

These files are loaded with:

```ts
loadFromUri('/models')
```

## Main Routes

- `/attendance` - public face scanner
- `/login` - admin login
- `/register` - admin account registration
- `/dashboard` - admin overview
- `/members` - member directory
- `/members/new` - member enrollment
- `/logs` - attendance history

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```