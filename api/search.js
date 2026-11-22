// api/search.js
// Backend de findforme.biz, fonction serverless Vercel, version accélérée :
// - Mistral et OpenStreetMap interrogés EN PARALLÈLE (au lieu de l'un après l'autre)
// - réponses de carte mémorisées 30 minutes par zone (cache en mémoire)
// - dictionnaire d'objets courants : réponse instantanée sans appeler l'IA
// Nécessite la variable d'environnement MISTRAL_API_KEY.

const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const SHOP_LABELS = {
  hardware: "quincaillerie", doityourself: "bricolage", electronics: "électronique",
  electrical: "fournitures électriques", paint: "peinture / décoration",
  appliance: "électroménager", secondhand: "occasion", seafood: "poissonnerie",
  supermarket: "supermarché", convenience: "épicerie", frozen_food: "surgelés",
  greengrocer: "primeur", bakery: "boulangerie", butcher: "boucherie", deli: "traiteur",
  beverages: "boissons", chemist: "parapharmacie", books: "librairie", stationery: "papeterie",
  clothes: "vêtements", shoes: "chaussures", sports: "articles de sport", bicycle: "magasin de vélos",
  car_parts: "pièces auto", garden_centre: "jardinage", furniture: "meubles",
  mobile_phone: "téléphonie", computer: "informatique", photo: "photo", toys: "jouets",
  gift: "cadeaux", florist: "fleuriste", pet: "animalerie",
};

const ALLOWED_SHOPS = Object.keys(SHOP_LABELS);

// Catégories les plus demandées, interrogées d'avance en parallèle de l'IA.
// Elles couvrent l'immense majorité des recherches.
const BROAD_CATS = [
  "hardware", "doityourself", "supermarket", "electronics", "convenience",
  "electrical", "appliance", "secondhand", "seafood", "bakery", "butcher",
  "greengrocer", "chemist", "mobile_phone", "computer",
];

const LANG_CODE = {
  "français": "fr", "french": "fr", "anglais": "en", "english": "en",
  "allemand": "de", "german": "de", "néerlandais": "nl", "dutch": "nl",
  "espagnol": "es", "spanish": "es",
};

// ------------------------------------------------------------------
// Dictionnaire d'objets courants : réponse instantanée (aucun appel IA)
// ------------------------------------------------------------------

