import readline from "node:readline";

/** Ask a plain question and resolve with the typed answer. */
export function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/** Ask a yes/no question. Default is applied on empty input. */
export async function confirm(question: string, defaultYes = false): Promise<boolean> {
  const hint = defaultYes ? "[Y/n]" : "[y/N]";
  const answer = (await ask(`${question} ${hint} `)).toLowerCase();
  if (!answer) return defaultYes;
  return answer === "y" || answer === "yes";
}

/**
 * Ask for a secret — keystrokes are masked with a bullet.
 * Falls back to plain input if stdin is not a TTY.
 */
export function askSecret(question: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) return ask(question);

  return new Promise((resolve) => {
    process.stdout.write(question);
    let value = "";
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();

    const finish = () => {
      stdin.setRawMode(wasRaw ?? false);
      stdin.pause();
      stdin.removeListener("data", onData);
    };

    const onData = (buf: Buffer) => {
      const code = buf[0];
      if (code === 0x0d || code === 0x0a || code === 0x04) {
        // Enter / Ctrl-D
        finish();
        process.stdout.write("\n");
        resolve(value);
        return;
      }
      if (code === 0x03) {
        // Ctrl-C
        finish();
        process.stdout.write("\n");
        process.exit(130);
      }
      if (code === 0x7f || code === 0x08) {
        // Backspace / Delete
        if (value.length > 0) {
          value = value.slice(0, -1);
          process.stdout.write("\b \b");
        }
        return;
      }
      // Printable characters only
      if (code !== undefined && code >= 0x20) {
        value += buf.toString("utf8");
        process.stdout.write("•");
      }
    };

    stdin.on("data", onData);
  });
}
