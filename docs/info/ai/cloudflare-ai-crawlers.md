---
title: "Cloudflare AI crawler policy: Search, Agent и Training"
description: "Как раздельно управлять поисковыми AI-ботами, агентами и обучающими crawlers, настроить Content Signals, robots.txt и техническую блокировку"
icon: fa-solid fa-shield-cat
category: Нейросети
tag: [AI, Cloudflare, AI Crawl Control, robots.txt, Search, Agent, Training, WAF, SEO]
---

# Cloudflare AI crawler policy: Search, Agent и Training

Cloudflare уходит от одного общего переключателя **Block AI bots** к раздельной политике для трёх типов поведения:

- **Search**;
- **Agent**;
- **Training**.

Это важное изменение для SEO и владельцев контента. Решение «запретить AI-ботов» больше не обязательно означает одинаковое отношение к поисковому индексированию, работе агента по запросу пользователя и сбору данных для обучения модели.

С **15 сентября 2026 года** для новых доменов Cloudflare изменит значения по умолчанию:

- Training — блокировать на страницах с рекламой;
- Agent — блокировать на страницах с рекламой;
- Search — разрешать.

В тот же день старый общий переключатель Block AI bots будет deprecated. Существующие домены могут самостоятельно выбрать политику и не обязаны ждать новых defaults.

## Три категории поведения

| Категория | Что делает бот | Типичный сценарий | Что можно выбрать |
| --- | --- | --- | --- |
| Search | собирает или индексирует контент, чтобы отвечать на вопросы позднее | AI search, индекс ответов и рекомендаций | Allow, Block on pages with ads, Block all pages |
| Agent | действует в реальном времени от имени человека | chat fetch, browser-use agent, выполнение пользовательской задачи | Allow, Block on pages with ads, Block all pages |
| Training | использует контент для обучения или fine-tuning | сбор датасета, включая mixed-purpose crawlers | Allow, Block on pages with ads, Block all pages |

Cloudflare применяет настройки к verified bots соответствующего класса и к дополнительным неавторизованным ботам, которые система относит к такому поведению.

## Почему единый запрет неудобен

У сайта могут быть разные интересы:

```text
хочу присутствовать в AI search
        ↓
Search = Allow

хочу, чтобы пользовательский агент мог открыть страницу
        ↓
Agent = Allow или выборочная политика

не разрешаю использовать статьи для обучения
        ↓
Training = Block
```

При старом бинарном подходе эти сценарии легко смешать. В результате сайт либо оставляет всё открытым, либо блокирует полезный канал обнаружения вместе со сбором данных для обучения.

## Mixed-purpose crawlers

Некоторые crawlers используются одновременно для Search и Training. С 15 сентября 2026 года такие боты будут затронуты правилами блокировки Training, включая новые defaults и старый Block AI bots.

Практическое следствие:

- `Search = Allow` не гарантирует доступ crawler, если он также классифицирован как Training;
- после включения Training block нужно проверить, какие конкретные операторы и user agents перестали получать контент;
- оценивать нужно не название компании, а классификацию поведения и фактические запросы.

## Где настроить

В панели Cloudflare:

```text
Security Settings
    ↓
Bot traffic
    ↓
Configure AI bot policies
```

Для каждой категории выбирается:

- **Allow (do not block)**;
- **Block on pages with ads**;
- **Block (on all pages)**.

Перед включением блокировки сохраните текущие значения и подготовьте rollback. Изменение применяется на уровне zone и может повлиять на разные hostnames одного домена.

## Политика поведения и Content Signals — разные уровни

Cloudflare использует два дополняющих механизма:

| Механизм | Что выражает | Обязательность для crawler |
| --- | --- | --- |
| Search / Agent / Training policy | техническое действие Cloudflare для классифицированного трафика | Cloudflare может реально блокировать запрос |
| `robots.txt` и Content Signals | предпочтения владельца по доступу и использованию контента | добровольное соблюдение оператором crawler |

Не стоит считать, что один `robots.txt` технически остановит crawler. Cloudflare прямо указывает: соблюдение robots-директив добровольное. Для enforcement используются AI Crawl Control, managed bot rules или WAF.

## Content Signals

Content Signals добавляют в `robots.txt` машинно-читаемые указания о допустимом использовании контента:

