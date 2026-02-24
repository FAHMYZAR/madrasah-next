import Link from "next/link";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  href?: string;
  trend?: {
    value: number;
    label: string;
    positive: boolean;
  };
  color?: "emerald" | "blue" | "purple" | "amber";
}

export function StatCard({ title, value, icon, href, trend, color = "emerald" }: StatCardProps) {
  const colorMap = {
    emerald: { bg: "bg-emerald-100", text: "text-emerald-600", hover: "hover:bg-emerald-50" },
    blue: { bg: "bg-blue-100", text: "text-blue-600", hover: "hover:bg-blue-50" },
    purple: { bg: "bg-purple-100", text: "text-purple-600", hover: "hover:bg-purple-50" },
    amber: { bg: "bg-amber-100", text: "text-amber-600", hover: "hover:bg-amber-50" },
  };

  const colors = colorMap[color];

  const content = (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 transition-all duration-200 hover:shadow-md ${href ? "cursor-pointer " + colors.hover : ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className={`mt-2 flex items-center text-sm ${trend.positive ? "text-emerald-600" : "text-red-600"}`}>
              <i className={`fas ${trend.positive ? "fa-arrow-up" : "fa-arrow-down"} mr-1`}></i>
              <span className="font-medium">{trend.value}%</span>
              <span className="text-gray-500 ml-1">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colors.bg}`}>
          <i className={`fas fa-${icon} ${colors.text} text-xl`}></i>
        </div>
      </div>
      {href && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <span className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
            View details →
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
