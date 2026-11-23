"use client";

import { useRef, useState, type ReactNode } from "react";

export function HeaderMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={toggle}
        className="menu-toggle"
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="header-menu"
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
      >
        <span className="menu-icon" aria-hidden="true" />
      </button>
      <div
        id="header-menu"
        className="header-menu"
        data-open={open}
        onClick={(event) => {
          if (open && event.target instanceof Element && event.target.closest("a[href]")) {
            setOpen(false);
            const href = event.target.closest("a")?.getAttribute("href");
            const destination = href?.startsWith("#") ? href.slice(1) : undefined;
            if (destination) document.getElementById(destination)?.focus({ preventScroll: true });
          }
        }}
        onKeyDown={(event) => {
          if (open && event.key === "Escape" && !event.defaultPrevented && !(event.target instanceof Element && event.target.closest("dialog"))) {
            setOpen(false);
            toggle.current?.focus();
          }
        }}
      >
        {children}
      </div>
    </>
  );
}
