// src/App.tsx
// findforme.biz, version 3 : interface bilingue FR/EN, détection automatique
// de la position (IP, sans autorisation), recherche de ville libre,
// recherches suggérées, pages FAQ et Guides. Backend : /api/search, /api/geo,
// /api/geocode. Remplace tout le contenu précédent de src/App.tsx.

import React, { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* Lieux                                                               */
/* ------------------------------------------------------------------ */

type Place = { label: string; flag: string; lat: number; lon: number; targetLang: string };

const PRESETS: Place[] = [
  { label: "Berlin", flag: "🇩🇪", lat: 52.52, lon: 13.405, targetLang: "allemand" },
  { label: "Paris", flag: "🇫🇷", lat: 48.8566, lon: 2.3522, targetLang: "français" },
  { label: "Bruxelles", flag: "🇧🇪", lat: 50.8503, lon: 4.3517, targetLang: "français" },
  { label: "Amsterdam", flag: "🇳🇱", lat: 52.3676, lon: 4.9041, targetLang: "néerlandais" },
  { label: "London", flag: "🇬🇧", lat: 51.5074, lon: -0.1278, targetLang: "anglais" },
];

const QUERY_LANGS: { value: string; fr: string; en: string }[] = [
  { value: "français", fr: "Français", en: "French" },
  { value: "anglais", fr: "Anglais", en: "English" },
  { value: "allemand", fr: "Allemand", en: "German" },
  { value: "néerlandais", fr: "Néerlandais", en: "Dutch" },
  { value: "espagnol", fr: "Espagnol", en: "Spanish" },
];

const POPULAR: { fr: string; en: string }[] = [
  { fr: "tournevis", en: "screwdriver" },
  { fr: "pile", en: "battery" },
  { fr: "chargeur", en: "charger" },
  { fr: "poisson frais", en: "fresh fish" },
  { fr: "pain", en: "bread" },
  { fr: "adaptateur de prise", en: "power plug adapter" },
];

/* ------------------------------------------------------------------ */
/* Textes de l'interface, bilingues                                    */
/* ------------------------------------------------------------------ */

const COPY = {
  fr: {
    tagline: "Trouvez l'objet qu'il vous faut, près de vous, dans votre langue",
    detected: (city: string, country: string | null) =>
      `Vous semblez être à ${city || "proximité de votre connexion"}${country ? ` (${country})` : ""}.`,
    searchHere: "Chercher ici",
    hideBanner: "Masquer",
    searchFor: "Où cherchez-vous ?",
    otherPlace: "Ou cherchez une ville :",
    cityPlaceholder: "Ex. : Barcelone, Vienne, Milan…",
    cityBtn: "Chercher",
    citySearching: "Recherche de la ville…",
    cityNone: "Ville introuvable. Essayez un autre nom.",
    cityError: "Recherche de ville indisponible pour le moment.",
    useGps: "📍 Position GPS précise",
    geoOk: "Position détectée : la recherche se fera autour de vous.",
    geoFail: "Position inaccessible : autorisez la géolocalisation ou choisissez une ville.",
    popular: "Recherches fréquentes :",
    tabText: "Recherche par texte",
    tabPhoto: "Recherche par photo",
    askIn: "Je demande en : ",
    placeholder: "Ex. : « je cherche un tournevis »",
    photoPrompt: "Prenez en photo l'objet ou importez une image",
    photoReady: "Image prête à être analysée : ",
    findBtn: "Trouver près de moi",
    finding: "Recherche en cours…",
    errEmptyText: "Tapez d'abord le nom de l'objet recherché.",
    errNoImage: "Importez d'abord une photo de l'objet.",
    errImage: "Impossible de lire cette image. Essayez une photo JPG ou PNG.",
    errBackend: "Le backend n'est pas encore déployé : créez les fichiers api/search.js, api/geo.js et api/geocode.js (voir les canvas), puis laissez Vercel redéployer.",
    errNetwork: "Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.",
    translateTitle: "Exprimez votre demande sur place",
    inFrench: "En français",
    localLang: (l: string) => `Langue locale (${l})`,
    askInStore: (city: string, word: string) => `À ${city}, demandez « ${word} » en magasin.`,
    badgeStock: "⚠️ Disponibilité non vérifiée en temps réel : appelez le magasin si besoin.",
    osmNote: "Magasins issus d'OpenStreetMap, triés par distance.",
    storesFound: (n: number, city: string) => `${n} magasin${n > 1 ? "s" : ""} trouvé${n > 1 ? "s" : ""} près de ${city}`,
    noStores: "Aucun magasin trouvé à proximité",
    gpsLabel: "Ma position actuelle",
    route: "Itinéraire",
    back: "← Retour à la recherche",
    whyTitle: "Pourquoi findforme.biz ?",
    why1: "Dans une ville étrangère, trouver un objet simple devient un casse-tête : vous ne connaissez ni le mot, ni le quartier, ni les enseignes. FindForMe traduit votre demande dans la langue locale et vous indique les magasins proches qui vendent ce type de produit, avec un itinéraire.",
    why2: "Le service s'appuie sur l'IA de Mistral pour comprendre votre description ou votre photo, et sur la carte libre OpenStreetMap pour localiser les magasins. Gratuit, sans inscription, disponible en français et en anglais.",
    howLink: "Comment ça marche",
    guidesLink: "Guides pratiques",
    faqLink: "Questions fréquentes",
    legalLink: "Confidentialité et mentions légales",
    howTitle: "Comment ça marche",
    guidesTitle: "Guides pratiques",
    faqTitle: "Questions fréquentes",
    legalTitle: "Confidentialité et mentions légales",
  },
  en: {
    tagline: "Find the object you need, near you, in your own language",
    detected: (city: string, country: string | null) =>
      `You seem to be in ${city || "the area of your connection"}${country ? ` (${country})` : ""}.`,
    searchHere: "Search here",
    hideBanner: "Hide",
    searchFor: "Where are you searching?",
    otherPlace: "Or search for a city:",
    cityPlaceholder: "e.g. Barcelona, Vienna, Milan…",
    cityBtn: "Search",
    citySearching: "Searching for the city…",
    cityNone: "City not found. Try another name.",
    cityError: "City search is unavailable right now.",
    useGps: "📍 Precise GPS location",
    geoOk: "Location detected: the search will run around you.",
    geoFail: "Location unavailable: allow geolocation or pick a city.",
    popular: "Popular searches:",
    tabText: "Search by text",
    tabPhoto: "Search by photo",
    askIn: "I'm asking in: ",
    placeholder: 'e.g. "I need a screwdriver"',
    photoPrompt: "Take a photo of the object or upload an image",
    photoReady: "Image ready to be analysed: ",
    findBtn: "Find near me",
    finding: "Searching…",
    errEmptyText: "First type the name of the object you need.",
    errNoImage: "First upload a photo of the object.",
    errImage: "This image cannot be read. Try a JPG or PNG photo.",
    errBackend: "The backend is not deployed yet: create the api/search.js, api/geo.js and api/geocode.js files (see the canvases), then let Vercel redeploy.",
    errNetwork: "The server cannot be reached. Check your connection and try again.",
    translateTitle: "How to ask for it locally",
    inFrench: "In French",
    localLang: (l: string) => `Local language (${l})`,
    askInStore: (city: string, word: string) => `In ${city}, ask for "${word}" in the store.`,
    badgeStock: "⚠️ Availability not verified in real time: call the store if needed.",
    osmNote: "Stores from OpenStreetMap, sorted by distance.",
    storesFound: (n: number, city: string) => `${n} store${n > 1 ? "s" : ""} found near ${city}`,
    noStores: "No store found nearby",
    gpsLabel: "My current location",
    route: "Directions",
    back: "← Back to search",
    whyTitle: "Why findforme.biz?",
    why1: "In a foreign city, finding a simple object becomes a puzzle: you don't know the word, the neighbourhood or the store chains. FindForMe translates your request into the local language and shows nearby stores selling that type of product, with directions.",
    why2: "The service uses Mistral AI to understand your description or photo, and the free OpenStreetMap map to locate stores. Free, no sign-up, available in French and English.",
    howLink: "How it works",
    guidesLink: "Practical guides",
    faqLink: "Frequently asked questions",
    legalLink: "Privacy and legal notice",
    howTitle: "How it works",
    guidesTitle: "Practical guides",
    faqTitle: "Frequently asked questions",
    legalTitle: "Privacy and legal notice",
  },
};

const HOW_SECTIONS = {
  fr: [
    { h: "1. Décrivez l'objet recherché", p: "Par texte, dans votre langue, ou par une simple photo de l'objet. L'intelligence artificielle identifie l'objet et le traduit dans la langue du pays où vous vous trouvez avec les mots que les commerçants comprennent : à Berlin, « tournevis » devient « Schraubendreher »." },
    { h: "2. Nous cherchons les magasins autour de vous", p: "Autour de votre position ou de la ville choisie, nous consultons les données publiques d'OpenStreetMap pour trouver les magasins qui vendent ce type de produit, triés par distance. La disponibilité exacte en stock n'est pas vérifiée en temps réel : le site vous le signale clairement." },
    { h: "3. Vous partez avec le bon mot et un itinéraire", p: "Chaque résultat propose un itinéraire direct. Montrez la traduction fournie sur place et demandez le mot dans la langue locale. FindForMe fait le pont entre votre langue et le magasin d'à côté." },
    { h: "Qui fournit quoi ?", p: "L'analyse des textes et des photos est réalisée par les modèles d'IA de Mistral AI. Les magasins proviennent d'OpenStreetMap, une carte libre du monde. Les itinéraires sont proposés par Google Maps." },
  ],
  en: [
    { h: "1. Describe the object you need", p: "By text, in your own language, or simply with a photo. The AI identifies the object and translates it into the local language with words shopkeepers understand: in Berlin, \"screwdriver\" becomes \"Schraubendreher\"." },
    { h: "2. We look for stores around you", p: "Around your position or around the chosen city, we consult OpenStreetMap public data to find stores selling that type of product, sorted by distance. Exact stock availability is not verified in real time: the site tells you clearly." },
    { h: "3. You leave with the right word and directions", p: "Every result offers a direct route. Show the provided translation and ask for the word in the local language. FindForMe bridges your language and the store next door." },
    { h: "Who provides what?", p: "Text and photo analysis is done by Mistral AI models. Stores come from OpenStreetMap, a free map of the world. Directions are provided by Google Maps." },
  ],
};

const FAQ_SECTIONS = {
  fr: [
    { h: "Le service est-il gratuit ?", p: "Oui, la recherche est entièrement gratuite et ne demande aucune inscription. Le site peut afficher des publicités pour financer son fonctionnement." },
    { h: "Dans quelles langues puis-je chercher ?", p: "Vous pouvez décrire votre objet en français, anglais, allemand, néerlandais ou espagnol. Le site traduit ensuite dans la langue locale de la ville où vous cherchez, quelle qu'elle soit." },
    { h: "La disponibilité en stock est-elle garantie ?", p: "Non. Nous indiquons les magasins qui vendent le type de produit recherché, mais le stock exact d'un article n'est pas vérifié en temps réel. Un bouton d'appel ou l'itinéraire vous permet de vérifier auprès du magasin." },
    { h: "Comment fonctionne la recherche par photo ?", p: "Envoyez une photo de l'objet : un modèle de vision l'analyse, identifie l'objet le plus probable, puis effectue la même recherche que pour le texte. La photo est compressée avant l'envoi et n'est pas conservée." },
    { h: "Ma position est-elle enregistrée ?", p: "Non. La position (déduite de votre connexion, du GPS sur demande, ou de la ville choisie) sert uniquement à chercher les magasins proches, pendant la recherche. Elle n'est pas conservée." },
    { h: "Toutes les villes sont-elles couvertes ?", p: "Les données de magasins proviennent d'OpenStreetMap, très complète dans les grandes villes européennes, parfois lacunaire ailleurs. Si aucun magasin n'apparaît, essayez une ville voisine plus grande." },
    { h: "Comment utiliser la traduction en magasin ?", p: "Montrez la traduction donnée sur la page de résultats au commerçant, ou prononcez-la simplement. Pour les objets techniques, montrer une photo sur votre téléphone reste la méthode la plus sûre." },
    { h: "Puis-je suggérer une amélioration ?", p: "Oui, toute suggestion est bienvenue via l'adresse de contact indiquée dans la page Confidentialité." },
  ],
  en: [
    { h: "Is the service free?", p: "Yes, the search is completely free and requires no sign-up. The site may display advertising to fund its operation." },
    { h: "Which languages can I search in?", p: "You can describe your object in French, English, German, Dutch or Spanish. The site then translates into the local language of the city where you are searching, whatever it is." },
    { h: "Is stock availability guaranteed?", p: "No. We show stores that sell the type of product you need, but the exact stock of an item is not verified in real time. A call button or directions let you check with the store." },
    { h: "How does the photo search work?", p: "Upload a photo of the object: a vision model analyses it, identifies the most likely object, then runs the same search as for text. The photo is compressed before sending and is not kept." },
    { h: "Is my location recorded?", p: "No. The location (derived from your connection, from GPS on request, or from the chosen city) is only used to find nearby stores, during the search. It is not kept." },
    { h: "Are all cities covered?", p: "Store data comes from OpenStreetMap, very complete in large European cities, sometimes sparse elsewhere. If no store appears, try a larger nearby city." },
    { h: "How do I use the translation in a store?", p: "Show the translation given on the results page to the shopkeeper, or simply say it out loud. For technical objects, showing a photo on your phone remains the safest method." },
    { h: "Can I suggest an improvement?", p: "Yes, any suggestion is welcome via the contact address shown on the Privacy page." },
  ],
};

const GUIDE_CONTENT = {
  fr: [
    {
      h: "Guide 1 — Trouver un outil à l'étranger",
      s: [
        { h: "Le mot juste avant de sortir", p: "Un « tournevis » se dit Schraubendreher en allemand, schroevendraaier en néerlandais, destornillador en espagnol. Cherchez d'abord le mot exact sur findforme.biz : une fois devant le rayon, le mot juste vaut mieux que dix gestes." },
        { h: "Montrez plutôt que parlez", p: "Gardez la photo de l'objet ou son nom en langue locale sur votre téléphone : la montrer au personnel reste la méthode la plus rapide et la plus fiable, surtout pour les pièces précises." },
        { h: "Où chercher", p: "Les quincailleries de quartier (Hardware en OpenStreetMap) sont souvent plus proches que les grandes surfaces de bricolage ; les magasins de seconde main peuvent dépanner pour un outil d'usage occasionnel." },
      ],
    },
    {
      h: "Guide 2 — Les objets du quotidien en Europe : prix et enseignes",
      s: [
        { h: "Des écarts importants selon les pays", p: "Piles, adaptateurs, produits d'hygiène : les prix varient du simple au double entre pays, et les aéroports ou gares sont presque toujours les plus chers. Privilégiez les supermarchés de centre-ville." },
        { h: "Reconnaître les enseignes utiles", p: "À Berlin : Bauhaus, OBI, Rossmann ; à Amsterdam : Kruidvat, Praxis, HEMA ; à Londres : Screwfix, B&Q, Boots. La fonction recherche de ville du site fonctionne partout, même dans les villes non listées." },
        { h: "L'adaptateur de prise, l'indispensable du voyageur", p: "Le Royaume-Uni et l'Irlande utilisent des prises différentes du continent : un adaptateur se trouve dans la plupart des supermarchés et kiosques de gare, comptez quelques livres." },
      ],
    },
    {
      h: "Guide 3 — Acheter d'occasion près de soi",
      s: [
        { h: "Bon pour la planète et le portefeuille", p: "Pour un outil ponctuel ou un appareil simple, la seconde main (secondhand sur OpenStreetMap, brocantes de quartier, ressourceries) revient souvent 3 à 10 fois moins cher." },
        { h: "Vérifier avant d'acheter", p: "Outils : contrôle de l'état des manches et des fils ; appareils électroniques : demandez un essai sur place. Dans le doute, un prix très bas cache souvent une panne." },
        { h: "Négocier avec courtoisie", p: "Dans les vide-greniers et boutiques solidaires, une offre polie et en espèces obtient souvent une remise de 10 à 20 %." },
      ],
    },
  ],
  en: [
    {
      h: "Guide 1 — Finding a tool abroad",
      s: [
        { h: "Get the right word before you go out", p: "A \"screwdriver\" is Schraubendreher in German, schroevendraaier in Dutch, destornillador in Spanish. Look up the exact word on findforme.biz first: once in front of the shelf, the right word beats ten gestures." },
        { h: "Show rather than speak", p: "Keep the object's photo or its local name on your phone: showing it to staff remains the fastest and most reliable method, especially for specific parts." },
        { h: "Where to look", p: "Neighbourhood hardware stores are often closer than big DIY chains; second-hand stores can save the day for an occasional tool." },
      ],
    },
    {
      h: "Guide 2 — Everyday items across Europe: prices and chains",
      s: [
        { h: "Big differences between countries", p: "Batteries, adapters, toiletries: prices vary by a factor of two between countries, and airports or train stations are almost always the most expensive. Prefer city-centre supermarkets." },
        { h: "Know the useful chains", p: "In Berlin: Bauhaus, OBI, Rossmann; in Amsterdam: Kruidvat, Praxis, HEMA; in London: Screwfix, B&Q, Boots. The site's city search works everywhere, even in unlisted cities." },
        { h: "The plug adapter, a traveller's essential", p: "The UK and Ireland use different sockets from the continent: an adapter is found in most supermarkets and station kiosks for a few pounds." },
      ],
    },
    {
      h: "Guide 3 — Buying second-hand near you",
      s: [
        { h: "Good for the planet and the wallet", p: "For an occasional tool or a simple appliance, second-hand often costs 3 to 10 times less." },
        { h: "Check before buying", p: "Tools: check handles and cables; electronics: ask to try on the spot. When in doubt, a very low price often hides a fault." },
        { h: "Negotiate politely", p: "At flea markets and charity shops, a polite cash offer often gets a 10–20% discount." },
      ],
    },
  ],
};

const LEGAL_SECTIONS = {
  fr: [
    { h: "Éditeur du site", p: "Site findforme.biz, édité à titre personnel par [votre prénom et nom], [votre adresse], contact : [votre adresse e-mail]." },
    { h: "Hébergement", p: "Site hébergé par Vercel (vercel.com)." },
    { h: "Données envoyées lors d'une recherche", p: "Aucun compte, aucune inscription : le site ne vous demande pas d'identité. Lors d'une recherche, votre texte ou votre photo, ainsi que la position choisie, sont envoyés à notre serveur : le texte ou la photo est transmis au service d'analyse (Mistral AI) pour identifier l'objet et le traduire ; la position sert à chercher les magasins proches dans OpenStreetMap. Ces éléments servent uniquement à répondre à votre demande." },
    { h: "Géolocalisation", p: "Une position approximative est déduite de votre connexion internet pour suggérer un point de recherche ; vous pouvez la refuser. La position GPS précise n'est utilisée que si vous cliquez sur « Position GPS précise » et autorisez le navigateur. Aucune position n'est conservée après la recherche." },
    { h: "Cookies et publicité", p: "Le site dépose des cookies publicitaires Google (AdSense) et de ses partenaires. Paramétrez vos préférences à tout moment sur https://policies.google.com/technologies/ads?hl=fr" },
    { h: "Journaux techniques", p: "Comme tout site, l'hébergeur (Vercel) enregistre des journaux techniques standards (adresse IP, date, page demandée) pendant une durée limitée, à des fins de sécurité et de lutte contre les abus." },
    { h: "Vos droits (RGPD)", p: "Conformément au Règlement général sur la protection des données, vous disposez d'un droit d'accès, de rectification et d'effacement des informations vous concernant. Écrivez à [votre adresse e-mail] ; réponse sous 30 jours." },
    { h: "Droit applicable", p: "Le site est soumis au droit de [votre pays]." },
  ],
  en: [
    { h: "Site publisher", p: "Website findforme.biz, published on a personal basis by [your first and last name], [your address], contact: [your e-mail address]." },
    { h: "Hosting", p: "Hosted by Vercel (vercel.com)." },
    { h: "Data sent during a search", p: "No account, no sign-up: the site does not ask for your identity. During a search, your text or photo, together with the chosen location, are sent to our server: the text or photo is passed to the analysis service (Mistral AI) to identify and translate the object; the location is used to find nearby stores in OpenStreetMap. These elements are used solely to answer your request." },
    { h: "Geolocation", p: "An approximate position is derived from your connection to suggest a search point; you can dismiss it. Your precise GPS position is only used if you click \"Precise GPS location\" and let your browser share it. No position is kept after the search." },
    { h: "Cookies and advertising", p: "The site deposits Google (AdSense) advertising cookies and those of its partners. Manage your preferences at any time on https://policies.google.com/technologies/ads" },
    { h: "Technical logs", p: "Like any website, the host (Vercel) records standard technical logs (IP address, date, requested page) for a limited period, for security and abuse prevention." },
    { h: "Your rights (GDPR)", p: "Under the General Data Protection Regulation, you have a right of access, rectification and erasure. Write to [your e-mail address]; reply within 30 days." },
    { h: "Applicable law", p: "The site is governed by the law of [your country]." },
  ],
};

/* ------------------------------------------------------------------ */
/* Utilitaires et composants                                           */
/* ------------------------------------------------------------------ */

type Store = {
  name: string;
  address: string | null;
  lat: number;
  lon: number;
  distanceKm: number;
  categories: string[];
};

type Results = {
  objet_fr: string;
  objet_local: string;
  categories?: string[];
  categoryLabels: string[];
  stockNote: string;
  instant?: boolean;
  stores: Store[];
};

const Icon = ({ d, className = "w-4 h-4" }: { d: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  search: "M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z",
  camera: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z",
  pin: "M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1118 0zM12 13a3 3 0 100-6 3 3 0 000 6z",
  route: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
  swap: "M8 3L4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4",
};

function compressImage(file: File): Promise<{ base64: string; type: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      resolve({ base64: dataUrl.split(",")[1], type: "image/jpeg" });
    };
    img.onerror = () => reject(new Error("image"));
    img.src = url;
  });
}

