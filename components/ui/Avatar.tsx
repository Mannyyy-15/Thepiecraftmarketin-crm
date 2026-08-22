import { cn } from "./cn";

interface AvatarProps {
  name?: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  status?: "online" | "away" | "offline";
  interactive?: boolean;
  role?: string;
}

const sizes = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

const dotSizes = {
  xs: "h-2 w-2",
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
  xl: "h-3.5 w-3.5",
};

const statusRing: Record<NonNullable<AvatarProps["status"]>, string> = {
  online:  "bg-emerald-500",
  away:    "bg-amber-500",
  offline: "bg-slate-400",
};

function guessGenderFromName(name: string): "male" | "female" | "neutral" {
  if (!name) return "neutral";
  const first = name.trim().split(" ")[0].toLowerCase();
  if (!first) return "neutral";
  
  // Simple heuristic based on common name endings
  const femaleEndings = ["a", "ah", "ee", "ia", "lyn", "elle", "anne", "ie"];
  for (const ending of femaleEndings) {
    if (first.endsWith(ending)) return "female";
  }
  return "male";
}

function generateDiceBearUrl(name: string, role?: string) {
  const seed = encodeURIComponent(name || "User");
  const bgColors = "b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf";
  const gender = guessGenderFromName(name);
  
  if (role) {
    const r = role.toLowerCase();
    if (r.includes("dev") || r.includes("tech") || r.includes("engineer")) {
      return `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=${bgColors}`;
    }
    if (r.includes("admin") || r.includes("manager") || r.includes("lead")) {
      // Use 'avataaars' with blazer clothing, and appropriate hair styles based on name
      const top = gender === "female" ? "longHairBigHair,longHairBob,longHairCurly,longHairStraight" : "shortHairShortWaved,shortHairShortCurly,shortHairShortFlat";
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=${bgColors}&clothing=blazerAndShirt,blazerAndSweater&top=${top}`;
    }
    if (r.includes("client")) {
      return `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}&backgroundColor=${bgColors}`;
    }
  }
  
  // Default fallback (micah style)
  return `https://api.dicebear.com/7.x/micah/svg?seed=${seed}&backgroundColor=${bgColors}`;
}

// Org admins default to the brand mark instead of a generated avatar until
// they upload a real photo — role must be the literal "admin" account role,
// not a job-title string like "Office Administrator" that happens to
// contain "admin" (see generateDiceBearUrl's substring matching below).
const DEFAULT_ADMIN_AVATAR = "/logo.png";

export function Avatar({ name = "", src, size = "md", className, status, interactive, role }: AvatarProps) {
  const finalSrc = src || (role === "admin" ? DEFAULT_ADMIN_AVATAR : generateDiceBearUrl(name, role));

  return (
    <span className={cn(
      "relative inline-flex shrink-0",
      interactive && "transition-transform duration-150 hover:scale-110 cursor-pointer",
      className
    )}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={finalSrc}
        alt={name}
        className={cn("rounded-full object-cover ring-2 ring-white dark:ring-slate-900 bg-slate-50 dark:bg-[#303030]", sizes[size])}
      />

      {status && (
        <span className={cn("absolute -bottom-0 -right-0 flex rounded-full ring-2 ring-white dark:ring-slate-900", dotSizes[size])}>
          {status === "online" && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span className={cn("relative inline-flex rounded-full w-full h-full", statusRing[status])} />
        </span>
      )}
    </span>
  );
}

export function AvatarGroup({
  people,
  max = 4,
  size = "sm",
}: {
  people: { name: string; src?: string; role?: string }[];
  max?: number;
  size?: AvatarProps["size"];
}) {
  const shown = people.slice(0, max);
  const remaining = people.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((p, i) => (
        <Avatar key={i} name={p.name} src={p.src} role={p.role} size={size} />
      ))}
      {remaining > 0 && (
        <span className={cn(
          "inline-flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#303030] text-slate-600 dark:text-slate-300 ring-2 ring-white dark:ring-slate-900 font-medium",
          sizes[size!]
        )}>
          +{remaining}
        </span>
      )}
    </div>
  );
}
