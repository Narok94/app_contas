import { db } from '../db/index';
import { users, groups } from '../db/schema';
import { MOCK_USERS, MOCK_GROUPS } from '../utils/mockData';

async function seed() {
  console.log('Seeding initial user and group...');
  
  // Clear first just in case
  await db.delete(users);
  await db.delete(groups);

  await db.insert(users).values(MOCK_USERS);
  await db.insert(groups).values(MOCK_GROUPS);
  
  console.log('Done!');
  process.exit(0);
}

seed().catch(console.error);
