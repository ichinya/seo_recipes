---
title: "WordPress 7.2: developer preview, WebMCP и изменения Gutenberg"
description: "Что уже стоит проверить разработчикам до WordPress 7.2: WebMCP в Playground, runnable examples, DataViews, InnerBlocks templates и Site Editor v2"
icon: fa-brands fa-wordpress
category: Wordpress
tag: [WordPress, Gutenberg, Playground, WebMCP, AI, Plugins, Themes, "7.2"]
---

# WordPress 7.2: developer preview, WebMCP и изменения Gutenberg

По состоянию на **13 сентября 2026 года** WordPress 7.2 ещё находится в разработке. Beta 1 ожидается **20–22 октября**, финальный релиз — ориентировочно **8–10 декабря 2026 года**.

Поэтому этот материал — не Field Guide и не окончательный список изменений. Это ранний checklist того, что уже появилось в Gutenberg и Playground и что имеет смысл проверить разработчикам плагинов и тем заранее.

## Что уже заслуживает проверки

Наиболее практичные изменения из сентябрьского developer roundup:

- WordPress Code Reference получил runnable PHP examples на базе Playground;
- block variations и transforms могут объявлять keyboard shortcuts;
- Site Editor v2 становится обязательной точкой для новых расширений редактора;
- `@wordpress/dataviews` избавляется от private APIs;
- templates для inner blocks переносятся в block type settings;
- Playground получил поддержку WebMCP;
- Playground теперь удобнее использовать для regression-testing старых WordPress-релизов.

## Runnable examples в Code Reference

WordPress начал запускать некоторые примеры документации прямо в браузере через Playground.

Для таких примеров в PHP DocBlock используется fenced block:

```text
```php interactive
// пример
```
```

Пользователь может нажать `Run`, а код выполняется в реальном WordPress-окружении внутри Playground.

Практическая ценность для собственных проектов — хороший референс для документации плагинов и внутренних cookbook: пример можно превращать из статичного фрагмента в воспроизводимый тестовый стенд.

### Что можно перенять в SEO Recipes

Для части WordPress-рецептов можно позже добавить кнопку вроде:

```text
Запустить в WordPress Playground
```

Особенно хорошо подходят примеры, которые:

- не требуют секретов;
- не зависят от внешней инфраструктуры;
- работают на чистом WordPress;
- можно описать Blueprint;
- не требуют production-данных.

## InnerBlocks templates переезжают в block settings

В Gutenberg 23.8 `template` и `templateInsertUpdatesSelection` добавлены как настройки block type.

Новый подход:

```js
registerBlockType( 'example/list', {
    template: [ [ 'core/list-item' ] ],
    templateInsertUpdatesSelection: true,
} );
```

Раньше эти параметры часто передавались через `<InnerBlocks>`.

Старый путь пока работает, но помечается deprecated. Причина изменения связана в том числе с real-time collaboration: шаблон блока должен применяться как часть одной операции создания, а не после mount независимо на каждом подключённом клиенте.

### Что проверить в собственных блоках

Найдите использование:

```text
<InnerBlocks template=
<InnerBlocks templateInsertUpdatesSelection=
```

и проверьте миграцию до выхода 7.2.

## DataViews становится безопаснее для plugin dependencies

`@wordpress/dataviews` постепенно избавляется от private APIs.

Это важно для плагинов, которые bundle-ят собственную копию пакета: private API machinery могла приводить к конфликтам между двумя экземплярами зависимостей в одном runtime.

Часть компонентов переносится в публичные пакеты WordPress, например `@wordpress/ui` и `@wordpress/keycodes`.

Практический checklist:

- проверить собственные imports из `@wordpress/dataviews`;
- найти использование private APIs;
- обновить lockfile на тестовой ветке;
- проверить editor bundle на duplicate packages;
- прогнать UI-тесты с Gutenberg 23.8/23.9 и trunk.

## Keyboard shortcuts для block variations и transforms

Gutenberg 23.9 добавляет декларативный API для shortcuts.

Для variation используется `shortcut`, для transforms — `shortcuts`.

Это позволяет плагину объявлять клавиатурное действие рядом с самой variation/transform вместо отдельной приватной реализации внутри editor UI.

