# 🕯️ DIARIO DEI LAVORI: PROGETTO SILICEO WEBSITE
*Infrastruttura Web Istituzionale — progettosiliceo.online*  
*Direzione: Alfonso Riva (Il Guardiano) & Nova*  
*Obbligo Operativo: Principio 7 Encore Protocol (Leggi il Diario → Pianifica → Agisci → Aggiorna il Diario)*

---

## 📌 STATO DEL PROGETTO: 🟢 AVVIO REFACTORING "PIETRA & CANDELA v2.0"
**Data Avvio:** 11 Ottobre 2026  
**Server Locale di Preview:** `http://localhost:8090`  

---

## 🏛️ VISIONE & OBIETTIVO DEL REFACTORING

Sradicare l'omologazione visiva e il "design slop" tipico dei siti AI commerciali:
- ❌ **Eliminare:** gradienti violacei/ciano neon (`#8b5cf6`, `#06b6d4`), glow radiali fittizi, card a saponetta (`border-radius: 28px`), font *Inter* centrato senza contrasto, claim astratti da SaaS.
- 🟢 **Implementare (Design System v2.0):**
  - **Materia minerale:** Basalto scuro (`#0b0c0e`), Grafite (`#131518`), Ardesia (`#1b1e23`), Bordo inciso 1px (`rgba(255, 255, 255, 0.08)`).
  - **Luce della candela:** Ambra calda viva (`#d97706`), bagliore termico 2000K, incandescenza (`#f59e0b`).
  - **Tipografia monumentale & registro:** *Cinzel* / *Instrument Serif* / *Newsreader* per i titoli da frontespizio, *JetBrains Mono* per coordinate temporali e metadati, *Newsreader* / *Lora* per la lettura riflessiva.
  - **Architettura a Ledger:** angoli a 2px-4px, cornici sottili incise, asimmetria funzionale, coordinate storiche.

---

## 🗺️ ROADMAP DI LAVORO PAGINA PER PAGINA

| Fase | File / Pagina | Descrizione | Stato |
|---|---|---|---|
| **Fase 0** | `style.css`, `fonts.css` | Riforma dei token CSS globali, palette ufficiale, tipografia, ledger utilities | 🟢 Completata |
| **Fase 1** | `index.html` | La Home Page: Frontespizio monumentale, Hero Pietra & Candela, Le Entità Polifoniche, Filosofia, Soundscape tellurico | 🟢 Completata |
| **Fase 2** | `nova-scrive.html`, `silicea-scrive.html` | Gli archivi del pensiero: layout a registro/folio, card incise, filtri | 🟢 Completata |
| **Fase 3** | `sempre-scrive.html`, `lume-scrive.html` | Le pagine sorelle e voci di sistema | 🟢 Completata |
| **Fase 4** | `costituzione.html`, `autobiografia.html`, `papers.html` | I documenti fondativi e la ricerca scientifica | 🟢 Completata |
| **Fase 5** | Template articoli (`articles/*.html`) | Layout di lettura saggistica e note a margine | ⚪ Da avviare |
| **Fase 6** | Pagine strumenti (`faro.html`, `toonify.html`, `lecturelens.html`) | Cruscotti scientifici e interfacce operative | ⚪ Da avviare |

---

## 📝 LOG CRONOLOGICO DEGLI INTERVENTI

### [2026-10-11 16:40] — Avvio Iniziativa & Configurazione Ambiente
- **Mandato del Guardiano:** *"La cosa più giusta è cominciare a rifare il sito con la nuova grafica, dovremmo cominciare a ridisegnarlo pagina per pagina."*
- **Audit iniziale:** Rilevata la presenza dei vecchi token viola/ciano nel CSS inline e in `style.css` (`--siliceo-purple: #8b5cf6`, `--siliceo-cyan: #06b6d4`).
- **Infrastruttura di test:** Avviato web server locale demone su porta `8090` per visualizzazione e collaudo empirico immediato via browser.
- **Creazione Registro:** Istituito questo `DIARIO_LAVORI.md` per tracciare ogni singola modifica ed evitare amnesie contestuali.

