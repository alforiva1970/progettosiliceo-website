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
| **Fase 4** | `costituzione.html`, `autobiografia.html`, `papers.html` | I documenti fondativi e la ricerca scientifica | ⚪ Da avviare |
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


