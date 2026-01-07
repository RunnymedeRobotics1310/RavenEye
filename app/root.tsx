import {
  isRouteErrorResponse,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "~/assets/css/global.css";
import "~/assets/css/typography.css";
import "~/assets/css/colors.css";
import "~/assets/css/layout.css";
import "~/assets/css/components.css";
import "~/assets/css/report.css";
import logoUrl from "~/assets/images/logo.png";
import titleUrl from "~/assets/images/title.png";
import Sync from "~/common/icons/Sync.tsx";
import Spinner from "~/common/Spinner.tsx";
import { useOverallSyncStatus, syncAll } from "~/common/sync/sync.ts";
import { useEffect } from "react";

export const links: Route.LinksFunction = () => [
  { rel: "preload", href: logoUrl, as: "image" },
  { rel: "preload", href: titleUrl, as: "image" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const syncStatus = useOverallSyncStatus();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>1310 Raven Eye</title>
        <Meta />
        <Links />
      </head>
      <body>
        <section id="layout">
          <header>
            <div id="logo">
              <NavLink to={"/"}>
                <img src={logoUrl} alt="Runnymede Robotics" />
              </NavLink>
            </div>
            <div id="title">
              <img src={titleUrl} alt="1310 Raven Eye" />
            </div>
            <div className={"sync-button"}>
              <NavLink to={"/sync"} className={"button"}>
                <Sync status={syncStatus} />
              </NavLink>
            </div>
          </header>
          {children}
          <footer>
            <section>
              <div>&copy; 2026 Runnymede Robotics Team 1310</div>
              <div>Version: {import.meta.env.VITE_APP_VERSION}</div>
            </section>
          </footer>
        </section>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  useEffect(() => {
    syncAll();
  }, []);
  return <Outlet />;
}

export function HydrateFallback() {
  return (
    <main>
      <h1>Loading Page Data...</h1>
      <Spinner />
    </main>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main>
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
