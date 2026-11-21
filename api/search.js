// api/search.js
// Backend de findforme.biz, fonction serverless Vercel.
// À créer dans un dossier "api" à la racine du projet :  api/search.js
// Nécessite la variable d'environnement MISTRAL_API_KEY
// (Vercel > Settings > Environment Variables). Ne jamais mettre la clé dans App.tsx.

const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const SHOP_LABELS = {
  hardware: "quincaillerie",
  doityourself: "bricolage",
  electronics: "électronique",
  electrical: "fournitures électriques",
  paint: "peinture / décoration",
  appliance: "électroménager",
  secondhand: "occasion",
  seafood: "poissonnerie",
  supermarket: "supermarché",
  convenience: "épicerie",
  frozen_food: "surgelés",
  greengrocer: "primeur",
  bakery: "boulangerie",
  butcher: "boucherie",
  deli: "traiteur",
  beverages: "boissons",
  chemist: "parapharmacie",
  books: "librairie",
  stationery: "papeterie",
  clothes: "vêtements",
  shoes: "chaussures",
  sports: "articles de sport",
  bicycle: "magasin de vélos",
  car_parts: "pièces auto",
  garden_centre: "jardinage",
  furniture: "meubles",
  mobile_phone: "téléphonie",
  computer: "informatique",
  photo: "photo",
  toys: "jouets",
  gift: "cadeaux",
  florist: "fleuriste",
  pet: "animalerie",
};

const ALLOWED_SHOPS = Object.keys(SHOP_LABELS);

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function extractJson(text) {
  const match = String(text).match(/\{[\s\S]*\}/);
  if (!match) throw new Error("La réponse du modèle n'était pas un JSON valide.");
  return JSON.parse(match[0]);
}

async function askMistral(apiKey, params) {
  const { query, imageBase64, imageType, queryLang, targetLang, cityName } = params;

  const prompt = `Tu aides un service de recherche d'objets en magasin près de soi.
L'utilisateur fait sa recherche en ${queryLang}, dans la ville de ${cityName} où la langue locale est le ${targetLang}.
${imageBase64 ? "Une photo est fournie : identifie d'abord l'objet principal qu'elle montre." : ""}
Décris l'objet de façon courante et concrète, comme le dirait un client en magasin.
Choisis les catégories de magasins adaptées à CET objet avec soin
(exemples : poisson → seafood ou supermarket ; tournevis → hardware ou doityourself ; pile → electronics ou supermarket).
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :
{
  "objet_fr": "nom de l'objet en français",
  "objet_local": "nom de l'objet dans la langue locale (orthographe correcte, nom utilisé en magasin)",
  "categories_shop": ["une à trois valeurs à choisir uniquement parmi : ${ALLOWED_SHOPS.join(", ")}"]
}`;

  const content = [{ type: "text", text: prompt }];
  if (imageBase64) {
    content.push({ type: "image_url", image_url: `data:${imageType || "image/jpeg"};base64,${imageBase64}` });
  } else if (query) {
    content.push({ type: "text", text: `Recherche de l'utilisateur : « ${query} »` });
  }

  const response = await fetch(MISTRAL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: imageBase64 ? "pixtral-12b-latest" : "mistral-small-latest",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Appel Mistral en échec (${response.status}) : ${detail.slice(0, 300)}`);
  }
  const data = await response.json();
  return extractJson(data.choices[0].message.content);
}

function overpassQuery(categories, lat, lon, radiusMeters) {
  const clauses = [];
  for (const cat of categories) {
    clauses.push(`node["shop"="${cat}"](around:${radiusMeters},${lat},${lon});`);
    clauses.push(`way["shop"="${cat}"](around:${radiusMeters},${lat},${lon});`);
  }
  return `[out:json][timeout:25];(\n  ${clauses.join("\n  ")}\n);out center 40;`;
}

async function fetchOverpassAny(query) {
  let lastError = "";
  for (const server of OVERPASS_SERVERS) {
    try {
      const response = await fetch(server, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "findforme/1.0 (+https://www.findforme.biz)",
        },
        body: "data=" + encodeURIComponent(query),
      });
      if (!response.ok) {
        lastError = `${server} → HTTP ${response.status}`;
        continue;
      }
      const data = await response.json();
      if (Array.isArray(data.elements)) {
        return { elements: data.elements };
      }
      lastError = `${server} → réponse inattendue`;
    } catch (err) {
      lastError = `${server} → ${err.message}`;
    }
  }
  return {
    elements: [],
    error: `aucun serveur de carte n'a répondu (${lastError}). Réessayez dans une minute.`,
  };
}

