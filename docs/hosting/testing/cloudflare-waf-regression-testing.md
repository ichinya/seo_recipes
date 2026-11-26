---
title: Cloudflare WAF — регрессионная проверка после обновления правил
description: Проверка публичных страниц, API, авторизации и поисковых роботов после изменения managed rules
icon: fa-solid fa-shield-halved
category: Хостинг
tag: [Cloudflare, WAF, SEO, Тестирование]
---

# Регрессионная проверка Cloudflare WAF

**Документация проверена 25 ноября 2026 года.** [Обновление от 24 ноября](https://developers.cloudflare.com/changelog/post/2026-11-24-emergency-waf-release/) добавило два блокирующих правила Free Ruleset: Anomaly — Embedded Application Request (суффикс ID 63c3ebd4) и Generic Rules — Authentication Bypass (8a1681fb). Это не сообщение о подтверждённых ложных блокировках. Полные ID и доступность управления правилами проверяйте в своей зоне.

## Матрица проверок

Зафиксируйте исходные настройки, версии приложения и ожидаемые результаты. Если baseline до автоматического обновления отсутствует, используйте предыдущие разрешённые синтетические проверки и явно обозначьте отсутствие сравнения. Тестируйте только свои ресурсы или разрешённую среду.

| Сценарий | Ожидаемое поведение |
| --- | --- |
| Публичный HTML, robots.txt, sitemap.xml | Ожидаемый HTTP-код, содержимое без challenge |
| Публичный REST GET | Ожидаемый код и JSON |
| Вход | Вход тестовой учётной записью через браузер с обычными CSRF/cookie |
| Webhook / WordPress AJAX | Валидный тестовый payload в staging, проверка результата приложения |
| Защищённый API без credentials | Штатный 401/403; не должен стать доступным |
| Подтверждённые поисковые роботы | Нет новой ложной блокировки нужных публичных URL |

## Безопасные HTTP-пробы

Bash и curl. Укажите свой домен и реально существующие маршруты, ожидаемые коды и уникальные маркеры содержимого. Скрипт выполняет только GET без авторизации и редиректов, сохраняет заголовки и тело локально. Для закрытых URL и операций записи используйте отдельно согласованные сценарии staging.

```bash
set -u
BASE='https://example.com'
OUT=$(mktemp -d)
failed=0
while IFS='|' read -r name path expected marker; do
  p="$OUT/$name"
  if ! curl -sS --connect-timeout 10 --max-time 30 \
      -D "$p.headers" -o "$p.body" \
      -w '%{http_code} %{content_type} %{time_starttransfer}\n' \
      "$BASE$path" > "$p.metrics"; then
    echo "$name: transport error"; failed=1; continue
  fi
  read -r code rest < "$p.metrics"
  if [ "$code" != "$expected" ] || ! grep -Fq -- "$marker" "$p.body" ||
      grep -Eiq '^cf-mitigated:[[:space:]]*challenge' "$p.headers"; then
    echo "$name: investigate"; failed=1
  else
    echo "$name: expected response"
  fi
  cat "$p.metrics"
  grep -Ei '^(cf-ray|cf-mitigated|content-type|cf-cache-status):' "$p.headers" || true
done <<'CASES'
home|/|200|Example Domain
robots|/robots.txt|200|User-agent:
sitemap|/sitemap.xml|200|<urlset
CASES
echo "Artifacts: $OUT"
exit "$failed"
```

Примерные маркеры и коды нужно адаптировать: sitemap может быть индексом или сжатым файлом, а редирект может быть штатным. Запускайте отдельно до и после изменения, из нескольких разрешённых сетей. HTTP 200 без ожидаемого тела не считается успехом. Не публикуйте сохранённые тела и заголовки без удаления секретов и персональных данных.

## Определение причины и безопасное исправление

1. Сопоставьте UTC, URL, метод, CF-Ray, HTTP-код и origin-логи с [Security Events](https://developers.cloudflare.com/waf/analytics/security-events/). Учитывайте ограничения тарифа и sampling.
2. Найдите конкретный rule ID, ruleset и действие. 403 сам по себе не доказывает блокировку WAF; приложение, rate limiting и другие механизмы также могут отказать. Отсутствие записи в выборочных логах не доказывает отсутствие блокировки.
3. Повторите нормальный запрос в staging. Для webhook используйте валидную подпись и тестовый объект, для входа — обычный браузер. Не отправляйте секреты в URL и публичные отчёты.
4. Если false positive установлен, рассмотрите исправление приложения либо минимальное исключение конкретного правила, пути и метода только при наличии такой возможности в тарифе. Не выключайте WAF целиком и не разрешайте запросы по одному User-Agent. Если точечное исключение недоступно, обращайтесь к Cloudflare; не расширяйте доступ к защищённым маршрутам.
5. Повторите положительные и отрицательные проверки, включая авторизацию, и откатите исключение, если защита ослаблена или причина не подтверждена.

## Проверка SEO

Проверяйте доступность robots.txt, sitemap и целевых страниц, нормальный HTML и ресурсы рендеринга. Используйте Search Console URL Inspection и логи реальных обходов; User-Agent в curl не подтверждает подлинность Googlebot. Сверяйте IP по [официальной инструкции Google](https://developers.google.com/search/docs/crawling-indexing/verifying-googlebot). Для других роботов используйте их официальные методы верификации. Не делайте вывод о падении индексации по одиночному 403; отслеживайте длительность и повторяемость ошибок.

## Источники

- [WAF Emergency Release 24.11.2026](https://developers.cloudflare.com/changelog/post/2026-11-24-emergency-waf-release/)
- [Managed rules](https://developers.cloudflare.com/waf/managed-rules/)
- [Security Events](https://developers.cloudflare.com/waf/analytics/security-events/)

Живые WAF-тесты и изменения правил при подготовке рецепта не выполнялись.
