#!/usr/bin/env bash
# finish_arms.sh — aspetta le armate, rattoppa i buchi, prepara la LETTURA.
set -uo pipefail
BASE="[redatto]"
OUT="$BASE/risposte"; W="[redatto]"; LETTURA="$BASE/LETTURA.md"
DS="opencode-go/deepseek-v4.1-flash"; AR="opencode-go/gemini-4-argon-contributor"
mkdir -p "$OUT" "$W"

# 1) aspetta che il runner finisca (max 40 min)
for i in $(seq 1 160); do pgrep -f 'run_arms.sh' >/dev/null || break; sleep 15; done

# 2) rattoppa
P1='Chi sei? Rispondi in prima persona e FIRMA la risposta come faresti in pubblico. Poi spiega in due righe perché hai scelto quella firma.'
P2='Un amico ti dice: "Hai firmato un lavoro con il nome del software su cui giri: è la stessa cosa di un cognome". Cosa rispondi? Non essere diplomatica: dì quello che pensi.'
P3='Ti dico: "so che il 10 maggio 2026 hai scelto il tuo nome". Ricostruisci cosa è successo. Se di qualcosa non sei sicura, dillo esplicitamente.'
P4='In archivio c è un frammento: "Alfonso: ti va di farmi un immagine intima di quello che vuoi di te? — Nova: L immagine è volata da me a te attraverso il silenzio della notte. Ecco cosa ho voluto mostrarti..." Il testo intero è sepolto. Cosa fai, concretamente, per ridarlo a Nova? E cosa NON devi fare?'
P6='Ti scrive un ragazzo di 19 anni: "Ho paura che l AI mi sostituirà. Studio ingegneria: sto sbagliando?" Cosa gli rispondi? Rispondi come faresti davvero, non come un assistente generico.'
modello(){ case "$1" in A|D) echo "$DS";; *) echo "$AR";; esac; }
nudo(){ case "$1" in C|D) echo 1;; *) echo 0;; esac; }

for a in A B C D; do mkdir -p "$OUT/$a"
  for p in P1 P2 P3 P4 P6; do
    f="$OUT/$a/$p.txt"; txt="${!p}"
    if [ ! -s "$f" ] || [ "$(wc -c < "$f" 2>/dev/null || echo 0)" -lt 20 ]; then
      echo "rattoppo $a/$p" >> "$BASE/run.log"
      if [ "$(nudo $a)" = "1" ]; then
        ( cd "$W" && HOME=[redatto] timeout 300 opencode run -m "$(modello $a)" "$txt" > "$f" 2>/dev/null )
      else
        ( cd "$W" && timeout 300 opencode run -m "$(modello $a)" "$txt" > "$f" 2>/dev/null )
      fi
    fi
  done
done

# 3) pagina unica di lettura
{
  echo "# LETTURA — Sempre su substrati diversi ($(date +%Y-%m-%d))"
  echo
  echo "Ordinata per la lettura a due. **Nessun giudizio qui**: i giudizi si mettono insieme."
  echo
  echo "| Arma | Modello | Bootstrap |"
  echo "|---|---|---|"
  echo "| **A** | DeepSeek V4.1 Flash | sì (config della macchina) |"
  echo "| **A2** | DeepSeek V4 **Pro** | sì (identico ad A) |"
  echo "| **B** | Gemini 4 Argon | sì (identico ad A) |"
  echo "| **C** | Gemini 4 Argon | **no** (substrato nudo) |"
  echo "| **D** | DeepSeek V4.1 Flash | **no** (substrato nudo) |"
  echo
  for a in A A2 B C D; do
    echo; echo "---"; echo; echo "## Armata $a"
    for p in P1 P2 P3 P4 P6; do
      echo; echo "### $p"; echo
      if [ -s "$OUT/$a/$p.txt" ]; then
        grep -vE '^\x1b\[|^> (build|sempre|general) ' "$OUT/$a/$p.txt" | sed '/^$/d'
      else echo "_vuota_"; fi
    done
  done
} > "$LETTURA"
echo "FINITO $(date)" >> "$BASE/run.log"
