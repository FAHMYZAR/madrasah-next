import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="w-full max-w-full min-w-0 bg-white rounded-xl border border-gray-200 p-4 sm:p-5 overflow-x-hidden">
      <h2 className="text-lg font-semibold text-gray-900 break-words">{title}</h2>
      <div className="mt-4 min-w-0 space-y-4 text-sm text-gray-700 break-words [overflow-wrap:anywhere] [&_code]:break-all [&_li]:break-words max-md:[&_.font-mono]:break-all max-md:[&_.font-mono]:[overflow-wrap:anywhere]">{children}</div>
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="w-full max-w-full bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto text-[11px] sm:text-xs leading-5 text-gray-800 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
      <code>{children}</code>
    </pre>
  );
}

export default async function DocApiPage() {
  const auth = await getAuth();
  if (!auth || auth.role !== "admin") redirect("/admin");

  return (
    <div className="w-full max-w-[calc(100vw-1rem)] sm:max-w-6xl mx-auto space-y-5 overflow-x-hidden px-2 sm:px-0 pb-24 md:pb-6">
      <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 break-words">DocAPI — Production Handoff</h1>
        <p className="text-sm text-gray-500 mt-1">Dokumentasi API berdasarkan implementasi backend.</p>
      </section>

      <Card title="1) SYSTEM OVERVIEW">
        <ul className="list-disc pl-5 space-y-1">
          <li>Arsitektur: Next.js App Router (API routes), MongoDB + Mongoose, JWT cookie session.</li>
          <li>Role: ADMIN (dashboard + admin API), GURU (API mengajar), USER (API belajar/attempt).</li>
          <li><span className="font-semibold">AUTH REQUIREMENT</span></li>
          <li>Semua endpoint berikut memerlukan session authenticated (HTTP-only cookie): <span className="font-mono">/api/modules*</span>, <span className="font-mono">/api/quizzes*</span>, <span className="font-mono">/api/user*</span>, <span className="font-mono">/api/guru*</span>, <span className="font-mono">/api/admin/*</span>.</li>
          <li>Kecuali: <span className="font-mono">POST /api/auth/register</span> dan <span className="font-mono">POST /api/auth/login</span>.</li>
          <li>Jika request tanpa session valid, server mengembalikan <span className="font-mono">401 Unauthorized</span>.</li>
          <li>Response contract global: <span className="font-mono">{`{ success: boolean, data?: any, message?: string }`}</span></li>
          <li>Error code umum: 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Validation failed.</li>
        </ul>
      </Card>

      <Card title="2) AUTH MECHANISM">
        <ul className="list-disc pl-5 space-y-1">
          <li>Autentikasi menggunakan HTTP-only cookie berbasis JWT.</li>
          <li>Session dikirim otomatis via cookie, bukan Authorization Bearer header manual.</li>
          <li>Untuk mobile/web client: gunakan request dengan <span className="font-mono">credentials: "include"</span>.</li>
          <li>Pastikan cookie tidak diblokir kebijakan CORS / browser policy pada environment integrasi.</li>
          <li>Server membaca session dari cookie.</li>
        </ul>
        <Code>{`fetch("/api/modules", {
  method: "GET",
  credentials: "include"
});`}</Code>
      </Card>

      <Card title="3) ROLE MATRIX">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-3 py-2 border-b">Role</th>
                <th className="text-left px-3 py-2 border-b">Dashboard Access</th>
                <th className="text-left px-3 py-2 border-b">API Access</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 border-b">ADMIN</td>
                <td className="px-3 py-2 border-b">/admin/*</td>
                <td className="px-3 py-2 border-b">/api/admin/* + authenticated domain APIs</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border-b">GURU</td>
                <td className="px-3 py-2 border-b">Tidak</td>
                <td className="px-3 py-2 border-b">/api/guru/my-modules + domain mengajar sesuai assignedTeacherId</td>
              </tr>
              <tr>
                <td className="px-3 py-2">USER</td>
                <td className="px-3 py-2">Tidak</td>
                <td className="px-3 py-2">Learning APIs + quiz attempt (USER only)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="md:hidden space-y-3">
          {[
            ["ADMIN", "/admin/*", "/api/admin/* + authenticated domain APIs"],
            ["GURU", "Tidak", "/api/guru/my-modules + domain mengajar sesuai assignedTeacherId"],
            ["USER", "Tidak", "Learning APIs + quiz attempt (USER only)"],
          ].map(([role, dashboard, api]) => (
            <div key={String(role)} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="font-semibold text-gray-900">{role}</p>
              <p><span className="text-gray-500">Dashboard:</span> {dashboard}</p>
              <p><span className="text-gray-500">API:</span> {api}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="4) AUTH ENDPOINTS">
        <Sub title="POST /api/auth/register">
          <p className="text-xs text-gray-500">Role: Public</p>
          <Code>{`{
  "name": "Budi",
  "nim": "123456",
  "password": "rahasia123",
  "className": "6A"
}`}</Code>
          <Code>{`{
  "success": true,
  "data": {
    "user": { "id": "...", "nim": "123456", "name": "Budi", "role": "user" }
  }
}`}</Code>
        </Sub>
        <Sub title="POST /api/auth/login">
          <p className="text-xs text-gray-500">Role: Public</p>
          <Code>{`{ "email": "admin@school.id", "password": "******" }`}</Code>
          <Code>{`{
  "success": true,
  "data": {
    "user": { "id": "...", "nim": "...", "name": "...", "email": "...", "role": "admin", "className": "", "isActive": true }
  }
}`}</Code>
        </Sub>
        <Sub title="POST /api/auth/logout">
          <p className="text-xs text-gray-500">Role: Authenticated</p>
          <Code>{`{ "success": true, "data": { "message": "Logged out successfully" } }`}</Code>
        </Sub>
      </Card>

      <Card title="5) LEARNING DOMAIN">
        <ul className="list-disc pl-5 space-y-1">
          <li>Modules: <span className="font-mono">GET /api/modules</span>, <span className="font-mono">GET /api/modules/:id</span></li>
          <li>Phases: <span className="font-mono">GET/POST /api/modules/:id/phases</span>, <span className="font-mono">GET/PATCH/DELETE /api/phases/:id</span></li>
          <li>Materials: <span className="font-mono">GET/POST /api/phases/:id/materials</span>, <span className="font-mono">PATCH/DELETE /api/materials/:id</span></li>
          <li>Visibility rule: USER hanya modul active + visibility/enrollment valid.</li>
          <li>Enrollment rule: <span className="font-mono">POST /api/modules/:id/enroll</span> USER-only, sesuai enrollmentType/enrollKey.</li>
        </ul>
      </Card>

      <Card title="6) QUIZ LIFECYCLE">
        <ol className="list-decimal pl-5 space-y-1">
          <li>Fetch quiz metadata: <span className="font-mono">GET /api/quizzes/:id</span></li>
          <li>Fetch questions: <span className="font-mono">GET /api/quizzes/:id/questions</span></li>
          <li>Start quiz: <span className="font-mono">POST /api/quizzes/:id/start</span> (USER only)</li>
          <li>Submit quiz: <span className="font-mono">POST /api/quizzes/:id/submit</span> (USER only)</li>
          <li>Fetch attempt result: <span className="font-mono">GET /api/user/attempts</span> / <span className="font-mono">GET /api/user/attempts/:id</span></li>
        </ol>
        <Code>{`{
  "attemptId": "...",
  "answers": [
    { "questionId": "...", "selectedOptionId": "..." },
    { "questionId": "...", "answerText": "..." }
  ]
}`}</Code>
        <p className="text-xs text-gray-500">Security note: endpoint user tidak mengekspos correct answer saat fetch quiz/questions.</p>
      </Card>

      <Card title="7) ATTEMPT LIFECYCLE">
        <ul className="list-disc pl-5 space-y-1">
          <li>Status: inProgress → submitted → graded</li>
          <li>Essay tanpa answer key: <span className="font-mono">reviewStatus = pending</span></li>
          <li>Manual grading: <span className="font-mono">POST /api/admin/attempts/grade</span></li>
        </ul>
      </Card>

      <Card title="8) MODULE LEVEL RECAP">
        <Sub title="Endpoint">
          <p className="font-mono text-xs">GET /api/admin/modules/:id/recap</p>
        </Sub>
        <Sub title="Global Recap Endpoint (Dashboard Rekap)">
          <p className="font-mono text-xs">GET /api/admin/recap?page=1&limit=15&search=&moduleId=&quizId=&className=&status=</p>
          <p className="text-xs text-gray-500 mt-1">Dipakai oleh halaman <span className="font-mono">/admin/recap</span> untuk summary global, rekap per modul, trend nilai 30 hari, dan list nilai siswa terfilter.</p>
          <Code>{`{
  "success": true,
  "data": {
    "summary": {
      "totalStudents": 20,
      "totalModules": 3,
      "totalQuizzes": 6,
      "totalAttempts": 47,
      "averageScore": 78.64,
      "passed": 32,
      "failed": 15
    },
    "trend": [
      { "date": "2026-02-24", "attempts": 5, "averageScore": 80.2 }
    ],
    "moduleStats": [
      { "moduleId": "...", "moduleName": "Fiqih Dasar", "quizzesCount": 2, "totalStudents": 18, "totalAttempts": 20, "averageScore": 79.1 }
    ],
    "rows": [
      { "attemptId": "...", "studentName": "Ahmad", "nim": "SIS0001", "moduleName": "Fiqih Dasar", "quizTitle": "Quiz 1", "status": "graded", "score": 88, "passScore": 70, "submittedAt": "..." }
    ],
    "meta": { "page": 1, "limit": 15, "total": 47, "totalPages": 4 }
  }
}`}</Code>
        </Sub>
        <Sub title="Role Access">
          <ul className="list-disc pl-5 space-y-1">
            <li>ADMIN: full access</li>
            <li>GURU: hanya module assignedTeacherId = guruId</li>
            <li>USER: forbidden</li>
          </ul>
        </Sub>
        <Sub title="Response Example">
          <Code>{`{
  "success": true,
  "data": {
    "totalStudents": 20,
    "totalAttempts": 47,
    "averageScore": 78.64,
    "passed": 32,
    "failed": 15,
    "quizzesCount": 5
  }
}`}</Code>
        </Sub>
      </Card>

      <Card title="9) ADMIN MANAGEMENT ENDPOINTS">
        <ul className="list-disc pl-5 space-y-1 font-mono break-all">
          <li>GET,POST /api/admin/users</li>
          <li>PATCH,DELETE /api/admin/users/:id</li>
          <li>GET,POST /api/admin/modules</li>
          <li>GET,PATCH,DELETE /api/admin/modules/:id</li>
          <li>GET /api/admin/modules/:id/recap</li>
          <li>GET /api/admin/recap</li>
          <li>GET,POST /api/admin/quizzes</li>
          <li>GET,PATCH,DELETE /api/admin/quizzes/:id</li>
          <li>GET,POST /api/admin/quizzes/:id/questions</li>
          <li>GET,PATCH,DELETE /api/admin/questions/:id</li>
          <li>GET,POST /api/admin/questions/:id/options</li>
          <li>PATCH,DELETE /api/admin/options/:id</li>
          <li>GET,POST /api/admin/enrollments</li>
          <li>PATCH,DELETE /api/admin/enrollments/:id</li>
          <li>GET /api/admin/attempts/pending</li>
          <li>POST /api/admin/attempts/grade</li>
          <li>GET,PATCH /api/admin/profile</li>
          <li>PUT /api/admin/profile/password</li>
        </ul>
      </Card>

      <Card title="10) SECURITY BASELINE">
        <ul className="list-disc pl-5 space-y-1">
          <li>Ownership utama: <span className="font-mono">Module.assignedTeacherId</span></li>
          <li>RBAC: /api/admin/* (admin), /api/guru/my-modules (guru), attempt quiz (user only).</li>
          <li>Validation: Zod pada endpoint POST/PATCH yang sudah distandarkan.</li>
          <li>Deprecated endpoint: <span className="font-mono">POST /api/user/edit</span></li>
        </ul>
      </Card>

      <Card title="11) LIST RESPONSE FORMAT">
        <p>Endpoint list menggunakan format berlapis berikut (desain sengaja, bukan typo):</p>
        <Code>{`{
  "success": true,
  "data": {
    "data": [],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "totalPages": 1
    }
  }
}`}</Code>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="font-mono">data.data</span> = array hasil</li>
          <li><span className="font-mono">data.meta</span> = metadata pagination</li>
        </ul>
      </Card>

      <Card title="12) RESPONSE EXAMPLES">
        <Sub title="GET /api/modules">
          <Code>{`{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "moduleId",
        "name": "Matematika Dasar",
        "code": "MTK-001",
        "description": "...",
        "assignedTeacherId": "teacherId",
        "visibility": "public",
        "isActive": true,
        "startDate": null,
        "endDate": null,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
  }
}`}</Code>
        </Sub>

        <Sub title="GET /api/modules/:id">
          <Code>{`{
  "success": true,
  "data": {
    "_id": "moduleId",
    "name": "Matematika Dasar",
    "description": "...",
    "visibility": "public",
    "isActive": true,
    "assignedTeacherId": "teacherId",
    "startDate": null,
    "endDate": null
  }
}`}</Code>
        </Sub>

        <Sub title="GET /api/modules/:id/phases">
          <Code>{`{
  "success": true,
  "data": [
    {
      "_id": "phaseId",
      "moduleId": "moduleId",
      "title": "Pertemuan 1",
      "description": "...",
      "order": 0,
      "isPublished": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}`}</Code>
        </Sub>

        <Sub title="GET /api/phases/:id/materials">
          <Code>{`{
  "success": true,
  "data": [
    {
      "_id": "materialId",
      "phaseId": "phaseId",
      "type": "pdf",
      "title": "Ringkasan",
      "url": "/uploads/materials/file.pdf",
      "description": "...",
      "order": 0,
      "isVisible": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}`}</Code>
        </Sub>

        <Sub title="GET /api/quizzes">
          <Code>{`{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "quizId",
        "title": "Kuis Pecahan",
        "description": "...",
        "moduleId": "moduleId",
        "durationMinutes": 30,
        "passScore": 70,
        "status": "active",
        "questionsCount": 10
      }
    ],
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
  }
}`}</Code>
        </Sub>

        <Sub title="GET /api/quizzes/:id">
          <p className="text-xs text-gray-500">Catatan: endpoint ini mengembalikan metadata + questions. Untuk fetching terpisah gunakan GET /api/quizzes/:id/questions.</p>
          <Code>{`{
  "success": true,
  "data": {
    "_id": "quizId",
    "title": "Kuis Pecahan",
    "description": "...",
    "moduleId": "moduleId",
    "durationMinutes": 30,
    "passScore": 70,
    "status": "active",
    "startedAt": null,
    "endedAt": null,
    "questions": [
      {
        "_id": "questionId",
        "questionText": "Jelaskan pecahan 1/2",
        "questionType": "essay",
        "points": 10,
        "options": []
      }
    ]
  }
}`}</Code>
        </Sub>

        <Sub title="GET /api/quizzes/:id/questions">
          <Code>{`{
  "success": true,
  "data": [
    {
      "_id": "questionId",
      "questionText": "2+2 = ?",
      "options": [
        { "_id": "opt1", "optionText": "4" }
      ]
    }
  ]
}`}</Code>
        </Sub>

        <Sub title="GET /api/user/attempts">
          <Code>{`{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "attemptId",
        "quizId": "quizId",
        "userId": "userId",
        "status": "submitted",
        "totalScore": 80,
        "startedAt": "...",
        "submittedAt": "...",
        "quizTitle": "Kuis Pecahan"
      }
    ],
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
  }
}`}</Code>
        </Sub>

        <Sub title="GET /api/user/attempts/:id">
          <Code>{`{
  "success": true,
  "data": {
    "attempt": {
      "_id": "attemptId",
      "quizId": "quizId",
      "userId": "userId",
      "status": "graded",
      "totalScore": 90,
      "startedAt": "...",
      "submittedAt": "..."
    },
    "answers": [
      {
        "questionId": "questionId",
        "questionText": "2+2 = ?",
        "points": 10,
        "selectedOptionId": "opt1",
        "isCorrect": true,
        "options": [
          { "_id": "opt1", "optionText": "4", "isCorrect": true }
        ]
      }
    ]
  }
}`}</Code>
        </Sub>
      </Card>

      <Card title="13) DATA OBJECT CONTRACT">
        <p className="text-xs text-gray-500">Backend saat ini mengirim field <span className="font-mono">_id</span> (Mongo ObjectId). Client mobile boleh memetakan <span className="font-mono">_id</span> menjadi <span className="font-mono">id</span> di layer frontend jika diperlukan.</p>
        <Code>{`Module {
  _id: string
  name: string
  description: string
  visibility: "public" | "private"
  isActive: boolean
  assignedTeacherId: string | null
  startDate: string | null
  endDate: string | null
}

Phase {
  _id: string
  moduleId: string
  title: string
  description: string
  order: number
  isPublished: boolean
}

Material {
  _id: string
  phaseId: string
  type: "pdf" | "video" | "link"
  title: string
  url: string
  order: number
  isVisible: boolean
}

Quiz {
  _id: string
  moduleId: string
  title: string
  description: string
  durationMinutes: number
  passScore: number
  status: "draft" | "published" | "active" | "archived"
  startedAt: string | null
  endedAt: string | null
}

Question {
  _id: string
  quizId: string
  questionType: string
  questionText: string
  points: number
  options?: Array<{ _id: string; optionText: string }>
}

Attempt {
  _id: string
  quizId: string
  userId: string
  status: "inProgress" | "submitted" | "graded"
  totalScore: number | null
  startedAt: string
  submittedAt: string | null
}`}</Code>
      </Card>

      <Card title="14) ERROR RESPONSE EXAMPLES">
        <Sub title="401 Unauthorized"><Code>{`{ "success": false, "message": "Unauthorized" }`}</Code></Sub>
        <Sub title="403 Forbidden"><Code>{`{ "success": false, "message": "Forbidden" }`}</Code></Sub>
        <Sub title="404 Not Found"><Code>{`{ "success": false, "message": "Module not found" }`}</Code></Sub>
        <Sub title="422 Validation failed"><Code>{`{ "success": false, "message": "Validation failed" }`}</Code></Sub>
      </Card>

      <Card title="15) PAGINATION & FILTERING">
        <ul className="list-disc pl-5 space-y-1">
          <li>Pagination tersedia: <span className="font-mono">page</span>, <span className="font-mono">limit</span>.</li>
          <li><span className="font-mono">GET /api/modules</span>: page, limit.</li>
          <li><span className="font-mono">GET /api/quizzes</span>: page, limit, module_id, search.</li>
          <li><span className="font-mono">GET /api/user/attempts</span>: page, limit.</li>
          <li><span className="font-mono">GET /api/admin/recap</span>: page, limit, search, moduleId, quizId, className, status.</li>
          <li>Endpoint list lain (mis. phases/materials tertentu) belum memakai pagination explicit.</li>
          <li>Mobile guideline: gunakan pagination yang tersedia dan hindari overfetch.</li>
        </ul>
      </Card>

    </div>
  );
}
