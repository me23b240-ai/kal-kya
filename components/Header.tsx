import Link from "next/link";
import Avatar from "./Avatar";
import type { MemberView } from "@/lib/meal/types";

export default function Header({ household, members, viewerId }: { household?: string; members?: MemberView[]; viewerId?: string }) {
  return (
    <header className="head">
      <div className="head-top">
        <h1 className="brand">Kal Kya</h1>
        {household && <p className="household">{household}</p>}
      </div>
      {members && (
        <nav className="chips" aria-label="View as">
          {members.map((m) => (
            <Link key={m.id} href={`/?as=${m.id}`} className="chip" aria-current={m.id === viewerId ? "true" : undefined}>
              <Avatar name={m.name} tint={m.tint} size={32} />
              <span>{m.name}</span>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