- `search` — построение поискового индекса;
- `ai-input` — передача контента модели во время ответа, например для RAG или grounding;
- `ai-train` — обучение или fine-tuning.

Отдельно Cloudflare тестирует сигнал `use`:

- `use=immediate` — использовать в текущем взаимодействии без хранения и повторного использования;
- `use=reference` — индексировать, цитировать фрагмент и ссылаться на источник;
- `use=full` — суммаризировать и воспроизводить более полно.

Пример политики, которая разрешает обычный поиск и AI-ответы по запросу, но запрещает обучение:

```txt
User-agent: *
Content-signal: search=yes, ai-input=yes, ai-train=no, use=reference
Allow: /
```

Это выражение предпочтений, а не универсальный веб-стандарт с гарантированным юридическим или техническим enforcement для любого crawler.

## Не путать Search и `ai-input`

Названия похожи, но задачи различаются:

```text
Content Signal search
    → индекс, ссылки и выдержки

Content Signal ai-input
    → контент попадает в модель во время генерации ответа

Cloudflare Agent category
    → бот действует в реальном времени от имени пользователя
```

Agent может читать страницу для выполнения действия, но это не означает автоматическое совпадение с каждым сценарием `ai-input`. Поэтому политика должна учитывать и классификацию сетевого поведения, и желаемое использование контента.

## Managed robots.txt

Cloudflare может управлять `robots.txt` автоматически.

Если файл уже существует и возвращает HTTP 200, Cloudflare добавляет управляемый блок перед существующим содержимым. Если файла нет, Cloudflare может создать его.

Перед включением проверьте:

- текущий `robots.txt`;
- sitemap directives;
- правила для Googlebot и YandexBot;
- staging и служебные hostnames;
- отсутствие конфликтующих `Disallow`;
- какой именно блок будет добавлен;
- как файл выглядит через разные CDN POP.

Проверка:

```bash
curl -sS -D - https://example.com/robots.txt
```

Нужно увидеть:

- HTTP 200;
- `Content-Type: text/plain`;
- ожидаемые User-agent blocks;
- Sitemap;
- Content Signals;
- отсутствие HTML error page или challenge.

## Техническая блокировка через AI Crawl Control

AI Crawl Control доступен на всех планах Cloudflare и позволяет:

- видеть AI crawlers;
- анализировать объём запросов;
- проверять доступ к `robots.txt`;
- находить нарушения directives;
- разрешать или блокировать отдельных crawlers;
- дополнять политику WAF-правилами.

Полезная последовательность rollout:

```text
наблюдение без блокировки
        ↓
сегментация Search / Agent / Training
        ↓
robots.txt и Content Signals
        ↓
точечная блокировка Training
        ↓
проверка referral traffic и ошибок
        ↓
расширение политики
```

## BotBase for Operators: регистрация и проверка собственного бота

28 августа 2026 года Cloudflare запустил **BotBase for Operators** — отдельный интерфейс для владельцев crawlers и агентов. Раньше отправка бота была почти односторонней формой: оператор не видел нормальный статус проверки и не мог удобно обновить уже поданные сведения.

Новый раздел находится в панели:

```text
Protect & Connect
    ↓
Application Security
    ↓
BotBase
```

Внутри доступны три сценария:

- **Bots directory** — каталог ботов, которые уже отслеживает Cloudflare;
- **Submission form** — регистрация нового crawler или agent;
- **Submission history** — история заявок текущего аккаунта.

### Статусы заявки

| Статус | Что означает |
| --- | --- |
| Waiting for review | заявка получена и находится в очереди |
| Accepted | бот принят и отслеживается в BotBase |
| Rejected | сведения или способ проверки нужно исправить; интерфейс показывает причину и следующие действия |

Оператор может открыть заявку, увидеть изменённую Cloudflare классификацию, отредактировать ранее отправленные сведения или отменить заявку, пока она ожидает проверки.

### Что нужно декларировать

Новая форма использует ту же модель поведения и использования контента, что и AI crawler policies. Оператор описывает три независимые вещи:

1. **Что делает бот** — поиск, действие от имени пользователя, сбор данных, обучение, SEO-инструмент или несколько сценариев одновременно.
2. **Как он использует прочитанный контент** — например, краткая поисковая ссылка, reference-use, непосредственный AI input или обучение.
3. **Кто фактически запускает трафик** — сам оператор напрямую либо intermediary-платформа, которая переносит запросы приложений и клиентов.

