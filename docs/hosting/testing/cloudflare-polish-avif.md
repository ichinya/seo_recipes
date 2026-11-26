---
title: Cloudflare Polish — проверка AVIF и WebP
description: Воспроизводимое сравнение форматов изображений, CDN-кеша, размера ответа и LCP
icon: fa-solid fa-image
category: Хостинг
tag: [Cloudflare, AVIF, WebP, CDN, SEO]
---

# Cloudflare Polish: проверка AVIF и WebP

**Документация проверена 25 ноября 2026 года.** [Анонс 24 ноября](https://developers.cloudflare.com/changelog/post/2026-11-24-avif-in-polish/) добавляет AVIF к оптимизации JPEG/PNG с origin через Polish. Это не загрузка в Hosted Images и не remote transformations: для них есть [отдельный аудит](./cloudflare-images-delivery-audit.md).

## Подготовка

Используйте собственную тестовую зону с доступным Polish (проверьте тариф и настройки). Подготовьте фотографию JPEG, PNG с прозрачностью и небольшое уже оптимизированное изображение. Сохраните исходники, размеры, контрольные суммы и настройки. Проверьте, что URL обслуживается через Cloudflare и кешируем, а origin возвращает ожидаемое изображение. Не меняйте одновременно размеры, качество и другие оптимизаторы WordPress.

В Dashboard включите Polish, выберите режим компрессии и активируйте AVIF и WebP согласно [инструкции](https://developers.cloudflare.com/images/polish/configure-polish/). Учитывайте удаление метаданных и возможное изменение качества. После изменения настроек очистите только тестовые URL согласно [рецепту проверки purge](./cloudflare-cache-purge-2026-11-20.md). Не очищайте весь production-кеш.

## Матрица HTTP GET

Нужны Bash, curl и file. Подставьте собственный URL JPEG или PNG. Выполните до и после изменения настроек, с одинакового клиента, сохраняя вывод в разные каталоги.

```bash
set -eu
URL='https://example.com/test/photo.jpg'
OUT=$(mktemp -d)
for mode in avif webp original; do
  case "$mode" in
    avif) accept='image/avif,image/webp,image/jpeg,image/png' ;;
    webp) accept='image/webp,image/jpeg,image/png' ;;
    original) accept='image/jpeg,image/png' ;;
  esac
  for n in 1 2 3; do
    p="$OUT/$mode-$n"
    curl -sS --connect-timeout 10 --max-time 30 \
      -H "Accept: $accept" -D "$p.headers" -o "$p.body" \
      -w '%{http_code} %{content_type} %{size_download} %{time_starttransfer}\n' "$URL" > "$p.metrics"
    printf '%s: ' "$mode-$n"
    cat "$p.metrics"
    file "$p.body"
    grep -Ei '^(content-type|content-length|cf-cache-status|cf-polished|cf-ray|age|vary|cache-control):' "$p.headers" || true
  done
done
printf 'Artifacts: %s\n' "$OUT"
```

Повторите для каждого изображения и отдельно из другой сети. Не добавляйте случайные query-параметры: это может изменить cache key. Сравнивайте ответы с одинаковым статусом кеша и edge-локацией; первый MISS не сопоставляйте с прогретым HIT. Если формат не изменился, проверьте настройки, кешируемость, заголовки, диагностику Polish и размер исходника. Не требуйте AVIF для каждого изображения: возможен fallback, если преобразование невыгодно. Не считайте отсутствие конкретного диагностического заголовка доказательством отказа.

| Accept | Критерий |
| --- | --- |
| AVIF + WebP | Валидный поддерживаемый формат; AVIF предпочтителен, если условия преобразования выполнены |
| WebP | WebP либо исходный поддерживаемый формат |
| JPEG/PNG | Исходный поддерживаемый формат |
| Все варианты | HTTP 200, корректная сигнатура файла, отсутствие HTML/challenge, сохранение размеров и визуальной пригодности |

Экономия = (байты baseline − байты варианта) / байты baseline × 100%. Не сравнивайте HTML-страницу ошибки с изображением.

## WordPress и LCP

Проверьте реальные URL из srcset/currentSrc, прозрачность, качество мелкого текста и отсутствие сломанных картинок. В браузере убедитесь, что полученный MIME соответствует файлу. Выполните минимум пять одинаковых лабораторных прогонов Lighthouse до и после с одинаковыми настройками сети, viewport, устройством и состоянием кеша; сравните медиану LCP и объём загрузки. Отдельно измеряйте холодную и прогретую загрузку. Уменьшение файла не гарантирует улучшение LCP: учитывайте TTFB, приоритет запроса, декодирование и JS. Полевые данные сравнивайте только при достаточной выборке и сопоставимых условиях.

Откат: восстановите исходные настройки и очистите тестовые URL, повторите GET и визуальные проверки. Реальные запросы к клиентской зоне при подготовке не выполнялись.

## Источники

- [Анонс AVIF](https://developers.cloudflare.com/changelog/post/2026-11-24-avif-in-polish/)
- [Configure Polish](https://developers.cloudflare.com/images/polish/configure-polish/)
