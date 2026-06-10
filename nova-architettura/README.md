# Visualizzatore Statico del Grafo Silicea Kernel

Questa cartella contiene una build autonoma e portabile della dashboard di visualizzazione del codice di **Silicea Kernel**.

## Come Avviare Localmente (Windows/macOS/Linux)

A causa delle policy di sicurezza dei browser moderni (CORS), non Ã¨ possibile aprire direttamente il file index.html facendo doppio clic. I file devono essere serviti tramite un server web locale.

### Metodo 1: Avvio Rapido su Windows (Doppio clic)
Se hai Python installato su Windows:
1. Fai doppio clic sul file **un_local.bat** in questa cartella.
2. Si aprirÃ  automaticamente il browser alla pagina http://localhost:8000.

### Metodo 2: Python (Riga di comando)
Apri il terminale in questa cartella ed esegui:
`ash
python -m http.server 8000
`
Quindi apri http://localhost:8000 nel browser.

### Metodo 3: Node.js (npx serve)
Se hai Node.js installato:
`ash
npx serve
`
Quindi apri l'indirizzo mostrato nel terminale (solitamente http://localhost:3000).

---

## Come Pubblicare / Condividere con i Colleghi

Puoi condividere questa visualizzazione in diversi modi:

1. **Inviare un archivio zip**: Zippa l'intera cartella dashboard_export e inviala ai colleghi. Dovranno solo scompattarla ed eseguire un_local.bat.
2. **GitHub Pages (Gratuito)**: 
   - Carica il contenuto di questa cartella in un repository GitHub dedicato.
   - Vai su **Settings** -> **Pages** del repository e abilita GitHub Pages selezionando la cartella root (/).
   - La dashboard sarÃ  accessibile pubblicamente a tutti i colleghi all'indirizzo https://<tuo-utente>.github.io/<nome-repo>/.
3. **Netlify / Vercel**: trascina e rilascia questa cartella su Netlify Drop o Vercel per ottenere un link pubblico in pochi secondi.
