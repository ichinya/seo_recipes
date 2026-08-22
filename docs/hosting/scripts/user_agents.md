---
title: Подозрительные и служебные User Agents
icon: fa-solid fa-user-secret
category: Поисковые боты
tag: [боты, user agent, malware, Google-CloudVertexBot, crawler]
---

# Подозрительные и служебные User Agents

На GitHub есть большой список подозрительных HTTP User-Agent строк:

- [mthcht/awesome-lists — suspicious_http_user_agents_list.csv](https://github.com/mthcht/awesome-lists/blob/main/Lists/suspicious_http_user_agents_list.csv)

Дублировать весь список здесь нет смысла: он большой и быстрее устареет, чем исходный репозиторий.

## User-Agent сам по себе ничего не доказывает

Строку User-Agent может указать любой клиент.

Например, запрос:

```bash
curl -A 'Googlebot' https://example.com/
```

не становится настоящим Googlebot только из-за заголовка.

Поэтому нельзя использовать логику:

```text
известный User-Agent = доверенный запрос
неизвестный User-Agent = злоумышленник
```

Для известных поисковых crawler'ов нужно использовать официальные методы проверки IP/reverse DNS или опубликованные диапазоны, если провайдер их предоставляет.

## Не путать новый crawler с вредоносным трафиком

20 августа 2026 года Google добавил новый crawler:

```text
Google-CloudVertexBot
```

Он используется для обхода сайтов по запросу владельца при построении Vertex AI / Agent Search.

Если такая строка появилась в access log, это не повод автоматически отправлять её в blacklist.

Подробнее: [Google-CloudVertexBot и Agent Search](../../info/google/google-cloudvertexbot.md).

## Google-Extended — не HTTP User-Agent

`Google-Extended` часто упоминается рядом с crawler'ами, но Google не заявляет отдельную HTTP User-Agent строку с этим именем.

Это product token для `robots.txt`:

```robots.txt
User-agent: Google-Extended
Disallow: /
```

Поэтому правило в WAF вида:

```text
HTTP User-Agent contains "Google-Extended"
```

не является эквивалентом `robots.txt`-политики Google-Extended.

## Практический анализ access log

Топ User-Agent строк в Nginx:

```bash
awk -F'"' '{print $6}' /var/log/nginx/access.log \
  | sort \
  | uniq -c \
  | sort -nr \
  | head -50
```

Поиск нескольких AI/crawler строк:

```bash
grep -Ei 'GPTBot|ClaudeBot|Google-CloudVertexBot|Googlebot' /var/log/nginx/access.log
```

При разборе подозрительного клиента полезно смотреть одновременно:

- IP и ASN;
- частоту запросов;
- распределение URL;
- HTTP methods;
- status codes;
- объем переданных данных;
- request time;
- соблюдение `robots.txt`;
- официальную документацию владельца crawler'а.

## Когда User-Agent действительно полезен

Он удобен для:

- аналитики crawler traffic;
- отдельного логирования;
- мягкого rate limiting;
- диагностики;
- применения официально поддерживаемой crawler-policy.

Для защиты административных endpoint'ов, API и приватных данных User-Agent недостаточно. Нужны нормальная аутентификация, firewall/WAF и контроль доступа.

## Связанные материалы

- [Управление доступом ботов ChatGPT, Claude и Google AI](./block_chatgpt_claude_gemini.md)
- [Google-CloudVertexBot и Agent Search](../../info/google/google-cloudvertexbot.md)
