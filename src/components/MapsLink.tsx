// Opens the place in Google Maps through the public search URL (no API key).
const MAPS_SEARCH_URL = "https://www.google.com/maps/search/?api=1&query=";

type MapsLinkProps = {
  place: string;
  // The note ("by the entrance") is left out of the search on purpose.
  className?: string;
};

export function MapsLink({ place, className = "" }: MapsLinkProps) {
  const name = place.trim();
  if (name === "") return null;

  return (
    <a
      href={`${MAPS_SEARCH_URL}${encodeURIComponent(name)}`}
      // New tab; noopener/noreferrer keep the secret invitation URL from leaking.
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-block text-xs font-medium text-accent underline underline-offset-2 ${className}`}
    >
      Open in Maps
    </a>
  );
}
