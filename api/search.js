// api/search.js
// Backend de findforme.biz, version "analyse seule" :
// - dictionnaire d'objets courants : réponse instantanée sans appeler l'IA
// - sinon appel à Mistral (traduction + catégories de magasins)
// - la recherche des magasins sur la carte est d'abord faite par le navigateur
//   du visiteur (voir App.tsx) ; en secours, ce fichier interroge Nominatim
//   et renvoie une liste de magasins de repli. Il répond ainsi toujours bien
//   en dessous de la limite de 10 s de Vercel.
// Nécessite la variable d'environnement MISTRAL_API_KEY.

const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const OVERPASS_SERVERS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
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
const TOTAL_BUDGET_MS = 9000; // marge sur la limite Vercel de 10 s

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
  { keys: ["marteau", "hammer", "hamer", "martillo"], fr: "marteau", en: "hammer", de: "Hammer", nl: "hamer", es: "martillo", cats: ["hardware", "doityourself", "secondhand"] },
  { keys: ["clou", "nail", "nagel", "spijker", "clavo"], fr: "clou", en: "nail", de: "Nagel", nl: "spijker", es: "clavo", cats: ["hardware", "doityourself"] },
  { keys: ["perceuse", "visseuse", "drill", "bohrmaschine", "boormachine", "taladro"], fr: "perceuse", en: "drill", de: "Bohrmaschine", nl: "boormachine", es: "taladro", cats: ["hardware", "doityourself", "secondhand"] },
  { keys: ["scie", "saw", "säge", "zaag", "sierra"], fr: "scie", en: "saw", de: "Säge", nl: "zaag", es: "sierra", cats: ["hardware", "doityourself"] },
  { keys: ["pelle", "shovel", "schaufel", "schep", "pala"], fr: "pelle", en: "shovel", de: "Schaufel", nl: "schep", es: "pala", cats: ["hardware", "doityourself", "garden_centre"] },
  { keys: ["rouleau", "paint roller", "farbrolle", "verfroller", "rodillo"], fr: "rouleau de peinture", en: "paint roller", de: "Farbrolle", nl: "verfroller", es: "rodillo de pintura", cats: ["paint", "hardware", "doityourself"] },
  { keys: ["colle", "glue", "kleber", "lijm", "pegamento"], fr: "colle", en: "glue", de: "Kleber", nl: "lijm", es: "pegamento", cats: ["hardware", "doityourself", "supermarket"] },
  { keys: ["ruban adhesif", "adhesive tape", "duct tape", "klebeband", "plakband", "cinta adhesiva"], fr: "ruban adhésif", en: "adhesive tape", de: "Klebeband", nl: "plakband", es: "cinta adhesiva", cats: ["hardware", "supermarket", "doityourself"] },
  { keys: ["pile", "batterie", "battery", "batterij"], fr: "pile", en: "battery", de: "Batterie", nl: "batterij", es: "pila", cats: ["electronics", "supermarket", "convenience"] },
  { keys: ["ampoule", "light bulb", "glühbirne", "gloeilamp", "bombilla"], fr: "ampoule", en: "light bulb", de: "Glühbirne", nl: "gloeilamp", es: "bombilla", cats: ["supermarket", "hardware", "doityourself"] },
  { keys: ["chargeur", "charger", "ladegerät", "oplader", "cargador"], fr: "chargeur", en: "charger", de: "Ladegerät", nl: "oplader", es: "cargador", cats: ["electronics", "mobile_phone", "computer", "supermarket"] },
  { keys: ["cable usb", "usb cable", "usb-kabel", "usb-kabel", "cable usb", "cordon usb"], fr: "câble USB", en: "USB cable", de: "USB-Kabel", nl: "USB-kabel", es: "cable USB", cats: ["electronics", "computer", "supermarket"] },
  { keys: ["adaptateur", "power adapter", "stecker-adapter", "stekkeradapter", "adaptador de enchufe", "travel adapter"], fr: "adaptateur de prise", en: "power plug adapter", de: "Stecker-Adapter", nl: "stekkeradapter", es: "adaptador de enchufe", cats: ["electronics", "hardware", "supermarket"] },
  { keys: ["multiprise", "power strip", "steckdosenleiste", "stekkerdoos", "regleta"], fr: "multiprise", en: "power strip", de: "Steckdosenleiste", nl: "stekkerdoos", es: "regleta", cats: ["electronics", "hardware"] },
  { keys: ["parapluie", "umbrella", "regenschirm", "paraplu", "paraguas"], fr: "parapluie", en: "umbrella", de: "Regenschirm", nl: "paraplu", es: "paraguas", cats: ["supermarket", "convenience", "secondhand"] },
  { keys: ["cadenas", "padlock", "vorhängeschloss", "hangslot", "candado"], fr: "cadenas", en: "padlock", de: "Vorhängeschloss", nl: "hangslot", es: "candado", cats: ["hardware", "doityourself", "supermarket"] },
  { keys: ["lampe de poche", "lampe torche", "flashlight", "torch", "taschenlampe", "zaklamp", "linterna"], fr: "lampe de poche", en: "flashlight", de: "Taschenlampe", nl: "zaklamp", es: "linterna", cats: ["electronics", "hardware", "supermarket"] },
  { keys: ["bougie", "candle", "kerze", "kaars", "vela"], fr: "bougie", en: "candle", de: "Kerze", nl: "kaars", es: "vela", cats: ["supermarket", "convenience", "florist"] },
  { keys: ["allumettes", "matches", "streichhölzer", "lucifers", "cerillas"], fr: "allumettes", en: "matches", de: "Streichhölzer", nl: "lucifers", es: "cerillas", cats: ["supermarket", "convenience"] },
  { keys: ["pain", "bread", "brot", "brood", "baguette"], fr: "pain", en: "bread", de: "Brot", nl: "brood", es: "pan", cats: ["bakery", "supermarket", "convenience"] },
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
      if (q === k || (k.length >= 4 && q.includes(k)) || words.includes(k)) return item;
    }
  }
  return null;
}

