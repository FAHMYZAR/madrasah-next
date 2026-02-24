import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

const sections = [
  {
    title: "Auth",
    items: [
      "POST /api/auth/register (siswa, NIM + password)",
      "POST /api/auth/login (admin/guru: email+password; siswa: NIM, password opsional)",
      "POST /api/auth/logout",
    ],
  },
  {
    title: "Modules & Learning",
    items: [
      "GET,POST /api/admin/modules",
      "GET,PATCH,DELETE /api/admin/modules/:id",
      "GET,POST /api/modules/:id/phases",
      "GET,PATCH,DELETE /api/phases/:id",
      "GET,POST /api/phases/:id/materials",
      "PATCH,DELETE /api/materials/:id",
      "POST /api/modules/:id/enroll",
      "GET /api/user/my-courses",
      "GET /api/guru/my-modules",
    ],
  },
  {
    title: "Quizzes",
    items: [
      "GET,POST /api/admin/quizzes",
      "GET,PATCH,DELETE /api/admin/quizzes/:id",
      "GET,POST /api/admin/quizzes/:id/questions",
      "GET,PATCH,DELETE /api/admin/questions/:id",
      "GET,POST /api/admin/questions/:id/options",
      "PATCH,DELETE /api/admin/options/:id",
      "POST /api/admin/attempts/grade",
      "GET /api/admin/attempts/pending",
      "POST /api/quizzes/:id/start",
      "POST /api/quizzes/:id/submit",
      "GET /api/quizzes/:id/attempts",
      "GET /api/user/attempts",
      "GET /api/user/attempts/:id",
    ],
  },
  {
    title: "Admin Only",
    items: [
      "GET,POST /api/admin/users (NIM wajib)",
      "PATCH,DELETE /api/admin/users/:id",
      "GET /api/admin/enrollments",
      "GET,PATCH /api/admin/profile",
      "PUT /api/admin/profile/password",
      "GET /admin/docapi",
    ],
  },
  {
    title: "User Mobile API",
    items: [
      "GET /api/modules",
      "GET /api/modules/:id",
      "GET /api/modules/:id/phases",
      "GET /api/phases/:id/materials",
      "POST /api/modules/:id/enroll",
      "GET /api/user/my-courses",
      "GET /api/quizzes",
      "GET /api/quizzes/:id",
      "POST /api/quizzes/:id/start",
      "POST /api/quizzes/:id/submit",
      "GET /api/quizzes/:id/attempts",
      "GET /api/user",
      "PATCH /api/user",
      "PUT /api/user/password",
      "GET /api/user/attempts",
      "GET /api/user/attempts/:id",
    ],
  },
];

export default async function DocApiPage() {
  const auth = await getAuth();
  if (!auth || auth.role !== "admin") redirect("/admin");

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h1 className="text-xl font-semibold text-gray-900">API Documentation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Dokumentasi endpoint internal untuk Admin/Guru/User (Mobile). Response standar: {`{ success, data }`}.
        </p>
        <div className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md p-3 font-mono">
          Quiz create: {`{"title":"Quiz Fiqh","module_id":"...","status":"active","duration_minutes":30,"pass_score":70,"started_at":"2026-02-24T08:00:00Z","ended_at":"2026-02-24T10:00:00Z"}`}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Student Mobile Flow</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>Login pakai NIM (password opsional).</li>
          <li>GET /api/modules → pilih modul.</li>
          <li>Jika enrollmentType = enroll_key → POST /api/modules/:id/enroll dengan enrollKey; jika open → bisa langsung; manual → perlu admin/guru.</li>
          <li>GET /api/modules/:id/phases + GET /api/phases/:id/materials untuk materi.</li>
          <li>Quiz: GET /api/quizzes?moduleId=... → GET /api/quizzes/:id → POST /api/quizzes/:id/start → POST /api/quizzes/:id/submit → review via GET /api/user/attempts/:id.</li>
        </ol>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Guru Mobile Flow</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>Login pakai email+password (role guru).</li>
          <li>GET /api/guru/my-modules → daftar modul assigned.</li>
          <li>Kelola quiz & soal via endpoint admin (dibatasi module assigned).</li>
          <li>Lihat enrollments modulnya via /api/admin/enrollments?moduleId=... (dibatasi assignedTeacher).</li>
        </ol>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Security & RBAC</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
          <li>Admin: full akses semua API admin.</li>
          <li>Guru: dibatasi module assigned (Module.assignedTeacherId) untuk phases/materials/quizzes/enrollments.</li>
          <li>User: hanya API mobile; tidak ada akses admin dashboard.</li>
          <li>Soal/answer_key tidak dikirim ke siswa (hanya opsi tanpa is_correct).</li>
        </ul>
      </div>

      {sections.map((s) => (
        <div key={s.title} className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3">{s.title}</h2>
          <ul className="space-y-2">
            {s.items.map((i) => (
              <li key={i} className="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2 font-mono">{i}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
