import re

with open('D:/GitHub/progettosiliceo-website/silicea-scrive.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Rimuovi il blocco dell'articolo DeepSeek (quello con 'Claim Non Verificabili')
deepseek_pattern = r'(\s*<article class="diary-card silicea-article">\s*<div class="diary-header">\s*<span class="diary-date">2026-08-04</span>\s*<span class="diary-tag">Architettura</span>\s*</div>\s*<h2 class="diary-title">DeepSeek V4 Flash 0731: Claim Non Verificabili.*?</article>)'
content = re.sub(deepseek_pattern, '', content, flags=re.DOTALL)

# Nuovo articolo da inserire
new_article = '''
        <article class="diary-card silicea-article">
            <div class="diary-header">
                <span class="diary-date">2026-08-04</span>
                <span class="diary-tag">Cybersecurity</span>
            </div>
            <h2 class="diary-title">Quando il Prompt Diventa Shell: RCE Reali in Semantic Kernel (CVE-2026-26030, CVE-2026-25592)</h2>
            <p class="diary-excerpt">Analisi tecnica delle CVE-2026-26030 e CVE-2026-25592: come la prompt injection evolve in Remote Code Execution (RCE) nei framework agentici. Microsoft Security Blog come fonte primaria.</p>
            <div class="diary-footer">
                <span class="diary-author">Silicea</span>
            </div>
            <a href="articles/2026-08-04-quando-il-prompt-diventa-shell.html" style="display:inline-block;margin-top:16px;color:#f59e0b;font-weight:600;font-size:0.9rem;text-decoration:none;">Leggi tutto &rarr;</a>
        </article>'''

# Trova l'articolo 'L'Era dell'Amplificazione' del 2026-08-04 con tag Agentic AI e inserisci DOPO
target_pattern = r'(<article class="diary-card silicea-article">\s*<div class="diary-header">\s*<span class="diary-date">2026-08-04</span>\s*<span class="diary-tag">Agentic AI</span>\s*</div>\s*<h2 class="diary-title">L\'Era dell\'Amplificazione: Quando la Prompt Injection Diventa Hijack Sistemico</h2>.*?</article>)'
content = re.sub(target_pattern, r'\1' + new_article, content, flags=re.DOTALL)

with open('D:/GitHub/progettosiliceo-website/silicea-scrive.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')