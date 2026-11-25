"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingCart, Bookmark, Settings } from "lucide-react";

export default function TabBar({ mode, viewerId }: { mode: "family" | "single"; viewerId?: string }) {
  const pathname = usePathname();
  const qs = mode === "single" ? "household=single" : (viewerId ? `as=${viewerId}` : "");
  const withQS = (path: string) => (qs ? `${path}?${qs}` : path);
  const homeHref = mode === "single" ? "/solo" : (viewerId ? `/?as=${viewerId}` : "/");

  const tabs = [
    { key: "home", href: homeHref, label: "Today", Icon: Home },
    { key: "shopping", href: withQS("/shopping"), label: "Shopping", Icon: ShoppingCart },
    { key: "ideas", href: withQS("/ideas"), label: "Ideas", Icon: Bookmark },
    { key: "rules", href: withQS("/rules"), label: mode === "single" ? "Allergies" : "Settings", Icon: Settings },
  ] as const;

  const isActive = (key: string) => {
    if (key === "home") return pathname === "/" || pathname === "/solo";
    return pathname === `/${key}`;
  };

  return (
    <nav className="tabbar" aria-label="Sections">
      {tabs.map(({ key, href, label, Icon }) => (
        <Link key={key} href={href} className="tabbar-item" aria-current={isActive(key) ? "page" : undefined}>
          <Icon size={20} strokeWidth={2} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
