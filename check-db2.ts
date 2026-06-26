import { getDb } from './db/index';
import { users, accounts, incomes } from './db/schema';

async function main() {
  try {
    const db = getDb();
    const allUsers = await db.select().from(users);
    const allAccounts = await db.select().from(accounts);
    const allIncomes = await db.select().from(incomes);
    console.log("Users count:", allUsers.length);
    console.log("Accounts count:", allAccounts.length);
    console.log("Incomes count:", allIncomes.length);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
main();
