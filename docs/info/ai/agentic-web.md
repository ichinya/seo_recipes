---
title: Agentic web — WebMCP, AEO и готовность сайта к AI-агентам
description: "Как сайты меняются для AI-агентов: WebMCP, Agent Readiness, Answer Engine Optimization, безопасность и практический план внедрения"
icon: fa-solid fa-robot
category: Нейросети
tag: [AI, агенты, WebMCP, MCP, AEO, Agent Readiness, Cloudflare, SEO]
---

# Agentic web — WebMCP, AEO и готовность сайта к AI-агентам

Поиск и обычный браузинг предполагают, что пользователь сначала видит страницу, затем сам читает, кликает и заполняет формы. AI-агент может работать иначе: найти ресурс, понять доступные действия и выполнить задачу от имени пользователя.

Для владельца сайта появляется новый уровень оптимизации:

```text
SEO
  ↓
страницу может найти поисковая система

AEO / generative discovery
  ↓
контент может быть использован в ответе или рекомендации

agent readiness
  ↓
агент может правильно понять интерфейс

WebMCP / tools
  ↓
агент может выполнить действие через структурированный инструмент
```

Эти уровни дополняют друг друга, а не заменяют обычное SEO.

## Почему тема стала практической в 2026 году

В августе 2026 года Cloudflare собрал несколько направлений в одну agentic-web модель:

- Agent Readiness — техническая оценка того, насколько сайт понятен агентам;
- Answer Engine Optimization (AEO) — наблюдение за тем, рекомендуют ли AI-ассистенты сайт;
- WebMCP — экспериментальный browser API, через который страница может явно предоставить агенту инструменты;
- agent-first browser инфраструктура и MCP-интеграции.

Параллельно WebMCP опубликован как Draft Community Group Report Web Machine Learning Community Group. Это ранняя стадия: API и реализация еще меняются, поэтому внедрение нужно делать через feature detection и с ожиданием будущих изменений.

## Что такое WebMCP

WebMCP позволяет web-приложению зарегистрировать JavaScript-tools, которые AI-агент может обнаружить и вызвать в текущей вкладке браузера.

Вместо:

```text
агент → screenshot/DOM → найти кнопку → кликнуть → угадать форму
```

становится возможным:

```text
агент → список tools → выбрать tool → передать структурированные аргументы → получить результат
```

Это особенно интересно для сайтов, где пользователь выполняет конкретные действия:

- поиск;
- фильтрация каталога;
- расчет стоимости;
- создание заявки;
- изменение настроек;
- добавление в корзину;
- бронирование;
- получение статуса;
- запуск диагностики.

## WebMCP и обычный MCP — разные уровни

Обычный Model Context Protocol обычно связывает AI-приложение с отдельным MCP server.

```text
AI host
   ↓
MCP client
   ↓
MCP server
   ↓
API / database / service
```

WebMCP работает непосредственно внутри web page / browser tab:

```text
browser agent
   ↓
document.modelContext
   ↓
JavaScript tool страницы
   ↓
существующий UI / frontend API
```

WebMCP не следует воспринимать как полный backend MCP server. Текущий draft ориентирован на browser tools.

## Текущее состояние API

На момент августа 2026 года WebMCP остается экспериментальным.

В актуальных материалах используется API уровня:

```js
document.modelContext.registerTool(...)
```

Для lifecycle tool рекомендуется `AbortSignal`.

Минимальная идея:

```js
if ('modelContext' in document) {
  const controller = new AbortController()

  document.modelContext.registerTool({
    name: 'search_articles',
    description: 'Ищет статьи по ключевым словам',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      },
      required: ['query']
    },
    execute: async ({ query }) => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      return response.json()
    }
  }, { signal: controller.signal })
}
```

Код выше нужно рассматривать как ранний пример: API стандарта еще эволюционирует.

## Feature detection обязателен

WebMCP пока нельзя считать универсально доступным browser API.

Поэтому сайт должен продолжать нормально работать без него:

```js
if (!document.modelContext) {
  // Обычный UI продолжает работать.
  return
}
```

WebMCP — дополнительный agent interface, а не причина ломать HTML/forms/API для людей.

## Cloudflare WebMCP

Cloudflare в developer preview предлагает добавлять WebMCP bridge на edge без изменения origin-кода.

Схема:

```text
origin HTML
   ↓
Cloudflare edge / HTMLRewriter
   ↓
добавляется bridge script
   ↓
браузерный агент видит WebMCP tools
```

В опубликованном примере Cloudflare добавляет script с `/.webmcp/bridge.js` и tool packs.

Это удобно для эксперимента, но важно учитывать:

