---
name: sql
description: SQL patterns for SQLite with bun:sqlite — schema design, queries, migrations
triggers:
  - sql
  - sqlite
  - database
  - db
  - query
  - schema
  - migration
  - table
  - index
  - join
  - transaction
---
# SQL Skill

## Setup — WAL Mode (Always)
```ts
import { Database } from "bun:sqlite";
const db = new Database("app.db", { create: true });
db.run("PRAGMA journal_mode = WAL");    // concurrent reads
db.run("PRAGMA foreign_keys = ON");     // enforce relations
db.run("PRAGMA synchronous = NORMAL");  // safe + fast with WAL
```

## Prepared Statements — Never Interpolate
```ts
// ✅ Correct — parameterized
const get = db.prepare("SELECT * FROM users WHERE id = ?");
const user = get.get(id) as User | undefined;

// ❌ Never do this — SQL injection
db.run(`SELECT * FROM users WHERE id = '${id}'`);
```

## CRUD Patterns
```ts
// INSERT
db.prepare("INSERT INTO items (id, name, created_at) VALUES (?, ?, ?)").run(id, name, Date.now());

// SELECT one
const row = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Item | undefined;

// SELECT many
const rows = db.prepare("SELECT * FROM items ORDER BY created_at DESC LIMIT ?").all(20) as Item[];

// UPDATE
db.prepare("UPDATE items SET name = ?, updated_at = ? WHERE id = ?").run(name, Date.now(), id);

// DELETE
db.prepare("DELETE FROM items WHERE id = ?").run(id);

// Upsert
db.prepare("INSERT OR REPLACE INTO items (id, name) VALUES (?, ?)").run(id, name);
```

## Schema Design Principles
- Use `TEXT` for IDs (UUIDs or nanoid), not auto-increment integers — UUIDs work across replicas
- Use `INTEGER` (milliseconds) for timestamps — sort and compare efficiently
- Use `TEXT` for JSON blobs when structure is flexible: `env TEXT` → `JSON.stringify(obj)`
- Always define `NOT NULL` unless null is semantically meaningful
- Add `DEFAULT` values for optional columns

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL DEFAULT '',
  model      TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC);
```

## Transactions — Use for Multi-Step Writes
```ts
const addUser = db.transaction((user: User) => {
  db.prepare("INSERT INTO users (id, name) VALUES (?, ?)").run(user.id, user.name);
  db.prepare("INSERT INTO audit_log (user_id, action) VALUES (?, ?)").run(user.id, "created");
});
addUser({ id: "123", name: "Alice" }); // atomic — both succeed or neither does
```

## Indexes — Add for Every Query Column
```sql
-- Index on columns used in WHERE or ORDER BY
CREATE INDEX idx_messages_session ON messages(session_id, created_at);

-- Composite index for common join patterns
CREATE INDEX idx_messages_session_role ON messages(session_id, role);
```

## SQLite Migration Patterns
SQLite has limited `ALTER TABLE` support. To add a column:
```sql
ALTER TABLE users ADD COLUMN bio TEXT;       -- safe, always works
ALTER TABLE users ADD COLUMN bio TEXT NOT NULL; -- only if column has DEFAULT
```

To rename or drop a column (SQLite 3.35+):
```sql
ALTER TABLE users RENAME COLUMN old_name TO new_name;
ALTER TABLE users DROP COLUMN old_column;
```

For complex migrations (changing types, restructuring), use:
```sql
-- 1. Create new table
CREATE TABLE users_new (id TEXT, name TEXT, ...);
-- 2. Copy data
INSERT INTO users_new SELECT id, name, ... FROM users;
-- 3. Drop old, rename new
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
```

## Storing JSON in SQLite
```ts
// Write
db.prepare("UPDATE config SET value = ? WHERE key = ?").run(JSON.stringify(obj), key);

// Read
const raw = db.prepare("SELECT value FROM config WHERE key = ?").get(key) as { value: string } | undefined;
const obj = raw ? JSON.parse(raw.value) : null;
```

## Common Gotchas
- `INTEGER PRIMARY KEY` auto-increments in SQLite; UUIDs avoid this
- SQLite stores booleans as 0/1 — convert explicitly
- `UNIQUE` constraint throws on duplicate — use `INSERT OR IGNORE` to skip silently
- No `RETURNING` clause in older SQLite — do a SELECT after INSERT if you need the row back