// ------------------------------------------------------------------
// Appels réseau protégés par minuterie
// ------------------------------------------------------------------

async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function askMistral(apiKey, params, budgetMs) {
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

  const response = await fetchWithTimeout(
    MISTRAL_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: imageBase64 ? "pixtral-12b-latest" : "mistral-small-latest",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content }],
      }),
    },
    budgetMs
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Appel Mistral en échec (${response.status}) : ${detail.slice(0, 200)}`);
  }
  const data = await response.json();
  const match = String(data.choices?.[0]?.message?.content || "").match(/\{[\s\S]*\}/);
  if (!match) throw new Error("La réponse du modèle n'était pas un JSON valide.");
  return JSON.parse(match[0]);
}

// ------------------------------------------------------------------
// Secours Nominatim : liste de magasins par mots-clés dans une fenêtre
// d'environ 30 km autour de la position. Sert de solution repli si les
// serveurs Overpass sont injoignables depuis le navigateur du client.
// ------------------------------------------------------------------

const CATEGORY_SEARCH = {
  hardware: "hardware", doityourself: "hardware", paint: "paint",
  secondhand: "second hand", supermarket: "supermarket", convenience: "convenience store",
  bakery: "bakery", butcher: "butcher", seafood: "seafood", greengrocer: "greengrocer",
  frozen_food: "frozen food", deli: "deli", chemist: "chemist", beverages: "beverages",
  electronics: "electronics", computer: "computer", mobile_phone: "mobile phone",
  stationery: "stationery", books: "bookshop", sports: "sports", bicycle: "bicycle",
  clothes: "clothes", shoes: "shoes", garden_centre: "garden centre",
  furniture: "furniture", toys: "toys", photo: "photo shop", gift: "gift shop",
  florist: "florist", pet: "pet shop", electrical: "electrical",
};

async function nominatimStores(categories, lat, lon, budgetMs) {
  const started = Date.now();
  const terms = (categories || [])
    .map((c) => CATEGORY_SEARCH[c])
    .filter(Boolean)
    .slice(0, 3);
  const keywords = terms.length > 0 ? terms : ["supermarket"];
  const viewbox = `${lon - 0.35},${lat + 0.3},${lon + 0.35},${lat - 0.3}`;
  const seen = new Set();
  const found = [];
  let lastError = "";
  for (const term of keywords) {
    const remaining = budgetMs - (Date.now() - started);
    if (remaining < 1500) break;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(4000, remaining));
      const url =
        NOMINATIM_URL +
        "?q=" + encodeURIComponent(term) +
        "&format=jsonv2&limit=15&bounded=1&addressdetails=1" +
        "&viewbox=" + viewbox;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "findforme/1.0 (https://www.findforme.biz; contact@findforme.biz)",
          "Accept-Language": "fr,en",
        },
      });
      clearTimeout(timer);
      if (!response.ok) { lastError = `Nominatim HTTP ${response.status}`; continue; }
      const items = await response.json();
      if (!Array.isArray(items)) continue;
      for (const it of items) {
        const sLat = Number(it.lat);
        const sLon = Number(it.lon);
        if (!Number.isFinite(sLat) || !Number.isFinite(sLon)) continue;
        const name = it.name || (it.display_name || "").split(",")[0] || "Magasin non nommé";
        const key = name + ";" + sLat.toFixed(3) + "," + sLon.toFixed(3);
        if (seen.has(key)) continue;
        seen.add(key);
        const address = (it.display_name || "").split(",").slice(1, 4).join(",").trim();
        found.push({
          name,
          address: address || null,
          lat: sLat,
          lon: sLon,
          distanceKm: Math.round(haversine(lat, lon, sLat, sLon) * 10) / 10,
          cats: [term],
        });
      }
    } catch (err) {
      lastError = `Nominatim : ${err.name === "AbortError" ? "délai dépassé" : err.message}`;
    }
  }
  found.sort((a, b) => a.distanceKm - b.distanceKm);
  return { list: found.slice(0, 12), error: found.length === 0 ? (lastError || null) : null };
}

// ------------------------------------------------------------------
// OpenStreetMap / Overpass : petites requêtes ciblées, avec cache
// ------------------------------------------------------------------

const cache = new Map(); // "lat,lon;cats" -> { list, date }
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
  return `[out:json][timeout:8];(\n  ${clauses.join("\n  ")}\n);out center ${limit};`;
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

async function overpassOnce(query, budgetMs) {
  let lastError = "";
  for (const server of OVERPASS_SERVERS) {
    const start = Date.now();
    try {
      const response = await fetchWithTimeout(
        server,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "findforme/1.0 (+https://www.findforme.biz)",
          },
          body: "data=" + encodeURIComponent(query),
        },
        Math.max(2000, Math.min(3500, budgetMs))
      );
      budgetMs -= Date.now() - start;
      if (!response.ok) {
        lastError = `${server} → HTTP ${response.status}`;
        continue;
      }
      const data = await response.json();
      if (Array.isArray(data.elements)) return { elements: data.elements };
      lastError = `${server} → réponse inattendue`;
    } catch (err) {
      budgetMs -= Date.now() - start;
      lastError = `${server} → ${err.name === "AbortError" ? "délai dépassé" : err.message}`;
    }
    if (budgetMs < 2000) break;
  }
  return { elements: [], error: `aucun serveur de carte n'a répondu (${lastError}).` };
}

