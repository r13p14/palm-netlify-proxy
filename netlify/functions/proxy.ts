import { Context } from "@netlify/edge-functions";

const pickHeaders = (headers: Headers, keys: (string | RegExp)[]): Headers => {
  const picked = new Headers();
  for (const key of headers.keys()) {
    if (keys.some((k) => (typeof k === "string" ? k === key : k.test(key)))) {
      const value = headers.get(key);
      if (typeof value === "string") {
        picked.set(key, value);
      }
    }
  }
  return picked;
};

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "*",
  "access-control-allow-headers": "*",
};

export default async (request: Request, context: Context) => {

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: CORS_HEADERS,
    });
  }

  const { pathname, searchParams } = new URL(request.url);
  if(pathname === "/") {
    return new Response('Proxy is Running!', {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
  const validPaths = ['api.groq.com', 'generativelanguage.googleapis.com'];
  const url = new URL(pathname, "https://generativelanguage.googleapis.com");
  if (validPaths.some(path => pathname.includes(path))) {
    const targetUrl = `https://${pathname}${searchParams}`;
    const headers = pickHeaders(request.headers, ["content-type", "authorization", "x-goog-api-client", "x-goog-api-key", "accept-encoding"]);
    const response = await fetch(url, {
    body: request.body,
    method: request.method,
    headers,
  });

  const responseHeaders = {
    ...CORS_HEADERS,
    ...Object.fromEntries(response.headers),
  };

  return new Response(response.body, {
    headers: responseHeaders,
    status: response.status
  });
  }
  else{
    return new Response('Unsupport URL!', {
      status: 404,
      headers: { 'Content-Type': 'text/html' }
    });
  }
  // searchParams.delete("_path");

  // searchParams.forEach((value, key) => {
  //   url.searchParams.append(key, value);
  // });

  
  
};
