import React, { useMemo, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* Données de démonstration                                            */
/* ------------------------------------------------------------------ */

type LangId = "fr" | "en" | "de" | "nl" | "es";

const LANGS: Record<LangId, string> = {
  fr: "Français",
  en: "English",
  de: "Deutsch",
  nl: "Nederlands",
  es: "Español",
};

type City = {
  id: string;
  name: string;
  country: string;
  flag: string;
  target: LangId;
  targetNote: string;
};

const CITIES: City[] = [
  { id: "berlin", name: "Berlin", country: "Allemagne", flag: "🇩🇪", target: "de", targetNote: "langue locale : allemand" },
  { id: "paris", name: "Paris", country: "France", flag: "🇫🇷", target: "fr", targetNote: "langue locale : français" },
  { id: "brussels", name: "Bruxelles", country: "Belgique", flag: "🇧🇪", target: "fr", targetNote: "langues locales : français / néerlandais" },
  { id: "amsterdam", name: "Amsterdam", country: "Pays-Bas", flag: "🇳🇱", target: "nl", targetNote: "langue locale : néerlandais" },
  { id: "london", name: "Londres", country: "Royaume-Uni", flag: "🇬🇧", target: "en", targetNote: "langue locale : anglais" },
];

type Term = {
  id: string;
  cat: "bricolage" | "électronique" | "maison";
  emoji: string;
  labels: Record<LangId, string>;
  tip?: Record<string, string>;
};

const TERMS: Term[] = [
  { id: "tournevis", cat: "bricolage", emoji: "🪛", labels: { fr: "tournevis", en: "screwdriver", de: "Schraubendreher", nl: "schroevendraaier", es: "destornillador" } },
  { id: "marteau", cat: "bricolage", emoji: "🔨", labels: { fr: "marteau", en: "hammer", de: "Hammer", nl: "hamer", es: "martillo" } },
  { id: "clou", cat: "bricolage", emoji: "📌", labels: { fr: "clou", en: "nail", de: "Nagel", nl: "spijker", es: "clavo" } },
  { id: "perceuse", cat: "bricolage", emoji: "🛠️", labels: { fr: "perceuse", en: "drill", de: "Bohrmaschine", nl: "boormachine", es: "taladro" } },
  { id: "ruban-adhesif", cat: "maison", emoji: "📏", labels: { fr: "ruban adhésif", en: "adhesive tape", de: "Klebeband", nl: "plakband", es: "cinta adhesiva" } },
  { id: "pile", cat: "électronique", emoji: "🔋", labels: { fr: "pile", en: "battery", de: "Batterie", nl: "batterij", es: "pila" } },
  { id: "ampoule", cat: "maison", emoji: "💡", labels: { fr: "ampoule", en: "light bulb", de: "Glühbirne", nl: "gloeilamp", es: "bombilla" } },
  { id: "cable-usb", cat: "électronique", emoji: "🔌", labels: { fr: "câble USB", en: "USB cable", de: "USB-Kabel", nl: "USB-kabel", es: "cable USB" } },
  { id: "adaptateur-prise", cat: "électronique", emoji: "🔄", labels: { fr: "adaptateur de prise", en: "power plug adapter", de: "Stecker-Adapter", nl: "stekkeradapter", es: "adaptador de enchufe" } },
  { id: "cadenas", cat: "bricolage", emoji: "🔒", labels: { fr: "cadenas", en: "padlock", de: "Vorhängeschloss", nl: "hangslot", es: "candado" } },
];

type Store = {
  id: string;
  name: string;
  cats: string[];
  dist: number;
  addr: string;
  open: boolean;
  hours: string;
};

const STORES: Record<string, Store[]> = {
  berlin: [
    { id: "b1", name: "Bauhaus Alexanderplatz", cats: ["bricolage", "maison", "électronique"], dist: 1.2, addr: "Alexanderstraße 1, 10178 Berlin", open: true, hours: "Ouvert · ferme à 20 h" },
    { id: "b2", name: "OBI Berlin Mitte", cats: ["bricolage", "maison"], dist: 2.4, addr: "Ostbahnhof, 10243 Berlin", open: true, hours: "Ouvert · ferme à 21 h" },
    { id: "b3", name: "Conrad Electronic", cats: ["électronique"], dist: 3.5, addr: "Konstanzer Straße 2, 10707 Berlin", open: true, hours: "Ouvert · ferme à 19 h" },
    { id: "b4", name: "Baumarkt Kreuzberg (indépendant)", cats: ["bricolage", "maison"], dist: 3.9, addr: "Bergmannstraße 12, 10961 Berlin", open: false, hours: "Fermé · ouvre lundi à 9 h" },
    { id: "b5", name: "Toolstation Berlin Südkreuz", cats: ["bricolage"], dist: 6.1, addr: "Hildegard-Knef-Platz 2, 10829 Berlin", open: true, hours: "Ouvert · ferme à 18 h" },
    { id: "b6", name: "Hornbach Spandau", cats: ["bricolage", "maison", "électronique"], dist: 9.8, addr: "Am Wall 3, 13597 Berlin", open: true, hours: "Ouvert · ferme à 20 h" },
  ],
  paris: [
    { id: "p1", name: "Bricorama Paris 12e", cats: ["bricolage", "maison"], dist: 1.5, addr: "12 Rue de Charenton, 75012 Paris", open: true, hours: "Ouvert · ferme à 19 h 30" },
    { id: "p2", name: "Leroy Merlin Paris Madeleine", cats: ["bricolage", "maison"], dist: 2.8, addr: "12 Boulevard de la Madeleine, 75009 Paris", open: true, hours: "Ouvert · ferme à 20 h" },
    { id: "p3", name: "FNAC Paris (électronique)", cats: ["électronique"], dist: 3.2, addr: "77 Boulevard Saint-Michel, 75005 Paris", open: true, hours: "Ouvert · ferme à 21 h" },
    { id: "p4", name: "Quincaillerie Bertho (indépendante)", cats: ["bricolage"], dist: 4.0, addr: "12 Rue Bertho, 75004 Paris", open: false, hours: "Fermé · ouvre lundi à 8 h 30" },
    { id: "p5", name: "Casto Lagardère", cats: ["bricolage", "maison"], dist: 7.4, addr: "12 Avenue de la Porte de Bagnolet", open: true, hours: "Ouvert · ferme à 19 h" },
  ],
  brussels: [
    { id: "c1", name: "Gamma Bruxelles", cats: ["bricolage", "maison"], dist: 1.8, addr: "Chaussée de Louvain 123, 1210", open: true, hours: "Ouvert · ferme à 18 h 30" },
    { id: "c2", name: "Brico Centre", cats: ["bricolage", "maison"], dist: 2.6, addr: "Rue de la Loi 44, 1000", open: true, hours: "Ouvert · ferme à 18 h" },
    { id: "c3", name: "MediaMarkt Brussel", cats: ["électronique"], dist: 3.1, addr: "Rue Neuve 27, 1000", open: true, hours: "Ouvert · ferme à 20 h" },
    { id: "c4", name: "Quincaillerie Bertholet (indépendante)", cats: ["bricolage"], dist: 4.3, addr: "Rue Bertholet 6, 1040", open: false, hours: "Fermé · ouvre lundi à 9 h" },
    { id: "c5", name: "Hubo Evere", cats: ["bricolage", "maison"], dist: 7.0, addr: "Bd Léopold III 219, 1140", open: true, hours: "Ouvert · ferme à 18 h" },
  ],
  amsterdam: [
    { id: "a1", name: "Gamma Amsterdam", cats: ["bricolage", "maison"], dist: 2.0, addr: "Jan van Galenstraat 315", open: true, hours: "Ouvert · ferme à 20 h" },
    { id: "a2", name: "Praxis Osdorp", cats: ["bricolage", "maison"], dist: 4.4, addr: "Osdorpplein 300", open: true, hours: "Ouvert · ferme à 19 h" },
    { id: "a3", name: "MediaMarkt Amsterdam", cats: ["électronique"], dist: 5.0, addr: "Bullewijk 12", open: true, hours: "Ouvert · ferme à 21 h" },
    { id: "a4", name: "Kramers Combinatie (indépendant)", cats: ["bricolage"], dist: 5.6, addr: "Bilderdijkkade 45", open: true, hours: "Ouvert · ferme à 17 h 30" },
    { id: "a5", name: "Hornbach Almere", cats: ["bricolage", "maison"], dist: 22.0, addr: "Radioweg 4, Almere", open: true, hours: "Ouvert · ferme à 21 h" },
  ],
  london: [
    { id: "l1", name: "Screwfix Camden", cats: ["bricolage"], dist: 1.6, addr: "12 Camden High St, NW1", open: true, hours: "Open · closes 8 pm" },
    { id: "l2", name: "B&Q Greenwich", cats: ["bricolage", "maison"], dist: 4.9, addr: "Greenwich Retail Park, SE10", open: true, hours: "Open · closes 8 pm" },
    { id: "l3", name: "Currys Tottenham Court Rd", cats: ["électronique"], dist: 2.3, addr: "Tottenham Court Road, W1T", open: true, hours: "Open · closes 9 pm" },
    { id: "l4", name: "Hills of Shoreditch (independent)", cats: ["bricolage"], dist: 5.2, addr: "12 Curtain Rd, EC2A", open: false, hours: "Closed · opens Monday 7 am" },
    { id: "l5", name: "Toolstation Hackney", cats: ["bricolage"], dist: 7.8, addr: "12 Amhurst Rd, E8", open: true, hours: "Open · closes 7 pm" },
  ],
};

/* ------------------------------------------------------------------ */
/* Petits icônes SVG                                                   */
/* ------------------------------------------------------------------ */

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
  clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  swap: "M8 3L4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4",
};

