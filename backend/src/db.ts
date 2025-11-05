import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export async function getDb() {
  return prisma;
}

export async function disconnectDb() {
  await prisma.$disconnect();
}



// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectDb();
});

export default prisma;

