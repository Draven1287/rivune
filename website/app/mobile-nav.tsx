"use client";

import { useRef, type MouseEvent } from "react";

const links = [
  ["Product", "#product-tour"],
  ["Workflow", "#how-it-works"],
  ["Availability", "#connect"],
  ["Updates", "#updates"],
  ["Open source", "#open-source"],
];

export default function MobileNav() {
  const menu = useRef<HTMLDetailsElement>(null);

  function navigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    event.preventDefault();
    const details = menu.current;
    if (details) details.open = false;
    window.history.pushState(null, "", href);
    document.querySelector(href)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
    window.requestAnimationFrame(() => {
      if (details) details.open = false;
    });
  }

  return (
    <details className="nav__menu" ref={menu}>
      <summary>Menu</summary>
      <div>
        {links.map(([label, href]) => (
          <a
            key={href}
            href={href}
            onClick={(event) => navigate(event, href)}
          >
            {label}
          </a>
        ))}
      </div>
    </details>
  );
}
