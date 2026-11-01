import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
export async function action({request}:ActionFunctionArgs){const {shop,topic}=await authenticate.webhook(request);if(topic==="APP_UNINSTALLED") {await db.$transaction([db.claimEvent.deleteMany({where:{claim:{shop}}}),db.claim.deleteMany({where:{shop}}),db.session.deleteMany({where:{shop}})]);}return new Response(null,{status:200});}
