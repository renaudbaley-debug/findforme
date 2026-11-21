// src/App.tsx
// Version production de findforme.biz : appelle /api/search (Vercel fonction
// serverless + Mistral + OpenStreetMap). Remplace tout le contenu précédent.

import React, { useRef, useState } from "react";

type City = {
  id: string;
  name: string;
  country: string;
  flag: string;
  lat: number;
  lon: number;
  targetLang: string;
};

const CITIES: City[] = [
  { id: "berlin", name: "Berlin", country: "Allemagne", flag: "🇩🇪", lat: 52.52, lon: 13.405, targetLang: "allemand" },
  { id: "paris", name: "Paris", country: "France", flag: "🇫🇷", lat: 48.8566, lon: 2.3522, targetLang: "français" },
  { id: "brussels", name: "Bruxelles", country: "Belgique", flag: "🇧🇪", lat: 50.8503, lon: 4.3517, targetLang: "français" },
  { id: "amsterdam", name: "Amsterdam", country: "Pays-Bas", flag: "🇳🇱", lat: 52.3676, lon: 4.9041, targetLang: "néerlandais" },
  { id: "london", name: "Londres", country: "Royaume-Uni", flag: "🇬🇧", lat: 51.5074, lon: -0.1278, targetLang: "anglais" },
];

const LANGS = ["français", "anglais", "allemand", "néerlandais", "espagnol"];

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
        reject(new Error("Impossible de lire l'image."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      resolve({ base64: dataUrl.split(",")[1], type: "image/jpeg" });
    };
    img.onerror = () => reject(new Error("Image illisible."));
    img.src = url;
  });
}

function DocPage({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-5">
      <button
        onClick={() => { onBack(); window.scrollTo(0, 0); }}
        className="text-sm text-blue-700 hover:underline mb-4 inline-block"
      >
        ← Retour à la recherche
      </button>
      <h2 className="text-2xl font-bold text-slate-800 mb-5">{title}</h2>
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed [&_h3]:text-slate-800 [&_h3]:font-semibold [&_h3]:mt-2">
        {children}
      </div>
    </section>
  );
}

