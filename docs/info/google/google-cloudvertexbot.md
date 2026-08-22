---
title: Google-CloudVertexBot и Agent Search
description: Как работает новый crawler Google для Vertex AI Agent Search, как управлять им через robots.txt и почему для sitemap нужен отдельный доступ Googlebot
icon: fa-brands fa-google
category: Google
tag: [Google, Google-CloudVertexBot, Vertex AI, Agent Search, robots.txt, боты, AI]
---

# Google-CloudVertexBot и Agent Search

20 августа 2026 года Google добавил `Google-CloudVertexBot` в официальный список crawler'ов. Он используется не обычным Google Search, а когда владелец сайта или приложения просит Google обходить сайт для построения Vertex AI / Agent Search.

Это важное отличие: появление `Google-CloudVertexBot` в логах само по себе не означает изменение индекса Google Search и не связано напрямую с ранжированием.

## Коротко

| Что | Значение |
| --- | --- |
| User-Agent token | `Google-CloudVertexBot` |
| Управление через `robots.txt` | Да |
| Обычный Google Search | Не затрагивается |
| Основной сценарий | Индексация сайта для Agent Search по запросу владельца |
| Sitemap в Agent Search | Забирает обычный `Googlebot` |
| Google-Extended | Отдельный product token, не тот же механизм |

## Базовый robots.txt

Разрешить обход:

```robots.txt
User-agent: Google-CloudVertexBot
Allow: /
```

Закрыть весь сайт:

```robots.txt
User-agent: Google-CloudVertexBot
Disallow: /
```

Разрешить только определенный раздел:

```robots.txt
User-agent: Google-CloudVertexBot
Allow: /docs/
Disallow: /
```

Google приводит аналогичный пример с выборочным доступом к разделам сайта.

## Самый неочевидный момент: страницы и sitemap забирают разные crawler'ы

Для Agent Search Google использует два разных механизма:

```text
страницы сайта
    ↓
Google-CloudVertexBot

sitemap.xml
    ↓
Googlebot
```

Поэтому конфигурация вроде этой может работать не так, как ожидается:

```robots.txt
User-agent: Google-CloudVertexBot
Allow: /

User-agent: Googlebot
Disallow: /
```

Страницы могут быть доступны `Google-CloudVertexBot`, но Agent Search не сможет забрать sitemap через `Googlebot`.

Если для конкретного проекта нужен sitemap-based refresh в Agent Search, нужно разрешить доступ обоим механизмам хотя бы к требуемым URL.

Например:

```robots.txt
User-agent: Google-CloudVertexBot
Allow: /

User-agent: Googlebot
Allow: /sitemap.xml
```

Но при составлении правил нужно учитывать обычный Google Search: `Googlebot` используется не только Agent Search.

## Google-CloudVertexBot, Googlebot и Google-Extended — это не одно и то же

### Google-CloudVertexBot

Реальный crawler с собственным User-Agent token. Его можно увидеть в HTTP access log и отдельно разрешать или блокировать в `robots.txt`.

### Googlebot

Основной crawler Google. Он используется Google Search и в Agent Search может отдельно забирать sitemap.

### Google-Extended

`Google-Extended` — product token для управления использованием контента некоторыми Gemini/Vertex AI сценариями. У него **нет отдельной строки HTTP User-Agent**.

Поэтому такое правило имеет смысл:

```robots.txt
User-agent: Google-Extended
Disallow: /
```

А попытка заблокировать HTTP-запросы поиском строки `Google-Extended` в заголовке User-Agent обычно не делает того, что ожидается: отдельного crawler User-Agent с этой строкой Google не заявляет.

## Пример раздельной политики

Допустим, сайт хочет:

- оставаться доступным Google Search;
- не отдавать данные через Google-Extended;
- разрешить Agent Search только для `/docs/`.

```robots.txt
User-agent: Googlebot
Allow: /

User-agent: Google-Extended
Disallow: /

User-agent: Google-CloudVertexBot
Allow: /docs/
Disallow: /
```

Это три разных решения, и их не следует объединять в один переключатель «разрешить/запретить Google AI».

## CDN и WAF