const DICT = [
  { keys: ["tournevis", "screwdriver", "schraubendreher", "schroevendraaier", "destornillador"], fr: "tournevis", en: "screwdriver", de: "Schraubendreher", nl: "schroevendraaier", es: "destornillador", cats: ["hardware", "doityourself", "secondhand"] },
  { keys: ["marteau", "hammer", "hamer", "martillo", "claw hammer"], fr: "marteau", en: "hammer", de: "Hammer", nl: "hamer", es: "martillo", cats: ["hardware", "doityourself", "secondhand"] },
  { keys: ["clou", "nail", "nagel", "spijker", "clavo"], fr: "clou", en: "nail", de: "Nagel", nl: "spijker", es: "clavo", cats: ["hardware", "doityourself"] },
  { keys: ["perceuse", "visseuse", "drill", "bohrmaschine", "boormachine", "taladro"], fr: "perceuse", en: "drill", de: "Bohrmaschine", nl: "boormachine", es: "taladro", cats: ["hardware", "doityourself", "secondhand"] },
  { keys: ["vis", "screw", "schraube", "schroef", "tornillo"], fr: "vis", en: "screw", de: "Schraube", nl: "schroef", es: "tornillo", cats: ["hardware", "doityourself"] },
  { keys: ["scie", "saw", "säge", "zaag", "sierra"], fr: "scie", en: "saw", de: "Säge", nl: "zaag", es: "sierra", cats: ["hardware", "doityourself"] },
  { keys: ["pelle", "shovel", "schaufel", "schep", "pala"], fr: "pelle", en: "shovel", de: "Schaufel", nl: "schep", es: "pala", cats: ["hardware", "doityourself", "garden_centre"] },
  { keys: ["rouleau", "paint roller", "farbrolle", "verfroller", "rodillo"], fr: "rouleau de peinture", en: "paint roller", de: "Farbrolle", nl: "verfroller", es: "rodillo de pintura", cats: ["paint", "hardware", "doityourself"] },
  { keys: ["colle", "glue", "kleber", "lijm", "pegamento"], fr: "colle", en: "glue", de: "Kleber", nl: "lijm", es: "pegamento", cats: ["hardware", "doityourself", "supermarket"] },
  { keys: ["ruban adhesif", "adhesive tape", "duct tape", "klebeband", "plakband", "cinta adhesiva"], fr: "ruban adhésif", en: "adhesive tape", de: "Klebeband", nl: "plakband", es: "cinta adhesiva", cats: ["hardware", "supermarket", "doityourself"] },
  { keys: ["pile", "batterie", "battery", "batterij", "aa battery"], fr: "pile", en: "battery", de: "Batterie", nl: "batterij", es: "pila", cats: ["electronics", "supermarket", "convenience"] },
  { keys: ["ampoule", "light bulb", "glühbirne", "gloeilamp", "bombilla"], fr: "ampoule", en: "light bulb", de: "Glühbirne", nl: "gloeilamp", es: "bombilla", cats: ["supermarket", "hardware", "doityourself"] },
  { keys: ["chargeur", "charger", "ladegerät", "oplader", "cargador"], fr: "chargeur", en: "charger", de: "Ladegerät", nl: "oplader", es: "cargador", cats: ["electronics", "mobile_phone", "computer", "supermarket"] },
  { keys: ["cable usb", "usb cable", "usb-kabel", "usb-kabel", "cable usb", "cordon usb"], fr: "câble USB", en: "USB cable", de: "USB-Kabel", nl: "USB-kabel", es: "cable USB", cats: ["electronics", "computer", "supermarket"] },
  { keys: ["adaptateur", "power adapter", "stecker-adapter", "stekkeradapter", "adaptador de enchufe", "travel adapter"], fr: "adaptateur de prise", en: "power plug adapter", de: "Stecker-Adapter", nl: "stekkeradapter", es: "adaptador de enchufe", cats: ["electronics", "hardware", "supermarket"] },
  { keys: ["multiprise", "power strip", "steckdosenleiste", "stekkerdoos", "regleta"], fr: "multiprise", en: "power strip", de: "Steckdosenleiste", nl: "stekkerdoos", es: "regleta", cats: ["electronics", "hardware"] },
  { keys: ["parapluie", "umbrella", "regenschirm", "paraplu", "paraguas"], fr: "parapluie", en: "umbrella", de: "Regenschirm", nl: "paraplu", es: "paraguas", cats: ["supermarket", "convenience", "secondhand"] },
  { keys: ["cadenas", "padlock", "vorhängeschloss", "hangslot", "candado"], fr: "cadenas", en: "padlock", de: "Vorhängeschloss", nl: "hangslot", es: "candado", cats: ["hardware", "doityourself", "supermarket"] },
  { keys: ["lampe de poche", "lampe torche", "flashlight", "torch", "taschenlampe", "zaklamp", "linterna"], fr: "lampe de poche", en: "flashlight", de: "Taschenlampe", nl: "zaklamp", es: "linterna", cats: ["electronics", "hardware", "supermarket"] },
  { keys: ["bougies", "candle", "kerze", "kaars", "vela"], fr: "bougie", en: "candle", de: "Kerze", nl: "kaars", es: "vela", cats: ["supermarket", "convenience", "florist"] },
  { keys: ["allumettes", "matches", "streichhölzer", "lucifers", "cerillas"], fr: "allumettes", en: "matches", de: "Streichhölzer", nl: "lucifers", es: "cerillas", cats: ["supermarket", "convenience"] },
  { keys: ["pain", "bread", "brot", "brood", "pan", "baguette"], fr: "pain", en: "bread", de: "Brot", nl: "brood", es: "pan", cats: ["bakery", "supermarket", "convenience"] },
  { keys: ["lait", "milk", "milch", "melk", "leche"], fr: "lait", en: "milk", de: "Milch", nl: "melk", es: "leche", cats: ["supermarket", "convenience"] },
  { keys: ["oeufs", "eggs", "eier", "eieren", "huevos"], fr: "œufs", en: "eggs", de: "Eier", nl: "eieren", es: "huevos", cats: ["supermarket", "convenience"] },
  { keys: ["beurre", "butter", "boter", "mantequilla"], fr: "beurre", en: "butter", de: "Butter", nl: "boter", es: "mantequilla", cats: ["supermarket", "convenience"] },
  { keys: ["cafe", "coffee", "kaffee", "koffie"], fr: "café", en: "coffee", de: "Kaffee", nl: "koffie", es: "café", cats: ["supermarket", "beverages", "convenience"] },
  { keys: ["sucre", "sugar", "zucker", "suiker", "azucar"], fr: "sucre", en: "sugar", de: "Zucker", nl: "suiker", es: "azúcar", cats: ["supermarket", "convenience"] },
  { keys: ["poisson", "fish", "fisch", "vis", "pescado"], fr: "poisson", en: "fish", de: "Fisch", nl: "vis", es: "pescado", cats: ["seafood", "supermarket", "frozen_food"] },
  { keys: ["viande", "meat", "fleisch", "vlees", "carne"], fr: "viande", en: "meat", de: "Fleisch", nl: "vlees", es: "carne", cats: ["butcher", "supermarket"] },
  { keys: ["dentifrice", "toothpaste", "zahnpasta", "tandpasta", "pasta de dientes"], fr: "dentifrice", en: "toothpaste", de: "Zahnpasta", nl: "tandpasta", es: "pasta de dientes", cats: ["supermarket", "convenience", "chemist"] },
  { keys: ["savon", "soap", "seife", "zeep", "jabon"], fr: "savon", en: "soap", de: "Seife", nl: "zeep", es: "jabón", cats: ["supermarket", "chemist", "convenience"] },
  { keys: ["brosse a dents", "toothbrush", "zahnbürste", "tandenborstel", "cepillo de dientes"], fr: "brosse à dents", en: "toothbrush", de: "Zahnbürste", nl: "tandenborstel", es: "cepillo de dientes", cats: ["supermarket", "chemist", "convenience"] },
  { keys: ["rasoir", "razor", "rasierer", "scheermes", "maquinilla"], fr: "rasoir", en: "razor", de: "Rasierer", nl: "scheermesje", es: "maquinilla de afeitar", cats: ["supermarket", "chemist", "convenience"] },
];

