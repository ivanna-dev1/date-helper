// The one address of the site, for links we give people to share.
//
// Every deployment on Vercel also gets its own address, like
// "date-helper-1r1u76204-ivanna-dev1.vercel.app". Such an address asks for
// a Vercel login and belongs to one build only, so a link copied from it
// does not work for anyone else. Vercel tells us the real domain in
// NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ("NEXT_PUBLIC_" means the
// browser may read it too), so we always build links from that.
const productionUrl = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL = productionUrl
  ? `https://${productionUrl}`
  : "http://localhost:3000";

// The address to put in front of a path like "/i/k7Fq2mXp9RtA".
// On a computer, where there is no Vercel, the browser knows best:
// the dev server can run on another port, or be opened from a phone.
export function getShareOrigin(): string {
  return productionUrl ? SITE_URL : window.location.origin;
}
