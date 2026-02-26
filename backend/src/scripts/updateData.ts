import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";

function sha256File(p: string) {
  const buf = fs.readFileSync(p);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

const CACHE_DIR = path.join(process.cwd(), "cache");
const ZIP_PATH = path.join(CACHE_DIR, "wca_export.zip");
const HASH_PATH = path.join(CACHE_DIR, "export.sha256");

fs.mkdirSync(CACHE_DIR, { recursive: true });

// 1) скачать ZIP (замени на свой url/скрипт)
execSync(`tsx src/scripts/downloadExport.ts "${ZIP_PATH}"`, { stdio: "inherit" });      

// 2) сравнить hash
const newHash = sha256File(ZIP_PATH);
const oldHash = fs.existsSync(HASH_PATH) ? fs.readFileSync(HASH_PATH, "utf8").trim() : "";

if (newHash === oldHash) {
  console.log("WCA export unchanged. Skip recompute.");
  process.exit(0);
}

fs.writeFileSync(HASH_PATH, newHash);

// 3) распаковать нужные tsv (замени на свой unzip/скрипт)
execSync(`tsx src/scripts/extractTsv.ts "${ZIP_PATH}"`, { stdio: "inherit" });

// 4) пересчитать кэши
execSync(`tsx src/scripts/buildCaches.ts`, { stdio: "inherit" });

console.log("Updated export and recomputed caches.");