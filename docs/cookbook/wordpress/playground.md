---
title: WordPress Playground
description: Браузерные стенды WordPress, Blueprints, Playground CLI, Site Manager API и MCP для AI-агентов
icon: fa-brands fa-wordpress
category: Wordpress
tag: [WordPress, Playground, Blueprints, MCP, AI, Тестирование, CLI]
---

# WordPress Playground: быстрые стенды, тесты и AI-агенты

**WordPress Playground** запускает WordPress без обычного серверного окружения и подходит для быстрых демонстраций, воспроизведения ошибок, тестирования плагинов и тем, обучения и автоматизированных стендов.

В 2026 году Playground стал заметно полезнее именно как инструмент разработчика:

- интерфейс переработан вокруг нескольких сохраняемых сайтов, а не только одноразового экземпляра;
- появился отдельный полноценный Playground Handbook;
- Sites API позволяет создавать, перечислять, изменять и удалять сайты программно;
- Blueprints дают декларативное описание окружения;
- Playground CLI можно использовать локально и в автоматизации;
- официальный `@wp-playground/mcp` позволяет подключать Claude Code, Gemini CLI и другие MCP-клиенты к изолированному WordPress-стенду.

Это особенно удобно, когда нужно дать AI-агенту реальный WordPress для экспериментов, не пуская его сразу на рабочий сервер.

## Когда Playground полезнее обычного staging

Playground хорошо подходит для задач, где окружение должно создаваться быстро и быть расходным:

- проверить новый плагин;
- воспроизвести баг пользователя;
- сравнить несколько версий WordPress и PHP;
- показать демо без отдельного VPS;
- протестировать изменение темы;
- подготовить минимальный reproduction для issue;
- дать AI-агенту файловую систему и WordPress для безопасного эксперимента;
- автоматически создавать тестовые матрицы.

Обычный staging остается лучше, когда нужна точная копия production: настоящий Nginx/Apache, MySQL/MariaDB, cron, почта, CDN, object cache, ограничения хостинга и реальная сеть.

## Самый быстрый старт

Официальный веб-интерфейс:

