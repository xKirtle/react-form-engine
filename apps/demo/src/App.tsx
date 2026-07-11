import type { ReactNode } from "react";
import { useState, useSyncExternalStore } from "react";
import { DOCS_URL, type GuideSlug, guides } from "./guides";
import { CustomFieldTypes } from "./pages/CustomFieldTypes";
import { FieldDefinitions } from "./pages/FieldDefinitions";
import { Localization } from "./pages/Localization";
import { ModulesContext } from "./pages/ModulesContext";
import { Rendering } from "./pages/Rendering";
import { RowModel } from "./pages/RowModel";
import { Rules } from "./pages/Rules";
import { Transforms } from "./pages/Transforms";
import { Validation } from "./pages/Validation";
import "./app.css";

const pages: Record<GuideSlug, () => ReactNode> = {
  "field-definitions": () => <FieldDefinitions />,
  transforms: () => <Transforms />,
  modules: () => <ModulesContext />,
  rules: () => <Rules />,
  validation: () => <Validation />,
  "row-model": () => <RowModel />,
  rendering: () => <Rendering />,
  "custom-field-types": () => <CustomFieldTypes />,
  localization: () => <Localization />,
};

/** Routes that predate the current layout. */
const legacyRoutes: Record<string, GuideSlug> = {
  quickstart: "field-definitions",
  visibility: "rules",
  "server-errors": "validation",
};

function useHashRoute(): string {
  return useSyncExternalStore(
    (listener) => {
      window.addEventListener("hashchange", listener);
      return () => window.removeEventListener("hashchange", listener);
    },
    () => window.location.hash.replace(/^#\/?/, ""),
  );
}

export function App() {
  const route = useHashRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const resolved = legacyRoutes[route] ?? route;
  const active = guides.find((entry) => entry.slug === resolved) ?? guides[0];
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="app">
      <nav className={menuOpen ? "nav nav--open" : "nav"} aria-label="Guides">
        <div className="nav__bar">
          {/* biome-ignore lint/a11y/useValidAnchor: the brand links to the first guide — the app is hash-routed — and the click handler only collapses the mobile menu */}
          <a
            className="nav__brand"
            href="#/field-definitions"
            onClick={closeMenu}
          >
            react-form-engine
            <span className="nav__sub">live examples, one per guide</span>
          </a>
          <button
            type="button"
            className="nav__toggle"
            aria-expanded={menuOpen}
            aria-controls="nav-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              {menuOpen ? (
                <path d="M3 3l12 12M15 3L3 15" />
              ) : (
                <path d="M2 4.5h14M2 9h14M2 13.5h14" />
              )}
            </svg>
            Menu
          </button>
        </div>
        <div className="nav__menu" id="nav-menu">
          <ol className="nav__list">
            {guides.map((entry) => (
              <li key={entry.slug}>
                <a
                  href={`#/${entry.slug}`}
                  aria-current={entry.slug === active.slug ? "page" : undefined}
                  onClick={closeMenu}
                >
                  <span className="nav__num" aria-hidden="true">
                    {entry.num}
                  </span>
                  {entry.title}
                </a>
              </li>
            ))}
          </ol>
          <div className="nav__footer">
            <a href={DOCS_URL}>Docs ↗</a>
            <a href="https://github.com/xKirtle/react-form-engine">GitHub ↗</a>
          </div>
        </div>
      </nav>
      <main className="content" key={active.slug}>
        {pages[active.slug]()}
      </main>
    </div>
  );
}
