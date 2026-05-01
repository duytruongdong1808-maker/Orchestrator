import { Bot, Code2, Copy, Sparkles, UserRound } from "lucide-react";
import { cn } from "../../lib/utils";

export type MessageKind = "user" | "claude" | "codex" | "system";

const labels = {
  user: "You",
  claude: "Assistant",
  codex: "Implementation Agent",
  system: "System"
};

const icons = {
  user: UserRound,
  claude: Sparkles,
  codex: Code2,
  system: Bot
};

type MessageSegment = { type: "text"; value: string } | { type: "code"; value: string; language?: string };

function splitFencedBlocks(body: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  const regex = /```([\w-]*)?\r?\n?([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(body)) !== null) {
    if (match.index > cursor) {
      segments.push({ type: "text", value: body.slice(cursor, match.index) });
    }
    segments.push({ type: "code", language: match[1], value: match[2].replace(/\r?\n$/, "") });
    cursor = match.index + match[0].length;
  }

  if (cursor < body.length) {
    segments.push({ type: "text", value: body.slice(cursor) });
  }

  return segments.length ? segments : [{ type: "text", value: body }];
}

export function MessageBubble({ kind, title, body }: { kind: MessageKind; title?: string; body: string }) {
  const Icon = icons[kind];
  const segments = splitFencedBlocks(body);
  return (
    <div className={cn("flex gap-3", kind === "user" && "justify-end")}>
      {kind !== "user" && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-muted/50">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[min(78ch,92%)] rounded-lg border px-4 py-3 shadow-sm",
          kind === "user" ? "bg-primary text-primary-foreground" : "bg-card/90",
          kind === "codex" && "border-primary/30",
          kind === "claude" && "border-emerald-500/25",
          kind === "system" && "border-border bg-muted/35"
        )}
      >
        <div className="mb-1 font-mono text-[11px] font-semibold opacity-80">{title ?? labels[kind]}</div>
        <div className="space-y-3 text-sm leading-6">
          {segments.map((segment, index) =>
            segment.type === "code" ? (
              <div key={`${segment.type}-${index}`} className="overflow-hidden rounded-md border bg-background/90">
                <div className="flex items-center justify-between border-b bg-muted/35 px-3 py-1.5">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">{segment.language || "code"}</span>
                  <button
                    type="button"
                    className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55"
                    onClick={() => void navigator.clipboard?.writeText(segment.value)}
                    title="Copy code"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <pre className="overflow-auto p-3 font-mono text-[12px] leading-5">
                  <code>{segment.value}</code>
                </pre>
              </div>
            ) : (
              <pre key={`${segment.type}-${index}`} className="whitespace-pre-wrap break-words font-sans text-sm leading-6">
                {segment.value}
              </pre>
            )
          )}
        </div>
      </div>
    </div>
  );
}
