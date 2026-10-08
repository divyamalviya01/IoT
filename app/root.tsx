import { useEffect } from "react";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { MotionConfig } from "motion/react";

import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/jetbrains-mono";
import "./app.css";

import type { Route } from "./+types/root";
import { themeInitScript, watchSystemTheme } from "./lib/theme";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];

export const meta: Route.MetaFunction = () => [
  { title: "IoT Simulator Lab" },
  {
    name: "description",
    content:
      "Learn the BCA-501 Internet of Things syllabus with simple theory, animated visuals and hands-on simulations.",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set by the inline script before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Meta />
        <Links />
      </head>
      <body className="bg-bg text-ink antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  useEffect(() => watchSystemTheme(), []);

  return (
    <MotionConfig reducedMotion="user">
      <Outlet />
    </MotionConfig>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let details = "The page hit an unexpected error. Go back to the home page and try again.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Page not found";
      details = "There is no page at this address. Check the link, or start again from the home page.";
    } else {
      details = error.statusText || details;
    }
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-20">
      <h1 className="text-h1 font-bold">{title}</h1>
      <p className="mt-3 text-ink-2">{details}</p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-lg bg-brand px-4 py-2 font-semibold text-brand-ink hover:bg-brand-hover"
      >
        Go to the home page
      </Link>
      {stack && (
        <pre className="mt-8 overflow-x-auto rounded-lg border border-line bg-surface-2 p-4 text-sm">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
