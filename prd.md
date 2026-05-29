# PRD — Presence Workforce Attendance Management System

# 1. Overview

Presence adalah Workforce Attendance Management System berbasis web yang menggunakan Face Recognition sebagai metode verifikasi kehadiran utama.

Tujuan utama project ini bukan hanya mencatat absensi, tetapi membangun sistem workforce management modern yang dapat digunakan organisasi atau perusahaan untuk:

* mengelola employee/member
* mengatur jadwal shift kerja
* memonitor keterlambatan
* melakukan attendance berbasis biometrik
* menghasilkan laporan kerja otomatis
* memantau kehadiran secara realtime

Sistem dirancang agar terasa seperti SaaS HR modern, bukan sekadar demo kamera AI.

Masalah utama yang ingin diselesaikan:

* absensi manual mudah dimanipulasi
* sulit memonitor keterlambatan
* tidak ada validasi identitas real
* tidak ada rekap otomatis
* tidak ada monitoring realtime
* attendance system terasa kuno dan tidak scalable

Presence akan menggunakan:

* Face Recognition
* Liveness Detection
* Shift Scheduling
* Realtime Monitoring
* PDF Reporting
* Server-side Vector Matching

# 2. Requirements

## Platform

* Web-based application
* Responsive desktop-first
* Mobile-friendly attendance mode

## User Roles

### Admin / HRD

Memiliki akses penuh untuk:

* mengelola member
* mengelola shift
* mengatur jadwal kerja
* melihat dashboard
* mengunduh laporan
* memonitor attendance realtime

### Member / Employee

Tidak wajib memiliki akun login pada MVP.
Member cukup didaftarkan oleh admin melalui proses face enrollment.

## Attendance Method

Attendance dilakukan menggunakan:

* kamera device
* face recognition
* liveness detection

## Security Requirements

* Attendance wajib melewati liveness detection
* Matching wajah dilakukan server-side menggunakan pgvector
* Descriptor tidak boleh di-fetch seluruhnya ke browser

## Performance Requirements

* Face inference tidak boleh membuat UI freeze
* TensorFlow inference dipindahkan ke Web Worker

# 3. Core Features

## 3.1 Authentication & Admin Access

* Login admin menggunakan Supabase Auth
* Protected dashboard routes
* Session persistence

---

## 3.2 Public Attendance Kiosk

Halaman attendance publik tanpa login:

* akses kamera
* scan wajah
* liveness challenge
* auto attendance
* success/error feedback

Attendance page harus terasa seperti kiosk professional.

---

## 3.3 Member Management

Admin dapat:

* tambah member
* edit member
* deactivate member
* enroll wajah member
* melihat attendance history member

Kolom member:

* employee code
* full name
* department
* position
* status

---

## 3.4 Face Enrollment

Saat add member:

* kamera aktif
* descriptor wajah dibuat
* descriptor disimpan ke database
* preview wajah ditampilkan

Enrollment harus:

* cepat
* stabil
* mudah dipahami user

---

## 3.5 Shift Management

Admin dapat membuat:

* Shift Pagi
* Shift Sore
* Shift Malam
* Custom Shift

Setiap shift memiliki:

* start time
* end time
* tolerance minutes
* very late threshold

---

## 3.6 Shift Assignment

Shift dapat berubah per hari.

Contoh:

* Senin → Shift Pagi
* Selasa → Shift Sore

Sistem menggunakan tabel assignment per tanggal.

---

## 3.7 Attendance Classification

Saat check-in:

* sistem mendeteksi shift hari ini
* menghitung keterlambatan
* menentukan status attendance

Status:

* On Time
* Late
* Very Late
* No Shift
* Liveness Failed

---

## 3.8 Liveness Detection

Sebelum attendance diterima:

* user wajib melewati challenge liveness berbasis face landmarks

Tujuan:

* mencegah spoofing menggunakan foto

Catatan implementasi MVP final:

* Rencana awal menggunakan blink 2x berbasis Eye Aspect Ratio (EAR).
* Implementasi final MVP menggunakan head-movement liveness karena lebih stabil di webcam nyata:
  1. wajah stabil sekitar 2 detik
  2. kepala bergerak sedikit ke kiri **atau** kanan
  3. kembali ke tengah
  4. verified

---

## 3.9 Server-side Face Matching (pgvector)

Matching wajah dilakukan menggunakan:

* Supabase pgvector extension
* vector similarity search

Flow:

1. Browser generate descriptor
2. Descriptor dikirim ke server
3. Server query vector similarity
4. Return best match

