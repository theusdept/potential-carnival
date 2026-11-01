import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter, type EntryContext } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";

export default function handleRequest(request: Request, status: number, headers: Headers, context: EntryContext) {
  addDocumentResponseHeaders(request, headers);
  return new Promise<Response>((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(<ServerRouter context={context} url={request.url} />, {
      [isbot(request.headers.get("user-agent") || "") ? "onAllReady" : "onShellReady"]() {
        const body = new PassThrough();
        headers.set("Content-Type", "text/html; charset=utf-8");
        resolve(new Response(createReadableStreamFromReadable(body), { status, headers }));
        pipe(body);
      },
      onShellError(error: unknown) { reject(error); },
      onError(error: unknown) { status = 500; console.error(error); },
    });
    setTimeout(abort, 6000);
  });
}
