import path from 'path';
import dotenv from 'dotenv';
import { generateTop100Leaderboard } from '../services/leaderboardTop100';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main(): Promise<void> {
  let ranksLineCount = 0;
  try {
    await generateTop100Leaderboard({
      onRanksLineProgress: (count) => {
        ranksLineCount = count;
        if (count % 500000 === 0) {
          console.log(`  RanksAverage: processed ${count.toLocaleString()} lines`);
        }
      },
    });
    if (ranksLineCount > 0 && ranksLineCount % 500000 !== 0) {
      console.log(`  RanksAverage: processed ${ranksLineCount.toLocaleString()} lines`);
    }
    console.log('Leaderboard cache written successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to generate leaderboard:', err);
    process.exit(1);
  }
}

main();
