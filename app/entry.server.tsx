import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter } from "react-router";
import { renderToPipeableStream } from "react-dom/server";
import type { EntryContext } from "react-router";
export default function handleRequest(request: Request, status: number, headers: Headers, context: EntryContext) {
 return new Promise<Response>((resolve,reject)=>{
  let didError=false;
  const {pipe,abort}=renderToPipeableStream(<ServerRouter context={context} url={request.url}/>,{
   onShellReady(){
    const body=new PassThrough();
    headers.set("Content-Type","text/html; charset=utf-8");
    resolve(new Response(createReadableStreamFromReadable(body),{status:didError?500:status,headers}));
    pipe(body);
   },
   onShellError(error){reject(error)},
   onError(error){didError=true;console.error(error)}
  });
  setTimeout(abort,10000);
 });
}