const normalize = (s) =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function lookupDict(rawQuery) {
  const q = normalize(rawQuery);
  if (!q) return null;
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  for (const item of DICT) {
    for (const key of item.keys) {
      const k = normalize(key);
      if (!k) continue;
      if (q === k) return item;
      if (q.includes(k) || words.includes(k)) return item;
    }
  }
  return null;
}

// ------------------------------------------------------------------
// Mistral
// ------------------------------------------------------------------

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
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
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

// ------------------------------------------------------------------
// OpenStreetMap / Overpass, avec cache de 30 minutes par zone
// ------------------------------------------------------------------

const nearbyCache = new Map(); // clé: "lat,arrondi;lon,arrondi" -> { list, date }
const CACHE_MS = 30 * 60 * 1000;

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

function overpassQuery(categories, lat, lon, radiusMeters, limit) {
  const clauses = [];
  for (const cat of categories) {
    clauses.push(`node["shop"="${cat}"](around:${radiusMeters},${lat},${lon});`);
    clauses.push(`way["shop"="${cat}"](around:${radiusMeters},${lat},${lon});`);
  }
  return `[out:json][timeout:25];(\n  ${clauses.join("\n  ")}\n);out center ${limit};`;
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
      if (Array.isArray(data.elements)) return { elements: data.elements };
      lastError = `${server} → réponse inattendue`;
    } catch (err) {
      lastError = `${server} → ${err.message}`;
    }
  }
  return { elements: [], error: `aucun serveur de carte n'a répondu (${lastError}). Réessayez dans une minute.` };
}

function parseStores(elements, lat, lon) {
  const list = [];
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
    list.push({
      name: tags.name || tags.operator || tags.brand || "Magasin non nommé",
      address: address || null,
      lat: sLat,
      lon: sLon,
      distanceKm: Math.round(haversine(lat, lon, sLat, sLon) * 10) / 10,
      cats: tags.shop ? [tags.shop] : [],
    });
  }
  return list;
}

// Liste de magasins d'une zone : mémo 30 min, calculée une seule fois par zone
async function getNearby(lat, lon) {
  const key = `${lat.toFixed(2)};${lon.toFixed(2)}`;
  const cached = nearbyCache.get(key);
  if (cached && Date.now() - cached.date < CACHE_MS) {
    return { list: cached.list, error: null };
  }
  const attempt = await fetchOverpassAny(overpassQuery(BROAD_CATS, lat, lon, 25000, 300));
  if (attempt.error) return { list: [], error: attempt.error };
  const list = parseStores(attempt.elements, lat, lon);
  nearbyCache.set(key, { list, date: Date.now() });
  return { list, error: null };
}

