import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link, Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
}

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  return (
    <AppProvider apiKey={apiKey}>
      <nav aria-label="ReturnGuard navigation">
        <Link to="/app">Dashboard</Link>
        <Link to="/app/claims">Claims</Link>
        <Link to="/app/billing">Plan</Link>
      </nav>
      <Outlet />
    </AppProvider>
  );
}
export function ErrorBoundary() { return boundary.error(useRouteError()); }
export const headers: HeadersFunction = (args) => boundary.headers(args);
