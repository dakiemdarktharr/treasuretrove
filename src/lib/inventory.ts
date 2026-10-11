import { z } from 'zod';

export const GROUPS = [
  { name: 'Power & regulation', hint: 'Supply, convert, protect', symbol: 'power' },
  { name: 'Sensing & measurement', hint: 'Sense the physical world', symbol: 'sense' },
  { name: 'Control & processing', hint: 'Compute and control', symbol: 'chip' },
  { name: 'Signals & timing', hint: 'Filter, amplify, oscillate', symbol: 'signal' },
  { name: 'Switching & drive', hint: 'Switch loads and motion', symbol: 'switch' },
  { name: 'Light & display', hint: 'Indicate and illuminate', symbol: 'light' },
  { name: 'Connectivity', hint: 'Connect and communicate', symbol: 'connect' },
  { name: 'Unsorted', hint: 'Ready to organize', symbol: 'box' },
] as const;
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

// Deterministic, editable suggestions: purpose takes precedence over part type.
export function suggestGroup(usage: string, type = '', partId = ''): GroupName {
  const rules: [GroupName, RegExp][] = [
    [
      'Power & regulation',
      /power|voltage regulat|buck|boost|battery|charger|rectif|supply|fuse|lm78|lm317|ams1117|ldo/,
    ],
    [
      'Sensing & measurement',
      /sensor|sens(?:e|ing)|measur|temperature|humidity|pressure|acceleromet|gyroscop|photoresist|ldr|dht|bme280|thermistor/,
    ],
    [
      'Control & processing',
      /microcontroller|processor|comput|arduino|esp32|esp8266|atmega|stm32|logic|shift register/,
    ],
    ['Switching & drive', /switch|relay|motor|mosfet|transistor|solenoid|driver|actuat|2n2222|irf/],
    ['Light & display', /\bled\b|display|lcd|oled|illuminat|indicator|ws2812/],
    [
      'Connectivity',
      /connect|communicat|wireless|bluetooth|wifi|wi-fi|radio|socket|header|cable|usb|ethernet|antenna|uart|i2c/,
    ],
    [
      'Signals & timing',
      /signal|filter|amplif|oscillat|timing|timer|resistor|capacitor|inductor|crystal|ne555|op.?amp|lm358/,
    ],
  ];
  for (const text of [usage, `${type} ${partId}`]) {
    const match = rules.find(([, pattern]) => pattern.test(text.toLowerCase()));
    if (match) return match[0];
  }
  return 'Unsorted';
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
