export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let pathname = url.pathname;

    // Root path fallback
    if (pathname === "/" || pathname === "") {
      pathname = "/index.html";
    }

    // Clean URL support (e.g. /sampada_categories -> /sampada_categories.html)
    if (!pathname.includes(".")) {
      pathname += ".html";
    }

    try {
      // Fetch asset from Cloudflare KV / Assets
      const response = await env.ASSETS.fetch(new Request(new URL(pathname, request.url), request));
      
      if (response.status === 404) {
        // Fallback to index.html for Single Page Applications
        return await env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
      }
      
      return response;
    } catch (e) {
      return await env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
    }
  }
};