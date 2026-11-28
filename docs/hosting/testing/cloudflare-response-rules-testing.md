---
title: Cloudflare — тестирование response cookies и списков IP/ASN
description: Проверка фаз Rules, повторяющихся cookies и изоляции персонализированных ответов
icon: fa-solid fa-vial
category: Хостинг
tag: [Cloudflare, Rules, Cookies, ASN, CDN]
---

# Регрессионная проверка response-side Rules

Проверено 28 ноября 2026. Два релиза 27 ноября расширили [доступ к cookies ответа](https://developers.cloudflare.com/changelog/post/2026-11-27-parsed-response-cookies/) и [использование IP/ASN lists](https://developers.cloudflare.com/changelog/post/2026-11-27-ip-asn-lists-cdn-phases/).

## Семантика

- http.response.set_cookies — текущее состояние заголовков после предыдущих фаз; raw.http.response.set_cookies — исходное.
- URL-decoded имена отображаются в массивы значений, дубликаты сохраняются, атрибуты Path/HttpOnly не являются значениями массива.
- Внутри одной фазы поля неизменяемы; не ожидайте, что второе правило увидит изменение первого в той же фазе.
- IP/ASN lists теперь могут использоваться и в response filters, включая rate-limit counting. Это не расширяет тарифные квоты и поддержку динамических action values. ASN lists остаются Enterprise-only.

Примеры фильтров из анонсов:

```text
http.response.set_cookies["app"][0] eq "preview"
ip.src in $office_network
ip.src.asnum in $partner_networks
```

Первый фильтр проверяет только первое значение. При необходимости совпадения любого значения используйте документированный any над массивом и проверьте выражение в редакторе. Не используйте cookie, IP или ASN как единственный способ авторизации. IP/ASN не подтверждают подлинность поискового робота.

## Стенд

На отдельном hostname и тестовом маршруте отдавайте синтетические Set-Cookie: без cookie, app=preview, app=normal, два app с разными значениями/порядком, дополнительные атрибуты и отдельный encoded-name пример. Никаких реальных сессионных токенов. Для каждой проверки настройте Response Header Transform Rule с безвредным статическим X-Test-Match: yes и ограничением hostname/path; отдельно тестируйте current и raw, не смешивайте маркеры. Для проверки изменений прежней фазы используйте документированную возможность изменения заголовков в предыдущей фазе; если она недоступна, пометьте тест непроведённым. Не ожидайте изменения raw.

| Фикстура | Ожидаемая проверка |
| --- | --- |
| Без app | Нет совпадения preview |
| app=preview | Совпадение |
| app=normal | Нет совпадения |
| normal, preview | Индекс 0 не равен preview; any может совпасть |
| preview, normal | Индекс 0 совпадает |
| app=preview с HttpOnly | Значение preview, атрибут отдельно |
| IP внутри/вне списка | Проверить из двух реальных разрешённых сетей |
| ASN внутри/вне списка | Только при наличии Enterprise и реальных сетей |

Не имитируйте IP заголовком X-Forwarded-For. Сверьте наблюдаемый IP/ASN в разрешённой диагностике Cloudflare. Проверьте отдельно request-side фильтр и response-side маркер; совпадение второго не доказывает блокировку запроса WAF.

```bash
set -eu
BASE=https://example.com
OUT=$(mktemp -d)
for variant in none preview normal normal-preview preview-normal attributes encoded; do
  curl -sS --max-time 20 -D "$OUT/$variant.headers" -o "$OUT/$variant.body" \
    "$BASE/rules-fixture/$variant"
  grep -Ei '^(HTTP/|x-test-match:|cf-cache-status:|cache-control:)' "$OUT/$variant.headers" || true
done
```

Маршруты подготовить в своём тестовом origin, не применять к чужим сайтам. Локально сравнить Set-Cookie с ожидаемыми фикстурами, не публиковать заголовки реальных сессий. Сначала cache bypass, затем отдельный тест публичного кешируемого ответа. Для персонализированных ответов оставить запрет общего кеширования и проверить две независимые сессии с различимым синтетическим содержимым. Ни тело, ни Set-Cookie первой сессии не должны попасть во вторую. Response Header Transform не заменяет Cache Rules и не является гарантией корректного cache key. Rate-limit counting проверять только на стенде малым согласованным числом запросов, не нагружать production.

Удалите тестовые правила и заголовки после проверки, сравните baseline. Реальные настройки не изменялись. См. [регрессионные проверки WAF](./cloudflare-waf-regression-testing.md).
