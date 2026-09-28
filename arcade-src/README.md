# NEON VOID — sorgente (Arcade Survival)

Gioco scaricato da Arena il 26/09/2026. Qui c'è il **sorgente**; il gioco **pubblicato**
è `../arcade/gioco.html` (file singolo, tutto incluso).

## Come si rigenera il gioco pubblicato

```bash
cd arcade-src
npm install        # una volta sola
npm run build      # produce dist/index.html (file singolo, ~285 KB)
```

Poi, **due correzioni obbligatorie** prima di pubblicare (sono già applicate in
`../arcade/gioco.html` — se si rigenera, vanno rifatte):

1. **Percorsi dei font**: nel build i font risultano relativi (`url(fonts/files/...)`).
   Vanno resi assoluti: `url(/fonts/files/...)` — altrimenti sotto `/arcade/` danno 404.
2. **Accessibilità**: il viewport del gioco ha `user-scalable=no` (blocca lo zoom).
   Va rimosso. E va tenuto il link di ritorno al sito (`← Progetto Siliceo`).

## I record

Il gioco salva i punteggi in `localStorage` (chiave `neonvoid.scores.v1`, max 8 voci:
nome, punteggio, wave, data). **È il meccanismo dell'app: non va toccato.**
Conseguenza da sapere: ogni giocatore vede solo i suoi record, legati al suo browser.
