import React from "react";

export const WI: Record<string, React.ReactNode> = {
  search:   <path d="M14 14l-3-3m1-4a5 5 0 11-10 0 5 5 0 0110 0z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>,
  plus:     <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>,
  upload:   <path d="M8 11V3M5 6l3-3 3 3M3 11v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
  download: <path d="M8 3v8m-3-3l3 3 3-3M3 13h10" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
  filter:   <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>,
  more:     <g fill="currentColor"><circle cx="3" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="13" cy="8" r="1.3"/></g>,
  chevron:  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>,
  chevronD: <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>,
  refresh:  <path d="M13 8a5 5 0 11-1.5-3.5L13 6V3M3 8a5 5 0 011.5-3.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>,
  trash:    <path d="M3 5h10M6 5V3h4v2M5 5l1 8h4l1-8" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
  copy:     <g fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3" y="5" width="8" height="9" rx="1"/><path d="M5 5V3a1 1 0 011-1h7a1 1 0 011 1v8a1 1 0 01-1 1h-2"/></g>,
  check:    <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
  user:     <g fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="6" r="2.5"/><path d="M3 13c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5"/></g>,
  spark:    <path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M4 12l2-2M10 6l2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>,
  lock:     <g fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3.5" y="7" width="9" height="6" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></g>,
  bell:     <path d="M3.5 12V7a4.5 4.5 0 019 0v5l1 1h-11l1-1zM6.5 13.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
  close:    <path d="M4 4l8 8M12 4L4 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>,
  sun:      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"><circle cx="8" cy="8" r="2.5"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1.1 1.1M11.1 11.1l1.1 1.1M12.2 3.8l-1.1 1.1M4.9 11.1l-1.1 1.1"/></g>,
  moon:     <path d="M13 9A6 6 0 016 3a6 6 0 100 10 6 6 0 007-4z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
};

export function WIcon({ name, size = 14, color }: { name: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16"
      style={{ color: color || "currentColor", display: "block", flexShrink: 0 }}>
      {WI[name]}
    </svg>
  );
}