// Recherche ciblée (rare) : les catégories IA sortent du lot prédéfini
async function getTargeted(categories, lat, lon) {
  const safe = (categories || []).filter((c) => ALLOWED_SHOPS.includes(c));
  if (safe.length === 0) return { list: [], error: null };
  const attempt = await fetchOverpassAny(overpassQuery(safe, lat, lon, 40000, 80));
  if (attempt.error) return { list: [], error: attempt.error };
  return { list: parseStores(attempt.elements, lat, lon), error: null };
}

function selectStores(all, wantedCats, lat, lon) {
  const wanted = new Set((wantedCats || []).filter((c) => ALLOWED_SHOPS.includes(c)));
  let pool = wanted.size > 0 ? all.filter((s) => s.cats.some((c) => wanted.has(c))) : all;
  if (pool.length === 0) pool = all;
  const seen = new Set();
  return pool
    .slice().sort((a, b) => a.distanceKm - b.distanceKm)
    .filter((s) => {
      const k = s.name + "@" + s.lat.toFixed(4) + "," + s.lon.toFixed(4);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 12)
    .map((s) => ({
      name: s.name,
      address: s.address,
      lat: s.lat,
      lon: s.lon,
      distanceKm: s.distanceKm,
      categories: s.cats.map((c) => SHOP_LABELS[c] || c),
    }));
}

// ------------------------------------------------------------------
// Handler principal
// ------------------------------------------------------------------

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

  // 1) Interroger la carte tout de suite, en parallèle de l'analyse
  const nearbyPromise = getNearby(lat, lon);

  // 2) Analyse : dictionnaire instantané si possible, sinon Mistral
  let analyse = null;
  let analyseError = null;
  const dictHit = query ? lookupDict(query) : null;

  if (dictHit) {
    const code = LANG_CODE[(targetLang || "").toLowerCase()] || LANG_CODE[targetLang] || "en";
    analyse = {
      objet_fr: dictHit.fr,
      objet_local: dictHit[code] || dictHit.en,
      categories_shop: dictHit.cats,
      fromDictionary: true,
    };
  } else {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Clé Mistral absente côté serveur : ajoutez MISTRAL_API_KEY dans les variables d'environnement Vercel, puis redéployez.",
      });
    }
    try {
      analyse = await askMistral(apiKey, {
        query, imageBase64, imageType,
        queryLang: queryLang || "français",
        targetLang: targetLang || "la langue locale",
        cityName: cityName || "la ville donnée par la position",
      });
    } catch (err) {
      analyseError = err.message || "Erreur pendant l'analyse de la demande.";
    }
  }

  if (analyseError) {
    return res.status(502).json({ error: analyseError });
  }

  // 3) Fusion : liste de magasins + catégories de l'analyse
  const nearby = await nearbyPromise;
  let pool = nearby.list;
  let mapError = nearby.error;

  let list = selectStores(pool, analyse.categories_shop, lat, lon);

  // Si la liste précalculée ne couvre pas les catégories voulues, requête ciblée
  const wantedSet = new Set((analyse.categories_shop || []).filter((c) => ALLOWED_SHOPS.includes(c)));
  const covered = new Set(BROAD_CATS);
  const outside = [...wantedSet].filter((c) => !covered.has(c));
  const filteredHadResults = list.length > 0 && wantedSet.size > 0 &&
    list.some((s) => s.categories.length > 0);

  if ((wantedSet.size > 0 && list.length === 0 && pool.length === 0) || (outside.length > 0 && !filteredHadResults)) {
    const targeted = await getTargeted(analyse.categories_shop, lat, lon);
    if (targeted.list.length > 0) {
      list = selectStores(targeted.list, analyse.categories_shop, lat, lon);
    }
    if (targeted.error) mapError = targeted.error;
  }

  return res.status(200).json({
    objet_fr: analyse.objet_fr,
    objet_local: analyse.objet_local,
    categoryLabels: (analyse.categories_shop || []).map((c) => SHOP_LABELS[c] || c),
    stockNote: mapError
      ? `Carte indisponible pour le moment : ${mapError}`
      : "Disponibilité non vérifiée en temps réel : appelez le magasin si besoin.",
    instant: analyse.fromDictionary === true,
    stores: list,
  });
}