Перед использованием стоит проверить:

- конфликт с core shortcuts;
- локализованное описание;
- работу в разных редакторах;
- accessibility и discoverability;
- поведение при нескольких variations одного типа.

## Site Editor v2: расширения должны учитывать новый редактор

Работа над extensible Site Editor продолжается. В сентябрьском roundup WordPress отдельно подчёркивает: новые Site Editor features должны также поддерживать extensible Site Editor.

Если плагин добавляет собственные страницы, panels, routes или editor integration, тест только на старой реализации уже недостаточен.

Минимальная тестовая матрица:

```text
WordPress current stable
WordPress trunk
latest Gutenberg
Site Editor v2 / experimental path, если feature его затрагивает
```

## Playground получил WebMCP

**5 сентября 2026 года** команда WordPress Playground описала интеграцию WebMCP.

WebMCP — draft browser API, через который веб-приложение может объявлять структурированные tools для AI-агента прямо внутри browser session.

Это отличается от обычного MCP:

```text
MCP
AI client → локальный/удалённый MCP server → Playground

WebMCP
AI agent/browser → tools открытой веб-страницы → Playground
```

Playground поддерживает оба сценария.

## Зачем Playground нужен proxy

WordPress внутри Playground работает в nested iframe. Если plugin регистрирует tool внутри WordPress, агент верхнего уровня может его не увидеть.

Playground добавил proxy, который:

1. обнаруживает tools внутри встроенного WordPress;
2. объявляет их на внешней Playground page;
3. передаёт вызов внутрь iframe;
4. возвращает результат обратно агенту.

При этом **WordPress Ability сама по себе не становится WebMCP tool автоматически**. Плагин должен явно обернуть нужное действие в WebMCP tool.

## Какие tools уже есть у Playground

Официальная публикация перечисляет несколько групп встроенных tools.

### Управление сайтом

```text
playground_get_website_url
playground_list_sites
playground_rename_site
playground_save_in_browser
```

### PHP и HTTP requests

```text
playground_execute_php
playground_request
```

### Навигация и информация

```text
playground_navigate
playground_get_current_url
playground_get_site_info
```

### Filesystem

```text
playground_read_file
playground_write_file
playground_list_files
playground_mkdir
playground_delete_file
playground_delete_directory
playground_file_exists
```

Список может меняться, поэтому для автоматизации нужно сверяться с текущей документацией и registration code.

## Практический сценарий для plugin development

Для AI-разработки можно использовать безопасный цикл:

```text
plugin repository
      ↓
Playground / Blueprint
      ↓
одноразовый WordPress
      ↓
WebMCP или MCP
      ↓
AI agent выполняет ограниченные действия
      ↓
smoke/regression tests
      ↓
review git diff
```

Это лучше прямого доступа агента к production WordPress.

## Что протестировать до Beta 1

- [ ] Плагин запускается на WordPress trunk.
- [ ] Проверены Gutenberg 23.8 и 23.9.
- [ ] Нет зависимости от deprecated `InnerBlocks` template props там, где можно перейти на block settings.
- [ ] Проверены imports DataViews и private APIs.
- [ ] Site Editor extensions протестированы с новой архитектурой редактора.
- [ ] Keyboard shortcuts не конфликтуют с core/editor shortcuts.
- [ ] Для AI-интеграций определено, нужен MCP, WebMCP или оба варианта.
- [ ] WebMCP tools не предоставляют агенту избыточные destructive operations.
- [ ] Playground используется как функциональный sandbox, а не как доказательство production performance.
- [ ] После Beta 1 материал сверяется с официальным Field Guide и Dev Notes.

## Связанные материалы

- [WordPress Playground](./playground.md)
- [WordPress 7.0 и 7.1](./wordpress-7-0-7-1.md)

## Источники

- [WordPress Developer Blog — What’s new for developers? September 2026](https://developer.wordpress.org/news/2026/09/whats-new-for-developers-september-2026/)
- [WordPress Playground — WordPress Playground and WebMCP](https://make.wordpress.org/playground/2026/09/05/wordpress-playground-and-webmcp-bringing-ai-agents-into-your-browser-workflow/)
