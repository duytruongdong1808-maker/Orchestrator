import { Bot, Code2, Sparkles, UserRound } from "lucide-react";
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

export function MessageBubble({ kind, title, body }: { kind: MessageKind; title?: string; body: string }) {
  const Icon = icons[kind];
  return (
    <div className={cn("flex gap-3", kind === "user" && "justify-end")}>
      {kind !== "user" && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[82%] rounded-lg border px-4 py-3 shadow-sm",
          kind === "user" ? "bg-primary text-primary-foreground" : "bg-card/90",
          kind === "codex" && "border-primary/30",
          kind === "claude" && "border-amber-500/25",
          kind === "system" && "border-border bg-muted/35"
        )}
      >
        <div className="mb-1 text-xs font-semibold opacity-80">{title ?? labels[kind]}</div>
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6">{body}</pre>
      </div>
    </div>
  );
}
