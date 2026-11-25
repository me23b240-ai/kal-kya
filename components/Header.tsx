import Link from "next/link";
import Avatar from "./Avatar";
import type { MemberView } from "@/lib/meal/types";

export default function Header({
  household, members, viewerId, modeToggle,
}: { household?: string; members?: MemberView[]; viewerId?: string; modeToggle?: React.ReactNode }) {
  return (
    <header className="head">
      <div className="head-top">
        <div className="brand-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kalkyalogo.png" alt="" aria-hidden="true" width={600} height={408} className="brand-icon" />
          <div>
            <h1 className="brand">Kal Kya?</h1>
            {household && <p className="household">{household}</p>}
          </div>
        </div>
        {modeToggle}
      </div>
      {members && (
        <nav className="chips" aria-label="View as">
          {members.map((m) => (
            <Link key={m.id} href={`/?as=${m.id}`} className="chip" aria-current={m.id === viewerId ? "true" : undefined}>
              <Avatar name={m.name} tint={m.tint} avatarUrl={m.avatarUrl} size={32} />
              <span>{m.name}</span>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
