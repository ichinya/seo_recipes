---
title: "Cloudflare AI-crawlers с 15 сентября 2026: Search, Agent и Training"
description: "Как новые политики Cloudflare для AI-ботов могут затронуть Googlebot, BingBot и Applebot, и что проверить до 15 сентября"
icon: fa-brands fa-cloudflare
category: SEO
tag: [SEO, Cloudflare, AI, Crawlers, Googlebot, BingBot, Robots, "2026"]
---

# Cloudflare AI-crawlers с 15 сентября 2026: Search, Agent и Training

С **15 сентября 2026 года** Cloudflare меняет поведение настроек для AI-crawlers. Это важно не только для владельцев сайтов, которые хотят ограничить обучение AI-моделей: новая классификация может затронуть и обычную поисковую индексацию.

Главная причина — Cloudflare разделяет автоматический трафик на три поведения:

- **Search** — индексирование контента для последующего поиска и ответов;
- **Agent** — действия в реальном времени от имени пользователя;
- **Training** — сбор контента для обучения или дообучения моделей.

Для каждого поведения можно выбрать `Allow`, `Block` или `Block on pages with ads`.

## Что меняется 15 сентября

По документации Cloudflare, для новых доменов с 15 сентября действуют обновлённые defaults:

| Категория | Default на страницах с рекламой |
| --- | --- |
| Search | Allow |
| Agent | Block |
| Training | Block |

Cloudflare также объявил, что legacy-настройка **Block AI bots** выводится из употребления в пользу новых раздельных политик.

Официальный блог отдельно указывает, что изменение defaults затрагивает также существующих пользователей Free, которые до дедлайна не изменили настройки вручную. Поэтому перед 15 сентября стоит проверить dashboard даже у давно подключённого домена.

## Самая важная ловушка: mixed-purpose crawlers

Некоторые crawlers используются сразу для нескольких целей. Cloudflare применяет к такому боту наиболее строгую подходящую политику.

В официальном анонсе прямо названы примеры multi-purpose crawlers:

- Googlebot;
- BingBot;
- Applebot.

Если такой crawler классифицирован одновременно как `Search` и `Training`, а владелец сайта блокирует `Training`, запрос может быть заблокирован даже при разрешённом `Search`.

То есть настройка вида:

```text
Search: Allow
Training: Block
```

не гарантирует, что каждый поисковый crawler фактически пройдёт.

## Почему robots.txt недостаточно

`robots.txt` и Cloudflare выполняют разные задачи.

`robots.txt` сообщает crawler правила обхода после того, как запрос дошёл до сайта. Cloudflare может остановить запрос раньше — на edge-уровне.

Поэтому возможен сценарий:

```text
robots.txt: Googlebot разрешён
        ↓
Cloudflare policy: запрос заблокирован
        ↓
origin Googlebot вообще не увидел
```

Проверка только `robots.txt` в таком случае даст ложное ощущение, что всё настроено правильно.

## Что проверить до 15 сентября

В Cloudflare Dashboard откройте настройки AI traffic / AI bot policies и явно определите нужную политику для каждого класса.

Для обычного информационного или коммерческого сайта разумно сначала проверить:

1. нужен ли классический поисковый трафик Google/Bing;
2. нужен ли AI-search, который может приводить переходы и цитирования;
3. готовы ли вы разрешать browser/agent access;
4. разрешаете ли использование контента для обучения;
5. есть ли на сайте страницы с рекламой, на которые распространяются отдельные defaults.

Не копируйте чужой набор переключателей без проверки назначения сайта.

## Как проверить, не заблокирован ли поисковик

### 1. Search Console

Для Google проверьте важные URL через URL Inspection и после изменения Cloudflare-настроек следите за ошибками crawling/indexing.

Один успешный fetch не подтверждает доступность всего сайта: отдельно проверьте шаблоны страниц, которые отличаются Cloudflare Rules или рекламными блоками.

### 2. Логи и Cloudflare Analytics

После изменения политики ищите всплеск ответов:

```text
401
403
429
```

по crawler traffic.

Важно отличать:

- блок Cloudflare;
- rate limit;
- WAF/custom rule;
- ошибку origin;
- настоящий ответ приложения.

### 3. Sitemap и ключевые страницы

Проверьте минимум:

```text
/
/robots.txt
/sitemap.xml
ключевую статью
категорию
карточку товара или услуги
```

Если правила различаются по URL, тест главной страницы недостаточен.

## Не объединяйте всех AI-ботов в одну категорию

Например, у OpenAI Cloudflare отдельно различает `GPTBot`, `ChatGPT-User` и `OAI-SearchBot`. Аналогичное разделение встречается и у других операторов.

Практически полезнее сначала определить политику по назначению:

| Назначение | Типичная цель владельца сайта |
| --- | --- |
| Search | обычно разрешить ради обнаружения и цитирования |
| Agent | разрешать, если сайт должен работать с пользовательскими AI-агентами |
| Training | отдельное решение владельца контента |

После этого уже проверять конкретных bots в Cloudflare Bot Directory / AI Crawl Control.

## После 15 сентября

После изменения defaults стоит повторно проверить:

- Search Console;
- Bing Webmaster Tools, если используется;
- Cloudflare crawler analytics;
- access logs origin;
- видимость sitemap;
- crawl errors;
- AI referrals и цитирование, если они отслеживаются.

Особенно важно проверить сайты, где настройки AI bots раньше никогда явно не менялись.

## Чек-лист

- [ ] Проверены текущие `Search`, `Agent`, `Training` policies в Cloudflare.
- [ ] Понятно, распространяются ли новые defaults на этот домен/аккаунт.
- [ ] Проверено влияние блокировки `Training` на mixed-purpose crawlers.
- [ ] Googlebot не считается разрешённым только на основании `robots.txt`.
- [ ] Проверены sitemap и несколько типов страниц.
- [ ] После изменения отслеживаются `401/403/429` и crawler traffic.
- [ ] AI-search bots отделены от training crawlers там, где это возможно.
- [ ] Есть дата повторной проверки после 15 сентября.

## Источники

- [Cloudflare Docs — Block AI Bots](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/)
- [Cloudflare Blog — Your site, your rules: new AI traffic options for all customers](https://blog.cloudflare.com/content-independence-day-ai-options/)
- [Cloudflare AI Crawl Control — Bot reference](https://developers.cloudflare.com/ai-crawl-control/reference/bots/)
- [Cloudflare AI Crawl Control — Manage AI crawlers](https://developers.cloudflare.com/ai-crawl-control/features/manage-ai-crawlers/)