async function findStores(categoriesAsked, lat, lon, budgetMs) {
  const startedAt = Date.now();
  const leftStores = () => budgetMs - (Date.now() - startedAt);
  const safe = (categoriesAsked || []).filter((c) => ALLOWED_SHOPS.includes(c));
  const categories = safe.slice(0, 3).length > 0 ? safe.slice(0, 3) : ["supermarket", "hardware", "doityourself"];
  const baseKey = categories.join(",") + ";" + lat.toFixed(2) + "," + lon.toFixed(2);

  const cached = cache.get(baseKey);
  if (cached && Date.now() - cached.date < CACHE_MS) {
    return { list: cached.list, error: null, fromCache: true };
  }

  // Première passe : rayon 15 km
  let attempt = await overpassOnce(overpassQuery(categories, lat, lon, 15000, 60), budgetMs);
  let elements = attempt.elements;

  // Seconde passe élargie si rien trouvé (même en cas d'erreur serveur) et s'il reste du temps
  if (elements.length === 0) {
    if (leftStores() < 3000) {
      return { list: [], error: attempt.error || "plus assez de temps pour élargir la recherche." };
    }
    const broad = [...new Set([...categories, ...defaultExtra(categories)])].slice(0, 4);
    const key2 = broad.join(",") + ";" + lat.toFixed(2) + "," + lon.toFixed(2);
    const cached2 = cache.get(key2);
    if (cached2 && Date.now() - cached2.date < CACHE_MS) {
      return { list: cached2.list, error: null, fromCache: true };
    }
    attempt = await overpassOnce(overpassQuery(broad, lat, lon, 45000, 40), budgetMs);
    elements = attempt.elements;
    if (elements.length > 0) {
      const parsed = parseStores(elements, lat, lon).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 12);
      cache.set(key2, { list: parsed, date: Date.now() });
      return { list: parsed, error: null };
    }
  }

  const parsed = parseStores(elements, lat, lon).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 12);
  if (parsed.length > 0) cache.set(baseKey, { list: parsed, date: Date.now() });
  return { list: parsed, error: attempt.error || null };
}

