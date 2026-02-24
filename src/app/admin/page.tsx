import { connectDb } from "@/lib/db";
import { Module } from "@/lib/models/Module";
import { User } from "@/lib/models/User";
import { Quiz } from "@/lib/models/Quiz";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await connectDb();
  const [totalModules, totalUsers, totalQuizzes, recentModules] = await Promise.all([
    Module.countDocuments(),
    User.countDocuments(),
    Quiz.countDocuments(),
    Module.find().sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard
          title="Total Modules"
          value={totalModules}
          icon="book"
          href="/admin/modules"
          color="emerald"
        />
        <StatCard
          title="Total Users"
          value={totalUsers}
          icon="users"
          href="/admin/users"
          color="blue"
        />
        <StatCard
          title="Total Quizzes"
          value={totalQuizzes}
          icon="question-circle"
          href="/admin/quizzes"
          color="purple"
        />
      </div>

      {/* Recent Activity */}
      <DashboardCard
        title="Recent Modules"
        description="Latest modules added to the system"
      >
        {recentModules.length > 0 ? (
          <div className="space-y-3">
            {recentModules.map((m: any) => (
              <div
                key={String(m._id)}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-book text-emerald-600"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                    <p className="text-xs text-gray-500">
                      {m.createdAt
                        ? new Date(m.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/modules"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex-shrink-0"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="inbox"
            title="No modules yet"
            description="Create your first module to get started"
            action={
              <Link
                href="/admin/modules"
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <i className="fas fa-plus mr-2"></i>
                Create Module
              </Link>
            }
          />
        )}
      </DashboardCard>
    </div>
  );
}