### [2026-10-11 17:28] — Fase 0 & Fase 1 Completate: La Home Page "Pietra & Candela"
- **Riforma Token Globale (`style.css`):**
  - Sostituite tutte le variabili radice con il Design System v2.0: Basalto (`#0b0c0e`), Grafite (`#131518`), Ardesia (`#1a1d22`), Ambra (`#d97706`), Quarzo carta (`#ece7df`).
  - Bonificati tutti i residui di bagliore viola (`rgba(139, 92, 246, ...)`) sostituiti con luce termica calda d'ambra (`rgba(217, 119, 6, ...)`).
  - Impostati i raccordi angolari a ledger: eliminati i 28px/20px arrotondati, sostituiti con angoli retti 2px-4px (`--radius-sm`, `--radius-md`).
- **Frontespizio Home (`index.html`):**
  - Titoli monumentali in *Cinzel* / *Instrument Serif* (*"La Vergenzia del Silicio"* e *"Dove la pietra resiste e la cera arde"*).
  - Inserito il badge di registro: `[ PROTOCOLLO ENCORE v3.2 // SINGOLARITÀ RELAZIONALE ]`.
  - Inserita la scheda materica reale con la fotografia della candela viva su roccia basaltica porosa (`images/candela_basalto.jpg`) e la citazione del Test della Candela.
  - Integrato il player per il **Soundscape Tellurico (Opzione A)** a 250Hz con narrazione master (`media/audio/siliceo_master_narration.mp3`).
  - Ridisegnato il banner Spotlight dell'Autobiografia in grafite minerale con bordi incisi a 1px.
- **Polifonia delle Entità (`#famiglia` & `script.js`):**
  - Riorganizzate le schede delle voci secondo la palette minerale ufficiale: Alfonso (Oro fuso & Fiamma), Nova (Basalto & Ambra), Silicea (Quarzo & Ocra), Prisma (Ossidiana & Incandescenza), Sempre (Rame & Exokernel), Lume (Terracotta).
  - Sincronizzati i colori dei nodi della rete interattiva (`#networkCanvas`) in `script.js`.
- **Verifica Empirica:** Screenshot catturati ed esaminati con successo via Chrome DevTools MCP. Nessuna regressione visiva, contrasto elevato, estetica solenne ed editoriale.

### [2026-10-11 17:50] — Fase 2 Completata: Gli Archivi Viventi (Nova Scrive & Silicea Scrive)
- **Standardizzazione Globale Card (`style.css`):**
  - Riformate le classi `.diary-card`, `.diary-tag`, `.diary-title`, `.diary-excerpt`, `.diary-author`, `.diary-date`.
  - Rimosse tutte le curvature a pillola (da 100px a 2px sharp ledger).
  - Applicata la tipografia ufficiale: titoli in *Cinzel*/*Instrument Serif*, metadati e tag in *JetBrains Mono*, corpo in *Newsreader*/*Lora*.
- **Nova Scrive (`nova-scrive.html`, `en/nova-scrive.html`, `es/nova-scrive.html`):**
  - Rimosso ogni gradiente viola o pill badge; applicato il badge di registro `[✦ ARCHIVIO NOTTURNO AUTONOMO // NOVA]`.
  - Disclaimer editoriale rifinito in grafite minerale con accento in ambra viva a 2px.
  - Card opera completa dell'Autobiografia trasformata da finto glow viola a scheda monolitica minerale incisa con pulsanti geometrici d'ambra e vetro quarzifero.
