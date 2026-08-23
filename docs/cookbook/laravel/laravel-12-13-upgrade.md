---
title: Обновление Laravel 12 до 13
description: Практический план миграции Laravel 12 на Laravel 13 с проверкой PHP, зависимостей, безопасности, очередей и SEO
icon: fa-brands fa-laravel
category: Laravel
tag: [Laravel, Laravel 12, Laravel 13, PHP, Composer, Обновление, Миграция, Deployment]
---

# Обновление Laravel 12 до Laravel 13

Laravel 13 вышел **17 марта 2026 года**. Laravel 12 с **13 августа 2026 года** больше не получает обычные bug fixes и находится в режиме security-only до **24 февраля 2027 года**.

Для нового проекта разумно использовать Laravel 13. Для существующего проекта на 12.x миграцию не обязательно проводить аварийно в тот же день, но откладывать её до конца security support без причины тоже не стоит.

## Короткий вывод

| Версия | PHP | Bug fixes | Security fixes |
| --- | --- | --- | --- |
| Laravel 12 | 8.2–8.5 | до 13 августа 2026 | до 24 февраля 2027 |
| Laravel 13 | 8.3–8.5 | ориентировочно до Q3 2027 | до 17 марта 2028 |

Главный технический порог Laravel 13 — **PHP 8.3+**.

Официальный upgrade guide оценивает типичное обновление 12 → 13 как относительно небольшое, но реальные затраты зависят от сторонних пакетов, собственного middleware, очередей, session/cache и инфраструктуры проекта.

## Перед началом

Проверьте текущую среду:

```bash
php -v
composer --version
php artisan --version
composer show laravel/framework
```

Сохраните текущее состояние:

```bash
git status
git rev-parse HEAD
composer show --direct > before-upgrade-packages.txt
php artisan about > before-upgrade-about.txt
```

На production сначала создайте проверяемый backup базы данных и файлов.

## Требования Laravel 13

Laravel 13 требует PHP **8.3 или новее** из поддерживаемой ветки.

Перед Composer-обновлением проверьте:

```bash
php -r 'echo PHP_VERSION, PHP_EOL;'
composer check-platform-reqs
```

Если production всё ещё на PHP 8.2, сначала обновите runtime и только потом framework.

Полезно отдельно сравнить CLI и FPM:

```bash
php -v
php-fpm8.3 -v 2>/dev/null || true
```

Частая ошибка — Composer запускается на новом CLI PHP, а Nginx продолжает отправлять запросы в старый PHP-FPM socket.

## Проверка пакетов

До изменения `composer.json`:

```bash
composer outdated --direct
composer why-not laravel/framework '^13.0'
```

`why-not` особенно полезен: он показывает пакет, который блокирует переход.

Типовые блокеры:

- административные панели;
- старые auth-пакеты;
- пакеты очередей;
- устаревшие Laravel service providers;
- библиотеки, жестко ограничивающие `illuminate/*`;
- старые dev-tools.

Не используйте `--ignore-platform-reqs` как способ «починить» несовместимость production-проекта.

## Основные Composer-зависимости

Официальный upgrade guide рекомендует обновить как минимум:

```json
{
  "require": {
    "laravel/framework": "^13.0"
  },
  "require-dev": {
    "laravel/boost": "^2.0",
    "laravel/tinker": "^3.0"
  }
}
```

Точные зависимости PHPUnit/Pest зависят от тестового стека проекта. Официальная документация для Laravel 13 ориентируется на современные major-версии тестовых инструментов.

После изменения constraints:

```bash
composer update --with-all-dependencies
```

Для production лучше обновлять зависимости в CI/build stage и деплоить уже зафиксированный `composer.lock`, а не выполнять неконтролируемый `composer update` на сервере.

## Laravel Boost и обновление через AI

Laravel 13 официально поддерживает сценарий обновления через **Laravel Boost** — first-party MCP server для coding agents.

В Laravel 12 приложении:

```bash
composer require laravel/boost:^2.0 --dev
php artisan boost:install
```

После этого официальный upgrade guide предлагает использовать команду:

```text
/upgrade-laravel-v13
```

в поддерживаемых coding assistants, например Claude Code, Cursor, OpenCode, Gemini или VS Code.

Это полезно как помощник по миграции, но не отменяет:

- review diff;
- тесты;
- staging;
- проверку конфигурации;
- ручную проверку production-critical flow.

AI-агент не должен самостоятельно принимать решение об изменении схемы базы или удалении compatibility-кода без review.

## High impact: Request Forgery Protection

В Laravel 13 CSRF middleware получил новое имя:

```php
Illuminate\Foundation\Http\Middleware\PreventRequestForgery
```

Старые:

```php
VerifyCsrfToken
ValidateCsrfToken
```

сохраняются как deprecated aliases, но прямые ссылки лучше обновить.

Было:

```php
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;

$this->withoutMiddleware([
    VerifyCsrfToken::class,
]);
```

Стало:

