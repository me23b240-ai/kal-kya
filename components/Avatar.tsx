export default function Avatar({ name, tint, tick = false, size = 40 }: { name: string; tint: string; tick?: boolean; size?: number }) {
  return (
    <span className="avatar" style={{ background: tint, width: size, height: size, fontSize: size * 0.45 }} aria-hidden="true">
      {name.charAt(0).toUpperCase()}
      {tick && <span className="avatar-tick">✓</span>}
    </span>
  );
}
