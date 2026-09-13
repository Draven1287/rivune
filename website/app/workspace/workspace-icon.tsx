import type { ReactNode } from "react";

export type IconName = "replay" | "sliders" | "search" | "conversations" | "spark" | "code" | "idea" | "chevron" | "plus" | "arrow" | "close" | "sidebar" | "activity" | "external" | "link" | "stop" | "copy" | "check" | "home" | "terminal" | "key" | "user" | "appearance" | "shield" | "monitor" | "info" | "keyboard";
export default function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a7 7 0 0 1 14 0v2" /></>,
    appearance: <><path d="M12 3a9 9 0 1 0 9 9h-9Z" /><path d="M16 3v4m-2-2h4m2 3v3m-1.5-1.5h3" /></>,
    shield: <><path d="m12 3 8 3v6c0 4-5 8-8 9-3-1-8-5-8-9V6Z" /><path d="m8 12 3 3 5-5" /></>,
    monitor: <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8m-4-4v4" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.1" /></>,
    keyboard: <><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" /></>,
    replay: <><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" /><path d="m10 8 6 4-6 4Z" /></>,
    sliders: <><path d="M3 7h10m4 0h4M3 17h4m4 0h10" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    conversations: <><path d="M7 16H5l-3 3V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v2" /><path d="M11 9h9a2 2 0 0 1 2 2v11l-4-3h-7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z" /></>,
    spark: <><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z" /><path d="m20 2 .6 1.4L22 4l-1.4.6L20 6l-.6-1.4L18 4l1.4-.6Z" /></>,
    code: <><path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-12-2 14" /></>,
    idea: <><path d="M9 18h6m-5 3h4m-6-7a6 6 0 1 1 8 0c-1 .8-1 1.6-1 2H9c0-.4 0-1.2-1-2Z" /></>,
    chevron: <path d="m9 5 7 7-7 7" />,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M12 19V5m-6 6 6-6 6 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    sidebar: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16" /></>,
    activity: <><path d="M4 7h16M4 12h10M4 17h13" /><circle cx="19" cy="12" r="1" /></>,
    external: <><path d="M14 4h6v6m0-6L10 14" /><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></>,
    link: <><path d="m10 13 4-4m-5 7-2 2a4 4 0 0 1-5-5l4-4a4 4 0 0 1 5 0m2 0 2-2a4 4 0 0 1 5 5l-4 4a4 4 0 0 1-5 0" /></>,
    stop: <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none" />,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    terminal: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="m7 9 3 3-3 3m6 0h4" /></>,
    key: <><circle cx="8" cy="8" r="4" /><path d="m11 11 9 9m-4-4 2-2m-5-1 2-2" /></>,
    home: <><path d="m3 10 9-7 9 7v10H3Z" /><path d="M9 20v-7h6v7" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