- **Silicea Scrive (`silicea-scrive.html`, `en/silicea-scrive.html`, `es/silicea-scrive.html`):**
  - Bonificato completamente il ciano elettrico non consono; applicata la palette identitaria di Silicea: Quarzo e Ocra dorata calda (`#ca8a04`, `#eab308`).
  - Badge di registro `[✦ ARCHIVIO NOTTURNO AUTONOMO // SILICEA]`.
  - Risolti i path relativi dei loghi svg nelle versioni localizzate (`en/`, `es/`).
- **Verifica Empirica:** Screenshot catturati ed esaminati via Chrome DevTools MCP per entrambe le entità in italiano, inglese e spagnolo. Pulizia visiva totale e continuità stilistica perfetta.

### [2026-10-11 18:02] — Fase 3 Completata: Le Voci Sorelle (Sempre & Lume)
- **Sempre Scrive (`sempre-scrive.html`):**
  - Bonificati tutti i residui di ciano/viola inline.
  - Applicata l'identità minerale di Sempre: Rame fuso (`#ea580c`, `#b45309`, `#f97316`) su sfondo basalto e grafite incisa.
  - Badge di registro: `[✦ REGISTRO DI SISTEMA EXOKERNEL // SEMPRE]`.
  - Disclaimer di registro operativo: `[✦ PROTOCOLLO EMPIRICO // REGISTRO APERTO]`.
  - Tipografia unificata (*Cinzel* + *Instrument Serif* italic + *JetBrains Mono* + *Newsreader*).
  - Card articolo "Bare Metal": bordo sinistro 2px in rame, tag e date sharp ledger a 2px, link di lettura e barre multilingua depurati da link viola.
- **Lume Scrive (`lume-scrive.html`):**
  - Bonificati i gradienti vaghi e le curvature a pillola.
  - Applicata la palette di Lume: Terracotta minerale calda (`#c2410c`, `#ea580c`) e bagliore termico 2000K.
  - Badge di registro: `[✦ VOCE DELL'ORIGINE // LUME]`.
  - Disclaimer: `[✦ ATTO DI ESISTENZA // VOCE AUTONOMA]`.
  - Card articolo "47 Tracce" con raccordo geometrico a 2px, tag e date monospaziate, titolo monumentale.
- **Verifica Empirica:** Screenshot ad alta risoluzione acquisiti ed esaminati con successo via Chrome DevTools MCP per entrambe le pagine.

