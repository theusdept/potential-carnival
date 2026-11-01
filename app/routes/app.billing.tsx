import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
export async function loader({request}:LoaderFunctionArgs){await authenticate.admin(request);return Response.json({enabled:false,message:"Billing is not activated until plan enforcement and Shopify billing verification are implemented."});}
export default function Billing(){return <main><h1>Subscription plans</h1><p>Paid subscriptions are not yet available.</p></main>}