`robots.txt` — рекомендация crawler'у, а не firewall. Если нужен технический запрет на уровне сервера, CDN или WAF, можно фильтровать реальный `Google-CloudVertexBot` по HTTP User-Agent.

Но User-Agent легко подделать. Если важно убедиться, что запрос действительно пришел от инфраструктуры Google, используйте официальную процедуру верификации crawler/fetcher, а не только строковое сравнение.

Не стоит строить allowlist вида:

```text
UA содержит Google-CloudVertexBot → доверять всему запросу
```

Для чувствительных endpoint'ов User-Agent никогда не является аутентификацией.

## Nginx: наблюдение, а не слепая блокировка

Для начала удобнее вынести crawler в отдельную метрику или лог.

```nginx
map $http_user_agent $is_vertex_bot {
    default 0;
    ~*Google-CloudVertexBot 1;
}
```

Дальше `$is_vertex_bot` можно использовать в расширенном формате логов или observability pipeline.

Если принято осознанное решение блокировать запросы на уровне Nginx:

```nginx
if ($http_user_agent ~* "Google-CloudVertexBot") {
    return 403;
}
```

Для обычного управления crawler предпочтительнее корректный `robots.txt`: жесткий `403` нужен только когда это действительно соответствует политике сайта.

## Apache

```apacheconf
SetEnvIfNoCase User-Agent "Google-CloudVertexBot" vertex_bot

<RequireAll>
    Require all granted
    Require not env vertex_bot
</RequireAll>
```

Как и в Nginx, это уже серверная блокировка, а не robots-policy.

## Как найти crawler в логах

Nginx/Apache access log:

```bash
grep -i 'Google-CloudVertexBot' /var/log/nginx/access.log
```

С частотой запросов по дню:

```bash
grep -i 'Google-CloudVertexBot' /var/log/nginx/access.log \
  | awk '{print $4}' \
  | cut -d: -f1 \
  | sort | uniq -c
```

Для реального анализа полезнее сохранять:

- timestamp;
- URL;
- status code;
- bytes sent;
- request time;
- User-Agent;
- IP/ASN после корректной нормализации;
- cache status.

## Что проверить перед включением Agent Search

1. Какие URL действительно должны попасть в индекс Agent Search.
2. Нет ли бесконечных URL с query-параметрами.
3. Доступен ли `robots.txt`.
4. Разрешен ли `Google-CloudVertexBot` нужным страницам.
5. Если используется sitemap — может ли `Googlebot` забрать сам sitemap.
6. Нет ли запрета на CDN/WAF, который конфликтует с `robots.txt`.
7. Не попадают ли в публичный сайт приватные документы или административные страницы.
8. Нужна ли доменная верификация для выбранного режима Advanced website indexing.

## Динамические URL

Google Cloud отдельно предупреждает, что автоматическое обнаружение URL на сайтах с большим числом динамических вариантов может раздувать индекс и стоимость хранения.

Для сайта вида:

```text
/catalog?page=1&sort=name
/catalog?page=1&sort=price
/catalog?page=1&utm_source=x
```

нужно заранее продумать include/exclude patterns, sitemap и канонические URL, а не просто разрешить crawler'у весь домен.

## Что это значит для SEO

Практически ничего напрямую.

Google прямо указывает, что настройки `Google-CloudVertexBot` влияют на обход, инициированный владельцем сайта для Vertex AI Agents, и не влияют на Google Search или другие продукты.

То есть блокировка:

```robots.txt
User-agent: Google-CloudVertexBot
Disallow: /
```

не является способом удалить страницу из Google Search.

И обратное тоже верно: разрешение этого crawler'а не дает преимущества в обычной поисковой выдаче.

## Источники

- [Google Search documentation updates — Introducing Google-CloudVertexBot](https://developers.google.com/search/updates)
- [Google common crawlers — Google-CloudVertexBot](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)
- [Google Cloud Agent Search — Prepare data](https://docs.cloud.google.com/generative-ai-app-builder/docs/prepare-data)
- [Google Cloud Agent Search — Index and refresh with sitemaps](https://docs.cloud.google.com/generative-ai-app-builder/docs/index-refresh-sitemap)
- [Overview of Google crawlers and fetchers](https://developers.google.com/crawling/docs/crawlers-fetchers/overview-google-crawlers)
