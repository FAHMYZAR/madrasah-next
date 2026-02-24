"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const menu = [
  { section: "Main", items: [
    { href: "/admin", label: "Dashboard", icon: "fas fa-home" },
    { href: "/admin/users", label: "Users", icon: "fas fa-users" },
    { href: "/admin/modules", label: "Modules", icon: "fas fa-book" },
    { href: "/admin/enrollments", label: "Enrollments", icon: "fas fa-id-badge" },
  ]},
  { section: "Learning", items: [
    { href: "/admin/quizzes", label: "Quizzes", icon: "fas fa-question-circle" },
    { href: "/admin/grading", label: "Grading", icon: "fas fa-clipboard-check" },
  ]},
  { section: "Docs", items: [
    { href: "/admin/docapi", label: "DocAPI", icon: "fas fa-file-alt" },
  ]},
];

export default function AdminLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-4 space-y-4">
          <div className="px-2 text-lg font-semibold text-emerald-700">Admin Dashboard</div>
          {menu.map((group) => (
            <div key={group.section} className="space-y-1">
              <div className="text-xs uppercase text-gray-400 px-2 mt-2">{group.section}</div>
              {group.items.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-50 ${active ? "bg-emerald-50 text-emerald-700" : "text-gray-700"}`}>
                    <i className={`${item.icon} w-4`} />
                    {item.label}
                  </Link>
                );
              })}
              <div className="border-b border-gray-100" />
            </div>
          ))}
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
