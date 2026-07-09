import { useSyncExternalStore } from "react";
import { Localization } from "./pages/Localization";
import { ModulesContext } from "./pages/ModulesContext";
import { Quickstart } from "./pages/Quickstart";
import { RowModel } from "./pages/RowModel";
import { ServerErrors } from "./pages/ServerErrors";
import { ValidationDisplay } from "./pages/ValidationDisplay";
import { Visibility } from "./pages/Visibility";
import "./app.css";

const pages = [
  { slug: "quickstart", label: "Quickstart", render: () => <Quickstart /> },
  {
    slug: "validation",
    label: "Validation display",
    render: () => <ValidationDisplay />,
  },
  {
    slug: "server-errors",
    label: "Server errors",
    render: () => <ServerErrors />,
  },
  {
    slug: "visibility",
    label: "Visibility & rules",
    render: () => <Visibility />,
  },
  { slug: "row-model", label: "Row model", render: () => <RowModel /> },
  {
    slug: "modules",
    label: "Modules & context",
    render: () => <ModulesContext />,
  },
  {
    slug: "localization",
    label: "Localization",
    render: () => <Localization />,
  },
] as const;

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
  const page = pages.find((p) => p.slug === route) ?? pages[0];

  return (
    <div className="app">
      <nav className="nav" aria-label="Examples">
        <a className="nav__brand" href="#/quickstart">
          react-form-engine
          <span className="nav__sub">live examples</span>
        </a>
        <ul className="nav__list">
          {pages.map((p) => (
            <li key={p.slug}>
              <a
                href={`#/${p.slug}`}
                aria-current={p.slug === page.slug ? "page" : undefined}
              >
                {p.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          className="nav__footer"
          href="https://github.com/xKirtle/react-form-engine"
        >
          GitHub ↗
        </a>
      </nav>
      <main className="content" key={page.slug}>
        {page.render()}
      </main>
    </div>
  );
}
