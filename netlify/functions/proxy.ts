import {Context} from "@netlify/edge-functions";

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
async function processResponse(response: Response): Promise<Response> {
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    const jsonData = await response.json();
    
    if (jsonData.choices && jsonData.choices[0]?.message?.content) {
      const content = jsonData.choices[0].message.content;
      const processedContent = content.replace(/<think>.*?<\/think>\s*/s, '').trim();
      jsonData.choices[0].message.content = processedContent;
    }

    return new Response(JSON.stringify(jsonData), {
      status: response.status,
      headers: response.headers
    });
  }
  
  return response;
}
export default async (request: Request, context: Context) => {
    // console.log(request.headers)
  const url = new URL(request.url);
  // console.log(url);
  const pathname = url.pathname;
  // const query = url.searchParams;
  // console.log(request.body)
    // 检查是否有查询参数
const queryString = url.search; // 包含 ? 和查询参数的部分，如果没有参数则是空字符串
// console.log(queryString)
  

  if (pathname === '/' || pathname === '/index.html') {
    return new Response('Proxy is Running!', {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
  const validPaths = ['api.groq.com', 'generativelanguage.googleapis.com'];
  // pathname.includes('api.groq.com')
  if (validPaths.some(path => pathname.includes(path))) {
    // resetCountersIfNeeded();

    // if (rateLimiter.requests >= 120) {
    //   return new Response('Rate limit exceeded. Max 120 requests per minute.', {
    //     status: 429,
    //     headers: {
    //       'Retry-After': '60',
    //       'Content-Type': 'application/json'
    //     }
    //   });
    // }

    if (request.body != null){
      try {
      const bodyClone = request.clone();
      const body = await bodyClone.json();
      // const estimatedTokens = estimateTokens(body);

      // if (rateLimiter.tokens + estimatedTokens > 60000) {
      //   return new Response('Token limit exceeded. Max 60000 tokens per minute.', {
      //     status: 429,
      //     headers: {
      //       'Retry-After': '60',
      //       'Content-Type': 'application/json'
      //     }
      //   });
      // }

      // rateLimiter.tokens += estimatedTokens;
    } catch (error) {
      console.error('Error parsing request body:', error);
    }
    }

    

    // rateLimiter.requests++;
    //const targetUrl = `https://${pathname}`;


// 构造目标 URL
const targetUrl = `https://${pathname}${queryString}`;

// console.log("Target URL:", targetUrl);

  try {
    const headers = new Headers();
    const allowedHeaders = ['accept', 'content-type', 'authorization', 'x-goog-api-key'];
    for (const [key, value] of request.headers.entries()) {
      if (allowedHeaders.includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    }
    // console.log(headers)

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body
    });
    // console.log(response)

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Referrer-Policy', 'no-referrer');
    // responseHeaders.set('X-RateLimit-Remaining', `${30 - rateLimiter.requests}`);
    // responseHeaders.set('X-TokenLimit-Remaining', `${6000 - rateLimiter.tokens}`);

    const processedResponse = await processResponse(response);

    return new Response(processedResponse.body, {
      status: processedResponse.status,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Failed to fetch:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  }else{
    return new Response('Unsupport URL!', {
      status: 404,
      headers: { 'Content-Type': 'text/html' }
    });
  }
};
