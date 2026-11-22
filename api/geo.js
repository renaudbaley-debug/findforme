// api/geo.js
// Détection approximative de la position du visiteur à partir de son adresse IP,
// SANS demander d'autorisation. Vercel fournit ces en-têtes automatiquement.
// Appelée par la page au chargement : GET /api/geo

const COUNTRY_LANG = {
  DE: "allemand", AT: "allemand", CH: "allemand",
  FR: "français", BE: "français", LU: "français", MC: "français",
  NL: "néerlandais",
  GB: "anglais", IE: "anglais", US: "anglais", CA: "anglais", AU: "anglais",
  ES: "espagnol", MX: "espagnol", AR: "espagnol",
  IT: "italien", PT: "portugais", BR: "portugais",
  PL: "polonais", DK: "danois", SE: "suédois", NO: "norvégien", FI: "finnois",
  CZ: "tchèque", GR: "grec", RO: "roumain", HU: "hongrois",
};

export default async function handler(req, res) {
  const header = (name) => {
    const v = req.headers[name];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : "";
  };

  const lat = parseFloat(header("x-vercel-ip-latitude"));
  const lon = parseFloat(header("x-vercel-ip-longitude"));
  const country = header("x-vercel-ip-country").toUpperCase();

  let city = header("x-vercel-ip-city");
  try {
    city = decodeURIComponent(city);
  } catch {
    /* la ville peut arriver encodée ou vide : on garde la valeur brute */
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    // Pas d'information IP : la page reste sur sa ville par défaut
    return res.status(200).json({ detected: false });
  }

  return res.status(200).json({
    detected: true,
    city: city || null,
    country: country || null,
    lat,
    lon,
    targetLang: COUNTRY_LANG[country] || "anglais",
  });
}
