const paths = {
  search: "M21 21l-5-5m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  grid: "M3 3h7v7H3zm11 0h7v4h-7zM3 14h7v7H3zm11-3h7v10h-7z",
  document: "M6 3h8l4 4v14H6zm8 0v5h4M9 12h6m-6 4h6",
  bell: "M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zm5 3a2 2 0 0 0 4 0",
  plus: "M12 5v14M5 12h14",
  sparkle: "m12 3 2 6 6 3-6 2-2 6-2-6-6-2 6-3zm7 0v4m-2-2h4",
  settings: "M12 3v3m0 12v3M3 12h3m12 0h3M6 6l2 2m8 8 2 2M6 18l2-2m8-8 2-2m-2 4a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",

  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M15 3a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-10 2 2 4-4",
  lock: "M7 11V7a5 5 0 0 1 10 0v4M5 11h14a1 1 0 0 1 1 1v8H4v-8a1 1 0 0 1 1-1Zm7 4v2",
  coin: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Zm-7-4h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12",
  clock: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Zm-10-6v6h4",
  check: "m5 12 4 4L19 6",
  arrow: "M4 12h15m-6-6 6 6-6 6",
  external: "M13 3h8v8m0-8-9 9m8 1v7H4V4h7",
  wallet: "M4 5h16v14H4zm0 5h5l1 2h4l1-2h5",
  calendar: "M4 5h16v15H4zm0 5h16M8 3v4m8-4v4m-8 7h1m3 0h1m3 0h1m-9 3h1m3 0h1",
  fingerprint: "M3 11a9 9 0 0 1 18 0m-16 8c1-2 1-4 1-7a6 6 0 0 1 12 0v4m-8 5c1-3 1-6 1-9a1 1 0 0 1 2 0c0 3 0 6-1 9m4-3-1 3m6-7v3",
  link: "M10 7H7a5 5 0 0 0 0 10h3m4-10h3a5 5 0 0 1 0 10h-3M8 12h8",
} as const;

export function Icon({ name }: { name: keyof typeof paths }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}
