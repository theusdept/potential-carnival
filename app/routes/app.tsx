import type { LoaderFunctionArgs } from "react-router";
import { Link, Outlet } from "react-router";
import { authenticate } from "../shopify.server";
export async function loader({request}: LoaderFunctionArgs) { await authenticate.admin(request); return null; }
export default function App(){return <div><header><h1>ReturnGuard</h1><nav><Link to="/app/claims">Claims</Link></nav></header><Outlet/></div>}