Это полезнее одного общего ярлыка. Один agent может выполнять запрос пользователя в реальном времени, а другой crawler того же оператора — строить индекс или собирать обучающие данные. Для владельца сайта эти режимы требуют разных решений.

### Проверка идентичности

Cloudflare автоматически проверяет, соответствует ли заявленный способ идентификации реальному трафику. В зависимости от конфигурации используются:

- опубликованный список IP-адресов;
- reverse DNS;
- криптографическая подпись **Web Bot Auth**.

Web Bot Auth связывает HTTP-запрос с оператором с помощью message signatures. Это устойчивее простой строки User-Agent, которую может скопировать любой клиент. При переходе с IP allowlist на Web Bot Auth оператору нужно обновить сведения в BotBase.

Важно разделять:

```text
идентичность
    → действительно ли запрос отправил заявленный бот

поведение
    → Search, Agent, Training и другие роли

разрешение владельца сайта
    → allow, block, WAF и Content Signals
```

Принятие в BotBase и Verified status **не дают автоматического доступа** ко всем сайтам Cloudflare. Финальное решение остаётся у владельца каждой zone и её правил.

### Практический чек-лист для собственного crawler или agent

- [ ] User-Agent уникален и не пересекается с чужими шаблонами.
- [ ] Опубликован актуальный IP list, настроен reverse DNS или Web Bot Auth.
- [ ] Поведение описано по фактическим сценариям, а не по маркетинговому названию.
- [ ] Отдельно указано, как используется контент.
- [ ] Выбрана корректная роль direct или intermediary operator.
- [ ] Заявка видна в Submission history.
- [ ] Причины Rejected исправлены, а не обходятся новой похожей заявкой.
- [ ] При смене IP, домена ключей или способа подписи запись обновляется.
- [ ] Робот соблюдает `robots.txt`, Content Signals, rate limits и ответы 403/429.
- [ ] Проверено, что Accepted не трактуется системой как безусловный allow.

## WAF и исключения по путям

Глобальный preset может быть слишком широким. Например:

- статьи разрешены Search;
- закрытая база знаний запрещена всем crawlers;
- API разрешён только собственному агенту;
- checkout нельзя сканировать;
- публичная документация доступна Agent;
- платный архив запрещён Training.

Для таких сценариев используются WAF custom rules и skip/exception rules.

Пример логики, а не готовое универсальное выражение:

```text
если путь начинается с /private/
    → block для AI crawler

если путь начинается с /docs/
    → allow Search и Agent

если hostname = api.example.com
    → разрешить только известный собственный agent
```

После добавления исключений проверьте порядок правил. Более раннее WAF-правило может перехватить запрос до нужного allow/skip.

## AI Labyrinth

AI Labyrinth создаёт невидимые `nofollow`-ссылки-ловушки для crawlers, которые не соблюдают ограничения. Cloudflare заявляет, что механизм не меняет внешний вид страницы и не должен влиять на SEO.

Это дополнительный honeypot, а не замена понятной политике:

- сначала настройте robots и AI crawler policy;
- затем включайте Labyrinth;
- отслеживайте false positives;
- не считайте попадание в ловушку единственным доказательством злонамеренности.

## Готовые профили политики

### Информационный сайт, заинтересованный в AI referral

| Категория | Политика |
| --- | --- |
| Search | Allow |
| Agent | Allow |
| Training | Block |
| Content Signals | `search=yes, ai-input=yes, ai-train=no, use=reference` |

Дополнительно: отслеживать переходы из AI-сервисов и цитирование источника.

### Интернет-магазин

| Категория | Политика |
| --- | --- |
| Search | Allow |
| Agent | Allow для каталога, ограничить checkout/account |
| Training | Block или Block on pages with ads |
| Content Signals | разрешить поиск каталога, отдельно закрыть личные и служебные пути |

Agent может быть полезен для подбора и покупки товара, но нельзя давать crawler свободно обходить корзину, персональные URL и административные endpoints.

### Платный или лицензируемый контент

| Категория | Политика |
| --- | --- |
| Search | Allow только публичные preview pages |
| Agent | по продуктовой модели и договору |
| Training | Block |
| Content Signals | `ai-train=no`, ограничения по путям, `use=reference` или `immediate` |

