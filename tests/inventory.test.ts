import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeId,
  partSchema,
  searchParts,
  suggestGroup,
  resolveGroup,
  type Part,
} from '../src/lib/inventory';
const part = (overrides: Partial<Part>): Part => ({
  id: '1',
  partId: 'ESP32-WROOM-32',
  name: 'Development board',
  type: 'Microcontroller',
  usage: 'Wireless sensor control',
  group: 'Microcontrollers',
  location: 'A3',
  notes: '',
  quantity: 4,
  photoVersion: '1',
  updatedAt: '',
  ...overrides,
});
test('IDs match case and common separators without merging distinct suffixes', () => {
  assert.equal(normalizeId(' Esp32_WROOM 32 '), 'esp32wroom32');
  assert.notEqual(normalizeId('LM7805'), normalizeId('LM7812'));
});
test('search supports ID fragments, descriptive words, purpose and location; exact IDs rank first', () => {
  const parts = [part({ id: '2', partId: 'ESP32-WROOM-32D' }), part({})];
  assert.equal(searchParts(parts, 'esp32 wroom32')[0].id, '1');
  assert.equal(searchParts(parts, 'wireless control').length, 2);
  assert.equal(searchParts(parts, 'A3').length, 2);
  assert.equal(searchParts(parts, 'NE555').length, 0);
});
test('component identity takes priority over usage and overlapping broad names', () => {
  assert.equal(suggestGroup('Switch a motor', 'Microcontroller'), 'Microcontrollers');
  assert.equal(suggestGroup('Power supply filtering', 'Capacitor'), 'Capacitors');
  assert.equal(suggestGroup('Limit LED current', 'Resistor'), 'Resistors');
  assert.equal(suggestGroup('', '', 'AMS1117'), 'Linear regulators');
  assert.equal(suggestGroup('', '', 'MPU-6050'), 'IMUs');
  assert.equal(suggestGroup('', 'Buck-boost converter'), 'Buck-boost converters');
  assert.equal(suggestGroup('', 'MOSFET transistor'), 'MOSFETs & JFETs');
  assert.equal(suggestGroup('', 'Motor driver'), 'Motor drivers');
  assert.equal(suggestGroup('', 'Photodiode'), 'Light sensors');
  assert.equal(suggestGroup('Unknown custom module'), 'Uncategorized');
});
test('legacy purpose groups resolve without overwriting explicitly selected specific groups', () => {
  assert.equal(resolveGroup('Power & regulation', '', '', 'LM2596'), 'Voltage step-down');
  assert.equal(resolveGroup('Sensing & measurement', '', '', 'BME280'), 'Pressure sensors');
  assert.equal(resolveGroup('Unsorted', '', '', 'custom'), 'Uncategorized');
  assert.equal(resolveGroup('Transistors', 'motor control', '', 'IRF520'), 'Transistors');
});
test('inventory rejects fractional, negative, invalid, huge quantities and missing IDs', () => {
  for (const quantity of [-1, 1.5, NaN, Infinity, 1000001, '3'])
    assert.equal(partSchema.safeParse({ partId: 'NE555', quantity }).success, false);
  assert.equal(partSchema.safeParse({ partId: 'NE555', quantity: 0 }).success, true);
  assert.equal(partSchema.safeParse({ partId: ' ', quantity: 1 }).success, false);
  assert.equal(partSchema.safeParse({ partId: '---', quantity: 1 }).success, false);
});
