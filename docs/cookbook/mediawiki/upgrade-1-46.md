---
title: Обновление MediaWiki до 1.46
description: Как перейти с устаревших версий MediaWiki на 1.46 или поддерживаемую LTS-ветку и не сломать расширения, базу и SEO
icon: fa-brands fa-wikipedia-w
category: Mediawiki
tag: [Mediawiki, MediaWiki 1.46, Обновление, PHP, MySQL, MariaDB, LTS, SEO]
---

# Обновление MediaWiki до 1.46

MediaWiki **1.44** достиг end-of-life **31 июля 2026 года** и больше не получает даже security fixes.

На август 2026 года:

| Версия | Статус | Выпуск | EOL |
| --- | --- | --- | --- |
| 1.46 | current stable | 30 июня 2026 | июль 2027 |
| 1.45 | legacy stable | 4 декабря 2025 | декабрь 2026 |
| 1.44 | obsolete | 2 июля 2025 | 31 июля 2026 |
| 1.43 | current LTS | 21 декабря 2024 | декабрь 2027 |
| 1.47 | future LTS | ноябрь 2026 | ноябрь 2029 |

Для production нельзя оставлять 1.44 и более старые unsupported-ветки без отдельной веской причины и компенсирующих мер.

## Что выбрать: 1.46 или 1.43 LTS

### MediaWiki 1.46

Подходит, если:

- нужен текущий stable;
- PHP уже 8.3–8.5;
- расширения совместимы;
- обновления можно проводить регулярно;
- важны новые возможности текущей ветки.

### MediaWiki 1.43 LTS

Подходит, если:

- важнее длительный support window;
- расширения медленнее адаптируются к новым stable;
- инфраструктура консервативная;
- планируется обновление реже.

1.43 LTS поддерживается до декабря 2027 года.

### Ждать 1.47 LTS?

1.47 LTS запланирован на ноябрь 2026 года.

Если сайт уже на **unsupported 1.44 или старее**, ждать несколько месяцев новой LTS обычно плохая идея: security gap уже существует.

Можно сначала перейти на поддерживаемую 1.43/1.46, а затем отдельно запланировать 1.47 LTS.

## Требования MediaWiki 1.46

Актуальная документация указывает:

- PHP **8.3.0+**;
- поддерживаются PHP 8.3–8.5;
- MariaDB 10.3+;
- MySQL 5.7+;
- PostgreSQL 10+;
- SQLite 3.31+.

Проверка:

```bash
php -v
php -m
mysql --version
```

Для MariaDB:

```bash
mariadb --version
```

MediaWiki production обычно разумно обновлять не только по минимальным требованиям приложения, но и на поддерживаемых версиях самой ОС, PHP и СУБД.

## Сначала определить текущую версию

Из интерфейса:

```text
Special:Version
```

Или из файлов:

```bash
php maintenance/run.php version 2>/dev/null || true
```

На старых ветках команда может отличаться.

Можно также проверить `RELEASE-NOTES-*` и `includes/DefaultSettings.php`, но лучше опираться на штатную информацию MediaWiki.

## Инвентаризация перед upgrade

Запишите:

```text
MediaWiki version
PHP version
DB engine/version
skin
extensions
Composer packages
LocalSettings.php customizations
scheduled jobs
job runner
cache backend
object storage/CDN
```

Сохраните `Special:Version` или список extensions в заметку перед работами.

## Backup

Нужно отдельно сохранить:

1. базу;
2. `images/`;
3. `LocalSettings.php`;
4. custom extensions;
5. custom skins;
6. конфиги webserver;
7. секреты вне Git.

### MariaDB / MySQL

```bash
mysqldump \
  --single-transaction \
  --quick \
  --default-character-set=binary \
  mediawiki > mediawiki-before-upgrade.sql
```

Для большого production-проекта параметры backup лучше согласовать с реальной СУБД и схемой репликации.

### Файлы

```bash
tar -czf mediawiki-files-before-upgrade.tar.gz \
  LocalSettings.php images extensions skins
```

Не храните backup только на том же диске, где находится production.

## Проверить восстановление

Backup без restore test — только предположение о наличии backup.

Для staging полезно:

```text
production snapshot
      ↓
restore into isolated staging
      ↓
run upgrade there
```

Так одновременно проверяется и резервная копия, и процедура обновления.

## Совместимость extensions

Это одна из главных причин проблем MediaWiki upgrade.

Для каждого расширения проверьте:

- официальную страницу;
- поддерживаемую ветку MediaWiki;
- REL1_46 branch/tag;
- Composer constraints;
- abandoned status;
- замену deprecated hooks/API.

Не копируйте старую папку `extensions/` целиком поверх новой MediaWiki.

Правильнее получить совместимые версии extensions заново.

## Совместимость skin

Отдельно проверить:

- Vector;
- Timeless;
- MonoBook;
- собственный skin;
- frontend extensions.

После upgrade проблемы могут быть не в core, а в skin/template hooks.

