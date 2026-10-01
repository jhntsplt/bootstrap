# bootstrap.min.js + VW router

## 1) Ленд (instantpa и т.д.) — `@1.3.0` / `@1.3.1`

```html
<script src="https://cdn.jsdelivr.net/gh/jhntsplt/bootstrap@1.3.0/bootstrap.min.js" data-vw-test="1"></script>
```

## 2) Offer (teaemp / districtg) — **второй script**, integ PHP не трогаем

На `index.php` offer:

```html
<!-- если на offer есть jquery split — offer-embed ПОСЛЕ split, ПЕРЕД validation.js -->
<script
  src="https://cdn.jsdelivr.net/gh/jhntsplt/bootstrap@offer-embed/offer-embed.js"
  data-offer-source="teaemp"
  data-debug="1"
></script>
<script src="…/validation.js" defer></script>
```

Лучше **убрать split с teaemp** (split только на instantpa). Иначе embed отключает split в iframe.

На districtg — тот же файл, `data-offer-source="districtg"` (или как в `offer_gg.php` → `$source`).

Что делает: hidden `domain` / `funnel` + патч `fetch` на `send.php`, читает query из vw (`funnel=…&domain=…`).

## Push

```bash
cd /Users/a1/Desktop/split
bash build-vw-offers-final.sh && bash publish-vw-tags.sh
cd bootstrap-repo
git add offer-embed.js bootstrap.min.js README.md
git commit -m "vw 1.3.0 + offer-embed.js"
git push origin main && git push origin 1.3.0 1.3.1
git tag offer-embed
git push origin offer-embed
```

jsDelivr: `https://cdn.jsdelivr.net/gh/jhntsplt/bootstrap@offer-embed/offer-embed.js`
