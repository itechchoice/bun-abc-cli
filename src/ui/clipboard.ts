function commandCandidatesByPlatform(): string[][] {
  if (process.platform === "darwin") {
    return [["pbcopy"]];
  }
  if (process.platform === "win32") {
    return [["clip"]];
  }
  return [
    ["wl-copy"],
    ["xclip", "-selection", "clipboard"],
    ["xsel", "--clipboard", "--input"],
  ];
}

async function tryCommandCopy(command: string[], text: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(command, {
      stdin: "pipe",
      stdout: "ignore",
      stderr: "ignore",
    });

    if (!proc.stdin) {
      return false;
    }

    proc.stdin.write(text);
    proc.stdin.end();
    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch {
    return false;
  }
}

function tryOsc52Copy(text: string): boolean {
  try {
    const encoded = Buffer.from(text, "utf8").toString("base64");
    process.stdout.write(`\u001b]52;c;${encoded}\u0007`);
    return true;
  } catch {
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  const normalized = text.trimEnd();
  if (normalized === "") {
    return false;
  }

  const commands = commandCandidatesByPlatform();
  for (const command of commands) {
    if (await tryCommandCopy(command, normalized)) {
      return true;
    }
  }

  return tryOsc52Copy(normalized);
}