```php
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;

$this->withoutMiddleware([
    PreventRequestForgery::class,
]);
```

Middleware также использует request-origin verification на основе `Sec-Fetch-Site`.

### Что проверить

- SPA;
- формы из iframe;
- embedded widgets;
- webhook endpoints;
- OAuth callbacks;
- cross-domain admin tools;
- feature/integration tests, отключающие CSRF middleware.

Webhook не должен «чиниться» глобальным отключением защиты для всего приложения. Исключение должно быть минимальным и сопровождаться собственной проверкой подписи/секрета провайдера.

## Cache: serializable_classes

Laravel 13 усиливает защиту от PHP unserialize gadget chains.

В актуальной конфигурации cache появляется `serializable_classes`.

Если приложение намеренно хранит PHP-объекты в cache, лучше перечислять разрешенные классы явно:

```php
'serializable_classes' => [
    App\Data\CachedDashboardStats::class,
],
```

Если cache содержит только массивы, числа, строки и JSON-подобные структуры, дополнительный allow-list обычно не нужен.

Перед переключением проверьте реальные cache payloads и пользовательские cache drivers.

## Session serialization

Новый application skeleton использует более безопасную JSON serialization для session.

Если существующий проект переключить с PHP serialization на JSON, активные сессии могут стать недействительными.

Поэтому перед изменением:

1. проверьте, хранятся ли в session PHP objects;
2. решите, допустим ли forced logout;
3. предупредите пользователей, если это административный/клиентский сервис;
4. не меняйте формат одновременно с framework upgrade без необходимости.

Для плавной миграции можно временно сохранить прежний формат, а hardening выполнить отдельным релизом.

## Cache/session prefixes

Laravel 13 меняет framework fallback naming для части cache/session prefix.

Если значения явно заданы в `.env`, влияние обычно минимально.

Проверьте:

```env
CACHE_PREFIX=
REDIS_PREFIX=
SESSION_COOKIE=
```

Особенно если несколько приложений используют один Redis cluster.

Коллизия prefix может быть хуже обычного cache miss.

## Database upsert

В Laravel 13 `upsert()` требует непустой `uniqueBy`.

Проверьте код вида:

```php
Model::upsert(
    $rows,
    [],
    ['price', 'updated_at'],
);
```

Он должен быть приведен к явному ключу:

```php
Model::upsert(
    $rows,
    ['external_id'],
    ['price', 'updated_at'],
);
```

Даже если MySQL/MariaDB фактически используют свои primary/unique indexes, Laravel 13 валидирует входной параметр.

Это особенно важно для:

- импортов товаров;
- SEO-метрик;
- sitemap pipelines;
- синхронизации внешних API;
- cron-importers.

## Queue events

Если приложение слушает `JobAttempted`, проверьте использование:

```php
$event->exceptionOccurred
```

В Laravel 13 событие предоставляет exception object:

```php
$event->exception
```

Это может затронуть собственный queue monitoring или отправку ошибок в observability.

## Scheduler

Проверьте регистрацию задач через `withScheduling()` и собственную bootstrap-логику.

После обновления обязательно выполнить:

```bash
php artisan schedule:list
```

Для SEO-проектов особенно важны задачи:

- sitemap generation;
- import feeds;
- Search Console/API ingestion;
- очистка cache;
- обновление цен/остатков;
- генерация отчетов;
- email queues.

## Route precedence

Если приложение использует сложную комбинацию domain routes и обычных routes, добавьте regression tests.

Минимум проверить:

```text
example.com/path
api.example.com/path
admin.example.com/path
```

После framework upgrade роут должен попадать в тот же controller/middleware stack.

## Global helpers и PHP 8.5 polyfill

Laravel 13 использует `symfony/polyfill-php85`.

На PHP < 8.5 это может определять функции вроде:

```php
array_first()
array_last()
```

Проверьте legacy helper packages и собственные `helpers.php`, чтобы избежать конфликтов имен.

В старом проекте лучше заменить исторические helpers на актуальные Laravel API, например `Arr::first()`.

## Тесты до обновления

Перед framework bump текущая Laravel 12 версия должна иметь зеленую базу.

```bash
php artisan test
```

или:

```bash
vendor/bin/pest
vendor/bin/phpunit
```

Если тесты падают до upgrade, после обновления будет сложно отличить старый дефект от regression.

## Минимальный набор integration tests

### Авторизация

```text
login
logout
password reset
email verification
2FA — если есть
```

### CRUD

```text
create
read
update
delete
validation
permissions
```

### HTTP/API

```text
REST endpoints
webhooks
CORS
CSRF
rate limiting
signed URLs
```

### Очереди

```text
dispatch
retry
failed jobs
notifications
scheduled jobs
```

### Файлы

```text
upload
download
S3
image processing
signed storage URLs
```

## Staging

Сделайте staging максимально похожим на production:

```text
PHP version
extensions
webserver
Redis
DB engine/version
queue driver
filesystem
cron
reverse proxy
CDN
```

