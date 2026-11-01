export async function loader(){return new Response("User-agent: *\nDisallow: /app\nDisallow: /auth\n",{headers:{"Content-Type":"text/plain"}})}
