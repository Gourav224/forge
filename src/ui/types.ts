export interface ToolEvent {
  id: string;
  name: string;
  input?: Record<string, unknown>;
  status: "running" | "done" | "error";
  result?: string;
  startMs?: number;
  durationMs?: number;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  toolEvents?: ToolEvent[];  // frozen tool calls from this turn
}

export interface AppState {
  messages: Message[];
  toolEvents: ToolEvent[];
  isRunning: boolean;
  currentText: string;
  sessionId: string | null;
  model: string;
}
