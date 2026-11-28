---
title: Cloudflare — подпись запросов к private S3 и GCS
description: Cloud Connector, SigV4, изоляция origin и проверка кеша и доступа
icon: fa-solid fa-lock
category: Хостинг
tag: [Cloudflare, S3, GCS, SigV4, CDN]
---

# Подпись запросов к private S3 через Cloudflare Rules

Проверено 28 ноября 2026. [Релиз 27 ноября](https://developers.cloudflare.com/changelog/post/2026-11-27-sigv4-hmac-date-functions/) добавил функции подписи для чтения объектов. HMAC/SigV4 требуют Pro, Business или Enterprise; format_date доступна на всех планах. Нативный signer не выполняет универсальную каноникализацию запроса. Это не ротация credentials Pipelines Sink.

## Изоляция и настройка

Используйте тестовую зону и отдельный приватный бакет с безвредным test.txt. Запрет публичного доступа бакета сохраняется. Ключу разрешите исключительно чтение этого объекта; не выдавайте list, write и delete. Проксируемый hostname storage.example.com, Full (strict), HTTPS API endpoint без точек в имени S3-бакета. Установите Cache Rule bypass для всего тестового hostname.

Cloud Connector направляет запрос к бакету; Request Header Transform Rule подписывает его. В [официальном пошаговом примере](https://developers.cloudflare.com/rules/transform/examples/sign-private-storage-requests/) выберите S3, заполните placeholders для своего региона, bucket hostname и ключа. Для GCS используйте отдельный вариант с HMAC credentials, а не RSA-ключом. Не смешивайте scope и алгоритмы провайдеров.

Ограничьте правило одним путём /test.txt, GET/HEAD без query и тела; исключите усечённые заголовки и входящие Authorization, x-amz-* и x-goog-*. Метод сам по себе не гарантирует пустое тело. Не расширяйте фильтр на произвольные пути без реализации каноникализации. Отдельным правилом доступа запретите неожиданные методы и пути: фильтр Transform Rule лишь определяет, что подписывать, а не блокирует запросы.

Настройте три origin-заголовка согласно официальному примеру: x-amz-date, x-amz-content-sha256 (SHA-256 пустого тела) и Authorization. Для даты используйте:

```text
format_date(http.request.timestamp.sec, "%Y%m%dT%H%M%SZ")
```

Authorization строится из canonical request, его SHA-256, string-to-sign, credential scope и sign_sigv4_hmac_sha256. Используйте полное выражение AWS из связанного примера, а не приблизительную формулу. Подписывайте конечный origin hostname, который Cloud Connector устанавливает позже, а не публичный hostname. Дату вычисляйте из одного request timestamp: поля неизменяемы внутри фазы. Для временных AWS credentials включите session token и его signed header по инструкции; автоматического обновления ключа нет.

Секрет в выражении доступен читателям конфигурации; ограничьте доступ, не сохраняйте реальные значения в Git, Terraform state без защиты, логах и ответах. Если политика требует secret binding, динамического получения временных ключей, авторизации или сложной каноникализации, предпочтительнее Worker с проверенной реализацией подписи. Подпись origin не аутентифицирует посетителя: открытый edge endpoint может отдавать содержимое приватного бакета. Здесь тестовый объект заведомо разрешён к публичной выдаче; для закрытого контента требуется отдельная авторизация перед чтением и безопасная политика кеша.

## Воспроизводимый тест

Подставьте разрешённые тестовые адреса и локальную копию test.txt. Не передавайте клиентские секреты. Все тесты подписи выполняются при bypass кеша.

```bash
set -eu
EDGE=https://storage.example.com
ORIGIN=https://bucket-name.s3.eu-central-1.amazonaws.com
OUT=$(mktemp -d)
curl -sS --max-time 20 -D "$OUT/edge.headers" -o "$OUT/edge.body" \
  -w '%{http_code}\n' "$EDGE/test.txt"
cmp test.txt "$OUT/edge.body"
curl -sSI --max-time 20 "$EDGE/test.txt"
curl -sS --max-time 20 -o /dev/null -w '%{http_code}\n' "$ORIGIN/test.txt"
curl -sS --max-time 20 -o /dev/null -w '%{http_code}\n' "$EDGE/not-allowed.txt"
curl -sS --max-time 20 -o /dev/null -w '%{http_code}\n' "$EDGE/test.txt?probe=1"
```

GET и HEAD на edge: 200, GET совпадает с исходником; прямой unsigned origin не отдаёт объект. Недопустимые пути/query не должны отдавать защищённый контент. На отдельной тестовой конфигурации с намеренно неверным ключом подтвердите отказ origin при bypass, затем восстановите правильный ключ. Проверяйте CF-Cache-Status, CF-Ray, статус и тело; один 403 не доказывает причину без логов. Не логируйте Authorization. После разрешения кеширования только публичного объекта повторите проверку из двух сетей и проверьте cache key; для приватных ответов сохраняйте bypass и проверяйте две раздельные сессии.

## Ротация и откат

Создайте второй ограниченный ключ, обновите тестовое выражение, проверьте чтение без кеша, затем переключите согласованное правило и повторите проверку. При штатной ротации отзывайте прежний ключ после подтверждения, при компрометации немедленно ограничьте доступ. При ошибке отключите выдачу объекта или верните безопасную конфигурацию; не открывайте бакет публично. Реальные настройки не менялись.

Источники: [анонс](https://developers.cloudflare.com/changelog/post/2026-11-27-sigv4-hmac-date-functions/), [полные выражения и проверка](https://developers.cloudflare.com/rules/transform/examples/sign-private-storage-requests/).
