---
title: Google Developer Knowledge API и MCP — первоисточники для AI-агентов
description: "Как подключить Developer Knowledge MCP или API, искать официальную документацию Google, фильтровать результаты по relevanceScore и проверять ответы по исходным страницам"
icon: fa-brands fa-google
category: Нейросети
tag: [AI, MCP, Google, Developer Knowledge, API, Grounding, Документация]
---

# Google Developer Knowledge API и MCP — первоисточники для AI-агентов

Обычный web search смешивает официальную документацию, старые статьи, форумы и пересказы. Google Developer Knowledge предоставляет отдельный corpus публичной developer-документации и два способа доступа:

- REST/API для программного поиска и получения Markdown-документов;
- remote MCP server для coding/research agents.

Это удобно, когда агент должен сначала проверить первоисточник по Google Cloud, Chrome, Firebase, Android, Maps и другим технологиям, а затем писать код или материал.

## Что изменилось в 2026 году

- 16 апреля Developer Knowledge API и MCP server стали GA;
- 17 июля endpoint `AnswerQuery` стал GA;
- 18 августа появились команды `gcloud alpha developer-knowledge`;
- 21 августа поле `relevance_score` появилось в стабильном v1 API.

В REST JSON поле называется `relevanceScore` и имеет диапазон `0.0–1.0`: большее значение означает более высокую релевантность chunk поисковому запросу.

## Что находится в corpus

Corpus включает публичные страницы поддерживаемых developer-доменов, среди которых Google Cloud, Firebase, Android, Chrome, web.dev, Maps и другие источники из официального списка.

Важно понимать ограничения:

- результаты пока только на английском;
- GitHub, сторонние OSS-сайты, блоги и YouTube не входят в corpus;
- наличие страницы в интернете не гарантирует её наличие в Developer Knowledge;
- `updateTime` помогает оценить свежесть записи, но не отменяет проверку исходного URL;
- это специализированный источник, а не замена всему web search.

## API, MCP и обычный web search

| Способ | Когда использовать | Что возвращает | Контроль |
| --- | --- | --- | --- |
| Web search | новости, сторонние кейсы, обсуждения, продукты вне corpus | страницы из разных источников | нужен ручной отбор доверия |
| `SearchDocumentChunks` / `search_documents` | найти релевантные фрагменты официальной документации | chunks, metadata, `parent`, URL, score | высокий контроль источника |
| `GetDocument` / `get_documents` | прочитать полную страницу после поиска | полный Markdown и metadata | расходует больше context |
| `AnswerQuery` / `answer_query` | получить синтезированный grounded answer | ответ с references/citations | нужно проверить ссылки и цитаты |

Для подготовки технической статьи обычно лучше начинать с chunks, затем получать только нужные полные документы.

## Подготовка Google Cloud project

Задайте project и включите API:

```bash
export PROJECT_ID="your-project-id"

gcloud services enable developerknowledge.googleapis.com \
  --project="$PROJECT_ID"
```

После 17 марта 2026 года remote MCP server должен включаться вместе с API. Если для проекта это не произошло, официальный guide предлагает отдельную команду:

```bash
gcloud beta services mcp enable developerknowledge.googleapis.com \
  --project="$PROJECT_ID"
```

Для REST или MCP через API key создайте отдельный key, ограничьте его Developer Knowledge API и не сохраняйте значение в Git.

```bash
export DEVELOPERKNOWLEDGE_API_KEY="YOUR_API_KEY"
```

## Поиск chunks через REST

Пример поиска материалов Chrome только в `developer.chrome.com`:

```bash
curl -G "https://developerknowledge.googleapis.com/v1/documents:searchDocumentChunks" \
  --data-urlencode "query=Chrome WebMCP executeTool" \
  --data-urlencode 'filter=data_source = "developer.chrome.com"' \
  --data-urlencode "pageSize=10" \
  --data-urlencode "key=$DEVELOPERKNOWLEDGE_API_KEY"
```

Результат содержит:

- `parent` — resource name полного документа;
- `id` — идентификатор chunk;
- `content` — найденный фрагмент;
- `document.title` и `document.uri`;
- `document.dataSource` и `document.updateTime`;
- `relevanceScore` — относительную релевантность запросу.

## Как использовать relevanceScore

Score полезен для сортировки и отсечения слабых совпадений, но не является оценкой истинности или качества всей страницы.

Пример локальной эвристики:

```bash
curl -sG "https://developerknowledge.googleapis.com/v1/documents:searchDocumentChunks" \
  --data-urlencode "query=Chrome WebMCP executeTool" \
  --data-urlencode 'filter=data_source = "developer.chrome.com"' \
  --data-urlencode "pageSize=20" \
  --data-urlencode "key=$DEVELOPERKNOWLEDGE_API_KEY" \
| jq '.results[]
    | select(.relevanceScore >= 0.75)
    | {
        score: .relevanceScore,
        title: .document.title,
        uri: .document.uri,
        updated: .document.updateTime,
        parent
      }'
```

Порог `0.75` — пример для конкретного pipeline, а не правило Google. Его нужно подбирать по своим запросам и не использовать как единственное условие.

## Фильтры

`SearchDocumentChunks` поддерживает строгие фильтры по metadata родительского документа:

- `data_source`;
- `update_time`;
- `uri`;
- `content_length_bytes`.

