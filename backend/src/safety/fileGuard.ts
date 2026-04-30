const sensitivePathPatterns = [
  /(^|[\\/])\.env$/i,
  /(^|[\\/])\.env\.local$/i,
  /(^|[\\/])\.env\.production$/i,
  /\.pem$/i,
  /\.key$/i,
  /(^|[\\/])id_rsa$/i,
  /(^|[\\/])credentials\.json$/i,
  /(^|[\\/])service-account\.json$/i
];

export function isSensitivePath(filePath: string) {
  return sensitivePathPatterns.some((pattern) => pattern.test(filePath));
}

export function filterSensitiveDiffForPrompt(diff: string) {
  const lines = diff.split(/\r?\n/);
  const filtered: string[] = [];
  let skipping = false;

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
      skipping = match ? isSensitivePath(match[1]) || isSensitivePath(match[2]) : isSensitivePath(line);
    }
    if (!skipping) {
      filtered.push(line);
    }
  }

  return filtered.join("\n");
}
