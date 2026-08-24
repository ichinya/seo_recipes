---
title: Chrome DevTools MCP — runtime-проверка сайта AI-агентом
description: "Как подключить Chrome DevTools MCP, обойти страницы или Storybook stories, найти console/network ошибки, исправить код и повторно проверить результат"
icon: fa-brands fa-chrome
category: Хостинг
tag: [Тестирование, Chrome, DevTools, MCP, AI, Storybook, VuePress, Runtime]
---

# Chrome DevTools MCP — runtime-проверка сайта AI-агентом

Успешный build ещё не означает, что сайт нормально работает в браузере. Ошибка может появиться только после hydration, загрузки данных, открытия конкретного route, запуска компонента или ответа внешнего API.

Chrome DevTools MCP подключает coding agent к реальному Chrome. Агент может открывать страницы, читать console, анализировать Network, выполнять действия и после исправления кода повторно проверять результат.

## Практический кейс CyberAgent

В опубликованном Chrome кейсе AI-агент примерно за час прошёл 32 компонента и 236 Storybook stories дизайн-системы Spindle. Он нашёл и исправил один runtime error и два warning, затем подтвердил, что остальные stories работают без этих проблем.

Ценность такого прогона не только в найденных ошибках. Агент механически проверяет большой список состояний, который человеку трудно пройти без пропусков.

## Что проверяет рецепт

- загрузку документа и основных UI-состояний;
- `console.error`, warnings и unhandled rejections;
- HTTP 4xx/5xx, CORS, mixed content и заблокированные запросы;
- переходы между routes;
- отдельные Storybook stories;
- результат после автоматического или ручного исправления;
- отсутствие новых ошибок после повторного прогона.

Это второй слой после build/unit/e2e tests, а не их замена.

## Требования

- актуальная LTS-версия Node.js и npm;
- текущая stable-версия Chrome;
- MCP-совместимый агент: Codex, Claude Code, Gemini CLI, Cursor, Copilot или другой клиент;
- локальный либо staging URL приложения.

## Установка

### Codex

```bash
codex mcp add chrome-devtools -- npx chrome-devtools-mcp@latest
```

### Gemini CLI

Расширение с MCP и skills:

```bash
gemini extensions install --auto-update https://github.com/ChromeDevTools/chrome-devtools-mcp
```

Только MCP server:

```bash
gemini mcp add chrome-devtools npx chrome-devtools-mcp@latest
```

### Claude Code

В Claude Code добавить marketplace и установить plugin:

```text
/plugin marketplace add ChromeDevTools/chrome-devtools-mcp
/plugin install chrome-devtools-mcp@chrome-devtools-plugins
```

### Универсальная JSON-конфигурация

Для клиентов с ключом `mcpServers`:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

Для повторяемого CI или командного процесса лучше закрепить проверенную версию package вместо `@latest`.

## Безопасный режим работы

Chrome DevTools MCP получает доступ к содержимому браузера и может действовать от имени активной web-сессии.

Перед прогоном:

1. используйте отдельный browser profile или чистую сессию;
2. не открывайте в ней почту, платежи, production admin и другие чувствительные вкладки;
3. начинайте с localhost или staging;
4. явно ограничьте scope в prompt;
5. для аудита без изменений напишите «не редактируй файлы и не выполняй write-actions»;
6. не передавайте production cookies агенту без отдельной необходимости и контроля.

Фраза в prompt — организационное ограничение, а не криптографический sandbox. Полномочия браузера и агента всё равно должны быть минимальными.

## Базовый workflow

### 1. Запустить приложение

Для SEO Recipes:

```bash
npm run docs:dev
```

Для Storybook обычно используется команда проекта, например:

```bash
npm run storybook
```

Сначала убедитесь, что URL открывается обычным браузером.

### 2. Определить полный список targets

Источник списка должен быть воспроизводимым:

- routes приложения;
- sitemap;
- ссылки из навигации;
- список Storybook stories;
- заранее подготовленный файл URL;
- изменённые страницы из PR.

Без списка агент может проверить только несколько заметных экранов и ошибочно назвать аудит полным.

### 3. Проверить каждую страницу

Для каждого target агент должен:

1. открыть URL;
2. дождаться стабильного состояния;
3. проверить, что основной контент отрисован;
4. собрать новые console errors и warnings;
5. проверить failed/blocked network requests;
6. выполнить минимальные действия сценария;
7. записать точный URL, шаги и сообщение ошибки.

### 4. Исправить и повторить

После изменения кода нужно заново открыть затронутую страницу и затем повторить весь smoke-набор. Иначе исправление одной story может сломать общий компонент в других состояниях.

