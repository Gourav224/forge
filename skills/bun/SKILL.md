---
name: bun
description: Bun-native APIs for file I/O, HTTP, SQLite, spawning, and building
triggers:
  - bun
  - bun.spawn
  - bun.file
  - bun.write
  - bun:sqlite
  - bun build
  - bun serve
  - bun.serve
  - bun.$
  - bun link
  - bunx
---
# Bun Skill

## File I/O — Use Bun APIs
```ts
// Read
const text = await Bun.file("path/to/file.txt").text();
const json = await Bun.file("data.json").json();
const bytes = await Bun.file("image.png").arrayBuffer();

// Write
await Bun.write("output.txt", "content");
await Bun.write("data.json", JSON.stringify(obj, null, 2));

// Check existence
const exists = await Bun.file("path").exists();

// Copy
await Bun.write("dest.txt", Bun.file("src.txt"));
```

## Spawning Processes
```ts
// Recommended: Bun.spawn — non-blocking
const proc = Bun.spawn(["git", "status"], {
  cwd: process.cwd(),
  stdout: "pipe",
  stderr: "pipe",
});
const stdout = await new Response(proc.stdout).text();
const exitCode = await proc.exited;

// Shell template (simpler for one-liners)
const result = await Bun.$`git log --oneline -5`.text();
```

## SQLite — bun:sqlite
```ts
import { Database } from "bun:sqlite";

// WAL mode for concurrent reads
const db = new Database("app.db", { create: true });
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA foreign_keys = ON");

// Prepared statements (required — no string interpolation)
const insert = db.prepare("INSERT INTO users (id, name) VALUES (?, ?)");
insert.run("123", "Alice");

const user = db.prepare("SELECT * FROM users WHERE id = ?").get("123");
const all = db.prepare("SELECT * FROM users").all() as User[];

// Transactions
const txn = db.transaction((items: Item[]) => {
  for (const item of items) insert.run(item.id, item.name);
});
txn(myItems);
```

## HTTP Server — Bun.serve()
```ts
import index from "./index.html"; // HTML import — Bun bundles automatically

Bun.serve({
  routes: {
    "/": index,
    "/api/users": {
      GET: () => Response.json({ users: [] }),
      POST: async (req) => {
        const body = await req.json();
        return Response.json({ id: "new" }, { status: 201 });
      },
    },
    "/api/users/:id": {
      GET: (req) => Response.json({ id: req.params.id }),
    },
  },
  development: { hmr: true }, // hot reload in dev
});
```

## Building — bun build
```bash
# Compile to self-contained native binary (no Bun required on target)
bun build --target=bun --compile src/index.ts --outfile dist/myapp

# Bundle for browser
bun build src/app.ts --outdir dist --target=browser

# Bundle for Node.js
bun build src/lib.ts --outdir dist --target=node
```

## Environment Variables
Bun automatically loads `.env`, `.env.local`, `.env.development`. No `dotenv` needed.
```ts
const key = process.env.API_KEY; // works immediately
Bun.env.API_KEY;                 // also works
```

## Package Management
```bash
bun install              # install dependencies (uses bun.lock)
bun add <pkg>            # add a dependency
bun add -d <pkg>         # add a dev dependency
bunx <cmd>               # run a package binary (like npx)
bun link                 # install current package globally via symlink
bun run <script>         # run package.json script
```

## Testing
```bash
bun test                 # run all *.test.ts files
bun test --watch         # watch mode
bun test --coverage      # with coverage
```

## Key Differences from Node.js
- `Bun.spawn` not `child_process.spawn`
- `Bun.file().text()` not `fs.readFileSync`
- `bun:sqlite` not `better-sqlite3`
- `WebSocket` built-in, not `ws`
- `fetch` built-in, no `node-fetch`
- `.env` auto-loaded, no `dotenv`
