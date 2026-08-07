const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointInBounds(lat, lng, bounds) {
  if (!bounds) return false;
  return (
    lat <= bounds.north
    && lat >= bounds.south
    && lng <= bounds.east
    && lng >= bounds.west
  );
}

function pointInPolygon(lat, lng, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [lngI, latI] = polygon[i];
    const [lngJ, latJ] = polygon[j];
    const intersects =
      latI > lat !== latJ > lat
      && lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInCircle(lat, lng, center, radiusKm) {
  const centerLat = Number(center?.lat ?? center?.latitude);
  const centerLng = Number(center?.lng ?? center?.longitude);
  const radius = Number(radiusKm);
  if (
    !Number.isFinite(centerLat) ||
    !Number.isFinite(centerLng) ||
    !Number.isFinite(radius) ||
    radius <= 0
  ) {
    return false;
  }
  return haversineKm(Number(lat), Number(lng), centerLat, centerLng) <= radius;
}

module.exports = {
  haversineKm,
  pointInBounds,
  pointInPolygon,
  pointInCircle,
};
