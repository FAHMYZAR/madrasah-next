"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarItemProps {
  href: string;
  icon: string;
  label: string;
  badge?: number | string;
}

export function SidebarItem({ href, icon, label, badge }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`
        group flex items-center justify-between px-3 py-2.5 rounded-lg
        transition-colors duration-200
        ${isActive 
          ? "bg-emerald-50 text-emerald-700" 
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }
      `}
    >
      <div className="flex items-center gap-3">
        <i className={`fas fa-${icon} text-lg ${isActive ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-600"}`}></i>
        <span className="text-sm font-medium">{label}</span>
      </div>
      {badge !== undefined && (
        <span className={`
          px-2 py-0.5 text-xs font-semibold rounded-full
          ${isActive ? "bg-emerald-200 text-emerald-800" : "bg-gray-100 text-gray-600"}
        `}>
          {badge}
        </span>
      )}
    </Link>
  );
}
