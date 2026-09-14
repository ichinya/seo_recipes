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

В тот же день старый общий переключатель Block AI bots будет deprecated.

## Переход для существующих клиентов

Уточнение от **14 сентября 2026 года**: [документация Cloudflare](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/) предоставляет opt-out до 15 сентября **всем существующим клиентам, включая платные тарифы**, а не только Free. Проверьте Security settings у каждого ранее подключённого домена и явно выберите нужное поведение.

Согласно [официальному анонсу](https://blog.cloudflare.com/content-independence-day-ai-options/), opt-out сохраняет текущую обработку Training crawlers, которые также используются для Search. Это не обещание безусловного доступа через все WAF-правила. Не смешивайте defaults для новых доменов с изменением обработки mixed-purpose crawlers у существующих клиентов; установленный legacy Block AI bots тоже требует проверки.

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

Некоторые crawlers используются одновременно для Search и Training. В объявленном на 15 сентября 2026 года поведении они подпадают под правила блокировки Training, включая новые defaults и legacy Block AI bots; до дедлайна существующим клиентам доступен описанный выше opt-out.

Cloudflare прямо приводит **Googlebot, Applebot и BingBot** как примеры multi-purpose crawlers и указывает, что применяется наиболее строгая подходящая политика. Это описание классификации и правил Cloudflare, а не утверждение, что каждый запрос этих ботов используется для обучения.

Практическое следствие:

- `Search = Allow` не гарантирует доступ crawler, если он также классифицирован как Training;
- после включения Training block нужно проверить, какие конкретные операторы и user agents перестали получать контент;
- оценивать нужно не название компании, а классификацию поведения и фактические запросы.

Не объединяйте всех ботов одного оператора: в [Bot reference Cloudflare](https://developers.cloudflare.com/ai-crawl-control/reference/bots/) `GPTBot`, `ChatGPT-User` и `OAI-SearchBot` перечислены отдельно. Для принятия решения сверяйте конкретного бота, его назначение и актуальную классификацию, а не только бренд оператора.

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

Разрешение Googlebot в `robots.txt` не отменяет блокировку на edge: origin может вообще не получить запрос. Поэтому отсутствие обращения в origin logs не доказывает, что crawler не пытался открыть страницу; проверяйте также события Cloudflare.

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
оценка mixed-purpose crawlers и точечная блокировка Training
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

Профили ниже выражают желаемую политику, а не гарантируют доступ всех поисковиков. В каждом варианте с `Training = Block` сначала оцените mixed-purpose crawlers и сохранение их текущей обработки через opt-out до 15 сентября. Не включайте профиль вслепую только потому, что `Search = Allow`.

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
- HTTP 401/403/429 и managed challenge;
- robots.txt requests;
- crawl rate;
- bandwidth;
- cache hit ratio;
- наиболее посещаемые paths;
- crawlers, нарушающие directives.

Не приписывайте все 401/403/429 AI policy: разделяйте AI block, rate limit, WAF/custom rule, авторизацию приложения и ошибки origin по событию и сработавшему правилу.

### SEO и обнаружение

Отдельно контролируйте:

- Google Search Console;
- Bing Webmaster Tools, если используется;
- Яндекс Вебмастер;
- обычный organic traffic;
- referral из AI-сервисов;
- появление бренда и страниц в generative answers;
- индексацию новых материалов;
- server logs Googlebot/YandexBot.

Не связывайте любую просадку с AI policy без сегментации. Классические поисковые боты и AI crawlers могут пересекаться по оператору, но имеют разные user agents и назначения.

### SEO-проверки до и после 15 сентября

Составьте небольшой набор URL и повторите проверку после изменения политики и после 15 сентября:

| URL или тип страницы | Что проверить |
| --- | --- |
| Главная | Ожидаемый HTTP-ответ и контент, а не challenge или страница входа |
| `/robots.txt` | Текст правил, Content Signals, Sitemap и отсутствие блокировки на edge |
| Фактический URL sitemap | XML и ссылки на дочерние карты, если они используются |
| Статья, категория, товар или услуга | Каждый используемый шаблон и отличающиеся правила для hostname/path |
| Страницы с рекламой и без неё | Разницу действия `Block on pages with ads` |

Для важных URL используйте URL Inspection в Search Console, затем сопоставьте результат с реальными crawler requests в Cloudflare и origin logs. Один успешный fetch не доказывает доступность всех шаблонов и hostnames. При разборе логов проверяйте идентичность Google по [официальной методике](https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests), а не только по User-Agent.

Проверяйте GET и тело ответа: `200` со страницей входа или challenge не считается успешной выдачей контента. Успех обычного `curl` также не подтверждает доступ verified crawler через его путь проверки.

## Rollout без резкого отключения

1. Выгрузить 14–30 дней bot traffic.
2. Определить crawlers с реальным referral или полезным индексированием.
3. Зафиксировать текущую конфигурацию и до 15 сентября явно решить вопрос opt-out для каждого существующего домена, включая платные тарифы.
4. Добавить Content Signals.
5. До блокировки Training оценить влияние на mixed-purpose crawlers.
6. Проверить фактический доступ нужных Search crawlers, не ограничиваясь значением `Search = Allow`.
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

# Заголовки GET-ответа с собственным тестовым User-Agent
curl -sS -A 'KNOWN_TEST_USER_AGENT' -D - -o /dev/null \
  https://example.com/article/
```

Последняя команда отбрасывает тело ответа, поэтому сама по себе не проверяет, пришёл контент или challenge. Для просмотра тела повторите GET без `-o /dev/null`; не выполняйте полученное содержимое как код.

Не подставляйте user agent известного crawler для обхода правил или имитации verified bot. Такая проверка показывает только обработку строки User-Agent и не подтверждает полный путь Cloudflare verification.

## Checklist

- [ ] Определена цель сайта: referral, agent actions, лицензирование, защита датасета.
- [ ] Search, Agent и Training настроены отдельно.
- [ ] Учтены mixed-purpose crawlers.
- [ ] Проверены новые defaults до 15 сентября 2026 года.
- [ ] Для существующих доменов на Free и платных тарифах осознанно выбран opt-out или переход на новые правила.
- [ ] Старый Block AI bots не остаётся единственной политикой.
- [ ] `robots.txt` возвращает HTTP 200 и не ломает sitemap.
- [ ] Проверены sitemap и несколько типов страниц, включая страницы с рекламой и без неё.
- [ ] Добавлены осознанные Content Signals.
- [ ] Добровольные directives дополнены техническим enforcement там, где он нужен.
- [ ] Закрытые материалы защищены авторизацией, а не только robots.txt.
- [ ] Проверен порядок WAF custom rules и exceptions.
- [ ] Для собственного crawler заполнена и поддерживается актуальной запись BotBase.
- [ ] Verified identity не считается автоматическим разрешением доступа.
- [ ] Настроен мониторинг bot traffic, 401/403/429 и referral.
- [ ] Запланирована повторная SEO-проверка после 15 сентября.
- [ ] Есть rollback и сохранён предыдущий policy snapshot.

## Источники

- [Cloudflare: Configure AI bot policies](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/)
- [Cloudflare: Your site, your rules — новые настройки и opt-out](https://blog.cloudflare.com/content-independence-day-ai-options/)
- [Cloudflare AI Crawl Control: Bot reference](https://developers.cloudflare.com/ai-crawl-control/reference/bots/)
- [Google: проверка запросов crawlers и fetchers](https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests)
- [Cloudflare: Managed robots.txt и Content Signals](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)
- [Cloudflare AI Crawl Control](https://developers.cloudflare.com/ai-crawl-control/)
- [Cloudflare: контроль robots.txt directives](https://developers.cloudflare.com/ai-crawl-control/features/track-robots-txt/)
- [Cloudflare: WAF custom rules для bot traffic](https://developers.cloudflare.com/bots/additional-configurations/custom-rules/)
- [Cloudflare AI Labyrinth](https://developers.cloudflare.com/bots/additional-configurations/ai-labyrinth/)
- [Cloudflare: BotBase for Operators](https://blog.cloudflare.com/botbase-for-operators/)
- [Cloudflare: Web Bot Auth](https://developers.cloudflare.com/bots/reference/bot-verification/web-bot-auth/)
