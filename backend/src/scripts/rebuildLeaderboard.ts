import { prisma } from "../lib/prisma";

async function rebuildLeaderboard() {
  console.log("Rebuilding leaderboard snapshot...");

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE leaderboard_entries
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO leaderboard_entries
    (
      person_id,
      name,
      country_iso2,
      country_name,
      wps,
      global_rank,
      country_rank,
      generated_at
    )
    SELECT
      p.id,
      p.name,
      p.country_iso2,
      p.country_name,
      s.score,
      RANK() OVER (ORDER BY s.score DESC),
      RANK() OVER (
        PARTITION BY p.country_iso2
        ORDER BY s.score DESC
      ),
      NOW()
    FROM persons p
    JOIN wps_scores s ON s.person_id = p.id
    WHERE s.score IS NOT NULL
  `);

  console.log("Leaderboard snapshot created.");
}

rebuildLeaderboard()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });