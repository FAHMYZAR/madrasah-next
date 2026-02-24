# Roadmap Eksekusi

## Phase 0 - Foundation (Done)
- Bootstrap Next.js app router + TypeScript + Tailwind
- Install core libs: mongoose, zod, jose, bcryptjs

## Phase 1 - Core Backend
- Setup DB connector Mongo
- Implement models: User, Module, Quiz, Question, Option, UserQuizAttempt
- Implement auth helpers (JWT cookie) + guard role admin

## Phase 2 - API Parity
- Auth API: register/login/logout
- User API: profile + update
- Module API: public list/detail + admin CRUD
- Quiz API: CRUD quiz, create question/option, submit attempt/history

## Phase 3 - Admin UI 1:1
- Login page admin
- Dashboard
- Modules, Users, Quizzes, Profile
- Validasi form + feedback + pagination

## Phase 4 - Data Migration
- Export MySQL lama -> JSON
- Import JSON -> Mongo collections
- Verify counts + sample data integrity

## Phase 5 - Hardening
- RBAC, rate-limit login, sanitize upload
- Tests endpoint penting
- Deploy config (Next + Mongo)

## Deliverable Target
- Alur & UI setara Laravel lama
- API contract stabil
- Lebih maintainable dan scalable
