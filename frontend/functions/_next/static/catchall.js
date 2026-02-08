// Cloudflare Pages Functions - 处理 MIME 类型
export function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  
  // 设置正确的 MIME 类型
  let contentType = 'text/plain';
  if (pathname.endsWith('.js') || pathname.includes('/chunks/')) {
    contentType = 'application/javascript';
  } else if (pathname.endsWith('.css')) {
    contentType = 'text/css';
  } else if (pathname.endsWith('.json')) {
    contentType = 'application/json';
  } else if (pathname.endsWith('.png')) {
    contentType = 'image/png';
  } else if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) {
    contentType = 'image/jpeg';
  } else if (pathname.endsWith('.svg')) {
    contentType = 'image/svg+xml';
  } else if (pathname.endsWith('.ico')) {
    contentType = 'image/x-icon';
  }
  
  // 代理请求并设置正确的 headers
  return fetch(context.request).then(response => {
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Content-Type', contentType);
    newResponse.headers.set('X-Content-Type-Options', 'nosniff');
    return newResponse;
  }).catch(error => {
    return new Response('Error: ' + error.message, { status: 500 });
  });
}
