## NextJS optimizations we get to take advantage of
1. CSS auto-bundled with the build (in prod only)
2. When we use next/fonts we bundle the fonts with the package too (no cls) and yes you can pre-download custom fonts and use it with local fonts (in case they don't pacakge it)
3. Image optimizers: we don't have to manually size images, manually responsive-ize images, manually create different sizes for different screen sizes, lazy-load images outside the viewport if we use next/image.
4. Progressive enhancement (good when there's no JS - Forms just wrap native form.)

reading 
https://nextjs.org/docs/app/getting-started/images
https://nextjs.org/docs/app/getting-started/fonts
https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/Multimedia
https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Text_styling/Web_fonts
https://vercel.com/blog/how-core-web-vitals-affect-seo
https://vercel.com/blog/how-google-handles-javascript-throughout-the-indexing-process


## Rendering & Nav & fetching concepts
#### Rendering
1. Partial rendering: Layouts keep client state/don't re-render when you use <Link>. Also lets you prerender page content. More performant than dynamic rendering. (lots of nuanced exceptions here tho)
2. Static vs dynamic rendering: Static rendering is a performance strategy. Render at build time or in the background & cache it, when it revalidates. Prerendering is the general mechanism/action of actually doing the render
3. Partial Prerendering ... Has to do with streaming? Or... Cache Components
 - read cache components.

This of course is different from
#### Routing concepts:
- Prefetching (content stored in client-side cache)
- Client-side navigation: This just says "<Link> intecepts all your http requests and only fetches the new content"

connection() seems to be usable only with suspense/ need to test this.

Independently (but leveraged frequently above), there's 
#### Caching
- There's a client-side cache which stores route segments in the browser for a time (so prefetch is BEFORE a request and the router cache is AFTER a request)

And the TYPE of route is behaves if its a
### Dynamic VS Static Route
- Remember the revalidatePath footgun if it's a static route

*And somehow cache components make this easier*


So, in an ideal scenario, you've partially rendered static content, which then gets prefetched into the browser cache, and is displayed via client-side navigation

- Dynamic rendering can be offset by using <Link>, which prefetches all <Links> whsoen they enter the viewport. (In a build, only, not dev)
- NOTE: We use static rendering by default it seems... so at build time even if there's a db call, it'll just query the db once at build time. in the current example, the postgres lib isn't part of next so it doesn't know to look for it. it only knows `fetch` and a few other flags (in that case it'll set it to dynamic)


### Code splitting
- Code split by route segments so we don't load the whole bundle all the time (i.e. SPA). Auto-chunked (applies to client-code so the first thing to look at is server-rendering)

## Quanitify performance
- Vercel's OpenTelemetry
- React performance in Chrome console
- Fetch logging in next (done)