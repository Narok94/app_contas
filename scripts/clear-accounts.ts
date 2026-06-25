import { db } from '../db/index';
import { accounts } from '../db/schema';

async function clearAccounts() {
  console.log('Clearing accounts...');
  await db.delete(accounts);
  console.log('All accounts have been cleared.');
  process.exit(0);
}

clearAccounts().catch(console.error);
