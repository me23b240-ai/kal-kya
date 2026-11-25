type Props = { name: string; tint: string; tick?: boolean; size?: number; avatarUrl?: string | null };

export default function Avatar({ name, tint, tick = false, size = 40, avatarUrl }: Props) {
  return (
    <span className="avatar" style={{ background: avatarUrl ? "transparent" : tint, width: size, height: size, fontSize: size * 0.45 }}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} width={size} height={size} />
      ) : (
        <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
      )}
      {tick && <span className="avatar-tick">{"\u2713"}</span>}
    </span>
  );
}