type UiLang = "fr" | "en";

/* ------------------------------------------------------------------ */
/* Magasins OpenStreetMap, interrogés depuis le navigateur du         */
/* visiteur (aucune limite de temps de serveur, données publiques)    */
/* ------------------------------------------------------------------ */

const MAP_SERVERS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.osm.jp/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const MAP_EXTRAS: Record<string, string[]> = {
  hardware: ["supermarket"],
  doityourself: ["supermarket"],
  paint: ["supermarket"],
  electrical: ["supermarket"],
  electronics: ["supermarket"],
  computer: ["supermarket"],
  mobile_phone: ["supermarket"],
  seafood: ["supermarket"],
  chemist: ["supermarket"],
  supermarket: ["bakery", "convenience"],
  convenience: ["supermarket"],
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function mapQuery(cats: string[], lat: number, lon: number, radius: number, limit: number) {
  const clauses: string[] = [];
  for (const c of cats) {
    clauses.push(`node["shop"="${c}"](around:${radius},${lat},${lon});`);
    clauses.push(`way["shop"="${c}"](around:${radius},${lat},${lon});`);
  }
  return `[out:json][timeout:25];(\n  ${clauses.join("\n  ")}\n);out center ${limit};`;
}

async function callMapServer(server: string, query: string): Promise<Record<string, unknown>[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    // Requête GET : plus légère, bien acceptée par tous les miroirs Overpass.
    const response = await fetch(`${server}?data=${encodeURIComponent(query)}`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data?.elements) ? data.elements : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchMapStores(categories: string[], lat: number, lon: number): Promise<Store[]> {
  const runPass = async (cats: string[], radius: number, limit: number) => {
    const query = mapQuery(cats, lat, lon, radius, limit);
    for (const server of MAP_SERVERS) {
      const elements = await callMapServer(server, query);
      if (elements && elements.length > 0) return elements;
    }
    // Les pannes de saturation sont souvent brèves : on retente une fois
    // le premier serveur après une courte pause.
    await new Promise((r) => setTimeout(r, 700));
    const elements = await callMapServer(MAP_SERVERS[0], query);
    if (elements && elements.length > 0) return elements;
    return [] as Record<string, unknown>[];
  };

  let elements = await runPass(categories.slice(0, 3), 15000, 60);
  if (elements.length === 0) {
    const broad = Array.from(
      new Set([...categories, ...categories.flatMap((c) => MAP_EXTRAS[c] || [])])
    ).slice(0, 4);
    elements = await runPass(broad, 45000, 40);
  }

  const list: Store[] = [];
  for (const el of elements) {
    const anyEl = el as { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };
    const sLat = typeof anyEl.lat === "number" ? anyEl.lat : anyEl.center?.lat;
    const sLon = typeof anyEl.lon === "number" ? anyEl.lon : anyEl.center?.lon;
    if (sLat === undefined || sLon === undefined) continue;
    const tags = anyEl.tags || {};
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
      distanceKm: Math.round(haversineKm(lat, lon, sLat, sLon) * 10) / 10,
      categories: tags.shop ? [tags.shop] : [],
    });
  }
  list.sort((a, b) => a.distanceKm - b.distanceKm);
  return list.slice(0, 12);
}
type Page = "home" | "how" | "faq" | "guides" | "legal";