Не используйте production API keys на staging без необходимости.

## Deployment checklist

Перед выкладкой:

```bash
composer validate --strict
composer check-platform-reqs
php artisan test
php artisan config:clear
php artisan route:list > route-list.txt
php artisan schedule:list > schedule-list.txt
```

В CI полезно также выполнить:

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

если приложение поддерживает соответствующие cache-команды.

## Production deployment

Один из вариантов:

```bash
php artisan down --retry=30
composer install --no-dev --prefer-dist --optimize-autoloader
php artisan migrate --force
php artisan optimize
php artisan queue:restart
php artisan up
```

Но миграции базы не обязаны присутствовать в каждом Laravel upgrade. Не запускайте неизвестные migrations «по привычке» без review.

Для zero-downtime release архитектура должна учитывать совместимость старого и нового кода с DB schema во время переключения.

## Workers

Queue workers — один из наиболее частых источников скрытой проблемы после deploy.

После обновления:

```bash
php artisan queue:restart
```

Если используется Supervisor/systemd/Horizon, убедитесь, что новые процессы действительно запущены с новым release path и PHP version.

Проверьте:

```bash
php artisan queue:failed
```

и метрики очереди после релиза.

## OPcache

При классическом deployment старые PHP bytecode могут оставаться в OPcache.

Стратегия зависит от инфраструктуры:

- reload PHP-FPM;
- atomic release path;
- explicit OPcache reset;
- container replacement.

Не выполняйте бесконтрольный restart всех PHP-FPM pools на высоконагруженном сервере.

## SEO-проверка после framework upgrade

Laravel update может не менять контент, но легко затронуть HTTP layer.

Проверьте несколько URL каждого типа:

```bash
curl -I https://example.ru/
curl -I https://example.ru/category/example
curl -I https://example.ru/product/example
curl -I https://example.ru/sitemap.xml
curl -I https://example.ru/robots.txt
```

### HTTP status

Ищите массовые:

- 500;
- 404;
- 301/302 loops;
- unexpected 403/419.

### Canonical

Проверьте HTML:

```bash
curl -fsS https://example.ru/page | grep -i canonical
```

### Robots

```bash
curl -fsS https://example.ru/robots.txt
```

### Sitemap

```bash
curl -fsS https://example.ru/sitemap.xml | head
```

### Structured data

Если JSON-LD генерируется Blade/DTO слоями, проверить несколько реальных страниц после deploy.

## Производительность

Сравнивайте одну и ту же страницу до и после:

```bash
curl -sS -o /dev/null \
  -w 'code=%{http_code} ttfb=%{time_starttransfer} total=%{time_total}\n' \
  https://example.ru/page
```

Это не заменяет полноценный load test, но быстро показывает грубую regression.

Отдельно смотрите:

- DB query count;
- Redis latency;
- queue latency;
- application error rate;
- p95/p99 response time.

## Rollback

До выкладки должен быть ответ на вопрос:

> Что мы делаем, если через пять минут после deploy видим 20% HTTP 500?

Минимальный rollback plan:

```text
old release preserved
composer.lock preserved
DB migration compatibility understood
previous env/config available
worker restart procedure documented
```

Если migration необратимо меняет данные, простой `git checkout` уже не является rollback.

## Когда можно остаться на Laravel 12

Временно остаться на Laravel 12 разумно, если:

- проект на поддерживаемом PHP;
- security updates устанавливаются;
- критический пакет еще не поддерживает Laravel 13;
- миграция уже запланирована;
- есть понятный срок перехода до 24 февраля 2027 года.

Плохой вариант — «Laravel 12 пока работает, поэтому вернемся к вопросу после окончания security support».

## Когда переходить быстрее

Приоритет повышается, если:

- нужен Laravel 13 AI SDK;
- используется agentic development / Laravel Boost;
- нужен современный PHP stack;
- проект активно развивается;
- зависимости уже требуют Laravel 13;
- проще выполнить небольшой upgrade сейчас, чем большой накопленный upgrade позже.

## Итоговый порядок

```text
1. Green Laravel 12 tests
2. Backup
3. PHP >= 8.3
4. composer why-not laravel/framework ^13.0
5. Update constraints
6. Review official upgrade guide
7. Fix Request Forgery / cache / session / DB / queue changes
8. Run tests
9. Deploy to staging
10. Functional + SEO checks
11. Production deploy
12. Restart workers
13. Monitor errors / queues / HTTP / SEO endpoints
14. Roll back if thresholds exceeded
```

## Источники

- [Laravel 13 Release Notes](https://laravel.com/docs/13.x/releases)
- [Laravel 13 Upgrade Guide](https://laravel.com/docs/13.x/upgrade)
- [Laravel 12 Release Notes / Support Policy](https://laravel.com/docs/12.x/releases)
- [Laravel 13 Documentation](https://laravel.com/docs/13.x/documentation)
- [Laravel Boost](https://laravel.com/docs/13.x/installation#installing-laravel-boost)
