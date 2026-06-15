import type { McpServer } from "../db/mcp-servers";

export interface McpTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  serverName: string; // which MCP server owns this tool
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

export class McpClient {
  private proc: ReturnType<typeof Bun.spawn> | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private buffer = "";
  readonly serverName: string;

  constructor(private server: McpServer) {
    this.serverName = server.name;
  }

  async connect(): Promise<void> {
    const [cmd, ...args] = this.server.command.split(" ");
    const allArgs = [...args, ...this.server.args];

    this.proc = Bun.spawn([cmd!, ...allArgs], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ...this.server.env },
    });

    // Read stdout line by line
    this.readLoop();

    // Send initialize
    await this.call("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      clientInfo: { name: "forge", version: "0.1.0" },
    });
  }

  private async readLoop() {
    const stdout = this.proc?.stdout;
    if (!stdout || typeof stdout === "number") return;
    const reader = (stdout as ReadableStream<Uint8Array>).getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        this.buffer += new TextDecoder().decode(value);
        const lines = this.buffer.split("\n");
        this.buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line) as JsonRpcResponse;
            const pending = this.pending.get(msg.id);
            if (pending) {
              this.pending.delete(msg.id);
              if (msg.error) pending.reject(new Error(msg.error.message));
              else pending.resolve(msg.result);
            }
          } catch (e) {
            if (process.env.FORGE_DEBUG) console.error(`[mcp:${this.serverName}] parse error:`, e, "raw:", line.slice(0, 100));
          }
        }
      }
    } catch { /* process ended */ }
  }

  private call(method: string, params?: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      const req: JsonRpcRequest = { jsonrpc: "2.0", id, method, ...(params ? { params } : {}) };
      const line = JSON.stringify(req) + "\n";
      const stdin = this.proc?.stdin;
      if (stdin && typeof stdin !== "number") {
        (stdin as import("bun").FileSink).write(line);
      }
      // Timeout: clean up pending entry to prevent memory leak
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`MCP call timed out (15s): ${method} on ${this.serverName}`));
        }
      }, 15_000);
      // Ensure timer is cleared when resolved normally
      const origResolve = resolve;
      const origReject = reject;
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); this.pending.delete(id); origResolve(v); },
        reject: (e) => { clearTimeout(timer); this.pending.delete(id); origReject(e); },
      });
    });
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.call("tools/list") as { tools?: any[] };
    const tools = result?.tools || [];
    return tools.map((t) => ({
      name: t.name,
      description: t.description || "",
      input_schema: t.inputSchema || { type: "object", properties: {}, required: [] },
      serverName: this.serverName,
    }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    const result = await this.call("tools/call", { name, arguments: args }) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const content = result?.content || [];
    return content.map((c) => c.text || "").join("\n") || "(no output)";
  }

  disconnect() {
    this.proc?.kill();
    this.proc = null;
  }
}