Доступ к контенту должен контролироваться авторизацией на origin. robots.txt не защищает материал, который можно получить по публичному URL.

### Сайт с рекламой

Новый default «Block on pages with ads» не следует принимать без проверки. Автоматическое определение рекламной страницы может не совпасть с вашей бизнес-логикой.

Проверьте:

- какие URL Cloudflare считает страницами с рекламой;
- не блокируется ли Search/Agent на важных landing pages;
- что происходит с mixed-purpose crawlers;
- влияет ли изменение на referral traffic;
- есть ли возможность точнее настроить пути через WAF.

## Мониторинг после изменения

### Серверные метрики

Сравните до и после:

- запросы по verified bot name;
- Search / Agent / Training classification;
- HTTP 403 и managed challenge;
- robots.txt requests;
- crawl rate;
- bandwidth;
- cache hit ratio;
- наиболее посещаемые paths;
- crawlers, нарушающие directives.

### SEO и обнаружение

Отдельно контролируйте:

- Google Search Console;
- Яндекс Вебмастер;
- обычный organic traffic;
- referral из AI-сервисов;
- появление бренда и страниц в generative answers;
- индексацию новых материалов;
- server logs Googlebot/YandexBot.

Не связывайте любую просадку с AI policy без сегментации. Классические поисковые боты и AI crawlers могут пересекаться по оператору, но имеют разные user agents и назначения.

## Rollout без резкого отключения

1. Выгрузить 14–30 дней bot traffic.
2. Определить crawlers с реальным referral или полезным индексированием.
3. Зафиксировать текущую конфигурацию.
4. Добавить Content Signals.
5. Сначала блокировать Training.
6. Оставить Search разрешённым.
7. Для Agent проверить реальные сценарии и paths.
8. Через 24–72 часа сравнить ошибки, трафик и crawl rate.
9. Добавить точечные WAF-исключения.
10. Только затем расширять блокировку.

## Проверка конфигурации

```bash
# robots.txt
curl -sS https://example.com/robots.txt

# Заголовки публичной страницы
curl -sS -I https://example.com/article/

# Проверка, не возвращается ли challenge вместо контента
curl -sS -A 'KNOWN_TEST_USER_AGENT' -D - -o /dev/null \
  https://example.com/article/
```

Не подставляйте user agent известного crawler для обхода правил или имитации verified bot. Такая проверка показывает только обработку строки User-Agent и не подтверждает полный путь Cloudflare verification.

## Checklist

- [ ] Определена цель сайта: referral, agent actions, лицензирование, защита датасета.
- [ ] Search, Agent и Training настроены отдельно.
- [ ] Учтены mixed-purpose crawlers.
- [ ] Проверены новые defaults до 15 сентября 2026 года.
- [ ] Старый Block AI bots не остаётся единственной политикой.
- [ ] `robots.txt` возвращает HTTP 200 и не ломает sitemap.
- [ ] Добавлены осознанные Content Signals.
- [ ] Добровольные directives дополнены техническим enforcement там, где он нужен.
- [ ] Закрытые материалы защищены авторизацией, а не только robots.txt.
- [ ] Проверен порядок WAF custom rules и exceptions.
- [ ] Для собственного crawler заполнена и поддерживается актуальной запись BotBase.
- [ ] Verified identity не считается автоматическим разрешением доступа.
- [ ] Настроен мониторинг bot traffic, 403 и referral.
- [ ] Есть rollback и сохранён предыдущий policy snapshot.

## Источники

- [Cloudflare: Configure AI bot policies](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/)
- [Cloudflare: Managed robots.txt и Content Signals](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)
- [Cloudflare AI Crawl Control](https://developers.cloudflare.com/ai-crawl-control/)
- [Cloudflare: контроль robots.txt directives](https://developers.cloudflare.com/ai-crawl-control/features/track-robots-txt/)
- [Cloudflare: WAF custom rules для bot traffic](https://developers.cloudflare.com/bots/additional-configurations/custom-rules/)
- [Cloudflare AI Labyrinth](https://developers.cloudflare.com/bots/additional-configurations/ai-labyrinth/)
- [Cloudflare: BotBase for Operators](https://blog.cloudflare.com/botbase-for-operators/)
- [Cloudflare: Web Bot Auth](https://developers.cloudflare.com/bots/reference/bot-verification/web-bot-auth/)