async function findStores(categoriesAsked, lat, lon) {
  const safe = (categoriesAsked || []).filter((c) => ALLOWED_SHOPS.includes(c));
  const categories = safe.length > 0 ? safe : ["supermarket", "hardware", "doityourself"];

  let elements = [];
  let overpassError = null;
  for (const radius of [8000, 20000, 40000]) {
    const attempt = await fetchOverpassAny(overpassQuery(categories, lat, lon, radius));
    if (attempt.error) {
      overpassError = attempt.error;
      break;
    }
    if (attempt.elements.length > 0) {
      elements = attempt.elements;
      break;
    }
  }

  const storesRaw = [];
  for (const el of elements) {
    const sLat = el.lat ?? el.center?.lat;
    const sLon = el.lon ?? el.center?.lon;
    if (typeof sLat !== "number" || typeof sLon !== "number") continue;
    const tags = el.tags || {};
    const address = [
      [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" "),
      tags["addr:postcode"],
      tags["addr:city"],
    ].filter(Boolean).join(", ");
    storesRaw.push({
      name: tags.name || tags.operator || tags.brand || "Magasin non nommé",
      address: address || null,
      lat: sLat,
      lon: sLon,
      distanceKm: Math.round(haversine(lat, lon, sLat, sLon) * 10) / 10,
      categories: (tags.shop ? [tags.shop] : []).map((c) => SHOP_LABELS[c] || c),
    });
  }

  // Dédoublonnage par nom et position, tri par distance
  const seen = new Set();
  const stores = storesRaw
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .filter((s) => {
      const key = s.name + "@" + s.lat.toFixed(4) + "," + s.lon.toFixed(4);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);

  return { stores, overpassError };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Utilisez la méthode POST." });
  }

  const { query, imageBase64, imageType, lat, lon, queryLang, targetLang, cityName } = req.body || {};

  if (typeof lat !== "number" || typeof lon !== "number") {
    return res.status(400).json({ error: "Coordonnées (lat, lon) manquantes ou invalides." });
  }
  if (!query && !imageBase64) {
    return res.status(400).json({ error: "Fournissez un texte (query) ou une image (imageBase64)." });
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Clé Mistral absente côté serveur : ajoutez MISTRAL_API_KEY dans les variables d'environnement Vercel, puis redéployez.",
    });
  }

  try {
    const analysed = await askMistral(apiKey, {
      query,
      imageBase64,
      imageType,
      queryLang: queryLang || "français",
      targetLang: targetLang || "la langue locale",
      cityName: cityName || "la ville donnée par la position",
    });

    const { stores, overpassError } = await findStores(analysed.categories_shop, lat, lon);

    return res.status(200).json({
      objet_fr: analysed.objet_fr,
      objet_local: analysed.objet_local,
      categoryLabels: (analysed.categories_shop || []).map((c) => SHOP_LABELS[c] || c),
      stockNote: overpassError
        ? `Carte indisponible pour le moment : ${overpassError}`
        : "Disponibilité non vérifiée en temps réel : appelez le magasin si besoin.",
      stores,
    });
  } catch (err) {
    return res.status(502).json({ error: err.message || "Erreur inattendue du backend." });
  }
}
