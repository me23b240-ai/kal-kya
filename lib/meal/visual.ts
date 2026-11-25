// Deterministic look for a dish or a person: same name, same colour, every time.
function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}
const KEYWORDS: [string, string][] = [
  ["aloo", "🥔"], ["gobi", "🥦"], ["dal", "🍲"], ["paneer", "🧀"], ["palak", "🥬"],
  ["bhindi", "🥒"], ["pulao", "🍚"], ["rice", "🍚"], ["chawal", "🍚"], ["rajma", "🍛"], ["chole", "🍛"],
];
const FALLBACK = ["🍛", "🥘", "🍲", "🍚"];

export function dishEmoji(name: string): string {
  const n = name.toLowerCase();
  return KEYWORDS.find(([k]) => n.includes(k))?.[1] ?? FALLBACK[hash(n) % FALLBACK.length];
}
export function tintFor(name: string): string {
  return `hsl(${hash(name.toLowerCase()) % 360} 62% 86%)`;
}
