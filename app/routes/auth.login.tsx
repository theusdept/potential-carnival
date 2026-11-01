import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { login } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return { errors: await login(request) };
}
export async function action({ request }: ActionFunctionArgs) {
  return { errors: await login(request) };
}
export default function Login() {
  const data = useActionData<typeof action>() ?? useLoaderData<typeof loader>();
  return <main><h1>Install ReturnGuard</h1><Form method="post">
    <label htmlFor="shop">Shop domain</label>
    <input id="shop" name="shop" placeholder="example.myshopify.com" required />
    <button type="submit">Install app</button>
    {data.errors?.shop && <p role="alert">Enter a valid myshopify.com shop domain.</p>}
  </Form></main>;
}