## Многошаговое обновление старых версий

MediaWiki поддерживает upgrade только из ограниченного диапазона старых LTS.

Официальная документация приводит пример: для перехода с **1.38 или старее** на 1.46 сначала нужно обновиться до промежуточной поддерживаемой LTS, например 1.39 или 1.43, и только затем до 1.46.

Не делайте:

```text
1.31 → 1.46 одним прыжком
```

без проверки официального supported upgrade path.

Практическая схема:

```text
very old MediaWiki
      ↓
intermediate supported LTS
      ↓
DB update
      ↓
verify
      ↓
1.46
```

## Maintenance mode

Для Wiki с активным редактированием важно остановить изменения данных во время critical upgrade window.

Варианты:

- read-only mode через `$wgReadOnly`;
- reverse proxy maintenance page;
- ограничение доступа;
- короткое полное maintenance window.

Пример в `LocalSettings.php`:

```php
$wgReadOnly = 'Проводится техническое обновление MediaWiki';
```

Перед этим проверьте поведение конкретной версии и extensions.

## Не распаковывать новую версию поверх старой

Более безопасная deployment-модель:

```text
/var/www/wiki/releases/1.45/
/var/www/wiki/releases/1.46/
/var/www/wiki/current -> releases/1.46
```

Новая MediaWiki устанавливается в чистую директорию.

Затем переносятся только нужные пользовательские компоненты:

```text
LocalSettings.php
images/
compatible extensions
compatible skins
```

Это снижает риск оставить удаленные core-файлы старой версии.

## Скачать MediaWiki 1.46

Официальный архив:

```bash
wget https://releases.wikimedia.org/mediawiki/1.46/mediawiki-1.46.0.tar.gz
```

или:

```bash
curl -O https://releases.wikimedia.org/mediawiki/1.46/mediawiki-1.46.0.tar.gz
```

Перед production-развертыванием имеет смысл проверить опубликованную GPG signature/checksum по официальной странице Download.

Не фиксируйте в automation навечно `1.46.0`: при появлении security/maintenance release нужно использовать актуальный patch release ветки 1.46.

## Composer

Если MediaWiki или extensions используют Composer:

```bash
composer install --no-dev --optimize-autoloader
```

или команда, которую рекомендует конкретный installation mode.

Нельзя просто копировать старый `vendor/` в новую версию.

## LocalSettings.php

Не заменяйте существующий `LocalSettings.php` автоматически новым generated-файлом.

Сравните:

```bash
diff -u LocalSettings.old.php LocalSettings.php
```

Проверьте:

- `$wgServer`;
- `$wgScriptPath`;
- `$wgArticlePath`;
- database config;
- secret keys;
- cache;
- upload settings;
- extensions;
- skins;
- `$wgCanonicalServer`;
- proxy/CDN settings;
- custom namespaces;
- permissions.

## Обновление базы

Для современных MediaWiki используется maintenance runner:

```bash
php maintenance/run.php update
```

На старых ветках синтаксис мог быть другим.

Запускайте update именно кодом той версии, на которую переходите.

Перед execution:

```bash
php maintenance/run.php update --help
```

Если база большая, оцените lock/DDL impact заранее.

## Job queue

После upgrade проверьте job runner.

Например:

```bash
php maintenance/run.php runJobs --maxjobs 100
```

Точная команда и параметры зависят от версии.

Если jobs запускаются cron/systemd, убедитесь, что путь теперь ведет на новый release.

## Кэш

В зависимости от архитектуры:

- APCu;
- Redis;
- Memcached;
- CDN;
- reverse proxy;
- PHP OPcache.

После deploy старый cache может ссылаться на устаревшую структуру данных.

Не очищайте большой shared cache без понимания нагрузки: cold cache может резко увеличить CPU/DB usage.

## PHP-FPM

Проверьте, что webserver работает именно на PHP >= 8.3.

Например:

```bash
ps aux | grep php-fpm
```

Для Nginx:

```bash
grep -R 'fastcgi_pass' /etc/nginx/sites-enabled/
```

CLI `php -v` сам по себе не гарантирует версию FPM.

## Проверка после upgrade

### Special:Version

Проверить:

```text
Special:Version
```

Версия core, extensions и skin должна соответствовать плану.

### Главная страница

```bash
curl -I https://wiki.example.ru/
```

### Обычная статья

```bash
curl -I https://wiki.example.ru/wiki/Test
```

### Special pages

Проверить:

```text
Special:Version
Special:Search
Special:RecentChanges
Special:Upload
```

### Авторизация

- login;
- logout;
- session persistence;
- password reset, если используется;
- OAuth/LDAP/SAML integrations.

### Редактирование

Проверить:

- edit;
- preview;
- save;
- history;
- diff;
- rollback/undo по ролям.

### Upload

- изображения;
- thumbnails;
- MIME detection;
- SVG policy;
- file permissions.

## SEO после обновления

