import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData } from "react-router";
import shopify from "../shopify.server";
export async function loader({request}:LoaderFunctionArgs){return shopify.login(request);}
export async function action({request}:ActionFunctionArgs){return shopify.login(request);}
export default function Login(){const data=useActionData<typeof action>();return <main><h1>Install ReturnGuard</h1><Form method="post"><label>Shop domain <input name="shop" placeholder="example.myshopify.com" required /></label><button type="submit">Install</button></Form>{data&&<pre>{JSON.stringify(data)}</pre>}</main>}