- [WordPress Playground](https://wordpress.org/playground/)

Для одноразовой проверки это самый простой способ: окружение стартует в браузере без покупки сервера и ручной установки WordPress.

Для долгоживущих тестов полезно сохранять отдельные Playground-сайты и давать им понятные имена, например:

```text
wp-7.1-plugin-current
wp-7.1-plugin-next
wp-7.0-regression
php-8.3-theme-test
```

Так проще не смешивать разные эксперименты.

## Blueprints: окружение как JSON

Blueprint описывает, какой WordPress нужно поднять и что сделать после запуска.

Минимальный пример:

```json
{
  "preferredVersions": {
    "wp": "latest",
    "php": "8.3"
  },
  "login": true,
  "siteOptions": {
    "blogname": "SEO Recipes Playground"
  }
}
```

Blueprint может также:

- устанавливать плагины и темы;
- импортировать контент;
- менять site options;
- выполнять PHP;
- активировать нужные компоненты;
- включать дополнительные возможности;
- открывать нужную landing page.

Это лучше ручной инструкции вида «зайди в админку и десять раз нажми кнопку»: один JSON можно повторять локально, в браузере и в CI.

### Фиксируйте версии для воспроизводимости

Для диагностики бага лучше не использовать только `latest`.

Например, матрица может выглядеть так:

```text
WordPress 7.0 + PHP 8.2
WordPress 7.0 + PHP 8.3
WordPress 7.1 + PHP 8.2
WordPress 7.1 + PHP 8.3
```

Если проблема возникает только в одной комбинации, область поиска резко уменьшается.

## Playground CLI

Для локальной разработки есть официальный `@wp-playground/cli`.

Самый простой режим:

```bash
npx @wp-playground/cli@latest start
```

Полезные параметры:

```bash
npx @wp-playground/cli@latest start --wp=latest --php=8.3
```

С конкретным каталогом проекта:

```bash
npx @wp-playground/cli@latest start --path=./my-plugin --wp=latest --php=8.3
```

CLI имеет несколько верхнеуровневых режимов:

- `start` — упрощенный локальный запуск с автоматическим определением проекта;
- `server` — более низкоуровневый запуск с ручной конфигурацией;
- `run-blueprint` — выполнение Blueprint без постоянного web server;
- `build-snapshot` — сборка snapshot сайта на основе Blueprint.

Справка текущей версии:

```bash
npx @wp-playground/cli@latest start --help
```

Для новых workflow лучше использовать Playground CLI, а не строить автоматизацию вокруг старых локальных оберток.

## Пример test matrix

Предположим, нужно проверить плагин перед обновлением WordPress.

Создаем четыре независимых запуска:

```text
7.0 / PHP 8.2
7.0 / PHP 8.3
7.1 / PHP 8.2
7.1 / PHP 8.3
```

Для каждого окружения выполняем один и тот же сценарий:

1. поднять WordPress;
2. установить плагин;
3. импортировать небольшой fixture-контент;
4. активировать плагин;
5. открыть ключевые страницы;
6. выполнить smoke-тесты;
7. проверить PHP errors;
8. сохранить результат;
9. уничтожить стенд.

Такой сценарий можно сначала выполнять вручную, а затем перенести в скрипт через CLI/Sites API.

## Sites API: несколько сайтов программно

В веб-приложении Playground доступен Sites API через глобальный объект:

```js
window.playgroundSites
```

Он управляет сайтами, которые отображаются в панели Playgrounds: временными экземплярами, autosave, сохраненными браузерными сайтами и локальными каталогами.

Перед вызовами нужно дождаться появления API и его готовности.

Практический смысл — не конкретный синтаксис одного метода, а возможность построить собственную обертку:

```text
создать стенд
    ↓
присвоить ему имя
    ↓
загрузить Blueprint
    ↓
провести тест
    ↓
сохранить или удалить стенд
```

Это полезно для:

- support-инструмента «воспроизвести проблему клиента»;
- каталога интерактивных демо;
- генератора тестовых окружений для разных версий;
- собственного интерфейса поверх WordPress Playground.

Важно: Sites API относится к приложению `playground.wordpress.net`, а не является тем же API, что `@wp-playground/client` внутри любого произвольного embed.

## MCP: дать AI-агенту безопасный WordPress

В 2026 году появился официальный пакет:

```text
@wp-playground/mcp
```

Например, для Claude Code официальный пример подключения выглядит так:

```bash
claude mcp add --transport stdio --scope user wordpress-playground -- npx -y @wp-playground/mcp
```

После этого агент получает инструменты для нескольких классов задач.

### Управление сайтом

Например:

```text
playground_list_sites
playground_open_site
playground_rename_site
playground_save_site
```

### PHP и запросы

```text
playground_execute_php
playground_request
```

### Навигация

```text
playground_navigate
playground_get_current_url
playground_get_site_info
```

### Файлы

```text
playground_read_file
playground_write_file
playground_list_files
playground_mkdir
playground_delete_file
```

Для AI-разработки это намного безопаснее прямого доступа к production WordPress.

## Практический workflow для AI-агента

Хорошая схема:

```text
репозиторий плагина/темы
        ↓
Playground Blueprint
        ↓
одноразовый WordPress
        ↓
MCP → coding agent
        ↓
изменение файлов
        ↓
smoke-test / PHP execution / navigation
        ↓
проверка diff
        ↓
только после review → обычный PR
```

То есть агент может ломать тестовый WordPress сколько угодно, но доступ к production ему для этой задачи вообще не нужен.

### Какие правила дать агенту

Даже в песочнице полезно задать ограничения:

```text
- не изменять production;
- не использовать реальные API keys;
- не загружать production database с персональными данными;
- все изменения исходников делать в Git-ветке;
- после изменения запускать согласованный smoke-test;
- не считать браузерный Playground доказательством production performance;
- фиксировать версии WordPress/PHP/плагинов в отчете.
```

## Fixture-контент вместо production-базы

Для тестирования темы или SEO-плагина не обязательно импортировать полный рабочий сайт.

Лучше подготовить небольшой fixture-набор:

- обычная статья;
- длинная статья;
- страница;
- категории и теги;
- изображения;
- комментарии, если нужны;
- WooCommerce product только для ecommerce-тестов;
- нестандартные post types, если проект их использует.

Преимущества:

- быстрее запуск;
- нет персональных данных;
- тест воспроизводим;
- проще понять, какой кейс сломался.

## Проверка SEO-плагина через Playground

Пример сценария:

1. поднять чистый WordPress;
2. установить SEO-плагин;
3. создать fixture pages;
4. включить pretty permalinks;
5. проверить `<title>` и meta description;
6. проверить canonical;
7. проверить robots directives;
8. проверить sitemap;
9. проверить JSON-LD;
10. обновить WordPress/PHP и прогнать тот же набор снова.

Для HTML-проверок можно сравнивать ответы программно, а не глазами.

Например:

```bash
curl -fsSL http://localhost:9400/example/ | grep -i canonical
```

Конкретный порт зависит от параметров запуска CLI.

## Где Playground не заменяет реальный сервер

Официальная документация отдельно перечисляет ограничения Playground. Среди них:

- особенности сетевых запросов;
- ограничения persistence в браузере;
- iframe-особенности;
- не вся PHP/системная функциональность ведет себя как на обычном Linux-сервере;
- поддержка WP-CLI имеет особенности;
- browser storage нельзя считать полноценной production storage.

Поэтому Playground подходит для **функциональных** тестов, но не для вывода:

```text
этот хостинг выдержит 1000 RPS
```

или:

```text
этот плагин использует ровно столько же RAM на production
```

Для производительности и инфраструктуры нужен реальный staging/VPS.

## Что имеет смысл хранить в репозитории

Если проект регулярно использует Playground, стоит закоммитить:

```text
.playground/
  blueprints/
    minimal.json
    plugin-test.json
    regression.json
  fixtures/
  README.md
```

И в README записать:

- зачем нужен каждый Blueprint;
- версии окружений;
- команды запуска;
- expected result;
- ограничения теста.

Тогда reproduction можно передать другому разработчику или AI-агенту одной ссылкой на ветку.

## Минимальный чек-лист внедрения

- [ ] Попробовать проблемный плагин/тему в браузерном Playground.
- [ ] Сделать Blueprint для повторяемого окружения.
- [ ] Перенести регулярные локальные тесты на Playground CLI.
- [ ] Подготовить fixture-content без production-персональных данных.
- [ ] Для AI-разработки подключить официальный MCP к отдельному Playground.
- [ ] Проверять несколько комбинаций WordPress/PHP перед крупным обновлением.
- [ ] Не использовать Playground как замену нагрузочному тесту реального хостинга.

## Источники

- [WordPress Playground](https://wordpress.org/playground/)
- [Playground documentation](https://wordpress.github.io/wordpress-playground/)
- [Playground Developers Docs](https://wordpress.github.io/wordpress-playground/developers/)
- [Blueprints Docs](https://wordpress.github.io/wordpress-playground/blueprints/)
- [Sites API](https://wordpress.github.io/wordpress-playground/developers/apis/sites-api/)
- [Playground CLI](https://wordpress.github.io/wordpress-playground/developers/local-development/wp-playground-cli/)
- [WordPress Developer Blog: What's new for developers? August 2026](https://developer.wordpress.org/news/2026/08/whats-new-for-developers-august-2026/)
- [WordPress Developer Blog: What's new for developers? April 2026](https://developer.wordpress.org/news/2026/04/whats-new-for-developers-april-2026/)