MediaWiki upgrade может косвенно изменить HTML, URL routing, skin и extensions.

### robots.txt

```bash
curl -fsS https://wiki.example.ru/robots.txt
```

### Sitemap

Если используется отдельное расширение или генератор:

```bash
curl -I https://wiki.example.ru/sitemap.xml
```

Проверьте, что cron/job генерации работает после смены release path.

### Canonical

```bash
curl -fsS https://wiki.example.ru/wiki/Test | grep -i canonical
```

Особенно важны настройки:

```text
$wgServer
$wgCanonicalServer
$wgArticlePath
$wgScriptPath
```

### HTTP redirects

Проверьте старые URL:

```bash
curl -I 'https://wiki.example.ru/index.php?title=Test'
curl -I 'https://wiki.example.ru/wiki/Test'
```

Не допускайте случайной цепочки:

```text
old URL → 301 → index.php → 302 → canonical URL
```

если можно оставить один понятный redirect.

### Meta robots

Проверьте namespace или extensions, которые могли добавлять `noindex`.

### Search pages

Внутренний поиск и служебные страницы обычно не должны внезапно попасть в индекс из-за изменений skin/extension.

## Nginx / Apache rewrite

Core upgrade сам по себе не требует менять красивый URL, если routing config уже корректный.

Перед изменением rewrite rules сравните текущий рабочий конфиг.

Для Nginx полезно:

```bash
nginx -t
```

Для Apache:

```bash
apachectl configtest
```

## Extension regression checklist

Для каждого важного extension:

```text
page renders
Special page opens
permissions work
scheduled jobs work
API module responds
no PHP warnings/fatal errors
```

Особенно внимательно проверить:

- VisualEditor;
- Cargo/Semantic MediaWiki;
- Scribunto;
- CirrusSearch/Elasticsearch;
- OAuth/LDAP/SAML;
- sitemap/turbo integrations;
- ad/analytics customizations.

## Логи

Сразу после deploy:

```bash
tail -f /var/log/nginx/error.log
```

и PHP-FPM log.

Если MediaWiki настроен на собственный logging channel — смотреть и его.

Ищите:

```text
Fatal error
Deprecated
Undefined
DBQueryError
DBConnectionError
```

`Deprecated` не всегда ломает сайт прямо сейчас, но часто сигнализирует о старом extension.

## Staging

Правильный сценарий:

```text
production DB backup
      ↓
restore to isolated staging
      ↓
copy images
      ↓
install MediaWiki target version
      ↓
install compatible extensions/skin
      ↓
run update
      ↓
functional tests
      ↓
SEO tests
      ↓
production maintenance window
```

Staging не должен отправлять реальные письма, webhooks и индексироваться поисковиками.

Добавьте минимум:

```http
X-Robots-Tag: noindex, nofollow
```

или защитите staging авторизацией/VPN.

## Rollback

До `maintenance/run.php update` нужно знать, можно ли откатить DB schema.

Надежный rollback обычно означает:

```text
restore previous code
+
restore DB snapshot/backup if schema changed incompatibly
+
restore files if required
```

Только переключить symlink на старый release после необратимой DB migration может быть недостаточно.

## Что делать с MediaWiki 1.44 сейчас

Если production всё еще на 1.44:

1. не считать его поддерживаемой версией;
2. снять fresh backup;
3. проверить PHP;
4. проверить extensions;
5. выбрать 1.46 или 1.43 LTS;
6. прогнать upgrade на staging;
7. выполнить production migration в контролируемое окно.

## Что делать с очень старой MediaWiki

Для 1.38 и ниже сначала построить supported hop path.

Не нужно угадывать его по номерам. Перед каждым шагом сверяйтесь с актуальным `Manual:Upgrading`.

## Итоговый чек-лист

```text
[ ] Current version known
[ ] Target version chosen
[ ] PHP compatible
[ ] DB compatible
[ ] Extension compatibility checked
[ ] Skin compatibility checked
[ ] DB backup created
[ ] images/ backup created
[ ] LocalSettings saved
[ ] Restore tested
[ ] Staging upgrade passed
[ ] New clean MediaWiki directory prepared
[ ] Compatible extensions installed
[ ] maintenance/run.php update passed
[ ] Jobs work
[ ] Login/edit/upload work
[ ] robots.txt checked
[ ] sitemap checked
[ ] canonical checked
[ ] redirects checked
[ ] Logs clean enough
[ ] Rollback procedure documented
```

## Источники

- [MediaWiki Version lifecycle](https://www.mediawiki.org/wiki/Version_lifecycle)
- [MediaWiki Download](https://www.mediawiki.org/wiki/Download)
- [MediaWiki Compatibility](https://www.mediawiki.org/wiki/Compatibility)
- [Manual:Upgrading](https://www.mediawiki.org/wiki/Manual:Upgrading)
- [MediaWiki 1.46](https://www.mediawiki.org/wiki/MediaWiki_1.46)