function HowPage({ onBack }: { onBack: () => void }) {
  return (
    <DocPage title="Comment ça marche" onBack={onBack}>
      <h3>1. Décrivez l'objet recherché</h3>
      <p>
        Par texte, dans votre langue ("un tournevis"), ou par une simple photo de l'objet.
        L'intelligence artificielle identifie l'objet, quel que soit le niveau de précision de votre
        description, et le traduit dans la langue du pays où vous vous trouvez avec les mots que
        les commerçants comprennent : à Berlin, "tournevis" devient "Schraubendreher".
      </p>
      <h3>2. Nous cherchons les magasins autour de vous</h3>
      <p>
        Autour de votre position (si vous l'autorisez) ou de la ville choisie, nous consultons les
        données publiques d'OpenStreetMap pour trouver les magasins qui vendent ce type de produit,
        triés par distance. La disponibilité exacte en stock n'est pas vérifiée en temps réel :
        le site vous le signale clairement, et vous pouvez appeler le magasin depuis sa fiche.
      </p>
      <h3>3. Vous partez avec le bon mot et un itinéraire</h3>
      <p>
        Chaque résultat propose un itinéraire direct. Imprimez ou montrez la traduction fournie
        sur place, et demandez le mot dans la langue locale. C'est tout : FindForMe fait le pont
        entre votre langue et le magasin d'à côté.
      </p>
      <h3>Qui fournit quoi ?</h3>
      <p>
        L'analyse des textes et des photos est réalisée par les modèles d'IA de Mistral AI. Les
        magasins proviennent d'OpenStreetMap, une carte libre du monde. Les itinéraires sont
        proposés par Google Maps.
      </p>
    </DocPage>
  );
}

function LegalPage({ onBack }: { onBack: () => void }) {
  return (
    <DocPage title="Confidentialité et mentions légales" onBack={onBack}>
      <h3>Éditeur du site</h3>
      <p>
        Site findforme.biz, édité à titre personnel par [votre prénom et nom], [votre adresse],
        contact : [votre adresse e-mail].
      </p>
      <h3>Hébergement</h3>
      <p>Site hébergé par Vercel (vercel.com). Adresses de Vercel : vercel.com/privacy-policy.</p>
      <h3>Données envoyées lors d'une recherche</h3>
      <p>
        Aucun compte, aucune inscription : le site ne vous demande pas d'identité. Lors d'une
        recherche, votre texte ou votre photo, ainsi que la position choisie, sont envoyés à
        notre serveur pour produire la réponse : le texte ou la photo est transmis au service
        d'analyse (Mistral AI) pour identifier l'objet et le traduire ; la position sert à
        chercher les magasins proches dans OpenStreetMap. Ces éléments servent uniquement à
        répondre à votre demande.
      </p>
      <h3>Géolocalisation</h3>
      <p>
        La position précise n'est utilisée que si vous cliquez sur "Utiliser ma position
        réelle" et autorisez le navigateur à la partager. Sinon, seule la ville choisie est
        utilisée. Aucune position n'est conservée après la recherche.
      </p>
      <h3>Cookies et publicité</h3>
      <p>
        Le site ne dépose aujourd'hui aucun cookie. Si des espaces publicitaires Google
        (AdSense) sont activés, des cookies publicitaires de Google et de ses partenaires
        pourront être déposés ; une bannière de consentement sera affichée. Vous pouvez à tout
        moment paramétrer vos préférences.publicitaires sur
        https://policies.google.com/technologies/ads?hl=fr
      </p>
      <h3>Journaux techniques</h3>
      <p>
        Comme tout site, l'hébergeur (Vercel) enregistre des journaux techniques standards
        (adresse IP, date, page demandée) pendant une durée limitée, à des fins de sécurité
        et de lutte contre les abus.
      </p>
      <h3>Vos droits (RGPD)</h3>
      <p>
        Conformément au Règlement général sur la protection des données, vous disposez d'un
        droit d'accès, de rectification et d'effacement des informations vous concernant.
        Écrivez à [votre adresse e-mail] ; réponse sous 30 jours.
      </p>
      <h3>Droit applicable</h3>
      <p>Le site est soumis au droit de [votre pays].</p>
    </DocPage>
  );
}

export default function App() {
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

  const goTo = (p: "home" | "how" | "legal") => {
    setPage(p);
    window.scrollTo(0, 0);
  };

  const city = CITIES.find((c) => c.id === cityId)!;
  const pos = customPos ?? { lat: city.lat, lon: city.lon, label: `${city.name} (centre-ville)` };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setImageInfo({ ...compressed, name: file.name });
      setResults(null);
      setError(null);
    } catch {
      setError("Impossible de lire cette image. Essayez une photo JPG ou PNG.");
    }
  };

  const search = async () => {
    setError(null);
    setResults(null);
    if (mode === "text" && !query.trim()) {
      setError("Tapez d'abord le nom de l'objet recherché.");
      return;
    }
    if (mode === "photo" && !imageInfo) {
      setError("Importez d'abord une photo de l'objet.");
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
          targetLang: city.targetLang,
          cityName: customPos ? "une ville proche de la position" : city.name,
        }),
      });

      if (response.status === 404) {
        setError("Le backend n'est pas encore déployé : créez le fichier api/search.js dans le dépôt (voir le canvas backend), puis laissez Vercel redéployer.");
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || `Erreur du serveur (code ${response.status}).`);
        return;
      }
      setResults(data);
    } catch (err) {
      setError("Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.");
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
              <div className="text-blue-200 text-sm">Trouvez l'objet qu'il vous faut, près de vous, dans votre langue</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        {page === "how" && <HowPage onBack={() => goTo("home")} />}
        {page === "legal" && <LegalPage onBack={() => goTo("home")} />}
        {page === "home" && (
        <>
        {/* Où chercher */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 -mt-6">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Icon d={ICONS.pin} className="w-4 h-4 text-blue-700" /> Où cherchez-vous ?
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
            <span>Vous cherchez pour un autre endroit ? Choisissez la ville, ou :</span>
            <button
              className="text-blue-700 hover:underline font-medium"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (p) => {
                      setCustomPos({ lat: p.coords.latitude, lon: p.coords.longitude, label: "Ma position actuelle" });
                      setGeoMsg("Position réelle détectée : la recherche se fera autour de vous.");
                    },
                    () => setGeoMsg("Position inaccessible : autorisez la géolocalisation ou choisissez une ville.")
                  );
                }
              }}
            >
              📍 Utiliser ma position réelle
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
              Recherche par texte
            </button>
            <button
              onClick={() => setMode("photo")}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition inline-flex items-center justify-center gap-2 ${mode === "photo" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              <Icon d={ICONS.camera} className="w-4 h-4" /> Recherche par photo
            </button>
          </div>

          {mode === "text" && (
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={queryLang}
                onChange={(e) => setQueryLang(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                {LANGS.map((l) => (
                  <option key={l} value={l}>Je demande en : {l}</option>
                ))}
              </select>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="Ex. : « je cherche un tournevis »"
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
                <span className="text-sm font-medium">Prenez en photo l'objet ou importez une image</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              {imageInfo && (
                <div className="mt-3 text-sm text-slate-600">
                  Image prête à être analysée : <span className="font-medium">{imageInfo.name}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={search}
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-5 py-3 text-sm font-semibold transition"
          >
            {loading ? "Recherche en cours…" : "Trouver près de moi"}
          </button>

          {error && <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800">{error}</div>}
        </section>

        {/* Traduction + résultats */}
        {results && (
          <>
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mt-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Icon d={ICONS.swap} className="w-4 h-4 text-blue-700" /> Exprimez votre demande sur place
              </h2>
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <div className="text-xs text-slate-500">En français</div>
                  <div className="text-xl font-semibold">{results.objet_fr}</div>
                </div>
                <div className="text-slate-300 text-2xl">→</div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                  <div className="text-xs text-blue-600">Langue locale ({city.targetLang})</div>
                  <div className="text-xl font-bold text-blue-900">{results.objet_local}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-3 py-1">
                  ⚠️ {results.stockNote}
                </span>
                {results.categoryLabels.map((c) => (
                  <span key={c} className="text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-3 py-1">{c}</span>
                ))}
              </div>
            </section>

            <section className="mt-5">
              <h2 className="font-semibold mb-1">
                {results.stores.length > 0
                  ? `${results.stores.length} magasin${results.stores.length > 1 ? "s" : ""} trouvé${results.stores.length > 1 ? "s" : ""} près de ${pos.label}`
                  : "Aucun magasin trouvé à proximité"}
              </h2>
              <p className="text-xs text-slate-400 mb-3">Magasins issus d'OpenStreetMap, triés par distance.</p>
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
                      <Icon d={ICONS.route} className="w-4 h-4" /> Itinéraire
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        </>
        )}

        <ins className="adsbygoogle"
             style={{ display: "block" }}
             data-ad-client="ca-pub-VOTRE_ID"
             data-ad-slot="VOTRE_EMPLACEMENT"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>

        <footer className="mt-8 text-center text-xs text-slate-400">
          <div className="flex flex-wrap justify-center gap-4 mb-2">
            <button onClick={() => goTo("how")} className="text-blue-700 hover:underline font-medium">Comment ça marche</button>
            <button onClick={() => goTo("legal")} className="text-blue-700 hover:underline font-medium">Confidentialité et mentions légales</button>
          </div>
          findforme.biz · IA Mistral + données OpenStreetMap · disponibilité des stocks non vérifiée en temps réel.
        </footer>
      </main>
    </div>
  );
}