Пример нескольких официальных web-источников и ограничения по дате:

```bash
curl -G "https://developerknowledge.googleapis.com/v1/documents:searchDocumentChunks" \
  --data-urlencode "query=service worker" \
  --data-urlencode 'filter=(data_source = "developer.chrome.com" OR data_source = "web.dev") AND update_time >= "2026-01-01T00:00:00Z"' \
  --data-urlencode "key=$DEVELOPERKNOWLEDGE_API_KEY"
```

Фильтр ограничивает corpus, а текстовый `query` определяет релевантность внутри него.

## Получение полного документа

Возьмите `parent` из результата, например:

```text
documents/developer.chrome.com/docs/ai/webmcp/imperative-api
```

И передайте его в path:

```bash
PARENT="documents/developer.chrome.com/docs/ai/webmcp/imperative-api"

curl "https://developerknowledge.googleapis.com/v1/${PARENT}?key=$DEVELOPERKNOWLEDGE_API_KEY"
```

Полный `content` приходит в Markdown. Для экономии bandwidth/context можно запросить только metadata:

```bash
curl "https://developerknowledge.googleapis.com/v1/${PARENT}?view=DOCUMENT_VIEW_BASIC&key=$DEVELOPERKNOWLEDGE_API_KEY"
```

Batch endpoint получает до 20 документов, но не следует без необходимости загружать в LLM все найденные страницы.

## Подключение remote MCP

Endpoint:

```text
https://developerknowledge.googleapis.com/mcp
```

### Claude Code

```bash
claude mcp add google-dev-knowledge \
  --transport http \
  https://developerknowledge.googleapis.com/mcp \
  --header "X-Goog-Api-Key: YOUR_API_KEY"
```

### Cursor

`.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "google-developer-knowledge": {
      "url": "https://developerknowledge.googleapis.com/mcp",
      "headers": {
        "X-Goog-Api-Key": "YOUR_API_KEY"
      }
    }
  }
}
```

Не коммитьте реальный key. Способ подстановки environment variable зависит от конкретного MCP client.

## MCP tools

Remote server предоставляет:

- `search_documents` — ищет chunks и возвращает `parent`;
- `get_documents` — получает полное содержимое нескольких документов;
- `answer_query` — формирует grounded answer; в MCP reference инструмент пока отмечен как Preview.

`AnswerQuery` API endpoint уже GA, но статус конкретного MCP tool нужно проверять отдельно.

Проверочный prompt:

```text
Найди в Google Developer Knowledge официальную документацию о Chrome WebMCP executeTool.
Сначала используй search_documents, покажи title, URL, update time и relevance score.
Полный документ получи только для двух самых релевантных результатов.
Не используй сторонние источники до завершения этого шага.
```

## gcloud alpha

С 18 августа 2026 года доступны команды:

```bash
gcloud alpha developer-knowledge answer-query --help
gcloud alpha developer-knowledge documents describe --help
gcloud alpha developer-knowledge documents search-chunks --help
```

Команды относятся к alpha-компоненту и могут менять flags. Перед автоматизацией стоит проверять встроенный `--help` установленной версии gcloud и закреплять ожидаемый формат вывода.

## Pipeline для SEO Recipes

Практическая последовательность:

```text
технический вопрос
  ↓
search_documents / SearchDocumentChunks
  ↓
убрать слабые и нерелевантные chunks
  ↓
проверить title, URL, dataSource, updateTime
  ↓
get_documents только для нужных страниц
  ↓
составить черновик со ссылками на первоисточники
  ↓
дополнить web search новостями и сторонними кейсами
  ↓
финально перепроверить утверждения по исходным страницам
```

Для материалов про Chrome, Google Cloud или Firebase это снижает риск сослаться на старый пересказ вместо текущей документации.

## Пример policy для research agent

```text
При вопросах о технологиях Google:

1. Сначала используй Google Developer Knowledge.
2. Предпочитай SearchDocumentChunks/search_documents прямому answer_query, если нужны точные формулировки.
3. Не загружай полные документы без необходимости.
4. Отбрасывай результаты с неподходящим dataSource даже при высоком score.
5. Указывай исходный URL и updateTime.
6. Считай relevanceScore сигналом ранжирования, а не доказательством корректности.
7. После официального corpus используй web search для новостей, GitHub issues и сторонних кейсов.
```

## Ограничения и безопасность

- ограничивайте API key конкретным API;
- не храните key в репозитории или prompt history;
- учитывайте quotas и HTTP 429;
- запрашивайте конкретные темы, иначе полные документы быстро заполняют context window;
- результаты только на английском;
- corpus не содержит все источники;
- `updateTime` относится к записи документа и не гарантирует, что каждая деталь страницы новая;
- generated answer всё равно проверяется по references;
- для сторонних библиотек нужен отдельный поиск в официальном repo/docs.

## Источники

- [Developer Knowledge release notes](https://developers.google.com/knowledge/release-notes)
- [Connect to the Developer Knowledge MCP server](https://developers.google.com/knowledge/mcp)
- [Search and retrieve documents](https://developers.google.com/knowledge/howto)
- [Developer Knowledge corpus reference](https://developers.google.com/knowledge/corpus)
- [MCP tools reference](https://developers.google.com/knowledge/reference/mcp)
- [Developer Knowledge REST API](https://developers.google.com/knowledge/reference/rest)
