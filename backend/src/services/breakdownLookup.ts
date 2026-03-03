import fs from 'fs';
import path from 'path';
import { getCacheDir } from '../utils/cachePath';
import type { ProfileBreakdownEntry } from './indexStore';

class LRUCache<K, V> {
  private map = new Map<K, V>();
  constructor(private maxSize: number) {}

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    this.map.delete(key);
    if (this.map.size >= this.maxSize) {
      const first = this.map.keys().next().value;
      if (first !== undefined) this.map.delete(first);
    }
    this.map.set(key, value);
  }
}

const cache = new LRUCache<string, ProfileBreakdownEntry | null>(500);

function getBreakdownPath(): string {
  return path.join(getCacheDir(), 'wps.breakdown.json');
}

/**
 * Stream-scan wps.breakdown.json for a single personId's breakdown entry.
 * Reads 64 KB chunks, searches for `"personId":`, extracts the JSON value
 * by brace-matching, then stops. Never loads the full 97 MB into memory.
 */
export async function lookupBreakdown(personId: string): Promise<ProfileBreakdownEntry | null> {
  const cached = cache.get(personId);
  if (cached !== undefined) return cached;

  const filePath = getBreakdownPath();
  if (!fs.existsSync(filePath)) return null;

  const needle = `"${personId}":`;

  return new Promise((resolve) => {
    const stream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 64 * 1024 });
    let tail = '';
    let collecting = false;
    let valueParts: string[] = [];
    let depth = 0;
    let done = false;

    function finish(result: ProfileBreakdownEntry | null) {
      if (done) return;
      done = true;
      stream.destroy();
      cache.set(personId, result);
      resolve(result);
    }

    stream.on('data', (chunk: string) => {
      if (done) return;

      if (collecting) {
        for (let i = 0; i < chunk.length; i++) {
          if (chunk[i] === '{') depth++;
          else if (chunk[i] === '}') depth--;
          if (depth === 0) {
            valueParts.push(chunk.slice(0, i + 1));
            try { finish(JSON.parse(valueParts.join(''))); }
            catch { finish(null); }
            return;
          }
        }
        valueParts.push(chunk);
        return;
      }

      const text = tail + chunk;
      const idx = text.indexOf(needle);
      if (idx === -1) {
        tail = text.length > needle.length ? text.slice(-(needle.length - 1)) : text;
        return;
      }

      collecting = true;
      depth = 0;
      const rest = text.slice(idx + needle.length);
      for (let i = 0; i < rest.length; i++) {
        if (rest[i] === '{') depth++;
        else if (rest[i] === '}') depth--;
        if (depth === 0) {
          try { finish(JSON.parse(rest.slice(0, i + 1))); }
          catch { finish(null); }
          return;
        }
      }
      valueParts.push(rest);
    });

    stream.on('end', () => finish(null));
    stream.on('error', () => finish(null));
  });
}
