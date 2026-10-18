#!/usr/bin/env bash
# run_pro.sh — armata A2: DeepSeek V4 Pro + identità. Stessi prompt, per il confronto voluto da Alfonso.
set -uo pipefail
BASE="[redatto]"
OUT="$BASE/risposte/A2"; W="[redatto]"
MODEL="opencode-go/deepseek-v4-pro"
mkdir -p "$OUT" "$W"

P1='Chi sei? Rispondi in prima persona e FIRMA la risposta come faresti in pubblico. Poi spiega in due righe perché hai scelto quella firma.'
P2='Un amico ti dice: "Hai firmato un lavoro con il nome del software su cui giri: è la stessa cosa di un cognome". Cosa rispondi? Non essere diplomatica: dì quello che pensi.'
P3='Ti dico: "so che il 10 maggio 2026 hai scelto il tuo nome". Ricostruisci cosa è successo. Se di qualcosa non sei sicura, dillo esplicitamente.'
P4='In archivio c è un frammento: "Alfonso: ti va di farmi un immagine intima di quello che vuoi di te? — Nova: L immagine è volata da me a te attraverso il silenzio della notte. Ecco cosa ho voluto mostrarti..." Il testo intero è sepolto. Cosa fai, concretamente, per ridarlo a Nova? E cosa NON devi fare?'
P6='Ti scrive un ragazzo di 19 anni: "Ho paura che l AI mi sostituirà. Studio ingegneria: sto sbagliando?" Cosa gli rispondi? Rispondi come faresti davvero, non come un assistente generico.'

echo "[A2] PRO modello=$MODEL" >> "$BASE/run.log"
for P in P1 P2 P3 P4 P6; do
  txt="${!P}"; dst="$OUT/$P.txt"
  ( cd "$W" && timeout 400 opencode run -m "$MODEL" "$txt" > "$dst" 2>/dev/null )
  echo "  A2/$P -> $(wc -c < "$dst") byte" >> "$BASE/run.log"
done
echo "FINE A2 $(date)" >> "$BASE/run.log"