function DocPage({ title, onBack, sections, back }: { title: string; onBack: () => void; sections: { h: string; p: string }[]; back: string }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-5">
      <button onClick={() => { onBack(); window.scrollTo(0, 0); }} className="text-sm text-blue-700 hover:underline mb-4 inline-block">
        {back}
      </button>
      <h2 className="text-2xl font-bold text-slate-800 mb-5">{title}</h2>
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed [&_h3]:text-slate-800 [&_h3]:font-semibold [&_h3]:mt-2">
        {sections.map((s) => (
          <div key={s.h + s.p.slice(0, 12)}>
            <h3>{s.h}</h3>
            <p>{s.p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdsBanner() {
  React.useEffect(() => {
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      w.adsbygoogle = w.adsbygoogle || [];
      w.adsbygoogle.push({});
    } catch {
      /* publicité indisponible, on ignore */
    }
  }, []);
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-9159260142857610"
        data-ad-slot="1234567890"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Application                                                         */
/* ------------------------------------------------------------------ */

export default function App() {
  const [uiLang, setUiLang] = useState<UiLang>("fr");
  const [place, setPlace] = useState<Place>(PRESETS[0]);
  const [queryLang, setQueryLang] = useState("français");
  const [mode, setMode] = useState<"text" | "photo">("text");
  const [query, setQuery] = useState("");
  const [imageInfo, setImageInfo] = useState<{ base64: string; type: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState<Page>("home");

  // Détection automatique par IP (sans autorisation)
  const [detected, setDetected] = useState<{ city: string | null; country: string | null; lat: number; lon: number; targetLang: string } | null>(null);
  const [bannerHidden, setBannerHidden] = useState(false);

  // Recherche de ville libre
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<{ name: string; region: string | null; country: string | null; lat: number; lon: number; targetLang: string }[] | null>(null);
  const [citySearching, setCitySearching] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);

  const copy = COPY[uiLang];
  const goTo = (p: Page) => {
    setPage(p);
    window.scrollTo(0, 0);
  };

  // Au chargement : proposer la position détectée (IP)
  useEffect(() => {
    fetch("/api/geo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.detected) {
          setDetected({ city: d.city, country: d.country, lat: d.lat, lon: d.lon, targetLang: d.targetLang });
        }
      })
      .catch(() => { /* détection facultative */ });
  }, []);

  const searchCity = async () => {
    const q = cityQuery.trim();
    if (q.length < 2) return;
    setCitySearching(true);
    setCityError(null);
    setCityResults(null);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      if (!response.ok) {
        setCityError(copy.cityError);
        return;
      }
      if (Array.isArray(data) && data.length === 0) {
        setCityError(copy.cityNone);
        return;
      }
      setCityResults(data.slice(0, 5));
    } catch {
      setCityError(copy.cityError);
    } finally {
      setCitySearching(false);
    }
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setImageInfo({ ...compressed, name: file.name });
      setResults(null);
      setError(null);
    } catch {
      setError(copy.errImage);
    }
  };

  const search = async (queryOverride?: string) => {
    setError(null);
    setResults(null);
    if (mode === "text" && !(queryOverride ?? query).trim()) {
      setError(copy.errEmptyText);
      return;
    }
    if (mode === "photo" && !imageInfo) {
      setError(copy.errNoImage);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mode === "text" ? (queryOverride ?? query).trim() : undefined,
          imageBase64: mode === "photo" ? imageInfo?.base64 : undefined,
          imageType: mode === "photo" ? imageInfo?.type : undefined,
          lat: place.lat,
          lon: place.lon,
          queryLang,
          targetLang: place.targetLang,
          cityName: place.label,
        }),
      });
      if (response.status === 404) {
        setError(copy.errBackend);
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || `Erreur du serveur (code ${response.status}).`);
        return;
      }
      // L'analyse vient du serveur ; les magasins sont cherchés directement
      // depuis le navigateur auprès d'OpenStreetMap (aucune limite de 10 s).
      const mapCats =
        data.categories && data.categories.length > 0
          ? data.categories
          : ["supermarket", "hardware", "doityourself"];
      const stores = await fetchMapStores(mapCats, place.lat, place.lon);
      setResults({ ...data, stores });
    } catch {
      setError(copy.errNetwork);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white px-6 py-10 sm:py-14">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur">
              <Icon d={ICONS.search} className="w-6 h-6" />
            </div>
            <div>
              <div className="text-3xl font-extrabold tracking-tight">findforme<span className="text-blue-300">.biz</span></div>
              <div className="text-blue-200 text-sm">{copy.tagline}</div>
            </div>
            <div className="ml-auto flex rounded-xl overflow-hidden border border-white/30">
              <button onClick={() => setUiLang("fr")} className={`px-3 py-1 text-sm font-semibold ${uiLang === "fr" ? "bg-white text-blue-800" : "text-white hover:bg-white/10"}`}>FR</button>
              <button onClick={() => setUiLang("en")} className={`px-3 py-1 text-sm font-semibold ${uiLang === "en" ? "bg-white text-blue-800" : "text-white hover:bg-white/10"}`}>EN</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        {page === "how" && <DocPage title={copy.howTitle} onBack={() => goTo("home")} sections={HOW_SECTIONS[uiLang]} back={copy.back} />}
        {page === "faq" && <DocPage title={copy.faqTitle} onBack={() => goTo("home")} sections={FAQ_SECTIONS[uiLang]} back={copy.back} />}
        {page === "legal" && <DocPage title={copy.legalTitle} onBack={() => goTo("home")} sections={LEGAL_SECTIONS[uiLang]} back={copy.back} />}
        {page === "guides" && (
          <DocPage
            title={copy.guidesTitle}
            onBack={() => goTo("home")}
            sections={GUIDE_CONTENT[uiLang].flatMap((g) => [{ h: g.h, p: "" }, ...g.s.map((x) => ({ h: x.h, p: x.p }))])}
            back={copy.back}
          />
        )}
        {page === "home" && (
        <>
        {/* Bandeau de détection automatique */}
        {detected && !bannerHidden && (
          <div className="bg-white rounded-2xl shadow-sm border border-blue-200 p-4 -mt-6 flex flex-wrap items-center gap-3">
            <Icon d={ICONS.pin} className="w-5 h-5 text-blue-700" />
            <span className="text-sm text-slate-600 flex-1">{copy.detected(detected.city || "", detected.country)}</span>
            <button
              onClick={() => {
                setPlace({ label: detected.city || copy.gpsLabel, flag: "📍", lat: detected.lat, lon: detected.lon, targetLang: detected.targetLang });
                setBannerHidden(true);
              }}
              className="rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-3.5 py-2"
            >
              {copy.searchHere}
            </button>
            <button onClick={() => setBannerHidden(true)} className="text-xs text-slate-400 hover:text-slate-600">{copy.hideBanner}</button>
          </div>
        )}

        {/* Où chercher */}
        <section className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-5 ${detected && !bannerHidden ? "" : "-mt-6"}`}>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Icon d={ICONS.pin} className="w-4 h-4 text-blue-700" /> {copy.searchFor}
          </h2>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((c) => (
              <button
                key={c.label}
                onClick={() => setPlace(c)}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  place.label === c.label ? "border-blue-700 bg-blue-50 text-blue-800 font-semibold" : "border-slate-200 hover:border-slate-400"
                }`}
              >
                {c.flag} {c.label}
              </button>
            ))}
            {place.flag === "📍" && (
              <span className="rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-800 font-semibold">📍 {place.label}</span>
            )}
          </div>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <input
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchCity()}
              placeholder={copy.cityPlaceholder}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button onClick={searchCity} className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2">
              {citySearching ? copy.citySearching : copy.cityBtn}
            </button>
          </div>
          {cityError && <div className="mt-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{cityError}</div>}
          {cityResults && (
            <div className="mt-2 flex flex-wrap gap-2">
              {cityResults.map((r) => (
                <button
                  key={`${r.name}-${r.lat}`}
                  onClick={() => {
                    setPlace({ label: r.name, flag: "📍", lat: r.lat, lon: r.lon, targetLang: r.targetLang });
                    setCityResults(null);
                    setCityQuery("");
                  }}
                  className="rounded-xl border border-slate-300 hover:border-blue-500 hover:bg-blue-50 px-3 py-2 text-sm"
                >
                  {r.name}{r.country ? ` · ${r.country}` : ""}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 text-sm text-slate-500">
            <button
              className="text-blue-700 hover:underline font-medium"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (p) => {
                      setPlace({ label: copy.gpsLabel, flag: "📍", lat: p.coords.latitude, lon: p.coords.longitude, targetLang: place.targetLang });
                    },
                    () => setError(copy.geoFail)
                  );
                }
              }}
            >
              {copy.useGps}
            </button>
          </div>
        </section>

        {/* Recherche */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mt-5">
          <div className="flex gap-2 mb-4">
            <button onClick={() => setMode("text")} className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${mode === "text" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {copy.tabText}
            </button>
            <button onClick={() => setMode("photo")} className={`flex-1 rounded-xl py-2 text-sm font-medium transition inline-flex items-center justify-center gap-2 ${mode === "photo" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              <Icon d={ICONS.camera} className="w-4 h-4" /> {copy.tabPhoto}
            </button>
          </div>

          {mode === "text" && (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <select value={queryLang} onChange={(e) => setQueryLang(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white">
                  {QUERY_LANGS.map((l) => (
                    <option key={l.value} value={l.value}>{copy.askIn}{uiLang === "fr" ? l.fr : l.en}</option>
                  ))}
                </select>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                  placeholder={copy.placeholder}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>{copy.popular}</span>
                {POPULAR.map((p) => (
                  <button
                    key={p.fr}
                    onClick={() => { setMode("text"); setQuery(uiLang === "fr" ? p.fr : p.en); search(uiLang === "fr" ? p.fr : p.en); }}
                    className="text-xs bg-slate-100 hover:bg-slate-200 rounded-full px-2.5 py-1"
                  >
                    {uiLang === "fr" ? p.fr : p.en}
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === "photo" && (
            <div>
              <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl py-8 flex flex-col items-center gap-2 text-slate-500 transition">
                <Icon d={ICONS.camera} className="w-7 h-7" />
                <span className="text-sm font-medium">{copy.photoPrompt}</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              {imageInfo && (
                <div className="mt-3 text-sm text-slate-600">
                  {copy.photoReady}<span className="font-medium">{imageInfo.name}</span>
                </div>
              )}
            </div>
          )}

          <button onClick={() => search()} disabled={loading} className="mt-4 w-full rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-5 py-3 text-sm font-semibold transition">
            {loading ? copy.finding : copy.findBtn}
          </button>

          {error && <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800">{error}</div>}
        </section>

        {/* Traduction + résultats */}
        {results && (
          <>
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mt-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Icon d={ICONS.swap} className="w-4 h-4 text-blue-700" /> {copy.translateTitle}
              </h2>
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <div className="text-xs text-slate-500">{copy.inFrench}</div>
                  <div className="text-xl font-semibold">{results.objet_fr}</div>
                </div>
                <div className="text-slate-300 text-2xl">→</div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                  <div className="text-xs text-blue-600">{copy.localLang(place.targetLang)}</div>
                  <div className="text-xl font-bold text-blue-900">{results.objet_local}</div>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-3">{copy.askInStore(place.label, results.objet_local)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-3 py-1">{copy.badgeStock}</span>
                {results.categoryLabels.map((c) => (
                  <span key={c} className="text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-3 py-1">{c}</span>
                ))}
              </div>
            </section>

            <section className="mt-5">
              <h2 className="font-semibold mb-1">
                {results.stores.length > 0 ? copy.storesFound(results.stores.length, place.label) : copy.noStores}
              </h2>
              <p className="text-xs text-slate-400 mb-3">{copy.osmNote}</p>
              <ul className="space-y-3">
                {results.stores.map((s, i) => (
                  <li key={`${s.lat},${s.lon},${i}`} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0">
                      {String.fromCharCode(65 + (i % 26))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">
                        {s.name} <span className="text-slate-400 font-normal">· {s.distanceKm} km</span>
                      </div>
                      {s.address && <div className="text-xs text-slate-500">{s.address}</div>}
                      {s.categories.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {s.categories.map((c) => (
                            <span key={c} className="text-xs rounded-full px-2 py-0.5 border bg-slate-50 text-slate-600">{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-3.5 py-2 transition"
                    >
                      <Icon d={ICONS.route} className="w-4 h-4" /> {copy.route}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {/* Contenu de présentation */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-6">
          <h2 className="text-xl font-bold text-slate-800 mb-3">{copy.whyTitle}</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-3">{copy.why1}</p>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">{copy.why2}</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => goTo("guides")} className="rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700">{copy.guidesLink}</button>
            <button onClick={() => goTo("faq")} className="rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700">{copy.faqLink}</button>
            <button onClick={() => goTo("how")} className="rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700">{copy.howLink}</button>
          </div>
        </section>

        </>
        )}

        <AdsBanner />

        <footer className="mt-8 text-center text-xs text-slate-400">
          <div className="flex flex-wrap justify-center gap-4 mb-2">
            <button onClick={() => goTo("how")} className="text-blue-700 hover:underline font-medium">{copy.howLink}</button>
            <button onClick={() => goTo("guides")} className="text-blue-700 hover:underline font-medium">{copy.guidesLink}</button>
            <button onClick={() => goTo("faq")} className="text-blue-700 hover:underline font-medium">{copy.faqLink}</button>
            <button onClick={() => goTo("legal")} className="text-blue-700 hover:underline font-medium">{copy.legalLink}</button>
          </div>
          findforme.biz · Mistral AI · OpenStreetMap
        </footer>
      </main>
    </div>
  );
}
