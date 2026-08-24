---
title: Agentic web — WebMCP, AEO и готовность сайта к AI-агентам
description: "Как сайты меняются для AI-агентов: WebMCP, обнаружение и выполнение tools, cross-origin iframe, безопасность, Agent Readiness и AEO"
icon: fa-solid fa-robot
category: Нейросети
tag: [AI, агенты, WebMCP, MCP, AEO, Agent Readiness, Cloudflare, Chrome, SEO]
---

# Agentic web — WebMCP, AEO и готовность сайта к AI-агентам

Поиск и обычный браузинг предполагают, что пользователь видит страницу, читает текст, нажимает кнопки и заполняет формы. AI-агент может работать иначе: найти ресурс, обнаружить доступные действия и вызвать их как структурированные инструменты.

Для владельца сайта появляется несколько дополняющих друг друга уровней:

```text
SEO
  ↓
страницу может найти поисковая система

AEO / generative discovery
  ↓
контент может попасть в ответ или рекомендацию

agent readiness
  ↓
агент может правильно понять интерфейс

WebMCP / tools
  ↓
агент может выполнить действие через структурированный инструмент
```

WebMCP не заменяет HTML, API, accessibility или SEO. Пока это экспериментальный progressive enhancement для браузеров и агентов, которые поддерживают API.

## Что такое WebMCP

WebMCP позволяет web-приложению зарегистрировать JavaScript-tools в текущем документе. Совместимый браузерный агент может получить их список, изучить JSON Schema, вызвать подходящий tool и обработать результат.

Вместо хрупкой цепочки:

```text
агент → screenshot/DOM → найти кнопку → кликнуть → угадать форму
```

становится возможна более явная:

```text
агент → getTools() → выбрать tool → executeTool() → получить результат
```

Это полезно для поиска, фильтрации, расчётов, получения статуса, бронирования, корзины, заявок и других действий, которые уже существуют в web-интерфейсе.

## WebMCP и обычный MCP — разные уровни

Обычный Model Context Protocol обычно связывает AI-приложение с отдельным MCP server:

```text
AI host → MCP client → MCP server → API / database / service
```

WebMCP работает внутри открытой страницы:

```text
browser agent → document.modelContext → JavaScript tool страницы → frontend/backend API
```

WebMCP не следует считать заменой backend MCP server. Browser tool живёт в контексте страницы, зависит от её lifecycle и использует полномочия текущей web-сессии.

## Текущее состояние API

На август 2026 года WebMCP остаётся экспериментальным и меняется. Актуальная документация Chrome описывает не только `registerTool()`, но и:

- `getTools()` для обнаружения доступных инструментов;
- `executeTool()` для ручного вызова найденного tool;
- событие `toolchange`;
- отмену регистрации и выполнения через `AbortSignal`;
- cross-origin tools в iframe через Permissions Policy и списки разрешённых origins.

Поэтому production-код должен использовать feature detection и оставлять обычный UI полностью рабочим.

```js
if (!document.modelContext) {
  // Пользователь и сайт продолжают работать через обычный UI/API.
  return
}
```

## Регистрация read-only tool

Начинать лучше с чтения и расчётов без изменения состояния.

```js
if ('modelContext' in document) {
  const lifecycle = new AbortController()

  await document.modelContext.registerTool({
    name: 'search_articles',
    description: 'Ищет опубликованные статьи по ключевым словам',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          minLength: 2,
          maxLength: 200
        }
      },
      required: ['query'],
      additionalProperties: false
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: true
    },
    execute: async ({ query }, { signal }) => {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}`,
        { signal }
      )

      if (!response.ok) {
        throw new Error(`Search failed: HTTP ${response.status}`)
      }

      return JSON.stringify(await response.json())
    }
  }, { signal: lifecycle.signal })

  // При размонтировании компонента или смене страницы tool можно снять:
  // lifecycle.abort()
}
```

JSON Schema помогает агенту сформировать аргументы, но не заменяет server-side validation, rate limit и проверку прав.

## Lifecycle и отмена выполнения

У WebMCP два разных `AbortSignal`:

1. `signal` в options `registerTool()` управляет временем жизни зарегистрированного tool;
2. `signal`, переданный вторым аргументом в `execute`, сообщает, что пользователь или агент отменил конкретное выполнение.

Долгий `fetch`, stream или вычисление нужно связывать с signal выполнения, иначе отменённая операция продолжит расходовать ресурсы.

```js
execute: async ({ url }, { signal }) => {
  const response = await fetch(url, { signal })
  return response.text()
}
```

Начиная с Chrome 153, снятие регистрации tool не должно отменять и ломать уже запущенные executions. Это полезно для React/Vue/Angular-компонентов, которые могут размонтироваться во время выполнения. Но сам handler всё равно должен корректно обрабатывать отмену конкретного вызова.

## Обнаружение tools через getTools()

`getTools()` возвращает доступные вызывающему документу tools в алфавитном порядке.

```js
const tools = await document.modelContext.getTools()
const searchTool = tools.find(tool => tool.name === 'search_articles')

