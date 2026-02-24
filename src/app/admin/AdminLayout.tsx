"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";

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
    { href: "/admin/recap", label: "Recap", icon: "fas fa-chart-line" },
  ]},
  { section: "Docs", items: [
    { href: "/admin/docapi", label: "DocAPI", icon: "fas fa-file-alt" },
  ]},
];

const sheetMenu = [
  { href: "/admin/modules", label: "Modules", icon: "fas fa-book" },
  { href: "/admin/enrollments", label: "Enrollments", icon: "fas fa-id-badge" },
  { href: "/admin/quizzes", label: "Quizzes", icon: "fas fa-question-circle" },
  { href: "/admin/grading", label: "Grading", icon: "fas fa-clipboard-check" },
  { href: "/admin/recap", label: "Recap", icon: "fas fa-chart-line" },
  { href: "/admin/docapi", label: "DocAPI", icon: "fas fa-file-alt" },
  { href: "/admin/profile", label: "Profile", icon: "fas fa-user" },
];

export default function AdminLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [showSheet, setShowSheet] = useState(false);
  const isActive = (href: string) => {
    if (href === "#more") return false;
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="hidden md:block w-64 bg-white border-r border-gray-200 min-h-screen p-4 space-y-4">
        <div className="px-2 text-lg font-semibold text-emerald-700">Admin Dashboard</div>
        {menu.map((group) => (
          <div key={group.section} className="space-y-1">
            <div className="text-xs uppercase text-gray-400 px-2 mt-2">{group.section}</div>
            {group.items.map((item) => {
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-emerald-50 ${active ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-gray-700 font-normal"}`}>
                  <i className={`${item.icon} w-4 ${active ? "font-semibold" : "font-normal"}`} />
                  {item.label}
                </Link>
              );
            })}
            <div className="border-b border-gray-100" />
          </div>
        ))}
      </aside>

      <main className="flex-1 p-6 pb-24 md:pb-6">{children}</main>

      {/* Bottom nav mobile with center FAB */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40">
        <div className="relative h-20 max-w-full mx-auto">
          <svg className="absolute inset-x-0 bottom-0 w-full h-20 text-white" viewBox="0 0 100 25" preserveAspectRatio="none" aria-hidden>
            <path d="M0 5 C5 0 15 0 20 0 H80 C85 0 95 0 100 5 V25 H0 Z" fill="currentColor" />
            <path d="M0 5 C5 0 15 0 20 0 H37 C44 0 47 12 50 12 C53 12 56 0 63 0 H80 C85 0 95 0 100 5 V25 H0 Z" fill="white" />
          </svg>
          <div className="absolute inset-0 flex items-end justify-between px-8 pb-3">
            <button
              onClick={() => { window.location.href = "/admin/users"; }}
              className={`flex flex-col items-center text-xs ${isActive("/admin/users") ? "text-emerald-700" : "text-gray-600"}`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${isActive("/admin/users") ? "bg-emerald-50" : ""}`}><i className="fas fa-users text-base"></i></span>
              <span className="mt-1">Users</span>
            </button>

            <button
              onClick={() => { window.location.href = "/admin"; }}
              className={`relative -mt-8 flex h-16 w-16 items-center justify-center rounded-full shadow-xl bg-white border border-emerald-200 ${isActive("/admin") ? "text-emerald-700" : "text-gray-700"}`}
            >
              <i className="fas fa-home text-xl"></i>
            </button>

            <button
              onClick={() => setShowSheet(true)}
              className={`flex flex-col items-center text-xs ${showSheet ? "text-emerald-700" : "text-gray-600"}`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${showSheet ? "bg-emerald-50" : ""}`}><i className="fas fa-ellipsis-h text-base"></i></span>
              <span className="mt-1">Lainnya</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sheet */}
      {showSheet && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSheet(false)}></div>
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 max-h-[70vh] overflow-y-auto animate-[slideUp_0.2s_ease]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900">Menu Lainnya</p>
              <button onClick={() => setShowSheet(false)} className="text-gray-500"><i className="fas fa-times" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {sheetMenu.map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-emerald-300" onClick={() => setShowSheet(false)}>
                  <i className={`${item.icon} text-emerald-600`}></i>
                  <span className="text-sm text-gray-800">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
