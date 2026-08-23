---
title: WordPress 7.0 и 7.1
description: Что изменилось в WordPress 7.0 и 7.1, security-релизы ветки 7.0 и безопасное обновление рабочего сайта
icon: fa-brands fa-wordpress
category: Wordpress
tag: [Wordpress, WordPress 7.0, WordPress 7.1, Security, Обновление, AI, Gutenberg]
---

# WordPress 7.0 и 7.1: изменения и безопасное обновление

WordPress 7.0 «Armstrong» вышел 20 мая 2026 года, а WordPress 7.1 «Mary Lou» — 19 августа 2026 года. Ветка 7.x добавляет AI-инфраструктуру, меняет административный интерфейс, развивает адаптивные стили и переносит часть обработки изображений в браузер.

Материал актуализирован **23 августа 2026 года** и дополнен security-хронологией WordPress 7.0.2–7.0.4.

## Короткий вывод

- Новый сайт разумно сразу разворачивать на актуальной поддерживаемой WordPress 7.1.
- Не следует устанавливать исходный WordPress 7.0 или ранний 7.0.x только потому, что инструкция написана под 7.0.
- В июле–августе 2026 в ветке 7.0 вышло несколько security-релизов.
- Рабочий сайт на WordPress 6.x или 7.0 сначала нужно проверить на staging.
- Основные зоны риска — старые Gutenberg blocks, admin CSS/JS, плагины редактора и image pipeline.
- Обновление ядра не заменяет backup и restore-test.
- После обновления нужно проверить SEO endpoints, формы, почту и cron.

## Что появилось в WordPress 7.0

### AI Client и Connectors

WordPress 7.0 добавил инфраструктуру, через которую plugins могут работать с AI providers более единообразно.

Ключевые компоненты:

- **WP AI Client**;
- **Connectors API**;
- управление подключениями в admin UI;
- **Client-Side Abilities API**.

Само наличие этих API не означает, что WordPress автоматически отправляет контент внешней модели. Реальное поведение зависит от установленного plugin и настроенных connectors.

Перед использованием AI plugin проверяйте:

- какие данные отправляются;
- кому;
- где они хранятся;
- retention policy;
- кто оплачивает запросы;
- какие capabilities доступны пользователю или агенту.

### Обновленная административная панель

WordPress 7.0 начал модернизацию admin UI. Собственные plugins/themes, которые зависят от внутренней DOM-разметки админки или глобально переопределяют CSS, нужно проверять отдельно.

### Gutenberg и editor

В 7.0 развивались:

- responsive controls;
- custom CSS для блоков;
- iframe editor architecture;
- server-side block registration;
- command/editor extension points.

Особое внимание требуется старым blocks/plugins, которые напрямую обращаются к DOM editor вместо публичных API.

## Хронология WordPress 7.0.x

### WordPress 7.0.1 — maintenance

9 июля 2026 года вышел maintenance release 7.0.1 с исправлениями ошибок.

### WordPress 7.0.2 — security

17 июля 2026 года вышел **security release 7.0.2**.

WordPress сообщил о двух проблемах безопасности — critical и high severity — и из-за серьезности включил forced update через auto-update system для затронутых версий.

Практический вывод: production-сайт на ранней ветке 7.0 нельзя было считать безопасно обновленным, остановившись на 7.0.1.

### WordPress 7.0.3 — security

6 августа 2026 года вышел **7.0.3** с несколькими security fixes. WordPress рекомендовал обновить сайты немедленно.

### WordPress 7.0.4 — security

12 августа 2026 года вышел **7.0.4**.

В нем исправлена возможность authenticated Author+ remote code execution через специально подготовленную загрузку файла на сайтах, использующих комбинацию **Imagick + Ghostscript**.

WordPress снова рекомендовал немедленное обновление.

### Что из этого следует сейчас

После выхода WordPress 7.1 нет смысла целенаправленно разворачивать новый production на 7.0.4 без отдельной причины.

Для существующего сайта на 7.0.x:

1. проверить текущую версию;
2. убедиться, что она как минимум содержит необходимые security fixes;
3. проверить plugins/themes на staging с 7.1;
4. перейти на актуальную поддерживаемую ветку.

Проверка:

```bash
wp core version
wp core check-update
```

## Проверить Imagick и Ghostscript

Для контекста vulnerability 7.0.4 полезно понимать, используется ли этот image stack.

PHP extension:

```bash
php -m | grep -i imagick
```

Информация ImageMagick:

```bash
convert -version 2>/dev/null || magick -version 2>/dev/null
```

Ghostscript:

```bash
gs --version
```

Наличие Imagick/Ghostscript само по себе не означает уязвимость на актуальном WordPress. Это только проверка того, относится ли historical attack surface к конфигурации сайта.

Не удаляйте Ghostscript или Imagick вслепую: они могут быть нужны plugins и image/PDF pipelines.

## Что добавилось в WordPress 7.1

### Адаптивные стили

WordPress 7.1 позволяет задавать responsive styles блоков непосредственно в editor. Block themes могут управлять breakpoints через `theme.json`.

После обновления проверьте:

- custom media queries;
- visibility blocks;
- specificity/order styles;
- соответствие editor и frontend.

### iframe editor для всех themes

Post editor теперь использует iframe для всех themes.

Риск для старых extensions:

- `document.querySelector()` ищет DOM не в том document;
- CSS подключается в parent admin page, а не editor canvas;
- plugin напрямую вставляет элементы в DOM;
- event handlers рассчитывают на старую window hierarchy.

Лучше использовать официальные editor APIs.

### Browser-side image processing

Часть image processing может выполняться в браузере через WebAssembly/libvips.