if (!searchTool) {
  throw new Error('search_articles is unavailable')
}
```

Обнаружение нужно выполнять динамически. Нельзя предполагать, что tool навсегда существует: его может зарегистрировать или снять компонент, iframe либо feature flag.

## Выполнение tool через executeTool()

В актуальном API аргументы передаются валидной JSON-строкой, а не обычным JavaScript-объектом.

```js
const controller = new AbortController()

const result = await document.modelContext.executeTool(
  searchTool,
  JSON.stringify({ query: 'WebMCP' }),
  { signal: controller.signal }
)

console.log(result)

// При необходимости:
// controller.abort()
```

Метод возвращает результат выполнения или `null`, если tool инициировал навигацию.

## Реакция на toolchange

Список инструментов может меняться после загрузки страницы. Например, пользователь вошёл в аккаунт, открыл карточку товара или iframe закончил инициализацию.

```js
async function refreshTools() {
  const tools = await document.modelContext.getTools()
  console.table(tools.map(({ name, origin }) => ({ name, origin })))
}

await refreshTools()

document.modelContext.addEventListener('toolchange', refreshTools)
```

Handler не должен автоматически выполнять новый tool. Событие означает только то, что список нужно перечитать.

## Cross-origin WebMCP в iframe

Cross-origin tools по умолчанию недоступны. Для доступа одновременно нужны три явных шага:

1. родитель делегирует iframe Permissions Policy через `allow="tools"`;
2. iframe регистрирует tool с `exposedTo` и точным origin родителя;
3. родитель запрашивает tools с `fromOrigins` и точным origin iframe.

Поддерживаются только secure origins.

### 1. Родительская страница подключает widget

```html
<iframe
  src="https://shop-widget.example/product/42"
  allow="tools"
  title="Остатки товара"
></iframe>
```

### 2. Widget предоставляет read-only tool

Код выполняется внутри `https://shop-widget.example`:

```js
const lifecycle = new AbortController()

await document.modelContext.registerTool({
  name: 'get_product_stock',
  description: 'Возвращает доступный остаток товара по productId',
  inputSchema: {
    type: 'object',
    properties: {
      productId: { type: 'string', minLength: 1, maxLength: 64 }
    },
    required: ['productId'],
    additionalProperties: false
  },
  annotations: {
    readOnlyHint: true,
    untrustedContentHint: true
  },
  execute: async ({ productId }, { signal }) => {
    const response = await fetch(
      `/api/products/${encodeURIComponent(productId)}/stock`,
      { signal, credentials: 'include' }
    )

    if (!response.ok) {
      throw new Error(`Stock API failed: HTTP ${response.status}`)
    }

    return JSON.stringify(await response.json())
  }
}, {
  signal: lifecycle.signal,
  exposedTo: ['https://catalog.example']
})
```

### 3. Родитель обнаруживает и вызывает tool

Код выполняется на `https://catalog.example`:

```js
const tools = await document.modelContext.getTools({
  fromOrigins: ['https://shop-widget.example']
})

const stockTool = tools.find(tool =>
  tool.name === 'get_product_stock' &&
  tool.origin === 'https://shop-widget.example'
)

if (!stockTool) {
  throw new Error('Trusted stock tool is unavailable')
}

const result = await document.modelContext.executeTool(
  stockTool,
  JSON.stringify({ productId: '42' })
```

`allow="tools"` не является разрешением всем внешним сайтам. И `exposedTo`, и `fromOrigins` должны содержать минимальные точные allowlists.