// Catégories compagnes utiles si la première passe ne trouve rien
function defaultExtra(cats) {
  const extras = new Set();
  for (const c of cats) {
    if (c === "hardware" || c === "doityourself" || c === "paint" || c === "electrical") extras.add("supermarket");
    if (c === "supermarket" || c === "convenience") extras.add("bakery");
    if (c === "electronics" || c === "computer" || c === "mobile_phone") extras.add("supermarket");
    if (c === "seafood") extras.add("supermarket");
    if (c === "chemist") extras.add("supermarket");
  }
  return [...extras];
}

// ------------------------------------------------------------------
// Handler principal
// ------------------------------------------------------------------

export default async function handler(req, res) {
  const started = Date.now();
  const left = () => TOTAL_BUDGET_MS - (Date.now() - started);

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

  // 1) Analyse : dictionnaire instantané si possible, sinon Mistral
  let analyse = null;
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
      analyse = await askMistral(
        apiKey,
        {
          query, imageBase64, imageType,
          queryLang: queryLang || "français",
          targetLang: targetLang || "la langue locale",
          cityName: cityName || "la ville donnée par la position",
        },
        left() - 2000 // garder au moins 2 s pour la recherche de magasins
      );
    } catch (err) {
      return res.status(502).json({ error: err.message || "Erreur pendant l'analyse de la demande." });
    }
  }

  // 2) Magasins : solution de repli Nominatim côté serveur. Le navigateur
  // du visiteur cherche d'abord via les serveurs Overpass ; s'il ne trouve
  // rien, c'est cette liste qui s'affiche. La fonction reste rapide :
  // 3 petites requêtes maximum, protégées par minuteries.

  let stores = [];
  let fallbackNote = null;
  try {
    const fallback = await nominatimStores(analyse.categories_shop, lat, lon, Math.max(4000, left() - 800));
    stores = fallback.list;
    if (fallback.error) fallbackNote = fallback.error;
  } catch {
    /* la liste restera vide, le navigateur a peut-être déjà trouvé */
  }

  return res.status(200).json({
    objet_fr: analyse.objet_fr,
    objet_local: analyse.objet_local,
    categories: analyse.categories_shop || [],
    categoryLabels: (analyse.categories_shop || []).map((c) => SHOP_LABELS[c] || c),
    stockNote: "Disponibilité non vérifiée en temps réel : appelez le magasin si besoin.",
    instant: analyse.fromDictionary === true,
    debug: { fallback: fallbackNote || "ok", elapsedMs: Date.now() - started },
    stores,
  });
}