Также развита поддержка современных форматов, включая AVIF/HEIC/HDR-related scenarios.

После обновления проверьте:

- JPEG/PNG/WebP/AVIF/HEIC upload;
- thumbnails;
- registered image sizes;
- optimizer plugins;
- S3/offload;
- EXIF orientation;
- качество и размер итоговых файлов.

### Новый media editor

Crop/rotate/metadata tools переработаны. Plugins, расширявшие прежний media editing UI через внутренние hooks/DOM, могут потребовать обновления.

### Новые blocks и UI

WordPress 7.1 включает новые editor capabilities, в том числе Tabs/Playlist и развитие interactive/responsive styles.

Перед использованием интерактивных blocks проверьте:

- keyboard navigation;
- content availability without JS;
- semantic HTML;
- accessibility;
- Core Web Vitals.

### Abilities API

Abilities API развивается как база для автоматизации и AI tools.

Для custom ability:

- проверять permissions;
- валидировать input;
- ограничивать destructive actions;
- не раскрывать secret data;
- вести audit trail для критичных операций.

## Что может сломаться

### Старые Gutenberg extensions

Проверьте plugins, добавляющие:

- blocks;
- format controls;
- editor sidebar;
- custom panels;
- DOM-level integrations.

### Admin CSS/JS

Selectors, завязанные на внутреннюю разметку WordPress, наиболее хрупкие.

### Image plugins / CDN

Несколько уровней обработки изображения могут конфликтовать:

```text
browser processing
→ WordPress sizes
→ optimization plugin
→ CDN transform
→ S3/offload
```

Проверьте, нет ли двойного compression или отсутствующих variants.

### Cache

После update может понадобиться очистить:

- page cache;
- object cache;
- OPcache;
- CDN cache;
- minification/bundler cache.

Не очищайте все большие cache layers в пиковое время без необходимости: cold-cache rebuild может создать нагрузку.

## Чек-лист перед обновлением

1. Проверить текущую версию core.
2. Проверить PHP/database requirements.
3. Сделать backup DB и `wp-content`.
4. Выполнить restore-test или иметь проверяемый snapshot.
5. Обновить plugins/themes до совместимых версий.
6. Проверить PHP error log и Site Health.
7. Создать staging с похожей инфраструктурой.
8. Зафиксировать основные SEO endpoints.
9. Зафиксировать CWV/TTFB baseline.
10. Документировать rollback.

## WP-CLI

Проверка:

```bash
wp core version
wp core check-update
wp plugin list --update=available
wp theme list --update=available
```

Backup DB:

```bash
mkdir -p backups
wp db export "backups/before-wordpress-update-$(date +%F-%H%M).sql"
```

Обновление:

```bash
wp maintenance-mode activate
wp core update
wp core update-db
wp maintenance-mode deactivate
```

После успешной проверки обновляйте plugins/themes контролируемо:

```bash
wp plugin update plugin-slug
wp theme update theme-slug
wp cache flush
```

## Автоматические security updates

WordPress умеет автоматически применять часть minor/security releases.

Проверьте, не отключены ли background core updates custom code или hosting panel.

Не стоит отключать security updates только из-за страха изменений и при этом не иметь собственной системы оперативного patch management.

Если auto-update запрещен политикой production:

```text
security announcement
→ staging smoke-test
→ controlled production deploy
```

должен занимать часы/дни, а не месяцы.

## Что проверить после обновления

### Функциональность

- home;
- posts/pages;
- login/logout/password reset;
- editor и Site Editor;
- publish/drafts/revisions;
- forms/comments/search;
- image upload;
- email;
- cron;
- REST API;
- integrations;
- mobile layout.

### SEO

- HTTP status;
- `robots.txt`;
- meta robots;
- `X-Robots-Tag`;
- canonical;
- XML sitemap;
- title/description;
- structured data;
- hreflang;
- Open Graph;
- 404/redirects;
- resource crawlability;
- Core Web Vitals.

Быстрая проверка:

```bash
curl -I https://example.com/
curl -fsS https://example.com/robots.txt
curl -fsS https://example.com/wp-sitemap.xml | head
curl -fsS https://example.com/article/ | grep -i canonical
```

## Откат

Если update сломал сайт:

1. ограничить запись данных/включить maintenance;
2. сохранить логи;
3. восстановить согласованную пару files + DB;
4. очистить cache;
5. проверить core/plugin/schema versions;
6. воспроизвести regression на staging.

Не заменяйте просто core-файлы старой версии поверх уже измененной базы без понимания DB upgrade.

## Связанные материалы

- [WordPress Playground](./playground.md)
- [WordPress Browser Extension](./browser-extension.md)
- [Плагин кэширования Breeze](./breeze.md)

## Официальные источники

- [WordPress 7.0 «Armstrong»](https://wordpress.org/news/2026/05/armstrong/)
- [WordPress 7.0 Field Guide](https://make.wordpress.org/core/2026/05/14/wordpress-7-0-field-guide/)
- [WordPress 7.0.1 Maintenance Release](https://wordpress.org/news/2026/07/wordpress-7-0-1-maintenance-release/)
- [WordPress 7.0.2 Security Release](https://wordpress.org/news/2026/07/wordpress-7-0-2-release/)
- [WordPress 7.0.3 Security Release](https://wordpress.org/news/2026/08/wordpress-7-0-3-release/)
- [WordPress 7.0.4 Security Release](https://wordpress.org/news/2026/08/wordpress-7-0-4-release/)
- [WordPress 7.1 «Mary Lou»](https://wordpress.org/news/2026/08/mary-lou/)
- [WordPress 7.1 Field Guide](https://make.wordpress.org/core/2026/08/05/wordpress-7-1-field-guide/)
