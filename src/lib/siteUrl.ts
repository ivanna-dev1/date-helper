// Links to share use the production domain: Vercel's per-deployment addresses ask for a login.
const productionUrl = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL = productionUrl
  ? `https://${productionUrl}`
  : "http://localhost:3000";

// On a computer the browser's address is used: the dev server may be on another port or open from a phone.
export function getShareOrigin(): string {
  return productionUrl ? SITE_URL : window.location.origin;
}
