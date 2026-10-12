import { z } from 'zod';
import { CATEGORIES } from './categories';
export { FAMILIES } from './categories';
export const GROUPS = CATEGORIES;
export type GroupName = (typeof GROUPS)[number]['name'];
export type Part = {
  id: string;
  partId: string;
  name: string;
  type: string;
  usage: string;
  group: GroupName;
  location: string;
  notes: string;
  quantity: number;
  photoVersion: string;
  updatedAt: string;
};
export const normalizeId = (id: string) =>
  id
    .trim()
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
const optionalText = (max: number) => z.string().trim().max(max).default('');
export const partSchema = z.object({
  partId: z
    .string()
    .trim()
    .min(1, 'Enter a part ID.')
    .max(100, 'Keep the ID under 100 characters.')
    .refine((v) => /[\p{L}\p{N}]/u.test(v), 'Use a letter or number in the ID.'),
  quantity: z
    .number()
    .int('Use a whole number.')
    .min(0, 'Quantity cannot be negative.')
    .max(1_000_000, 'Maximum quantity is 1,000,000.'),
  name: optionalText(150),
  type: optionalText(100),
  usage: optionalText(500),
  location: optionalText(100),
  notes: optionalText(2000),
  group: z.enum(GROUPS.map((g) => g.name) as [GroupName, ...GroupName[]]).optional(),
});
// Specific devices precede overlapping generic words. Part identity wins over intended use.
const priority = [
  'buck-boost',
  'drivers',
  'servos',
  'light-sensors',
  'current-sensors',
  'protection',
  'headers',
  'mosfets',
  'references',
  'optocouplers',
  'imu',
  'pressure',
  'temperature',
  'development-boards',
];
const ordered = [...GROUPS]
  .sort((a, b) => {
    const rank = (slug: string) => (priority.includes(slug) ? priority.indexOf(slug) : 100);
    return rank(a.slug) - rank(b.slug);
  })
  .map((g) => ({ name: g.name, pattern: new RegExp(g.pattern, 'i') }));
export function suggestGroup(usage: string, type = '', partId = ''): GroupName {
  for (const text of [type, partId, usage]) {
    const match = ordered.find((g) => g.pattern.test(text));
    if (match) return match.name;
  }
  return 'Uncategorized';
}
// Read older inventories without rewriting photos, stock, or the original usage notes.
export function resolveGroup(group: string, usage = '', type = '', partId = ''): GroupName {
  return GROUPS.some((g) => g.name === group)
    ? (group as GroupName)
    : suggestGroup(usage, type, partId);
}
export function searchParts(parts: Part[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return parts;
  const compact = normalizeId(q);
  const words = q.split(/\s+/);
  return parts
    .filter(
      (p) =>
        (compact && normalizeId(p.partId).includes(compact)) ||
        words.every((w) =>
          `${p.partId} ${p.name} ${p.type} ${p.usage} ${p.group} ${p.location}`
            .toLowerCase()
            .includes(w),
        ),
    )
    .sort(
      (a, b) =>
        Number(normalizeId(b.partId) === compact) - Number(normalizeId(a.partId) === compact) ||
        a.partId.localeCompare(b.partId),
    );
}
