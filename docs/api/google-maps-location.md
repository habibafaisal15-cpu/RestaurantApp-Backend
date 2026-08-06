# Google Maps Location APIs

Backend APIs for live location, map pin selection, and address search.  
Frontend uses **Google Maps JavaScript API** for the map UI; backend handles geocoding and zone checks.

## Setup

Add to `backend/.env`:

```env
GOOGLE_MAPS_API_KEY=your_server_key
GOOGLE_MAPS_BROWSER_KEY=your_browser_key
```

Enable in Google Cloud Console:
- Geocoding API
- Places API
- Maps JavaScript API (browser key)

Without `GOOGLE_MAPS_API_KEY`, coordinate-based zone matching still works; geocoding/autocomplete return errors or fallbacks.

---

## Get maps config (frontend init)

```
GET /api/v1/storefront/maps/config
```

```json
{
  "success": true,
  "data": {
    "maps_enabled": true,
    "browser_api_key": "AIza...",
    "geocoding_enabled": true,
    "autocomplete_enabled": true,
    "default_center": { "lat": 31.5497, "lng": 74.3436 },
    "default_zoom": 13
  }
}
```

Frontend uses `browser_api_key` to load Google Maps JS.

---

## Select live location (main flow)

User shares GPS or drops a pin on the map:

```
POST /api/v1/storefront/location/select-live
```

```json
{
  "latitude": 31.5497,
  "longitude": 74.3436,
  "address": "Optional label override"
}
```

**Response (serviceable):**
```json
{
  "success": true,
  "data": {
    "serviceable": true,
    "geocoding_source": "google",
    "zone": {
      "id": "...",
      "zone_name": "Downtown",
      "base_fee": 2.99,
      "estimated_time": "25-35 min"
    },
    "location": {
      "latitude": 31.5497,
      "longitude": 74.3436,
      "formatted_address": "Main Boulevard, Lahore",
      "pincode": "54000",
      "area": "Gulberg",
      "city": "Lahore",
      "place_id": "ChIJ..."
    }
  }
}
```

---

## Reverse geocode (coordinates → address)

```
POST /api/v1/storefront/location/reverse-geocode
{ "latitude": 31.5497, "longitude": 74.3436 }
```

---

## Geocode address (typed search)

```
POST /api/v1/storefront/location/geocode
{ "address": "DHA Phase 5, Lahore" }
```

---

## Place ID (from autocomplete selection)

```
POST /api/v1/storefront/location/place
{ "place_id": "ChIJ..." }
```

---

## Address autocomplete

```
GET /api/v1/storefront/location/autocomplete?input=DHA+Phase+5
GET /api/v1/storefront/location/autocomplete?input=DHA&session_token=abc123
```

Returns Google Places predictions. Frontend shows dropdown; on select, call `/location/place` then `/check-location` or use `/location/select-live`.

---

## Check location (enhanced)

```
POST /api/v1/storefront/check-location
```

Accepts any of:
- `{ "latitude": 31.55, "longitude": 74.34 }`
- `{ "place_id": "ChIJ..." }`
- `{ "address": "DHA Phase 5, Lahore" }`
- `{ "pincode": "54000" }` (legacy)

---

## Place order with coordinates

```
POST /api/v1/storefront/orders
```

```json
{
  "zone_id": "...",
  "customer_name": "Ali",
  "customer_phone": "+923001234567",
  "delivery_address": "DHA Phase 5, Lahore",
  "delivery_latitude": 31.4697,
  "delivery_longitude": 74.4103,
  "delivery_place_id": "ChIJ...",
  "payment_method": "COD",
  "items": [{ "product_id": "...", "quantity": 1 }]
}
```

---

## Zone matching

Zones support matching by:
- **GPS radius** — `center` + `radius_km` in `service_area`
- **Bounding box** — `bounds: { north, south, east, west }`
- **Polygon** — `polygon: [[lng, lat], ...]`
- **Pincode / area name** — legacy text matching

Seed zone "Downtown" covers Lahore area (~12 km radius from 31.5497, 74.3436).

---

## Frontend integration flow

```
1. GET  /maps/config                    → load Google Maps with browser_api_key
2. User picks live GPS or map pin
3. POST /location/select-live           → get zone + formatted address
4. GET  /menu?zone_id=...               → browse menu
5. POST /orders                         → include delivery_latitude/longitude
```

Optional search flow:
```
GET  /location/autocomplete?input=...
POST /location/place                    → { place_id }
POST /check-location                    → { place_id } or coords
```
