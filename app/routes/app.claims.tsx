import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { z } from "zod";
const decision = z.object({ id: z.string().min(1), status: z.enum(["APPROVED","REJECTED","RESOLVED"]) });
export async function loader({request}: LoaderFunctionArgs) {
 const {session} = await authenticate.admin(request);
 return {claims: await db.claim.findMany({where:{shop:session.shop},orderBy:{createdAt:"desc"},take:100})};
}
export async function action({request}: ActionFunctionArgs) {
 const {session} = await authenticate.admin(request);
 const parsed = decision.safeParse(Object.fromEntries(await request.formData()));
 if(!parsed.success) return Response.json({error:"Invalid decision"}, {status:400});
 const result = await db.claim.updateMany({where:{id:parsed.data.id,shop:session.shop,status:"PENDING"},data:{status:parsed.data.status}});
 if(result.count!==1) return Response.json({error:"Claim not found or already decided"}, {status:409});
 await db.claimEvent.create({data:{claimId:parsed.data.id,action:parsed.data.status}});
 return {ok:true};
}
export default function Claims(){
 const {claims}=useLoaderData<typeof loader>();
 return <main><h1>ReturnGuard Claims</h1><p>Merchant review queue</p><table><thead><tr><th>Order</th><th>Type</th><th>Reason</th><th>Status</th><th>Decision</th></tr></thead><tbody>{claims.map(c=><tr key={c.id}><td>{c.orderId}</td><td>{c.type}</td><td>{c.reason}</td><td>{c.status}</td><td>{c.status==="PENDING"&&<Form method="post"><input type="hidden" name="id" value={c.id}/><button name="status" value="APPROVED">Approve</button><button name="status" value="REJECTED">Reject</button></Form>}</td></tr>)}</tbody></table></main>;
}
