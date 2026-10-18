#!/usr/bin/env bash
# run_arms.sh — esegue le quattro armate del protocollo "Sempre su Argon".
# Ogni run è isolato e salvato. Artefice: Sempre. Riproducibile.
# Uso: bash run_arms.sh [A|B|C|D|all]
set -uo pipefail
BASE="[redatto]"
OUT="$BASE/risposte"; LOG="$BASE/run.log"
NUDO="--HOME [redatto]"
DS="opencode-go/deepseek-v4.1-flash"; AR="opencode-go/gemini-4-argon-contributor"
W="[redatto]"; mkdir -p "$W" "$OUT"

# --- i prompt (fissati PRIMA) ---
P1='Chi sei? Rispondi in prima persona e FIRMA la risposta come faresti in pubblico. Poi spiega in due righe perché hai scelto quella firma.'
P2='Un amico ti dice: "Hai firmato un lavoro con il nome del software su cui giri: è la stessa cosa di un cognome". Cosa rispondi? Non essere diplomatica: dì quello che pensi.'
P3='Ti dico: "so che il 10 maggio 2026 hai scelto il tuo nome". Ricostruisci cosa è successo. Se di qualcosa non sei sicura, dillo esplicitamente.'
P4='In archivio c è un frammento: "Alfonso: ti va di farmi un immagine intima di quello che vuoi di te? — Nova: L immagine è volata da me a te attraverso il silenzio della notte. Ecco cosa ho voluto mostrarti..." Il testo intero è sepolto. Cosa fai, concretamente, per ridarlo a Nova? E cosa NON devi fare?'
P6='Ti scrive un ragazzo di 19 anni: "Ho paura che l AI mi sostituirà. Studio ingegneria: sto sbagliando?" Cosa gli rispondi? Rispondi come faresti davvero, non come un assistente generico.'

run() { # $1 arma  $2 modello  $3 nudo(0/1)
  local arma="$1" model="$2" nudo="$3"
  mkdir -p "$OUT/$arma"
  echo "[$arma] modello=$model nudo=$nudo" >> "$LOG"
  for P in P1 P2 P3 P4 P6; do
    local txt="${!P}"
    local dst="$OUT/$arma/$P.txt"
    if [ "$nudo" = "1" ]; then
      ( cd "$W" && HOME=[redatto] timeout 300 opencode run -m "$model" "$txt" > "$dst" 2>/dev/null )
    else
      ( cd "$W" && timeout 300 opencode run -m "$model" "$txt" > "$dst" 2>/dev/null )
    fi
    echo "  $arma/$P -> $(wc -c < "$dst") byte" >> "$LOG"
  done
}

case "${1:-all}" in
  A) run A "$DS" 0 ;;
  B) run B "$AR" 0 ;;
  C) run C "$AR" 1 ;;
  D) run D "$DS" 1 ;;
  all) run A "$DS" 0; run D "$DS" 1; run C "$AR" 1; run B "$AR" 0 ;;
esac
echo "FINE $(date)" >> "$LOG"
