// api/geocode.js
// Recherche de ville par son nom (n'importe quelle ville du monde),
// via le géocodage gratuit Nominatim (OpenStreetMap).
// Appelée par la page : GET /api/geocode?q=berlin
// IMPORTANT : remplacez l'e-mail dans User-Agent par votre adresse réelle
// (exigence de la politique d'utilisation de Nominatim).

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const COUNTRY_LANG = {
  DE: "allemand", AT: "allemand", CH: "allemand", LI: "allemand",
  FR: "français", BE: "français", LU: "français", MC: "français",
  NL: "néerlandais",
  GB: "anglais", IE: "anglais", US: "anglais", CA: "anglais", AU: "anglais",
  ES: "espagnol", MX: "espagnol", AR: "espagnol",
  IT: "italien", PT: "portugais", BR: "portugais",
  PL: "polonais", DK: "danois", SE: "suédois", NO: "norvégien", FI: "finnois",
  CZ: "tchèque", GR: "grec", RO: "roumain", HU: "hongrois",
};

const cache = new Map(); // q -> { results, date }
const CACHE_MS = 6 * 60 * 60 * 1000; // 6 heures

export default async function handler(req, res) {
  const q = String(req.query?.q || "").trim().slice(0, 80);
  if (q.length < 2) {
    return res.status(400).json({ error: "Indiquez un nom de ville (au moins 2 caractères)." });
  }

  const key = q.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.date < CACHE_MS) {
    return res.status(200).json(cached.results);
  }

  try {
    const url = `${NOMINATIM_URL}?format=jsonv2&limit=6&addressdetails=1&accept-language=fr&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "findforme/1.0 (+https://www.findforme.biz; contact@findforme.biz)",
        "Accept-Language": "fr",
      },
    });
    if (!response.ok) {
      return res.status(502).json({ error: "Service de géocodage indisponible." });
    }
    const data = await response.json();

    const results = (Array.isArray(data) ? data : [])
      .filter((r) => r.lat && r.lon)
      .map((r) => {
        const parts = String(r.display_name || "").split(",").map((p) => p.trim());
        const countryCode = (r.address?.country_code || "").toUpperCase();
        return {
          name: parts[0] || r.display_name,
          region: parts.slice(1, -1).join(", ") || null,
          country: r.address?.country || parts[parts.length - 1] || null,
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon),
          targetLang: COUNTRY_LANG[countryCode] || "anglais",
        };
      });

    cache.set(key, { results, date: Date.now() });
    return res.status(200).json(results);
  } catch {
    return res.status(502).json({ error: "Erreur pendant la recherche de la ville." });
  }
}