## Threat model для embedded widgets

Cross-origin WebMCP превращает embedded-компонент в программный интерфейс. Перед включением нужно отдельно проверить:

### Идентичность origin

Родитель должен проверять `tool.origin`, а iframe — публиковать tool только доверенным origins. Не выбирайте инструмент только по имени.

### Авторизацию на backend

Наличие tool не даёт новых прав. Backend обязан проверить session, tenant, роль и доступ к конкретной сущности так же, как при обычном HTTP-запросе.

### Недоверенный результат

Ответ iframe может содержать пользовательский контент или данные внешней системы. Его нельзя автоматически превращать в привилегированные инструкции для агента.

### Prompt injection

Текст товара, комментария, тикета или документа может пытаться управлять агентом. Контент нужно считать данными, а не системными инструкциями.

### Read/write separation

`get_product_stock` и `place_order` — разные уровни риска. Платёж, публикация, удаление и изменение аккаунта требуют отдельного подтверждения пользователя, idempotency и audit log.

### Отзыв доступа

При logout, смене tenant, закрытии widget или отключении feature flag нужно снимать регистрацию tool и обновлять доступный список.

## Какой tool давать агенту

Плохой интерфейс:

```text
name: do_stuff
input: arbitrary string
```

Более предсказуемый:

```text
name: search_hosting_providers
input:
  country: string
  max_price: number
  min_ram_gb: number
```

Хороший WebMCP tool имеет:

- узкое назначение и стабильное имя;
- понятное описание;
- строгую schema с `additionalProperties: false` там, где это уместно;
- минимальный набор параметров;
- структурированный результат;
- программно различимые ошибки;
- annotations, соответствующие реальному поведению;
- отдельные read и write операции.

## Read-only tools — лучший первый шаг

Для SEO Recipes безопасными кандидатами будут:

```text
search_articles(query)
get_hosting_provider(name)
compare_hosting_providers(names[])
find_recipe(topic)
get_recent_hosting_incidents(provider)
```

Они позволяют сравнить agent flow с обычной навигацией, не предоставляя право менять данные.

## Опасные write tools

Отдельного threat model требуют:

- платежи и заказы;
- смена email или пароля;
- удаление аккаунта или данных;
- публикация контента;
- отправка сообщений;
- административные действия.

Наличие AI-агента не является согласием пользователя. Для необратимых операций нужны confirmation, повторная проверка параметров, idempotency и серверный audit log.

## Security checklist

1. Не хранить секреты в client-side tool.
2. Проверять auth и permissions на сервере.
3. Валидировать аргументы повторно на backend.
4. Ограничивать origins точными allowlists.
5. Проверять `tool.origin` перед вызовом cross-origin tool.
6. Отделять read от write.
7. Передавать execution `signal` в долгие операции.
8. Не исполнять инструкции из недоверенного результата.
9. Логировать write calls без чувствительных данных.
10. Оставлять обычный UI и accessibility рабочими.

## Agent Readiness

Agent Readiness отвечает на технический вопрос: может ли агент нормально прочитать и использовать сайт?

Типичные проблемы:

- критическая информация появляется только после сложной цепочки JavaScript;
- кнопки и формы не имеют понятных labels;
- контент разбит на декоративные элементы без семантики;
- важное действие требует имитации множества кликов;
- robots/WAF правила противоречат бизнес-задаче;
- каталог создаёт бесконечные URL-варианты;
- у сущностей нет стабильных идентификаторов.

Многие исправления одновременно полезны людям, accessibility tools, поисковым системам и агентам.

## AEO — Answer Engine Optimization

AEO измеряет, как answer engines цитируют и рекомендуют сайт. Это отдельный аналитический слой, а не подтверждённый ranking factor Google Search.

```text
SEO → discoverability в поиске
AEO → discoverability/recommendation в answer engines
Agent Readiness → способность агента понять сайт
WebMCP → явный интерфейс действий в браузере
```

Наличие `document.modelContext` само по себе не даёт оснований ожидать рост позиций.

## Практическая матрица

