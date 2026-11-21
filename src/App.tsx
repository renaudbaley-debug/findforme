// src/App.tsx
// Version production de findforme.biz : appelle /api/search (fonction serverless
// Vercel + Mistral + OpenStreetMap). Interface bilingue FR / EN.
// Replace tout le contenu précédent de src/App.tsx.

import React, { useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* Données                                                             */
/* ------------------------------------------------------------------ */

type City = {
  id: string;
  name: string;
  flag: string;
  lat: number;
  lon: number;
  // Langue locale de la ville, envoyée au backend (prompt Mistral)
  target: { fr: string; en: string };
};

const CITIES: City[] = [
  { id: "berlin", name: "Berlin", flag: "🇩🇪", lat: 52.52, lon: 13.405, target: { fr: "allemand", en: "German" } },
  { id: "paris", name: "Paris", flag: "🇫🇷", lat: 48.8566, lon: 2.3522, target: { fr: "français", en: "French" } },
  { id: "brussels", name: "Bruxelles", flag: "🇧🇪", lat: 50.8503, lon: 4.3517, target: { fr: "français", en: "French" } },
  { id: "amsterdam", name: "Amsterdam", flag: "🇳🇱", lat: 52.3676, lon: 4.9041, target: { fr: "néerlandais", en: "Dutch" } },
  { id: "london", name: "London", flag: "🇬🇧", lat: 51.5074, lon: -0.1278, target: { fr: "anglais", en: "English" } },
];

// Langues dans lesquelles l'utilisateur peut formuler sa demande.
// La valeur envoyée au backend reste en français.
const QUERY_LANGS: { value: string; fr: string; en: string }[] = [
  { value: "français", fr: "Français", en: "French" },
  { value: "anglais", fr: "Anglais", en: "English" },
  { value: "allemand", fr: "Allemand", en: "German" },
  { value: "néerlandais", fr: "Néerlandais", en: "Dutch" },
  { value: "espagnol", fr: "Espagnol", en: "Spanish" },
];

/* ------------------------------------------------------------------ */
/* Textes de l'interface, bilingues                                    */
/* ------------------------------------------------------------------ */

const COPY = {
  fr: {
    tagline: "Trouvez l'objet qu'il vous faut, près de vous, dans votre langue",
    searchFor: "Où cherchez-vous ?",
    otherPlace: "Vous cherchez pour un autre endroit ? Choisissez la ville, ou :",
    useGps: "📍 Utiliser ma position réelle",
    geoOk: "Position réelle détectée : la recherche se fera autour de vous.",
    geoFail: "Position inaccessible : autorisez la géolocalisation ou choisissez une ville.",
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
    errBackend: "Le backend n'est pas encore déployé : créez le fichier api/search.js dans le dépôt (voir le canvas backend), puis laissez Vercel redéployer.",
    errNetwork: "Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.",
    translateTitle: "Exprimez votre demande sur place",
    inFrench: "En français",
    localLang: (l: string) => `Langue locale (${l})`,
    askInStore: (city: string, word: string) => `À ${city}, demandez « ${word} » en magasin.`,
    badgeStock: "⚠️ Disponibilité non vérifiée en temps réel : appelez le magasin si besoin.",
    osmNote: "Magasins issus d'OpenStreetMap, triés par distance.",
    storesFound: (n: number, city: string) => `${n} magasin${n > 1 ? "s" : ""} trouvé${n > 1 ? "s" : ""} près de ${city}`,
    noStores: "Aucun magasin trouvé à proximité",
    cityCenter: (name: string) => `${name} (centre-ville)`,
    myPosition: "Ma position actuelle",
    route: "Itinéraire",
    back: "← Retour à la recherche",
    howTitle: "Comment ça marche",
    legalTitle: "Confidentialité et mentions légales",
    howLink: "Comment ça marche",
    legalLink: "Confidentialité et mentions légales",
    inputLabelFR: "En français",
    inQueryLang: (l: string) => `Dans votre langue (${l})`,
  },
  en: {
    tagline: "Find the object you need, near you, in your own language",
    searchFor: "Where are you searching?",
    otherPlace: "Searching for another place? Pick a city, or:",
    useGps: "📍 Use my real location",
    geoOk: "Real location detected: the search will run around you.",
    geoFail: "Location unavailable: allow geolocation or pick a city.",
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
    errBackend: "The backend is not deployed yet: create the api/search.js file in the repository (see the backend canvas), then let Vercel redeploy.",
    errNetwork: "The server cannot be reached. Check your connection and try again.",
    translateTitle: "How to ask for it locally",
    inFrench: "In French",
    localLang: (l: string) => `Local language (${l})`,
    askInStore: (city: string, word: string) => `In ${city}, ask for "${word}" in the store.`,
    badgeStock: "⚠️ Availability not verified in real time: call the store if needed.",
    osmNote: "Stores from OpenStreetMap, sorted by distance.",
    storesFound: (n: number, city: string) => `${n} store${n > 1 ? "s" : ""} found near ${city}`,
    noStores: "No store found nearby",
    cityCenter: (name: string) => `${name} (city centre)`,
    myPosition: "My current location",
    route: "Directions",
    back: "← Back to search",
    howTitle: "How it works",
    legalTitle: "Privacy and legal notice",
    howLink: "How it works",
    legalLink: "Privacy and legal notice",
    inputLabelFR: "In French",
    inQueryLang: (l: string) => `In your language (${l})`,
  },
};

/* Contenu des pages documentaires, bilingue */
const HOW_SECTIONS = {
  fr: [
    { h: "1. Décrivez l'objet recherché", p: "Par texte, dans votre langue, ou par une simple photo de l'objet. L'intelligence artificielle identifie l'objet et le traduit dans la langue du pays où vous vous trouvez avec les mots que les commerçants comprennent : à Berlin, « tournevis » devient « Schraubendreher »." },
    { h: "2. Nous cherchons les magasins autour de vous", p: "Autour de votre position (si vous l'autorisez) ou de la ville choisie, nous consultons les données publiques d'OpenStreetMap pour trouver les magasins qui vendent ce type de produit, triés par distance. La disponibilité exacte en stock n'est pas vérifiée en temps réel : le site vous le signale clairement." },
    { h: "3. Vous partez avec le bon mot et un itinéraire", p: "Chaque résultat propose un itinéraire direct. Montrez la traduction fournie sur place et demandez le mot dans la langue locale. FindForMe fait le pont entre votre langue et le magasin d'à côté." },
    { h: "Qui fournit quoi ?", p: "L'analyse des textes et des photos est réalisée par les modèles d'IA de Mistral AI. Les magasins proviennent d'OpenStreetMap, une carte libre du monde. Les itinéraires sont proposés par Google Maps." },
  ],
  en: [
    { h: "1. Describe the object you need", p: "By text, in your own language, or simply with a photo. The AI identifies the object and translates it into the local language with words shopkeepers understand: in Berlin, \"screwdriver\" becomes \"Schraubendreher\"." },
    { h: "2. We look for stores around you", p: "Around your position (if you allow it) or around the chosen city, we consult OpenStreetMap public data to find stores selling that type of product, sorted by distance. Exact stock availability is not verified in real time: the site tells you clearly." },
    { h: "3. You leave with the right word and directions", p: "Every result offers a direct route. Show the provided translation and ask for the word in the local language. FindForMe bridges your language and the store next door." },
    { h: "Who provides what?", p: "Text and photo analysis is done by Mistral AI models. Stores come from OpenStreetMap, a free map of the world. Directions are provided by Google Maps." },
  ],
};

const LEGAL_SECTIONS = {
  fr: [
    { h: "Éditeur du site", p: "Site findforme.biz, édité à titre personnel par [votre prénom et nom], [votre adresse], contact : [votre adresse e-mail]." },
    { h: "Hébergement", p: "Site hébergé par Vercel (vercel.com)." },
    { h: "Données envoyées lors d'une recherche", p: "Aucun compte, aucune inscription : le site ne vous demande pas d'identité. Lors d'une recherche, votre texte ou votre photo, ainsi que la position choisie, sont envoyés à notre serveur : le texte ou la photo est transmis au service d'analyse (Mistral AI) pour identifier l'objet et le traduire ; la position sert à chercher les magasins proches dans OpenStreetMap. Ces éléments servent uniquement à répondre à votre demande." },
    { h: "Géolocalisation", p: "La position précise n'est utilisée que si vous cliquez sur « Utiliser ma position réelle » et autorisez le navigateur à la partager. Sinon, seule la ville choisie est utilisée. Aucune position n'est conservée après la recherche." },
    { h: "Cookies et publicité", p: "Le site dépose aujourd'hui des cookies publicitaires Google (AdSense) et de ses partenaires. Vous pouvez à tout moment paramétrer vos préférences publicitaires sur https://policies.google.com/technologies/ads?hl=fr" },
    { h: "Journaux techniques", p: "Comme tout site, l'hébergeur (Vercel) enregistre des journaux techniques standards (adresse IP, date, page demandée) pendant une durée limitée, à des fins de sécurité et de lutte contre les abus." },
    { h: "Vos droits (RGPD)", p: "Conformément au Règlement général sur la protection des données, vous disposez d'un droit d'accès, de rectification et d'effacement des informations vous concernant. Écrivez à [votre adresse e-mail] ; réponse sous 30 jours." },
    { h: "Droit applicable", p: "Le site est soumis au droit de [votre pays]." },
  ],
  en: [
    { h: "Site publisher", p: "Website findforme.biz, published on a personal basis by [your first and last name], [your address], contact: [your e-mail address]." },
    { h: "Hosting", p: "Hosted by Vercel (vercel.com)." },
    { h: "Data sent during a search", p: "No account, no sign-up: the site does not ask for your identity. During a search, your text or photo, together with the chosen location, are sent to our server: the text or photo is passed to the analysis service (Mistral AI) to identify and translate the object; the location is used to find nearby stores in OpenStreetMap. These elements are used solely to answer your request." },
    { h: "Geolocation", p: "Your precise position is only used if you click \"Use my real location\" and let your browser share it. Otherwise, only the chosen city is used. No position is kept after the search." },
    { h: "Cookies and advertising", p: "The site currently deposits Google (AdSense) advertising cookies and those of its partners. You can manage your advertising preferences at any time on https://policies.google.com/technologies/ads" },
    { h: "Technical logs", p: "Like any website, the host (Vercel) records standard technical logs (IP address, date, requested page) for a limited period, for security and abuse prevention purposes." },
    { h: "Your rights (GDPR)", p: "Under the General Data Protection Regulation, you have a right of access, rectification and erasure of your personal information. Write to [your e-mail address]; reply within 30 days." },
    { h: "Applicable law", p: "The site is governed by the law of [your country]." },
  ],
};

/* ------------------------------------------------------------------ */
/* Types et utilitaires                                                */
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
  categoryLabels: string[];
  stockNote: string;
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

// Downscale la photo (max 1024 px) et la convertit en base64 JPEG
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

/* ------------------------------------------------------------------ */
/* Composants de page                                                  */
/* ------------------------------------------------------------------ */

type UiLang = "fr" | "en";

function DocPage({ title, onBack, sections, back }: { title: string; onBack: () => void; sections: { h: string; p: string }[]; back: string }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-5">
      <button onClick={() => { onBack(); window.scrollTo(0, 0); }} className="text-sm text-blue-700 hover:underline mb-4 inline-block">
        {back}
      </button>
      <h2 className="text-2xl font-bold text-slate-800 mb-5">{title}</h2>
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed [&_h3]:text-slate-800 [&_h3]:font-semibold [&_h3]:mt-2">
        {sections.map((s) => (
          <div key={s.h}>
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
  const [cityId, setCityId] = useState("berlin");
  const [queryLang, setQueryLang] = useState("français");
  const [mode, setMode] = useState<"text" | "photo">("text");
  const [query, setQuery] = useState("");
  const [imageInfo, setImageInfo] = useState<{ base64: string; type: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customPos, setCustomPos] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState<"home" | "how" | "legal">("home");

  const copy = COPY[uiLang];
  const goTo = (p: "home" | "how" | "legal") => {
    setPage(p);
    window.scrollTo(0, 0);
  };

  const city = CITIES.find((c) => c.id === cityId)!;
  const pos = customPos ?? { lat: city.lat, lon: city.lon, label: copy.cityCenter(city.name) };
  const localLangName = city.target[uiLang];

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

  const search = async () => {
    setError(null);
    setResults(null);
    if (mode === "text" && !query.trim()) {
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
          query: mode === "text" ? query.trim() : undefined,
          imageBase64: mode === "photo" ? imageInfo?.base64 : undefined,
          imageType: mode === "photo" ? imageInfo?.type : undefined,
          lat: pos.lat,
          lon: pos.lon,
          queryLang,
          targetLang: city.target.fr,
          cityName: customPos ? "la position actuelle" : city.name,
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
      setResults(data);
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
              <button
                onClick={() => setUiLang("fr")}
                className={`px-3 py-1 text-sm font-semibold ${uiLang === "fr" ? "bg-white text-blue-800" : "text-white hover:bg-white/10"}`}
              >
                FR
              </button>
              <button
                onClick={() => setUiLang("en")}
                className={`px-3 py-1 text-sm font-semibold ${uiLang === "en" ? "bg-white text-blue-800" : "text-white hover:bg-white/10"}`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        {page === "how" && <DocPage title={copy.howTitle} onBack={() => goTo("home")} sections={HOW_SECTIONS[uiLang]} back={copy.back} />}
        {page === "legal" && <DocPage title={copy.legalTitle} onBack={() => goTo("home")} sections={LEGAL_SECTIONS[uiLang]} back={copy.back} />}
        {page === "home" && (
        <>
        {/* Où chercher */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 -mt-6">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Icon d={ICONS.pin} className="w-4 h-4 text-blue-700" /> {copy.searchFor}
          </h2>
          <div className="flex flex-wrap gap-2">
            {CITIES.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCityId(c.id); setCustomPos(null); setGeoMsg(null); }}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  cityId === c.id && !customPos ? "border-blue-700 bg-blue-50 text-blue-800 font-semibold" : "border-slate-200 hover:border-slate-400"
                }`}
              >
                {c.flag} {c.name}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>{copy.otherPlace}</span>
            <button
              className="text-blue-700 hover:underline font-medium"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (p) => {
                      setCustomPos({ lat: p.coords.latitude, lon: p.coords.longitude, label: copy.myPosition });
                      setGeoMsg(copy.geoOk);
                    },
                    () => setGeoMsg(copy.geoFail)
                  );
                }
              }}
            >
              {copy.useGps}
            </button>
          </div>
          {geoMsg && <div className="mt-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{geoMsg}</div>}
        </section>

        {/* Recherche */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mt-5">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode("text")}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${mode === "text" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {copy.tabText}
            </button>
            <button
              onClick={() => setMode("photo")}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition inline-flex items-center justify-center gap-2 ${mode === "photo" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              <Icon d={ICONS.camera} className="w-4 h-4" /> {copy.tabPhoto}
            </button>
          </div>

          {mode === "text" && (
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={queryLang}
                onChange={(e) => setQueryLang(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
              >
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
          )}

          {mode === "photo" && (
            <div>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl py-8 flex flex-col items-center gap-2 text-slate-500 transition"
              >
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

          <button
            onClick={search}
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-5 py-3 text-sm font-semibold transition"
          >
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
                  <div className="text-xs text-slate-500">{uiLang === "fr" ? copy.inFrench : copy.inQueryLang(queryLangLabel(queryLang, uiLang))}</div>
                  <div className="text-xl font-semibold">{results.objet_fr}</div>
                </div>
                <div className="text-slate-300 text-2xl">→</div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                  <div className="text-xs text-blue-600">{copy.localLang(localLangName)}</div>
                  <div className="text-xl font-bold text-blue-900">{results.objet_local}</div>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-3">{copy.askInStore(city.name, results.objet_local)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-3 py-1">
                  {copy.badgeStock}
                </span>
                {results.categoryLabels.map((c) => (
                  <span key={c} className="text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-3 py-1">{c}</span>
                ))}
              </div>
            </section>

            <section className="mt-5">
              <h2 className="font-semibold mb-1">
                {results.stores.length > 0
                  ? copy.storesFound(results.stores.length, pos.label)
                  : copy.noStores}
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

        </>
        )}

        <AdsBanner />

        <footer className="mt-8 text-center text-xs text-slate-400">
          <div className="flex flex-wrap justify-center gap-4 mb-2">
            <button onClick={() => goTo("how")} className="text-blue-700 hover:underline font-medium">{copy.howLink}</button>
            <button onClick={() => goTo("legal")} className="text-blue-700 hover:underline font-medium">{copy.legalLink}</button>
          </div>
          findforme.biz · Mistral AI · OpenStreetMap
        </footer>
      </main>
    </div>
  );
}

function queryLangLabel(value: string, uiLang: UiLang) {
  const found = QUERY_LANGS.find((l) => l.value === value);
  if (!found) return value;
  return uiLang === "fr" ? found.fr : found.en;
}