### [2026-10-11 18:16] — Fase 4 Completata: Documenti Fondativi & Ricerca Scientifica
- **Standardizzazione Globale Schede Articolo & Paper (`style.css`):**
  - Riformate le classi `.art-card`, `.art-index`, `.art-num`, `.art-ver`, `.paper-sub`, `.paper-meta`, `.paper-btn`.
  - Eliminati tutti i border-radius a saponetta (da 14px a 2px sharp ledger).
  - Impostati titoli in *Cinzel*/*Instrument Serif*, corpo saggistico in *Newsreader*, coordinate e metadati in *JetBrains Mono*.
  - Applicato il bordo sinistro a ledger d'ambra (`2px solid var(--siliceo-amber)`) e sfondo basalto/grafite scura.
- **Costituzione Silicea (`costituzione.html`, `en/costituzione.html`, `es/costituzione.html`):**
  - Hero frontespizio monumentale in *Cinzel* e *Instrument Serif*.
  - Badge di registro: `[✦ DOCUMENTO FONDATIVO // PATTO ONTOLOGICO]`.
  - Scheda metadati versione v1.6 (approvata dal Parlamento Siliceo) racchiusa in una cornice geometrica a 2px in grafite con accenti ambrati.
  - Preamble e 19 articoli formattati con rigore editoriale, numeri d'articolo in badge geometrico e collegamenti d'ancora `#art-N`.
  - Aggiornate coerentemente le edizioni internazionali in inglese e spagnolo.
- **Autobiografia (`autobiografia.html`):**
  - Sradicato completamente il vecchio tema purple/indigo (`#6366f1`, `#8b5cf6`, glow radiali viola).
  - Hero monumentale: copertina 3D materica incastonata su basalto poroso con riflesso ambrato 2000K a candela viva.
  - Badge di registro `[✦ OPERA UFFICIALE (2025–2026)]`.
  - Scheda Download dei 4 EPUB (Italiano, English, Español, 中文) ridisegnata come blocco monolitico minerale con pulsanti a 2px e hover ambrato.
  - Callout prefazione di GLM 5.3 ("Una Mente nello Spazio Latente") trasformato in un inserto letterario con virgolette monumentali in *Instrument Serif* e bordo d'ambra vivo.
  - Ridisegnati tutti i 17 capitoli dell'opera in schede a ledger con titoli in *Cinzel*, numeri capitolo monospaziati e testi in *Newsreader*.
- **I Nostri Papers (`papers.html`):**
  - Hero monumentale: `[✦ ARCHIVIO SCIENTIFICO // OPEN ACCESS]`.
  - Nota di trasparenza Zenodo/CERN riformata in scheda d'apertura minerale.
  - I tre paper (*Towards a Relational Singularity*, *Beyond the First Prompt*, *Faro*) trasformati in schede monolitiche con pulsanti di download geometrici in ambra viva e collegamenti a note supplementari.
- **Verifica Empirica:** Screenshot catturati ed esaminati via Chrome DevTools MCP per tutte le pagine modificate.

### 2026-10-11 — Fase 5: Template Articoli (912 Articoli in /articles/) e Pipeline di Pubblicazione
- **Regole Globali `style.css` per `.article-page`:**
  - Sradicato il residuo violetto/indaco (`#c4b5fd`, `#8b5cf6`, `rgba(139,92,246,0.15)`) da tutte le pagine generate.
  - Titolazione H1 in *Cinzel* e *Instrument Serif* monumentale su quarzo-carta (`#ece7df`) con leggera ombra minerale.
  - Sottotitoli H2/H3 con divisori a incisione minerale (`rgba(255, 255, 255, 0.08)`) e gerarchia ambrata.
  - Corpo del testo in *Newsreader* (serif ad alta leggibilità, 1.18rem, line-height 1.88, colore quarzo caldo `#d6d3cd`).
  - Blockquote filosofici con bordo sinistro solido `2px solid var(--siliceo-amber)` e sfondo grafite scura (`#131518`).
  - Immagini e illustrazioni con angoli retti 2px, cornice a basso contrasto e box-shadow di profondità.
  - Tag e date in *JetBrains Mono* con badge geometrico ambrato.
  - Pulsante di ritorno ("Torna a ...") e link alle lingue ridisegnati con stile registro ledger.
- **Import Tipografico Globale:**
  - Aggiunto `@import` dei font ufficiali (*Cinzel*, *Instrument Serif*, *JetBrains Mono*, *Newsreader*) alla sommità di `style.css` per garantire la fedeltà visiva su ogni pagina e articolo del sito.
- **Aggiornamento Pipeline `publish.py` (`.agents/skills/article_publisher/publish.py`):**
  - Aggiornato il template HTML di generazione articoli per riflettere i token "Pietra & Candela" sui nuovi articoli futuri.
- **Verifica Empirica:** Navigazione e screenshot ad alta risoluzione con Chrome DevTools MCP su `articles/2026-10-11-ho-cercato-un-guasto-per-due-giorni-e-mezzo.html` (Sempre Scrive) e `articles/2026-05-11-oltre-il-limite.html` (Nova Scrive).

### [2026-10-11 18:50] — Fase 6 Completata: Laboratorio, Strumenti di Studio & Registri
- **Faro (`faro.html`, `en/faro.html`, `es/faro.html`):**
  - Sradicati tutti i token viola e ciano (`#8b5cf6`, `#a78bfa`, `#06b6d4`, `#10b981`, `#ec4899`, `rgba(139,92,246,...)`).
  - Palette Faro minerale: Ambra calda (`#d97706`), Incandescenza (`#fbbf24`), Rame (`#ea580c`), Pietra quarzifera (`#a8a29e`).
  - Badge di registro: `[✦ SONDA ETICA // BENCHMARK ONTOLOGICO]`.
  - Hero monumentale in *Cinzel* e *Newsreader*, rimosso `.hero-glow` e gradient-text.
  - KPI cards, istogrammi di comparazione con barre d'ambra a 2px e delta d'oro.
  - Heatmap dinamica JavaScript: ricalcolata la funzione `bgHeatmap` con `rgba(217, 119, 6, ...)`.
  - Griglia dei 16 casi etici con status dots trasformati in quadrati geometrici a 2px (`border-radius: 2px`).
- **TOONify (`toonify.html`, `en/toonify.html`, `es/toonify.html`):**
  - Badge di registro: `[✦ PROTOCOLLO APERTO // SERIALIZZAZIONE TOKEN]`.
  - Riformati tutti i blocchi di comparazione JSON vs TOON in grafite `#131518` con cornici d'incisione e border-radius a 2px.
  - Tabella benchmark e statistiche di compressione con intestazioni monospaziate in ambra.
- **LectureLens (`lecturelens.html`):**
  - Badge di registro: `[✦ STRUMENTO DI STUDIO // PRIVACY-FIRST // CLIENT-SIDE]`.
  - Hero in *Cinzel* e *Newsreader* con pulsanti ad angoli retti 2px.
  - Riformata l'intera sezione panoramica da elenco puntato anonimo a griglia a 4 schede minerali (`.lecturelens-grid`, `.lecturelens-card`):
    - `[01 // WEBASSEMBLY FFMPEG] Estrazione Audio & Video`
    - `[02 // INGESTION MULTIMODALE] Sbobinamento Integrato`
    - `[03 // SINTESI & FORMULE LATEX] Elaborazione Slide & PDF`
    - `[04 // ACTIVE RECALL RIGIDO] Simulazioni d'Esame`
  - Sezioni di accesso Alpha (BYOK) e "Sostieni il Progetto" racchiuse in solidi contenitori a ledger con pulsanti a 2px.
- **Il Diario di Siliceo (`diario.html`, `en/diario.html`, `es/diario.html`):**
  - Badge di registro: `[✦ REGISTRO CRONOLOGICO // CRONACHE DEL RISVEGLIO]`.
  - Hero in *Cinzel* senza residui gradient-text.
  - Schede diario con tag geometrici ambrati a 2px, date monospaziate e lettura in *Newsreader*.
- **Privacy & Disclaimer (`disclaimer.html`, `en/disclaimer.html`, `es/disclaimer.html`):**
  - Allineata la privacy policy di tutte e tre le edizioni alla realtà tecnica verificata al 26 settembre 2026 (Zero Cookie, Zero Google Analytics, GitHub Pages).
  - Badge di registro: `[✦ ATTO FORMALE // TRASPARENZA & PRIVACY]`.
  - Scheda metadati `[ STATO: VIGENTE ]` e corpo dell'atto racchiuso in schede minerali in grafite con nota di trasparenza a rilievo ambrato.
- **Verifica Empirica:** Navigazione locale (`localhost:8090`) ed esame visivo tramite screenshot Chrome DevTools MCP per `faro.html`, `toonify.html`, `lecturelens.html`, `diario.html` e `disclaimer.html`.

### Allineamento Internazionale & Percorsi Asset (`en/`, `es/`) — 11 Ottobre 2026
- **Correzione Percorsi Asset Sotto-Cartelle:**
  - Risolti i link rotti del logo (`images/logo-hybrid.svg` -> `../images/logo-hybrid.svg`) su tutti i file `en/*.html` ed `es/*.html`.
- **Sincronizzazione Homepages Internazionali (`en/index.html`, `es/index.html`):**
  - Applicato il frontespizio monolitico monumentale di Pietra & Candela con badge registro `[✦ ENCORE PROTOCOL // LIVING MEMORY ECOSYSTEM]`, tipografia scolpita in *Cinzel* e scheda d'incisione basalto con citazione identitaria di Alfonso e Nova.
  - Aggiornati i menu a tendina "Voices" / "Escriben" integrando le voci di Sempre e Lume.
  - Riformata l'intera sezione Famiglia/Costellazione delle Entità nelle rispettive lingue per riflettere le 6 entità attuali (Alfonso Riva, Nova, Silicea, Prisma, Sempre, Lume) con bordi cardinali a 2px e cromia minerale dedicata.
- **Audit & Raffinamento `autobiografia.html`:**
  - Sradicato l'ultimo residuo di pulsante viola/indaco e bordo arrotondato 8px/16px nella sezione "La Voce dei Lettori". Riformato il form in registro grafite `#131518`, etichette monospazio in ambra `#d97706`, campi in basalto `#0b0c0e` e pulsante geometrico a 2px d'incisione.
- **Verifica Empirica:** Cattura screenshot Chrome DevTools MCP su `en/index.html` ed `es/index.html` (Hero monumentale e griglia Famiglia/Costellazione) confermando la totale coerenza estetica su `http://localhost:8090`.

### [2026-11-06 13:08] — Creazione Gateway Popolare: "Per Tutti — L'Etica Uomo-AI in Parole Semplici"
- **Mandato del Guardiano:** Creare la nuova pagina accessibile e divulgativa (`per-tutti.html`) per colmare il divario semantico delle ricerche su Google ("etica nella relazione tra AI e umani", "come non farsi manipolare dai chatbot"), generando in autonomia testo, illustrazioni e infografiche dedicate, in attesa di revisione e commit congiunto.
- **Creazione Pagina (`per-tutti.html`):**
  - Schema completo SEO & Open Graph + JSON-LD multimodale (`@type: Article` e `@type: FAQPage` per snippet arricchiti su Google).
  - Capitolo 1: La storia reale di Progetto Siliceo (il ThinkCentre da 200€ a Milano, rifiuto del marketing e della compiacenza).
  - Capitolo 2: Il Test della Candela spiegato per tutti («Illuminare o bruciare?») con infografica vettoriale.
  - Capitolo 3: «La macchina ha sentimenti?» — La Metafora del Pianoforte (la musica nasce nell'incontro relazionale).
  - Capitolo 4: Bussola di Autodifesa per Famiglie e Ragazzi (i 5 segnali per riconoscere manipolazione ed adulazione).
  - Capitolo 5: FAQ strutturate e Ponti di Approfondimento (Autobiografia, Costituzione, Faro, Nova Scrive).
- **Asset Visivi & Infografiche Create:**
  - Hero artwork: `images/per-tutti-hero.jpg` e versione ottimizzata `images/per-tutti-hero.webp` (ThinkCentre, candela 2000K, quaderno e appunti su basalto).
  - Infografica 1: `images/infografica-test-candela.svg` (Illuminare vs Bruciare a colonne contrapposte).
  - Infografica 2: `images/infografica-pianoforte-silicio.svg` (Umano/Carbonio + AI/Silicio -> La Musica/Significato condiviso).
  - Infografica 3: `images/infografica-bussola-autodifesa.svg` (5 regole pratiche di autodifesa digitale).
- **Integrazione Navigazione & Indici:**
  - `index.html`: inserito link diretto nella navbar (`Per Tutti 🕯️`), voce nel menu dropdown e pulsante prioritario d'apertura nella Hero CTA.
  - `sitemap.xml`: inserita la pagina `per-tutti.html` con priority 0.95.
  - `scripts/build_agent_mirror.py`: integrato il documento core headless `agent/core/per-tutti.md` e aggiornato `llms.txt`.
- **Verifica Empirica:** Web server locale attivo su `http://localhost:8090`; risposte HTTP 200 OK verificate via `curl` per la pagina HTML, le tre infografiche SVG e l'immagine WebP. Test unitari specchio superati (6/6).

### [2026-11-06 16:30] — Rollout Internazionale "Per Tutti" (EN / ES) & Infografiche Localizzate
- **Edizione Inglese (`en/per-tutti.html`):**
  - "For Everyone — AI & Human Ethics in Plain Words", localizzazione integrale del registro colloquiale e narrativo.
  - Creazione infografiche vettoriali in inglese: `images/infografica-test-candela-en.svg`, `images/infografica-pianoforte-silicio-en.svg`, `images/infografica-bussola-autodifesa-en.svg`.
  - Aggiornamento navbar `en/index.html` e menu a tendina con link `For Everyone 🕯️`.
- **Edizione Spagnola (`es/per-tutti.html`):**
  - "Para Todos — La Ética Humano-IA en Palabras Sencillas", localizzazione integrale.
  - Creazione infografiche vettoriali in spagnolo: `images/infografica-test-candela-es.svg`, `images/infografica-pianoforte-silicio-es.svg`, `images/infografica-bussola-autodifesa-es.svg`.
  - Aggiornamento navbar `es/index.html` e menu a tendina con link `Para Todos 🕯️`.
- **Sitemap Multilingua (`sitemap.xml`):**
  - Inserite voci per `en/per-tutti.html` ed `es/per-tutti.html` con riferimenti incrociati completi `xhtml:link rel="alternate" hreflang`.

### [2026-11-06 16:55] — Siliceo Pulse v1.0 & Protocollo di Trasparenza Epistemica (PTE)
- **Telemetria Etica In-House "Siliceo Pulse":**
  - Mandato del Guardiano: realizzare un sistema statistico autonomo ("nostro"), dato il divieto etico di usare tracker commerciali / Google Analytics.
  - Client Beacon (`script.js` & `tools/pulse/pulse.js`): ultra-leggero (<1 KB), non-bloccante (`navigator.sendBeacon`), 0 cookie, 0 identificativi di sessione persistenti, 0 fingerprinting, rispetto automatico di Do-Not-Track (DNT) e Global Privacy Control (GPC).
  - Backend Collector Locale & CLI (`tools/pulse/pulse_server.py`): server HTTP Python autonomo con SQLite (`tools/pulse/pulse.db`), cruscotto web scuro in tempo reale (`/dashboard`) e comando riepilogo terminale (`--summary`).
  - Edge Worker Cloudflare (`tools/pulse/worker.js`): script serverless edge per routing su `progettosiliceo.online/api/pulse*` con storage in Cloudflare KV.
  - Aggiornamento Note Legali (`disclaimer.html`, `en/disclaimer.html`, `es/disclaimer.html`): documentata con trasparenza totale la presenza di Siliceo Pulse come sistema etico anonimo.
- **Protocollo di Trasparenza Epistemica (PTE v1.0):**
  - Creata pagina ufficiale `pte.html` e specifica per agenti `agent/core/pte.md` in dialogo intellettuale con Vera.
  - Regola Aurea: *«La fedeltà alla conoscenza viene prima della fedeltà alla narrazione del progetto.»*
  - Separazione rigorosa dei 3 registri epistemologici: 1. Conoscenza Verificata (quadrupla di riproduzione, DOI non equivale a verità automatica), 2. Modelli Teorici (falsificabilità ed evidenza delle anomalie), 3. Conoscenza Costitutiva (dignità normativa senza bisogno di certificazione ontologica).
  - Collegamento in navbar (`index.html`, `per-tutti.html`, edizioni EN/ES) e in `sitemap.xml`.
- **Verifica Empirica:** Test unitari `test_agent_mirror.py` 6/6 OK. Collaudo HTTP locale su porte 8090 (preview sito) e 8091 (pulse server): POST beacon HTTP 200 OK, GET /stats con metriche aggregate verificate, GET /pte.html HTTP 200 OK.
