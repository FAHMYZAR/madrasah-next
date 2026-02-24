# Migration Audit - madrasah2 (Laravel) -> madrasah-reactnextbun (Next.js + Mongo)

## Ringkasan Fitur Laravel yang Harus Dimigrasi 1:1

## 1) Web Admin
- Login admin (`/login`)
- Dashboard admin (`/admin`)
- CRUD Modules (`/admin/modules`)
- CRUD Users (`/admin/users`)
- Profile admin + ganti password (`/admin/profile`)
- CRUD Quizzes (`/admin/quizzes`)

## 2) API
- Auth: `register`, `login`, `logout`
- User: get profile, update profile
- Modules: list, detail, create, update, delete
- Quiz: list, create, detail, delete
- Question: create per quiz
- Option: create per question
- Attempt: submit score + history user

## 3) Data Model Laravel
- users: name, email, password, role, profile_url
- modules: name, image_url, description, pdf_url
- quizzes: title, description, created_by
- questions: quiz_id, question, type, time_limit
- options: question_id, option_text, is_correct
- user_quiz_attempts: user_id, quiz_id, score

## Catatan Kritis dari Source Lama
- Ada inkonsistensi field `question` vs `question_text` di controller lama.
- API quiz di Laravel belum full proteksi role admin pada beberapa endpoint.
- Path file upload masih bercampur style lama (`storage/public/...`).

## Strategi Migrasi
1. Stabilkan kontrak API (request/response schema) agar backward-compatible.
2. Migrasi data model ke Mongo (Mongoose) dengan relasi objectId.
3. Bangun route handler Next API dengan middleware auth + role.
4. Porting UI admin blade -> React components (layout/sidebar/table/form) 1:1 style.
5. Buat skrip migrasi data SQL -> JSON -> Mongo.
6. Tambahkan test smoke untuk endpoint inti.
