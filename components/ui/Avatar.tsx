import { cn } from "./cn";

interface AvatarProps {
  name?: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  status?: "online" | "away" | "offline";
}

const sizes = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

const statusColors = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-slate-400",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function bgFromName(name: string) {
  const palette = [
    "bg-brand-500",
    "bg-portal-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-sky-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-fuchsia-500",
  ];
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

export function Avatar({ name = "", src, size = "md", className, status }: AvatarProps) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className={cn(
            "rounded-full object-cover ring-2 ring-white dark:ring-slate-900",
            sizes[size]
          )}
        />
      ) : (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white dark:ring-slate-900",
            sizes[size],
            bgFromName(name || "U")
          )}
        >
          {initials(name || "U")}
        </span>
      )}
      {status && (
        <span
          className={cn(
            "absolute -bottom-0 -right-0 block rounded-full ring-2 ring-white dark:ring-slate-900",
            statusColors[status],
            size === "xs" || size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"
          )}
        />
      )}
    </span>
  );
}

export function AvatarGroup({
  people,
  max = 4,
  size = "sm",
}: {
  people: { name: string; src?: string }[];
  max?: number;
  size?: AvatarProps["size"];
}) {
  const shown = people.slice(0, max);
  const remaining = people.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((p, i) => (
        <Avatar key={i} name={p.name} src={p.src} size={size} />
      ))}
      {remaining > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-2 ring-white dark:ring-slate-900 font-medium",
            sizes[size!]
          )}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
}