- функция preview, а не стабильный production contract;
- Cloudflare становится частью agent-interface;
- tools нужно проверять так же тщательно, как API;
- нельзя предполагать, что автоматически сгенерированный tool безопасен только потому, что его добавил edge layer.

## Agent Readiness

Agent Readiness отвечает на технический вопрос:

> Может ли агент нормально прочитать и использовать сайт?

Это ближе к техническому аудиту, чем к ранжированию.

Типичные проблемы:

- критическая информация появляется только после сложной цепочки JS;
- кнопки имеют неясные названия;
- форма не имеет нормальных labels;
- контент разбит на декоративные элементы без семантики;
- важный endpoint невозможно вызвать без имитации множества кликов;
- сайт агрессивно блокирует весь машинный трафик;
- robots/WAF правила противоречат реальной бизнес-задаче;
- каталог имеет бесконечные URL variants;
- нет стабильных идентификаторов сущностей.

Многие исправления полезны одновременно людям, accessibility tools, поисковым системам и агентам.

## AEO — Answer Engine Optimization

Cloudflare использует термин AEO для оценки того, как AI assistants цитируют и рекомендуют сайт.

Их инструмент отправляет тематические запросы моделям и измеряет показатели вроде citation/recommendation rate.

К этому нужно относиться как к отдельному аналитическому сигналу, а не как к официальному фактору Google Search.

### Не смешивать AEO и Google SEO

Google отдельно пишет, что для AI features Search продолжают действовать обычные SEO best practices и не требуется специальная «AI-разметка».

Поэтому утверждение:

```text
AEO заменяет SEO
```

слишком сильное.

Более корректно:

```text
SEO → discoverability в поиске
AEO → discoverability/recommendation в answer engines
Agent readiness → способность агента использовать сайт
WebMCP → явный интерфейс действий для browser agent
```

## Практическая матрица технологий

| Механизм | Основная задача | Исполняет действия | Влияет на Google Search напрямую |
| --- | --- | --- | --- |
| `robots.txt` | управление crawler access | Нет | Может влиять на crawl |
| Schema.org | описание сущностей/контента | Нет | Используется поддерживаемыми Search features |
| sitemap | discovery/refresh URL | Нет | Да, как сигнал discovery |
| `llms.txt` | сторонний convention | Нет | Google Search его не использует |
| backend MCP | tools/resources/prompts для AI host | Да | Нет |
| WebMCP | tools текущей browser page | Да | Нет подтвержденного ranking эффекта |
| Preferred Sources | пользовательский выбор источника Google | Нет | Влияет на опыт конкретного пользователя |
| Agent Readiness | аудит пригодности сайта для агента | Нет | Не является Google ranking signal |
| AEO monitoring | наблюдение за рекомендациями моделей | Нет | Не является Google Search Console |

## Какой tool давать агенту

Плохой tool:

```text
name: do_stuff
input: arbitrary string
```

Хороший tool:

```text
name: search_hosting_providers
input:
  country: string
  max_price: number
  min_ram_gb: number
```

Хороший WebMCP tool должен иметь:

- узкое назначение;
- стабильное имя;
- понятное описание;
- строгую input schema;
- минимальный набор параметров;
- предсказуемый structured output;
- явное разделение read/write действий;
- ошибки, которые можно обработать программно.

## Read-only tools — лучший первый шаг

Начинать стоит с безопасных функций:

- поиск;
- чтение статуса;
- фильтрация;
- получение метаданных;
- расчет без сохранения;
- preview.

Например для SEO Recipes:

```text
search_articles(query)
get_hosting_provider(name)
compare_hosting_providers(names[])
find_recipe(topic)
get_recent_hosting_incidents(provider)
```

Это полезнее и безопаснее, чем сразу давать агенту write access.

## Опасные write tools

Следующие действия требуют отдельного threat model:

- удалить аккаунт;
- совершить платеж;
- изменить email;
- сменить пароль;
- удалить данные;
- опубликовать контент;
- отправить сообщение;
- сделать заказ;
- выполнить административную операцию.

Нельзя считать, что наличие AI-агента автоматически является согласием пользователя.

Для irreversible действий нужны дополнительные confirmation/authorization механизмы.

## Security checklist

### 1. Не хранить секреты в client-side tool

Плохо:

```js
const API_KEY = 'secret'
```

WebMCP выполняется в web context. Секреты должны оставаться на backend.

### 2. Проверять авторизацию на сервере

Если tool вызывает:

```text
POST /api/order
```

backend обязан проверить session/permissions так же, как для обычного UI.

### 3. Не доверять аргументам агента

Input schema помогает агенту, но не заменяет server-side validation.

### 4. Разделять read и write

Read-only tool можно дать широкому agent flow. Write tool должен иметь более жесткие guardrails.

### 5. Защищаться от prompt injection через контент

