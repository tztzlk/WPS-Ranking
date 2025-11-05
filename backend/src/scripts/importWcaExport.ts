import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import dotenv from 'dotenv';
import { getDb, disconnectDb } from '../db';

// Load .env from the backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Debug: Check if DATABASE_URL is loaded
console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL);
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in environment variables');
  console.error('Looking for .env at:', path.resolve(__dirname, '../../.env'));
  console.error('Current directory:', process.cwd());
  process.exit(1);
}

type TSVRow = string[];

function parseTSVLine(line: string): TSVRow {
  // Simple TSV split; export files do not quote tabs
  return line.split('\t');
}

async function importTable(tsvFile: string, tableName: string) {
  const prisma = await getDb();
  const fileStream = createReadStream(tsvFile);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isHeader = true;
  let processed = 0;
  let batch: any[] = [];
  const BATCH_SIZE = 1000; // Process in batches
  
  async function processBatch() {
    if (batch.length === 0) return;
    
    try {
      switch (tableName) {
        case 'Persons':
          await prisma.persons.createMany({
            data: batch,
            skipDuplicates: true
          });
          break;
          
        case 'Countries':
          await prisma.countries.createMany({
            data: batch,
            skipDuplicates: true
          });
          break;
          
        case 'Continents':
          await prisma.countries.createMany({
            data: batch,
            skipDuplicates: true
          });
          break;
          
        case 'Events':
          await prisma.events.createMany({
            data: batch,
            skipDuplicates: true
          });
          break;
          
        case 'RanksSingle':
          // Check if persons exist first
          const personIds = [...new Set(batch.map(b => b.personId))];
          const existingPersons = await prisma.persons.findMany({
            where: { id: { in: personIds } },
            select: { id: true }
          });
          const existingPersonIds = new Set(existingPersons.map(p => p.id));
          
          const validBatch = batch.filter(b => existingPersonIds.has(b.personId));
          
          if (validBatch.length > 0) {
            await prisma.ranksSingle.createMany({
              data: validBatch,
              skipDuplicates: true
            });
          }
          
          const skipped = batch.length - validBatch.length;
          if (skipped > 0) {
            console.log(`  ⚠ Skipped ${skipped} records (person not found)`);
          }
          break;
          
        case 'RanksAverage':
          const avgPersonIds = [...new Set(batch.map(b => b.personId))];
          const existingAvgPersons = await prisma.persons.findMany({
            where: { id: { in: avgPersonIds } },
            select: { id: true }
          });
          const existingAvgPersonIds = new Set(existingAvgPersons.map(p => p.id));
          
          const validAvgBatch = batch.filter(b => existingAvgPersonIds.has(b.personId));
          
          if (validAvgBatch.length > 0) {
            await prisma.ranksAverage.createMany({
              data: validAvgBatch,
              skipDuplicates: true
            });
          }
          
          const avgSkipped = batch.length - validAvgBatch.length;
          if (avgSkipped > 0) {
            console.log(`  ⚠ Skipped ${avgSkipped} records (person not found)`);
          }
          break;
      }
      
      processed += batch.length;
      console.log(`  📊 Processed ${processed.toLocaleString()} ${tableName} records...`);
      batch = [];
      
    } catch (error) {
      console.error(`❌ Error processing ${tableName} batch:`, error);
      batch = [];
    }
  }
  
  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    
    if (!line.trim()) continue;
    
    const cols = parseTSVLine(line);
    
    try {
      switch (tableName) {
        case 'Persons':
          // Format: id, subid, name, countryId, gender, competitionCount
          if (cols.length >= 6) {
            batch.push({
              id: parseInt(cols[0]),
              subid: parseInt(cols[1]) || 1,
              name: cols[2] || '',
              countryId: cols[3] || '',
              gender: cols[4] || '',
              competitionCount: parseInt(cols[5]) || 0
            });
          }
          break;
          
        case 'Countries':
          // Format: id, name, continentId, iso2
          if (cols.length >= 3) {
            batch.push({
              id: cols[0],
              name: cols[1] || '',
              continentId: cols[2] || '',
              iso2: cols[3] || null
            });
          }
          break;
          
        case 'Continents':
          // Format: id, name, recordName, latitude, longitude, zoom
          if (cols.length >= 2) {
            batch.push({
              id: cols[0],
              name: cols[1] || '',
              recordName: cols[2] || cols[1] || '',
              latitude: cols[3] ? parseInt(cols[3]) : 0,
              longitude: cols[4] ? parseInt(cols[4]) : 0,
              zoom: cols[5] ? parseInt(cols[5]) : 0
            });
          }
          break;
          
        case 'Events':
          // Format: id, name, rank, format, cellName
          if (cols.length >= 4) {
            batch.push({
              id: cols[0],
              name: cols[1] || '',
              rank: parseInt(cols[2]) || 0,
              format: cols[3] || '',
              cellName: cols[4] || null
            });
          }
          break;
          
       
        case 'RanksAverage':
          // Format: personId, eventId, best, worldRank, continentRank, countryRank
          if (cols.length >= 4) {
            batch.push({
              personId: parseInt(cols[0]),
              eventId: cols[1],
              best: parseInt(cols[2]),
              worldRank: parseInt(cols[3]),
              continentRank: cols[4] ? parseInt(cols[4]) : null,
              countryRank: cols[5] ? parseInt(cols[5]) : null
            });
          }
          break;
      }
      
      // Process batch when it reaches BATCH_SIZE
      if (batch.length >= BATCH_SIZE) {
        await processBatch();
      }
      
    } catch (error) {
      console.error(`⚠ Error parsing ${tableName} record:`, cols, error);
    }
  }
  
  // Process remaining records
  await processBatch();
  
  console.log(`✅ Completed importing ${processed.toLocaleString()} ${tableName} records\n`);
}

async function main() {
  const exportDir = process.argv[2];
  if (!exportDir) {
    console.error('Usage: tsx src/scripts/importWcaExport.ts <export-directory>');
    console.error('Example: tsx src/scripts/importWcaExport.ts ./WCA_export303_20251030T000034Z');
    process.exit(1);
  }

  // Check if directory exists
  if (!fs.existsSync(exportDir)) {
    console.error(`❌ Directory not found: ${exportDir}`);
    process.exit(1);
  }

  const files = [
    { name: 'WCA_export_Continents.tsv', table: 'Continents' },
    { name: 'WCA_export_Countries.tsv', table: 'Countries' },
    { name: 'WCA_export_Events.tsv', table: 'Events' },
    { name: 'WCA_export_Persons.tsv', table: 'Persons' },
    { name: 'WCA_export_RanksAverage.tsv', table: 'RanksAverage' }
  ];

  console.log('🚀 Starting WCA export import...\n');
  const startTime = Date.now();
  
  try {
    for (const { name, table } of files) {
      const filePath = path.join(exportDir, name);
      if (fs.existsSync(filePath)) {
        console.log(`📥 Importing ${table} from ${name}...`);
        await importTable(filePath, table);
      } else {
        console.warn(`⚠ File not found: ${filePath}, skipping ${table}\n`);
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 WCA export import completed successfully in ${duration}s!`);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await disconnectDb();
  }
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});