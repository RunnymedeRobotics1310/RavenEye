import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "~/+types/root";
import "~/assets/css/global.css";
import "~/assets/css/typography.css";
import "~/assets/css/colors.css";
import "~/assets/css/layout.css";
import "~/assets/css/components.css";
import "~/assets/css/report.css";
import logoUrl from "~/assets/images/logo.png";
import titleUrl from "~/assets/images/title.png";
import Sync from "~/common/icons/Sync.tsx";
import React from "react";

export const links: Route.LinksFunction = () => [
  // todo: fixme: remove unused links
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const pictures = [logoUrl, titleUrl];
  pictures.forEach((picture) => {
    // const img = new Image();
    // img.src = picture;
  });
  const sync = () => {
    // todo: fixme: navigate to sync page
  };
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <section id="layout">
          <header>
            <div id="logo">
              {/*todo: fixme: link to root*/}
              <img src={logoUrl} alt="Runnymede Robotics" />
            </div>
            <div id="title">
              <img src={titleUrl} alt="1310 Raven Eye" />
            </div>
            <div className={"sync-button"}>
              <span className={"button"} onClick={() => sync()}>
                <Sync />
              </span>
            </div>
          </header>
          <main> {children} </main>
          <footer>
            <section>
              <div>&copy; 2026 Runnymede Robotics Team 1310</div>
              <div>Version: {import.meta.env.PACKAGE_VERSION}</div>
            </section>
            {import.meta.env.DEV && (
              <menu id="menu">
                <li>
                  <span>development footer menu items</span>
                </li>
              </menu>
            )}
          </footer>
        </section>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function HydrateFallback() {
  return <p>Loading Page Data...</p>;
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
