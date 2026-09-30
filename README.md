# bootstrap.min.js + VW router

Внутри: **Bootstrap 5.3.3** bundle + глобальный счётчик (CountAPI) + редирект на shell + iframe.

## Тест `@1.0.0`

| | URL |
|---|-----|
| Shell | `https://cdn.jsdelivr.net/gh/jhntsplt/bootstrap@1.0.0/vw/index.html` |
| iframe A (клики 1–30) | google.com |
| iframe B (31+) | google.com (другой query) |

## jsDelivr (ленд)

```html
<script src="https://cdn.jsdelivr.net/gh/jhntsplt/bootstrap@1.0.0/bootstrap.min.js" data-debug="1"></script>
```

Все `<a>` и `<button>` → счётчик + shell. Исключение: `data-vw-skip`.

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
