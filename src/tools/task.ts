// Definition for the `task` sub-agent tool. The executor lives in
// src/agent/subagent.ts and is loaded lazily to avoid an import cycle.

export const taskTool = {
  name: "task",
  description:
    "Delegate a focused, read-only investigation to a sub-agent. Provide a clear, self-contained question " +
    "(the sub-agent has no other context). It can read files, search, and list directories, and returns a " +
    "concise findings report. Use this to explore unfamiliar code without cluttering your own context.",
  input_schema: {
    type: "object" as const,
    properties: {
      prompt: {
        type: "string",
        description: "A self-contained task or question for the sub-agent to investigate and report on.",
      },
    },
    required: ["prompt"],
  },
};
