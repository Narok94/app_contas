import express from 'express';
import cors from 'cors';
import { db } from './db';
import { users, groups, accounts, incomes, categories, settings } from './db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';

const app = express();

app.use(cors());
app.use(express.json());

// Users
app.get('/api/users', async (req, res) => {
  const allUsers = await db.select().from(users);
  res.json(allUsers.map(u => ({ ...u, groupIds: u.groupIds || [] })));
});

app.post('/api/users', async (req, res) => {
  const [newUser] = await db.insert(users).values(req.body).returning();
  res.json({ ...newUser, groupIds: newUser.groupIds || [] });
});

app.put('/api/users/:id', async (req, res) => {
  const [updatedUser] = await db.update(users).set(req.body).where(eq(users.id, req.params.id)).returning();
  res.json({ ...updatedUser, groupIds: updatedUser.groupIds || [] });
});

app.delete('/api/users/:id', async (req, res) => {
  await db.delete(users).where(eq(users.id, req.params.id));
  res.json({ success: true });
});

// Groups
app.get('/api/groups', async (req, res) => {
  const allGroups = await db.select().from(groups);
  res.json(allGroups);
});

app.post('/api/groups', async (req, res) => {
  const [newGroup] = await db.insert(groups).values(req.body).returning();
  res.json(newGroup);
});

app.put('/api/groups/:id', async (req, res) => {
  const [updatedGroup] = await db.update(groups).set(req.body).where(eq(groups.id, req.params.id)).returning();
  res.json(updatedGroup);
});

app.delete('/api/groups/:id', async (req, res) => {
  await db.delete(groups).where(eq(groups.id, req.params.id));
  res.json({ success: true });
});

// Accounts
app.get('/api/accounts', async (req, res) => {
  const allAccounts = await db.select().from(accounts);
  res.json(allAccounts.map(a => ({ ...a, value: Number(a.value), totalValue: a.totalValue ? Number(a.totalValue) : undefined })));
});

app.post('/api/accounts', async (req, res) => {
  const [newAccount] = await db.insert(accounts).values({ ...req.body, value: String(req.body.value), totalValue: req.body.totalValue ? String(req.body.totalValue) : null }).returning();
  res.json({ ...newAccount, value: Number(newAccount.value), totalValue: newAccount.totalValue ? Number(newAccount.totalValue) : undefined });
});

app.put('/api/accounts/:id', async (req, res) => {
  const [updatedAccount] = await db.update(accounts).set({ ...req.body, value: String(req.body.value), totalValue: req.body.totalValue ? String(req.body.totalValue) : null }).where(eq(accounts.id, req.params.id)).returning();
  res.json({ ...updatedAccount, value: Number(updatedAccount.value), totalValue: updatedAccount.totalValue ? Number(updatedAccount.totalValue) : undefined });
});

app.delete('/api/accounts/:id', async (req, res) => {
  await db.delete(accounts).where(eq(accounts.id, req.params.id));
  res.json({ success: true });
});

// Incomes
app.get('/api/incomes', async (req, res) => {
  const allIncomes = await db.select().from(incomes);
  res.json(allIncomes.map(i => ({ ...i, value: Number(i.value) })));
});

app.post('/api/incomes', async (req, res) => {
  const [newIncome] = await db.insert(incomes).values({ ...req.body, value: String(req.body.value) }).returning();
  res.json({ ...newIncome, value: Number(newIncome.value) });
});

app.put('/api/incomes/:id', async (req, res) => {
  const [updatedIncome] = await db.update(incomes).set({ ...req.body, value: String(req.body.value) }).where(eq(incomes.id, req.params.id)).returning();
  res.json({ ...updatedIncome, value: Number(updatedIncome.value) });
});

app.delete('/api/incomes/:id', async (req, res) => {
  await db.delete(incomes).where(eq(incomes.id, req.params.id));
  res.json({ success: true });
});

// Categories
app.get('/api/categories', async (req, res) => {
  const allCategories = await db.select().from(categories);
  res.json(allCategories.map(c => c.name));
});

app.post('/api/categories', async (req, res) => {
  const { categories: newCats } = req.body;
  await db.delete(categories);
  if (newCats && newCats.length > 0) {
    await db.insert(categories).values(newCats.map((name: string) => ({ id: name, name })));
  }
  res.json({ success: true });
});

// Settings
app.get('/api/settings', async (req, res) => {
  const allSettings = await db.select().from(settings).limit(1);
  res.json(allSettings[0] || { appName: 'TATU.' });
});

app.post('/api/settings', async (req, res) => {
  await db.delete(settings);
  const [newSettings] = await db.insert(settings).values({ id: '1', ...req.body }).returning();
  res.json(newSettings);
});

// Import entire DB
app.post('/api/import', async (req, res) => {
  const data = req.body;
  try {
    // Delete all existing data
    await db.delete(users);
    await db.delete(groups);
    await db.delete(accounts);
    await db.delete(incomes);
    await db.delete(categories);
    await db.delete(settings);

    // Insert new data
    if (data.users && data.users.length > 0) {
      await db.insert(users).values(data.users);
    }
    if (data.groups && data.groups.length > 0) {
      await db.insert(groups).values(data.groups);
    }
    if (data.accounts && data.accounts.length > 0) {
      await db.insert(accounts).values(data.accounts.map((a: any) => ({
        ...a,
        value: String(a.value),
        totalValue: a.totalValue ? String(a.totalValue) : null
      })));
    }
    if (data.incomes && data.incomes.length > 0) {
      await db.insert(incomes).values(data.incomes.map((i: any) => ({
        ...i,
        value: String(i.value)
      })));
    }
    if (data.categories && data.categories.length > 0) {
      await db.insert(categories).values(data.categories.map((name: string) => ({ id: name, name })));
    }
    if (data.settings) {
      await db.insert(settings).values({ id: '1', ...data.settings });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Import failed', err);
    res.status(500).json({ error: err.message });
  }
});

// Static frontend
app.use(express.static(path.join(process.cwd(), 'dist')));
app.use((req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