Bukan fetch seluruh descriptor ke browser.

---

## 3.10 Realtime Dashboard

Dashboard realtime menggunakan Supabase Realtime.

Admin dapat melihat:

* attendance terbaru
* siapa terlambat
* siapa belum hadir
* attendance hari ini
* punctuality analytics

Tanpa refresh halaman.

---

## 3.11 PDF Report Generator

Generate laporan bulanan:

* attendance summary
* keterlambatan
* total jam kerja
* ranking keterlambatan
* grafik attendance

Format:

* PDF downloadable
* professional layout

---

## 3.12 Analytics Dashboard

Dashboard menampilkan:

* total employee
* attendance hari ini
* punctuality rate
* total late employees
* attendance chart
* shift statistics

Menggunakan:

* Recharts

# 4. User Flow

## 4.1 Admin Setup

1. Admin login
2. Admin membuat shift
3. Admin menambahkan member
4. Admin melakukan face enrollment
5. Admin assign shift member

---

## 4.2 Attendance Flow

1. User membuka halaman attendance
2. Kamera aktif
3. Sistem mendeteksi wajah
4. Sistem menjalankan challenge liveness head movement
5. Descriptor dikirim ke server
6. Server melakukan vector matching
7. Attendance disimpan
8. Dashboard update realtime

---

## 4.3 Reporting Flow

1. Admin membuka dashboard report
2. Pilih bulan
3. Sistem generate attendance summary
4. Admin download PDF

# 5. Architecture

## Frontend

* Next.js App Router
* TypeScript
* TailwindCSS
* shadcn-ui
* face-api.js
* TensorFlow.js
* Recharts

## Backend

* Supabase
* PostgreSQL
* pgvector
* Supabase Realtime
* Supabase Auth

## Processing Layer

* Web Worker untuk face processing
* Server-side vector matching
* Realtime subscriptions

## Data Flow

### Enrollment

Camera → face-api.js → descriptor → Supabase vector storage

### Attendance

Camera → liveness → descriptor → Supabase RPC → match → attendance log

### Dashboard

Supabase Realtime → dashboard updates

# 6. Database Schema

## organizations

* id
* name
* created_at

---

## admin_users

* id
* user_id
* organization_id
* role

---

## members

* id
* organization_id
* employee_code
* full_name
* department
* position
* status
* created_at

---

## member_face_descriptors

* id
* member_id
* descriptor vector(128)
* created_at
* updated_at

---

## shifts

* id
* organization_id
* name
* start_time
* end_time
* tolerance_minutes
* very_late_after_minutes
* color
* is_active

---

## shift_assignments

* id
* organization_id
* member_id
* shift_id
* work_date
* created_at

---

## attendance_logs

* id
* organization_id
* member_id
* shift_id
* check_in_at
* check_out_at
* status
* late_minutes
* worked_minutes
* face_distance
* liveness_passed
* created_at

# 7. Design & Technical Constraints

## UI/UX Direction

UI harus:

* modern
* elegant
* premium
* enterprise-feel
* non-generic
* tidak terlihat seperti AI template

Inspirasi:

* Linear
* Vercel
* Notion
* modern HR SaaS dashboard

---

## Accessibility

Wajib:

* semantic HTML
* keyboard accessible
* good contrast
* proper labels
* loading states
* empty states

---

## Technical Rules

* Strict TypeScript
* Reusable components
* Server-side sensitive logic
* No exposed service role key
* Proper error handling
* Responsive layout
* Modular architecture

---

## Performance Rules

* Face inference optimized
* Avoid UI blocking
* Use Web Worker
* Cache model assets efficiently

---

## Security Rules

* Liveness verification mandatory
* No client-side full descriptor fetch
* Protected dashboard routes
* Proper Supabase RLS recommended

# 8. MVP Development Phases

## Phase 1

* Audit existing project
* Refactor architecture
* Dashboard shell
* Member management cleanup

## Phase 2

* Shift management
* Attendance classification
* Better attendance UX

## Phase 3

* Liveness detection

## Phase 4

* pgvector migration

## Phase 5

* Realtime dashboard

## Phase 6

* PDF reporting

## Phase 7

* Web Worker optimization

# 9. Success Criteria

Project dianggap berhasil jika:

* attendance stabil dan cepat
* UI terasa professional
* realtime dashboard berjalan
* attendance tidak bisa spoofing foto
* system scalable untuk banyak member
* dashboard tidak terlihat seperti project mahasiswa biasa
* architecture clean dan maintainable