Страница может содержать пользовательский текст, комментарии и внешние данные. Нельзя превращать текст страницы в инструкции с привилегиями.

### 6. Audit log

Для write-action полезно сохранять:

- user/session;
- tool name;
- аргументы после редактирования чувствительных данных;
- результат;
- timestamp;
- confirmation state.

## WebMCP и accessibility

Хорошо спроектированная agent-interface часто заставляет владельца сайта лучше описать:

- сущности;
- действия;
- параметры;
- состояния;
- ошибки.

Это пересекается с accessibility и API design, но WebMCP не заменяет ARIA, семантический HTML и обычную доступность.

## Эксперимент для SEO Recipes

SEO Recipes — удобный сайт для безопасного read-only эксперимента.

### Этап 1. Baseline

Проверить, может ли агент без специальных tools:

1. найти карточку конкретного провайдера;
2. определить его категорию;
3. найти последний подтвержденный инцидент;
4. найти инструкцию по определенной серверной задаче;
5. сравнить два материала.

Зафиксировать:

- число шагов;
- число ошибок навигации;
- токены/время;
- корректность ответа;
- какие URL пришлось открыть.

### Этап 2. Read-only tools

Добавить экспериментальные tools:

```text
search_recipes
get_provider
get_provider_incidents
find_related_articles
```

### Этап 3. Повторить тест

Сравнить baseline и WebMCP flow.

Если agent получает тот же результат стабильнее и с меньшим количеством navigation steps — interface приносит практическую пользу.

## Что можно реализовать без Cloudflare

Если сайт не использует Cloudflare, можно экспериментировать с WebMCP напрямую в frontend-коде и поддерживаемом experimental browser.

Для production пока разумно считать WebMCP progressive enhancement:

```text
обычный HTML/UI/API — основной интерфейс
WebMCP — дополнительный experimental interface
```

## Что можно тестировать на Cloudflare

Если домен уже проксируется через Cloudflare, developer preview позволяет быстро проверить edge-injected WebMCP без изменения origin.

Перед включением стоит проверить:

- CSP;
- cache behavior;
- injected script;
- какие tools реально экспонируются;
- authorization;
- поведение без WebMCP browser support;
- rollback одним переключателем.

## Метрики agent-ready сайта

Нельзя сводить все к одному score.

Практический набор:

### Discoverability

- crawl доступность;
- sitemap;
- canonical;
- structured data;
- нормальная внутренняя перелинковка.

### Readability

- semantic HTML;
- текст доступен без screenshot OCR;
- понятные сущности и заголовки;
- стабильные URL.

### Actionability

- формы и действия имеют понятную семантику;
- есть API или tools;
- ошибки структурированы;
- write actions защищены.

### Observability

- crawler/agent traffic можно выделить;
- tool calls логируются;
- ошибки видны;
- можно сравнить human и agent flow.

## Что не стоит делать

### Не создавать скрытый «SEO-текст для агентов»

Если content отличается для людей и машин с целью манипуляции, возникают те же риски, что у обычного cloaking.

### Не добавлять бессмысленные tools

Tool только ради наличия WebMCP усложняет frontend и поверхность атаки.

### Не давать write access без confirmation

Особенно платежи, удаление и публикация.

### Не строить стратегию только на одном vendor score

Cloudflare Agent Readiness/AEO полезны как наблюдение, но web/AI ecosystem шире одного провайдера.

### Не путать WebMCP с ranking signal

Пока нет оснований писать, что наличие `document.modelContext` повышает позиции Google.

## Минимальный план внедрения

1. Выбрать 3–5 read-only сценариев.
2. Записать baseline agent flow.
3. Проверить semantic HTML и accessibility.
4. Определить JSON schemas tools.
5. Добавить WebMCP только через feature detection.
6. Не помещать секреты в frontend.
7. Проверить backend auth/validation.
8. Запустить тесты с агентным браузером.
9. Логировать tool calls.
10. Сравнить качество с baseline.
11. Оставить обычный UI полностью рабочим.
12. Перепроверять спецификацию при обновлениях browser API.

## Источники

- [WebMCP Draft Community Group Report](https://webmachinelearning.github.io/webmcp/)
- [Google Chrome modern web guidance — WebMCP](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/webmcp/webmcp/guide.md)
- [Cloudflare — Give any website a WebMCP interface](https://blog.cloudflare.com/webmcp/)
- [Cloudflare — From ranking to recommended: AEO and Agent Readiness](https://blog.cloudflare.com/aeo/)
- [Cloudflare Agents Week review](https://blog.cloudflare.com/agents-week-review-august-2026/)
- [Model Context Protocol specification](https://modelcontextprotocol.io/specification/2026-07-28)
