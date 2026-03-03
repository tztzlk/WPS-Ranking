import assert from 'assert';
import { parseRow } from './personLookup';

const sampleRow = ['2017AMAN04', '1', 'Maksat Aman', 'Kazakhstan', 'm'];

const parsed = parseRow(sampleRow);

assert(parsed, 'parseRow should not return null for a valid row');

if (parsed) {
  assert.strictEqual(parsed.wcaId, '2017AMAN04');
  assert.strictEqual(parsed.subId, '1');
  assert.strictEqual(parsed.name, 'Maksat Aman');
  assert.strictEqual(parsed.countryId, 'Kazakhstan');
}