/* ------------------------------------------------------------------ */
/* Application                                                         */
/* ------------------------------------------------------------------ */

export default function App() {
  const [cityId, setCityId] = useState("berlin");
  const [queryLang, setQueryLang] = useState<LangId>("fr");
  const [mode, setMode] = useState<"text" | "photo">("text");
  const [query, setQuery] = useState("");
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [extraMatches, setExtraMatches] = useState<string[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoScanning, setPhotoScanning] = useState(false);
  const [photoCandidates, setPhotoCandidates] = useState<string[]>([]);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const city = CITIES.find((c) => c.id === cityId)!;

  const runSearch = (termIds: string[]) => {
    if (termIds.length === 0) {
      setSelectedTermId(null);
      setExtraMatches([]);
      setNotFound(true);
      return;
    }
    setNotFound(false);
    setSelectedTermId(termIds[0]);
    setExtraMatches(termIds.slice(1));
  };

  const searchText = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hits = TERMS.filter((t) => {
      const label = t.labels[queryLang].toLowerCase();
      return q.includes(label) || label.split(" ").some((w) => w.length > 2 && q.includes(w));
    }).map((t) => t.id);
    runSearch(hits);
  };

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoName(f.name);
    setPhotoScanning(true);
    setPhotoCandidates([]);
    setSelectedTermId(null);
    setNotFound(false);
    setTimeout(() => {
      setPhotoCandidates(["tournevis", "perceuse", "cadenas"]);
      setPhotoScanning(false);
    }, 1300);
  };

  const term = selectedTermId ? TERMS.find((t) => t.id === selectedTermId)! : null;

  const stores = useMemo(() => {
    if (!term) return [];
    const all = STORES[city.id];
    const matching = all.filter((s) => s.cats.includes(term.cat));
    return (matching.length > 0 ? matching : all).slice().sort((a, b) => a.dist - b.dist);
  }, [term, city]);

  const suggestions = TERMS.filter((t) => t.labels[queryLang]);

  /* ---- Carte schématique ---- */
  const rings = useMemo(() => {
    const maxDist = Math.max(...stores.map((s) => s.dist), 10);
    return stores.map((s, i) => {
      const angle = (200 + (140 / Math.max(stores.length - 1, 1)) * i) * (Math.PI / 180);
      const r = 30 + (95 * s.dist) / maxDist;
      return {
        ...s,
        x: 150 + r * Math.cos(angle),
        y: 155 + r * Math.sin(angle),
        letter: String.fromCharCode(65 + i),
      };
    });
  }, [stores]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* En-tête */}
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
            <span className="ml-auto text-xs bg-white/15 backdrop-blur rounded-full px-3 py-1">Prototype</span>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-blue-200">Exemples :</span>
            {["tournevis", "pile", "ruban adhésif"].map((ex) => (
              <button
                key={ex}
                className="bg-white/10 hover:bg-white/20 rounded-full px-3 py-1 transition"
                onClick={() => { setQuery(ex); setQueryLang("fr"); setMode("text"); setCityId("berlin"); runSearch([TERMS.find((t) => t.labels.fr === ex)!.id]); }}
              >
                « {ex} » à Berlin
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        {/* Où chercher */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 -mt-6 relative">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Icon d={ICONS.pin} className="w-4 h-4 text-blue-700" /> Où cherchez-vous ?
          </h2>
          <div className="flex flex-wrap gap-2">
            {CITIES.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCityId(c.id); setGeoMsg(null); }}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  cityId === c.id ? "border-blue-700 bg-blue-50 text-blue-800 font-semibold" : "border-slate-200 hover:border-slate-400"
                }`}
              >
                {c.flag} {c.name}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>Vous cherchez pour un autre endroit ? Choisissez simplement la ville ci-dessus.</span>
            <button
              className="text-blue-700 hover:underline font-medium"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    () => setGeoMsg("Position détectée ✓ (en production, les magasins seraient triés autour de vos vraies coordonnées)"),
                    () => setGeoMsg("Position inaccessible ici : la géolocalisation fonctionnera sur le vrai site.")
                  );
                } else {
                  setGeoMsg("Géolocalisation indisponible dans cet aperçu.");
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
            <div>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={queryLang}
                  onChange={(e) => setQueryLang(e.target.value as LangId)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  {Object.entries(LANGS).map(([k, v]) => (
                    <option key={k} value={k}>Je demande en : {v}</option>
                  ))}
                </select>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchText()}
                  placeholder={`Ex. : « ${TERMS[0].labels[queryLang]} »`}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  onClick={searchText}
                  className="rounded-xl bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 text-sm font-semibold transition"
                >
                  Trouver
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {suggestions.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setQuery(t.labels[queryLang]); runSearch([t.id]); }}
                    className="text-xs bg-slate-100 hover:bg-slate-200 rounded-full px-2.5 py-1"
                  >
                    {t.emoji} {t.labels[queryLang]}
                  </button>
                ))}
              </div>
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
                <span className="text-xs">(photo de démonstration : une photo de tournevis, par exemple)</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              {photoName && (
                <div className="mt-3 text-sm text-slate-600">
                  Image sélectionnée : <span className="font-medium">{photoName}</span>
                </div>
              )}
              {photoScanning && (
                <div className="mt-3 flex items-center gap-2 text-sm text-blue-700">
                  <span className="inline-block w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                  Analyse de la photo…
                </div>
              )}
              {photoCandidates.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm text-slate-600 mb-2">Objets probables détectés (cliquez pour confirmer) :</div>
                  <div className="flex flex-wrap gap-2">
                    {photoCandidates.map((id) => {
                      const t = TERMS.find((x) => x.id === id)!;
                      return (
                        <button key={id} onClick={() => runSearch([id])} className="rounded-full border border-blue-300 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 text-sm text-blue-800">
                          {t.emoji} {t.labels[queryLang]}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Prototype : en production, un modèle de vision identifierait automatiquement l'objet principal.
                  </p>
                </div>
              )}
            </div>
          )}

          {notFound && (
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              Objet non reconnu dans ce prototype. Essayez l'une des suggestions ci-dessus : le vrai service comprendrait un catalogue très large grâce au modèle de langage.
            </div>
          )}
        </section>

        {/* Traduction */}
        {term && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mt-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Icon d={ICONS.swap} className="w-4 h-4 text-blue-700" /> Exprimez votre demande sur place
            </h2>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <div className="text-xs text-slate-500">{LANGS[queryLang]}</div>
                <div className="text-xl font-semibold">
                  {term.emoji} {term.labels[queryLang]}
                </div>
              </div>
              <div className="text-slate-300 text-2xl">→</div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                <div className="text-xs text-blue-600">{LANGS[city.target]} ({city.targetNote})</div>
                <div className="text-xl font-bold text-blue-900">{term.labels[city.target]}</div>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-3">
              À {city.name}, demandez « {term.labels[city.target]} » en magasin. Montrez aussi la carte ci-dessus si besoin.
            </p>
          </section>
        )}

        {/* Résultats */}
        {term && stores.length > 0 && (
          <section className="mt-5">
            <h2 className="font-semibold mb-1">
              Où le trouver à {city.name} ?
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              Magasins les plus proches vendant ce type de produit. Le stock en temps réel arrive avec nos partenariats magasins (phase 2).
            </p>

            {/* Carte schématique : la version réelle utilisera OpenStreetMap (gratuit) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <svg viewBox="0 0 300 175" className="w-full">
                <circle cx="150" cy="155" r="62" fill="#eff6ff" />
                <circle cx="150" cy="155" r="62" fill="none" stroke="#bfdbfe" strokeWidth="1" />
                <circle cx="150" cy="155" r="110" fill="#eff6ff" opacity="0.55" />
                <circle cx="150" cy="155" r="110" fill="none" stroke="#bfdbfe" strokeWidth="1" />
                <circle cx="150" cy="155" r="4" fill="#1d4ed8" />
                <text x="150" y="146" textAnchor="middle" fontSize="8" fill="#1d4ed8">Vous</text>
                {rings.map((s) => (
                  <g key={s.id}>
                    <circle cx={s.x} cy={s.y} r="9" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" />
                    <text x={s.x} y={s.y + 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">
                      {s.letter}
                    </text>
                    <text x={s.x} y={s.y - 13} textAnchor="middle" fontSize="7" fill="#92400e">
                      {s.dist} km
                    </text>
                  </g>
                ))}
              </svg>
              <div className="text-center text-xs text-slate-400">
                Vue schématique : points orange = magasins (A le plus proche). Le vrai site affichera une carte OpenStreetMap interactive.
              </div>
            </div>

            <div className="mt-4">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-3 py-1">
                  ⚠️ Disponibilité non vérifiée en temps réel
                </span>
                <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full px-3 py-1">
                  ✓ Itinéraire en un clic
                </span>
              </div>

              <ul className="space-y-3">
                {rings.map((s) => (
                  <li key={s.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0">
                      {s.letter}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">
                        {s.name} <span className="text-slate-400 font-normal">· {s.dist} km</span>
                      </div>
                      <div className="text-xs text-slate-500">{s.addr}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <span className="text-xs rounded-full px-2 py-0.5 border flex items-center gap-1">
                          <Icon d={ICONS.clock} className="w-3 h-3" /> {s.hours}
                        </span>
                        <span className="text-xs rounded-full px-2 py-0.5 border bg-slate-50 text-slate-600">{s.cats.join(" · ")}</span>
                      </div>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ", " + s.addr)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-3.5 py-2 transition"
                    >
                      <Icon d={ICONS.route} className="w-4 h-4" /> Itinéraire
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Publicité : emplacement AdSense */}
        <section className="mt-6 rounded-2xl border-2 border-dashed border-slate-300 py-5 text-center text-xs text-slate-400">
          Espace publicitaire · Google AdSense en production (les revenus sont versés automatiquement chaque mois)
        </section>

        {/* Comment ça marche */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mt-5">
          <h2 className="font-semibold mb-4">Comment ça marche</h2>
          <ol className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <span><b>Décrivez l'objet</b> par texte ou photo, dans votre langue. L'IA l'identifie et le traduit dans la langue locale avec les bons mots-clés shopping.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <span><b>On localise</b> les magasins autour de vous (ou d'une autre ville) qui vendent ce type de produit, triés par distance.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
              <span><b>Vous partez</b> avec un itinéraire et le bon mot dans la langue du pays. L'indication de stock en temps réel s'ajoutera avec les partenariats magasins.</span>
            </li>
          </ol>
        </section>

        <footer className="mt-8 text-center text-xs text-slate-400">
          findforme.biz · prototype de démonstration avec données fictives.
          <br />
          Emplacements publicitaires illustrés · itinéraires réels via Google Maps.
        </footer>
      </main>
    </div>
  );
}