| Механизм | Основная задача | Исполняет действия | Прямой ranking signal Google |
| --- | --- | --- | --- |
| `robots.txt` | управление crawler access | Нет | Может влиять на crawl |
| Schema.org | описание сущностей и контента | Нет | Используется поддерживаемыми Search features |
| sitemap | discovery и refresh URL | Нет | Сигнал discovery |
| `llms.txt` | сторонний convention | Нет | Google Search его не использует |
| backend MCP | tools/resources/prompts для AI host | Да | Нет |
| WebMCP | tools текущей browser page | Да | Не подтверждён |
| Agent Readiness | аудит пригодности сайта для агента | Нет | Нет |
| AEO monitoring | наблюдение за ответами моделей | Нет | Нет |

## Cloudflare WebMCP

Cloudflare в developer preview предлагает добавлять WebMCP bridge на edge без изменения origin-кода:

```text
origin HTML → Cloudflare edge / HTMLRewriter → bridge script → WebMCP tools
```

Это удобно для эксперимента, но edge-generated tool нужно проверять так же тщательно, как вручную написанный API. Перед включением проверяют CSP, cache behavior, injected script, auth, набор tools, fallback без WebMCP и быстрый rollback.

## WebMCP и accessibility

WebMCP не заменяет semantic HTML, ARIA, labels, keyboard navigation и обычные формы. Пользователь не должен зависеть от наличия AI-агента, чтобы выполнить основную задачу.

## Эксперимент для SEO Recipes

### Этап 1. Baseline

Без специальных tools попросить агента:

1. найти карточку провайдера;
2. определить его категорию;
3. найти последний подтверждённый инцидент;
4. найти серверную инструкцию;
5. сравнить два материала.

Зафиксировать число шагов, ошибки навигации, время, токены, точность и открытые URL.

### Этап 2. Read-only tools

Добавить 3–5 инструментов поиска и чтения. Для каждого определить schema, результат, ошибки и логирование.

### Этап 3. Повторный тест

Сравнить baseline и WebMCP flow на одинаковых задачах. Польза есть, если агент получает тот же корректный результат стабильнее и с меньшим числом navigation steps.

Для runtime-проверки страницы и console/network ошибок можно использовать отдельный рецепт [Chrome DevTools MCP](../../hosting/testing/chrome-devtools-mcp.md).

## Метрики agent-ready сайта

### Discoverability

- crawl-доступность;
- sitemap и canonical;
- structured data;
- внутренняя перелинковка.

### Readability

- semantic HTML;
- текст доступен без screenshot OCR;
- понятные заголовки и сущности;
- стабильные URL.

### Actionability

- формы имеют семантику;
- API/tools узкие и предсказуемые;
- ошибки структурированы;
- write actions защищены.

### Observability

- crawler/agent traffic можно выделить;
- tool calls логируются;
- ошибки видны;
- human и agent flow можно сравнить.

## Что не стоит делать

- создавать скрытый «SEO-текст для агентов»;
- добавлять tools без полезного сценария;
- давать write access без подтверждения;
- доверять cross-origin tool только по имени;
- считать vendor score универсальной оценкой;
- путать WebMCP с ranking signal;
- ломать обычный UI ради экспериментального API.

## Минимальный план внедрения

1. Выбрать 3–5 read-only сценариев.
2. Записать baseline agent flow.
3. Проверить semantic HTML и accessibility.
4. Определить JSON Schemas и structured output.
5. Добавить feature detection.
6. Связать lifecycle и execution с `AbortSignal`.
7. Для iframe определить точные `exposedTo` и `fromOrigins`.
8. Проверить backend auth, validation и rate limit.
9. Прогнать runtime-тест с агентным браузером.
10. Логировать tool calls и ошибки.
11. Сравнить результат с baseline.
12. Перепроверять API при новых версиях Chrome.

## Источники

- [Chrome — WebMCP Imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [Chrome — WebMCP security considerations](https://developer.chrome.com/docs/ai/webmcp/security)
- [WebMCP Draft Community Group Report](https://webmachinelearning.github.io/webmcp/)
- [Cloudflare — Give any website a WebMCP interface](https://blog.cloudflare.com/webmcp/)
- [Cloudflare — From ranking to recommended: AEO and Agent Readiness](https://blog.cloudflare.com/aeo/)
- [Model Context Protocol specification](https://modelcontextprotocol.io/specification/2026-07-28)
