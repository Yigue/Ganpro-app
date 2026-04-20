/**
 * Pure TypeScript GIS utilities for GanPro.
 * No React/RN imports.
 */

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface GeoPolygon {
  points: GeoPoint[];
}

export interface SvgPoint {
  x: number;
  y: number;
}

/**
 * Safely parses a GeoJSON string into a GeoPolygon.
 * Supports GeoJSON Feature, FeatureCollection, and Polygon geometry types.
 * Returns null on any parse error or unsupported format.
 */
export function parseGeoJSON(raw: string): GeoPolygon | null {
  try {
    const parsed = JSON.parse(raw);
    let coordinates: number[][] | null = null;

    if (parsed.type === 'Polygon') {
      coordinates = parsed.coordinates?.[0] ?? null;
    } else if (parsed.type === 'Feature' && parsed.geometry?.type === 'Polygon') {
      coordinates = parsed.geometry.coordinates?.[0] ?? null;
    } else if (
      parsed.type === 'FeatureCollection' &&
      Array.isArray(parsed.features) &&
      parsed.features.length > 0
    ) {
      const firstFeature = parsed.features[0];
      if (firstFeature?.geometry?.type === 'Polygon') {
        coordinates = firstFeature.geometry.coordinates?.[0] ?? null;
      }
    }

    if (!coordinates || !Array.isArray(coordinates)) return null;

    const points: GeoPoint[] = coordinates.map((coord) => ({
      lon: coord[0],
      lat: coord[1],
    }));

    return { points };
  } catch {
    return null;
  }
}

/**
 * Calculates stocking density in animals/hectare.
 */
export function calcularDensidadCarga(
  animalesCount: number,
  hectareas: number
): number {
  if (hectareas === 0) return 0;
  return animalesCount / hectareas;
}

/**
 * Normalizes GeoPolygon lat/lon coordinates to SVG canvas dimensions.
 * Maps the bounding box of the polygon to fit within canvasW × canvasH
 * with a small padding margin.
 */
export function renderPolygonPoints(
  polygon: GeoPolygon,
  canvasW: number,
  canvasH: number
): SvgPoint[] {
  if (polygon.points.length === 0) return [];

  const padding = 10;
  const usableW = canvasW - 2 * padding;
  const usableH = canvasH - 2 * padding;

  const lats = polygon.points.map((p) => p.lat);
  const lons = polygon.points.map((p) => p.lon);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const spanLat = maxLat - minLat || 1;
  const spanLon = maxLon - minLon || 1;

  return polygon.points.map((p) => ({
    x: padding + ((p.lon - minLon) / spanLon) * usableW,
    // Flip y-axis: higher lat = higher on screen
    y: padding + ((maxLat - p.lat) / spanLat) * usableH,
  }));
}

/**
 * Calculates the area of a polygon in hectares using the Shoelace formula.
 * Assumes points are in WGS84 lat/lon.
 * Converts result from square degrees to km² using approximate conversion,
 * then to hectares (1 km² = 100 ha).
 */
export function calcularAreaHectareas(polygon: GeoPolygon): number {
  const pts = polygon.points;
  if (pts.length < 3) return 0;

  // Shoelace formula for area in "lat/lon squared units"
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i].lon * pts[j].lat;
    area -= pts[j].lon * pts[i].lat;
  }
  area = Math.abs(area) / 2;

  // Approximate conversion at the centroid latitude
  const avgLat = pts.reduce((sum, p) => sum + p.lat, 0) / n;
  const latRad = (avgLat * Math.PI) / 180;

  // 1 degree latitude ≈ 111.32 km
  // 1 degree longitude ≈ 111.32 * cos(lat) km
  const kmPerDegreeLat = 111.32;
  const kmPerDegreeLon = 111.32 * Math.cos(latRad);

  const areaKm2 = area * kmPerDegreeLat * kmPerDegreeLon;
  return areaKm2 * 100; // km² → hectares
}
