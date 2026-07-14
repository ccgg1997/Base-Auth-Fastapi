import type { SVGProps } from "react";

export type IconName =
  | "alert"
  | "bell"
  | "building"
  | "calendar"
  | "check"
  | "chevronDown"
  | "chevronLeft"
  | "chevronRight"
  | "clock"
  | "close"
  | "eye"
  | "flag"
  | "grid"
  | "heart"
  | "logout"
  | "menu"
  | "pencil"
  | "plus"
  | "refresh"
  | "save"
  | "search"
  | "shield"
  | "trash"
  | "trendDown"
  | "trendUp"
  | "user"
  | "users";

const paths: Record<IconName, React.ReactNode> = {
  alert: <><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  building: <><path d="M3 21h18"/><path d="M6 21V4h9v17"/><path d="M15 8h3v13"/><path d="M9 8h2M9 12h2M9 16h2"/></>,
  calendar: <><path d="M3 5h18v16H3z"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
  chevronDown: <path d="m7 10 5 5 5-5"/>,
  chevronLeft: <path d="m15 18-6-6 6-6"/>,
  chevronRight: <path d="m9 18 6-6-6-6"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  close: <path d="M6 6l12 12M18 6 6 18"/>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  flag: <><path d="M5 22V3"/><path d="M5 4h11l-2 4 2 4H5"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  heart: <><path d="M20.8 5.7a5.5 5.5 0 0 0-7.8 0L12 6.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z"/><path d="M8 12h2l1-3 2 6 1-3h2"/></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  pencil: <><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/><path d="m14 7 3 3"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  refresh: <><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M6.1 9A7 7 0 0 1 18 6l2 5M4 13l2 5a7 7 0 0 0 11.9-3"/></>,
  save: <><path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="M9 12h6M12 9v6"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
  trendDown: <path d="m4 8 6 6 4-4 6 6M20 11v5h-5"/>,
  trendUp: <path d="m4 16 6-6 4 4 6-6M15 8h5v5"/>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 19a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14a5 5 0 0 1 5 5"/></>,
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Icon name="heart" className="size-6" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <strong className="block text-lg font-bold tracking-tight">SaludPlus</strong>
          <small className="text-xs text-muted-foreground">Gestión de pacientes</small>
        </span>
      )}
    </div>
  );
}
