---
title: Управление доступом ботов ChatGPT, Claude и Google AI
icon: fa-solid fa-robot
category: Поисковые боты
tag: [боты, ChatGPT, Claude, Gemini, Google-CloudVertexBot, Google-Extended, robots.txt, htaccess]
---

# Управление доступом ботов ChatGPT, Claude и Google AI

У разных AI-сервисов разные механизмы доступа к сайту. Нельзя считать, что все названия из `robots.txt` являются реальными HTTP User-Agent строками.

Особенно важно различать:

- `GPTBot` и `ClaudeBot` — crawler'ы с HTTP User-Agent;
- `Google-CloudVertexBot` — crawler Google для Agent Search / Vertex AI сценариев;
- `Google-Extended` — product token для `robots.txt`, **без отдельной HTTP User-Agent строки**.

## robots.txt

Пример запрета:

```robots.txt
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-CloudVertexBot
Disallow: /

User-agent: Google-Extended
Disallow: /
```

Это четыре разных политики.

### Google-CloudVertexBot

Google представил `Google-CloudVertexBot` 20 августа 2026 года. Он обходит сайты по запросу владельца при построении Vertex AI / Agent Search.

Его правила **не влияют на Google Search**.

Подробнее: [Google-CloudVertexBot и Agent Search](../../info/google/google-cloudvertexbot.md).

### Google-Extended

`Google-Extended` — не отдельный HTTP crawler User-Agent. Google описывает его как product token для управления использованием контента некоторыми Gemini и Vertex AI сценариями.

Правило:

```robots.txt
User-agent: Google-Extended
Disallow: /
```

имеет смысл.

Но ловить строку `Google-Extended` в HTTP-заголовке через `.htaccess` или Nginx как будто это самостоятельный crawler — некорректная модель: Google не заявляет отдельного User-Agent с таким именем.

## Apache / .htaccess

Если нужна именно техническая HTTP-блокировка crawler'ов, фильтровать можно только реальные User-Agent строки.

```apacheconf
SetEnvIfNoCase User-Agent "GPTBot" bad_bot
SetEnvIfNoCase User-Agent "ClaudeBot" bad_bot
SetEnvIfNoCase User-Agent "Google-CloudVertexBot" bad_bot

<RequireAll>
    Require all granted
    Require not env bad_bot
</RequireAll>
```

`Google-Extended` здесь намеренно отсутствует.

Для старого Apache 2.2 синтаксис будет отличаться, но использовать устаревшие `Order Allow,Deny` без необходимости на современных конфигурациях не стоит.

## Nginx

```nginx
map $http_user_agent $blocked_ai_bot {
    default 0;
    ~*GPTBot 1;
    ~*ClaudeBot 1;
    ~*Google-CloudVertexBot 1;
}

server {
    if ($blocked_ai_bot) {
        return 403;
    }
}
```

`if` в Nginx для простого `return` допустим, но для сложной логики лучше использовать WAF, `map` и отдельные location/rules.

## robots.txt или HTTP 403

Это разные уровни контроля.

### robots.txt

Подходит для добросовестных crawler'ов:

- явно выражает политику владельца сайта;
- не требует обработки правила на каждом endpoint;
- проще сопровождать.

### Firewall / WAF / Nginx / Apache

Нужен, если запрос нужно технически отклонить независимо от поведения crawler'а.

Минусы:

- User-Agent легко подделать;
- неправильный regex может зацепить обычных пользователей;
- IP allowlist нужно поддерживать по официальным источникам;
- можно случайно заблокировать crawler, который нужен другому продукту.

## Не доверяйте одному User-Agent

Строка:

```text
Google-CloudVertexBot
```

не является аутентификацией. Злоумышленник может отправить такой же заголовок.

Если нужно подтвердить, что crawler действительно принадлежит Google, используйте официальную процедуру проверки crawler/fetcher и опубликованные Google IP ranges.

## Отдельная политика для Search, обучения и Agent Search

Пример:

```robots.txt
# Google Search разрешен
User-agent: Googlebot
Allow: /

# Использование через Google-Extended запрещено
User-agent: Google-Extended
Disallow: /

# Agent Search разрешен только для документации
User-agent: Google-CloudVertexBot
Allow: /docs/
Disallow: /
```

Такое разделение гораздо безопаснее правила «заблокировать весь Google AI».

## Sitemap и Agent Search

Есть отдельная ловушка: страницы для Agent Search обходит `Google-CloudVertexBot`, а sitemap Google Cloud забирает через `Googlebot`.

Если вы разрешили VertexBot, но запретили `Googlebot` доступ к sitemap, sitemap-based indexing/refresh не заработает как ожидается.

Подробнее: [Google-CloudVertexBot и Agent Search](../../info/google/google-cloudvertexbot.md).

## Что логировать

Перед блокировкой полезно хотя бы неделю посмотреть реальный трафик:

```bash
grep -Ei 'GPTBot|ClaudeBot|Google-CloudVertexBot' /var/log/nginx/access.log
```

Смотрите не только количество запросов, но и:

- какие URL обходятся;
- HTTP status;
- request time;
- переданный трафик;
- cache hit/miss;
- частоту повторного обхода.

Иногда правильнее ограничить конкретный раздел или rate limit, чем блокировать весь crawler.

## Источники

- [Google common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)
- [Google crawler overview](https://developers.google.com/crawling/docs/crawlers-fetchers/overview-google-crawlers)
- [Google Search documentation updates](https://developers.google.com/search/updates)
- [OpenAI GPTBot documentation](https://platform.openai.com/docs/bots)
- [Anthropic crawler documentation](https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)

Также смотрите [Поисковые боты OpenAI](./chatgpt_bot.md).