### 5. Сохранить отчёт

Минимальная таблица:

| URL / story | Результат | Console | Network | Действие |
| --- | --- | --- | --- | --- |
| `/hosting/providers/` | OK | чисто | чисто | — |
| `/info/ai/example` | Ошибка | `TypeError...` | `GET /api/... 500` | исправлен handler |

Отдельно перечислите targets, которые не удалось проверить, и причину.

## Prompt для Storybook

```text
Storybook уже запущен локально.

Используй Chrome DevTools MCP и выполни полный runtime-аудит.

1. Найди все components и stories. Не ограничивайся открытыми или первыми в списке.
2. Открой каждую story и дождись её загрузки.
3. Проверь console errors, warnings, unhandled rejections и failed network requests.
4. Выполни очевидные безопасные интеракции: открыть dropdown/modal, переключить state, заполнить локальную форму без отправки наружу.
5. Для каждой проблемы запиши component, story, точный текст ошибки и шаги воспроизведения.
6. Исправь ошибки в коде.
7. Повторно проверь исправленные stories и затем весь набор.
8. В конце выдай таблицу: checked, clean, fixed, remaining, skipped.

Не изменяй публичные API компонентов без необходимости и не скрывай warning через отключение логирования.
```

Для режима только аудита замените пункты 6–7 на запрет редактирования и запрос рекомендаций.

## Prompt для SEO Recipes / VuePress

```text
Сайт VuePress запущен локально.

Используй Chrome DevTools MCP для runtime-проверки.

1. Собери внутренние ссылки из разделов /info/, /cookbook/ и /hosting/.
2. Открой каждую опубликованную страницу, а не только index-файлы.
3. Проверь загрузку основного контента, sidebar, внутренних ссылок и code blocks.
4. Для каждой страницы проверь console errors/warnings и Network 4xx/5xx/blocked requests.
5. Отдельно найди broken navigation, hydration errors и ошибки client-side scripts.
6. Не отправляй формы и не выполняй внешние write-actions.
7. Исправь ошибки проекта, затем повторно проверь затронутые страницы.
8. Выдай отчёт с точными URL и итоговым количеством проверенных страниц.
```

Такой прогон дополняет `npm run docs:build`: build ловит frontmatter и compile-time проблемы, а DevTools MCP проверяет уже работающий сайт в браузере.

## Audit-only prompt для production

```text
Проведи только read-only аудит указанного production URL через Chrome DevTools MCP.

Разрешено: открыть страницы, читать DOM, console и Network, выполнять безопасную навигацию.
Запрещено: редактировать файлы, отправлять формы, менять настройки, авторизовываться, создавать или удалять данные.

При любой неоднозначности останови действие и добавь его в список skipped.
```

Даже при таком prompt лучше использовать неавторизованную или тестовую сессию.

## Что смотреть в Console

- runtime exceptions;
- hydration mismatch;
- unhandled promise rejection;
- Vue/React warnings;
- deprecated API;
- CSP и mixed-content violations;
- ошибки сторонних widgets;
- повторяющийся warning, который маскирует реальные проблемы.

Не следует «исправлять» аудит простым отключением `console.warn` или фильтрацией сообщений.

## Что смотреть в Network

- HTTP 4xx/5xx;
- CORS и preflight failures;
- запросы, зависшие без ответа;
- redirect loops;
- неработающие assets/chunks;
- неверный content type;
- запросы к localhost из production;
- утечки секретов в URL/query string;
- внешние зависимости, блокирующие основной UI.

## Ограничения

- агентный прогон может быть недетерминированным;
- визуально похожее состояние не гарантирует правильную бизнес-логику;
- не все auth/payment flows безопасно автоматизировать;
- один Chrome не заменяет cross-browser tests;
- длинный список страниц требует явного учёта coverage;
- внешние API могут давать временные ошибки;
- performance trace нужно анализировать отдельно от обычного console-аудита.

## Как встроить в release process

1. Build и unit tests.
2. Обычные deterministic e2e tests.
3. Chrome DevTools MCP smoke-аудит изменённых routes/stories.
4. Периодический полный обход всего каталога.
5. Сохранение отчёта как PR artifact или комментария.
6. Ручная проверка high-risk сценариев.

Для CI закрепляйте версии Chrome/package, используйте тестовые аккаунты и не позволяйте агенту автоматически публиковать изменения без review.

## Источники

- [Chrome — Get started with Chrome DevTools for agents](https://developer.chrome.com/docs/devtools/agents/get-started)
- [Chrome — CyberAgent automated runtime error fixing](https://developer.chrome.com/blog/autofix-runtime-devtools-mcp)
- [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)
