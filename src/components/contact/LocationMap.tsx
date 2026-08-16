import { ExternalLink, MapPin } from "lucide-react";

/**
 * Sydney Opera House — the default pin until the CMS supplies coordinates
 * under `contact.mapLat` / `contact.mapLng`.
 */
const DEFAULT_PLACE = {
  lat: -33.856784,
  lng: 151.215297,
  label: "Sydney Opera House",
  area: "Bennelong Point, Sydney NSW 2000, Australia",
};

/** Roughly a 1.3 km × 0.9 km window around the pin — close enough to read street names. */
function boundingBox(lat: number, lng: number) {
  const padLat = 0.004;
  const padLng = 0.006;
  return [lng - padLng, lat - padLat, lng + padLng, lat + padLat]
    .map((n) => n.toFixed(6))
    .join(",");
}

/**
 * OpenStreetMap's export embed: no API key, no third-party script, and nothing
 * to configure per environment. `contact.mapEmbed` still wins when the CMS has
 * one, so an editor can drop in a Google Maps embed without a deploy.
 */
export function LocationMap({
  embedUrl,
  lat = DEFAULT_PLACE.lat,
  lng = DEFAULT_PLACE.lng,
  label = DEFAULT_PLACE.label,
  area = DEFAULT_PLACE.area,
}: {
  embedUrl?: string | null;
  lat?: number;
  lng?: number;
  label?: string;
  area?: string;
}) {
  const src =
    embedUrl ||
    `https://www.openstreetmap.org/export/embed.html?bbox=${boundingBox(lat, lng)}` +
      `&layer=mapnik&marker=${lat},${lng}`;

  const directions = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <section className="mt-8">
      <h2 className="text-xs font-semibold tracking-wider text-ink-muted uppercase">Find us</h2>

      <div className="mt-3 overflow-hidden rounded-[var(--radius-card)] border border-line">
        <iframe
          src={src}
          title={`Map showing ${label}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="aspect-4/3 w-full border-0"
        />

        <div className="flex items-start gap-3 border-t border-line bg-surface-raised px-4 py-3">
          <MapPin className="mt-0.5 size-4 shrink-0 text-flame-600 dark:text-flame-400" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{label}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{area}</p>
          </div>
          <a
            href={directions}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-flame-600 transition-colors hover:text-flame-700 dark:text-flame-400"
          >
            Directions
            <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}
