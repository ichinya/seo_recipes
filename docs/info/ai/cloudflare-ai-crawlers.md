---
title: "Cloudflare AI crawler policy: Search, Agent и Training"
description: "Disallow AI Training вместо полного Block: Accountable crawlers, Bot Preference Sync, Content Signals и проверка поискового доступа после изменений 15 сентября 2026"
icon: fa-solid fa-shield-cat
category: Нейросети
tag: [AI, Cloudflare, AI Crawl Control, robots.txt, Search, Agent, Training, WAF, SEO, Bot Preference Sync]
---

# Cloudflare AI crawler policy: Search, Agent и Training

Материал обновлён **17 сентября 2026 года** по официальной публикации Cloudflare от 15 сентября, API reference и документации операторов crawlers. Настройки реальной zone и эксплуатационные тесты в рамках этой проверки не выполнялись.

Cloudflare разделяет автоматический трафик на **Search**, **Agent** и **Training**. Для SEO важно различать отказ от обучения на контенте и технический запрет поисковому роботу получать страницы.

## Что изменилось 15 сентября

По [анонсу Cloudflare](https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers/), **Disallow AI Training** сохраняет поисковый доступ Accountable mixed-use crawlers, публикуя предпочтение через Bot Preference Sync. Остальные training crawlers блокируются. Обычные **Block** и **Block on pages with ads** теперь охватывают и mixed-use crawlers — включая Googlebot, Applebot и Bingbot.

**Accountable** — категория Cloudflare с требованиями и обязательствами операторов, в том числе с будущими сроками реализации. Это не доказательство, что все обещанные функции уже работают, и не безусловное разрешение доступа любому боту такой категории.

### Миграция существующих настроек

Сентябрьский анонс описывает автоматический перенос:

| Прежняя настройка | Объявленный результат |
| --- | --- |
| Legacy Block AI Bots выключен | Search, Training и Agent: Allow |
| Legacy Block AI Bots: Block или ads-only | Search: Allow; Training: Disallow AI Training; Agent: Block on pages with ads |
| Уже настроенный granular Training: Block или ads-only | Training: Disallow AI Training; Search и Agent сохраняют значения |
| Granular Training: Allow | Allow сохраняется |

Прежнее предупреждение об opt-out до 15 сентября относилось к предварительному анонсу и всем существующим тарифам, не только Free. После дедлайна проверяйте **фактический результат миграции**, а не следуйте устаревшей инструкции «успеть отказаться».

Новые домены получают предлагаемые пресеты с учётом наличия рекламы; это не единая обязательная политика для всех сайтов. Подробная матрица — в датированном анонсе выше.

## Три категории и четыре действия Training

| Категория | Что делает бот | Доступные действия |
| --- | --- | --- |
| Search | собирает контент для последующего поиска и ответов | Allow, Block on pages with ads, Block |
| Agent | действует в реальном времени по запросу пользователя | Allow, Block on pages with ads, Block |
| Training | собирает данные для обучения или дообучения | Allow, Disallow AI Training, Block on pages with ads, Block |

[API reference](https://developers.cloudflare.com/api/resources/bot_management/) различает поля `ai_search`, `ai_user` и `ai_training`. Только `ai_training` принимает дополнительное значение `disallow`; остальные значения — `disabled`, `block`, `only_on_ad_pages`. Поле `bot_preference_sync_enabled` управляет синхронизацией предпочтений в `robots.txt`.

Не придумывайте комбинацию `disallow_on_ad_pages` и не подставляйте `disallow` в Search или Agent: таких вариантов в прочитанной схеме нет. Сначала сравните интерфейс, API и реально отдаваемый `robots.txt`. Наличие поля в схеме не подтверждает настройку конкретной zone.

## Почему Disallow и Block нельзя заменять друг другом

Для сайта, который хочет оставаться в поиске, рабочая гипотеза для проверки:

```text
Search = Allow
Training = Disallow AI Training
Bot Preference Sync = Enabled
Agent = отдельное решение по назначению сайта
```

Сравнение сценариев:

| Конфигурация | Что необходимо проверить |
| --- | --- |
| Search Allow + Training Disallow | Доставку no-training preferences и сохранение доступа нужных Accountable mixed-use crawlers |
| Search Allow + Training Block | Осознанность отказа в доступе также поисковым mixed-use crawlers |
| Training Block on pages with ads | Какие страницы определены как рекламные и не потерян ли их поисковый обход |

`Search = Allow` не отменяет подходящий запрет другой категории, WAF-правило, rate limit или авторизацию приложения. Сохраняйте настройки до изменения и проверяйте реальный HTTP-ответ, а не только состояние переключателя.

Не объединяйте всех ботов одного оператора: в [Bot reference Cloudflare](https://developers.cloudflare.com/ai-crawl-control/reference/bots/) `GPTBot`, `ChatGPT-User` и `OAI-SearchBot` перечислены отдельно. Сверяйте конкретного бота, назначение и классификацию, а не только бренд.

## Особенности Google, Apple и Bing

### Google-Extended — не отдельный HTTP crawler

[Документация Google](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers#google-extended) определяет `Google-Extended` как управляющий product token в `robots.txt`, а не отдельную строку User-Agent HTTP-запроса. Он относится к описанным Google сценариям обучения Gemini и grounding; его использование не исключает сайт из обычного Google Search и не является сигналом ранжирования.

Поэтому не ищите обязательно запросы с HTTP User-Agent `Google-Extended` и не считайте этот token универсальным выключателем всех AI-функций Google Search. Управление AI-представлением в поиске проверяется отдельно от запрета обучения.

### Applebot-Extended и AI-ответы — разные настройки

[Apple](https://support.apple.com/ru-ru/119829) также разделяет crawler `Applebot` и управляющий token `Applebot-Extended`. Последний не сканирует страницы: он ограничивает использование собранных данных для обучения моделей. Запрет обучения сам по себе не запрещает обычный поиск Apple. Для описанных Apple сценариев AI-ответов отдельно предусмотрен `nosnippet`; последствия нужно оценивать для конкретного сайта.

Пример ручного отказа от обучения для двух операторов, а не точная копия блока Cloudflare:

```txt
User-agent: Google-Extended
Disallow: /

User-agent: Applebot-Extended
Disallow: /
```

Не добавляйте второй несогласованный блок поверх уже включённого Bot Preference Sync. Сначала прочитайте итоговый файл и проверьте, нет ли более специфичных или противоречащих правил.

### Bing: не выдавать дорожную карту за работающую гарантию

Согласно анонсу Cloudflare от 15 сентября, robots-level механизм Microsoft нацелен на **начало 2027 года**; пока используются `NOARCHIVE` и Bing Webmaster Tools. Поэтому одного переключателя Cloudflare недостаточно, чтобы утверждать, что Bing уже соблюдает новый доменный no-training сигнал. Отдельно проверяйте текущие инструкции Microsoft и влияние выбранных мер на отображение контента.

## Где настроить

В панели Cloudflare откройте настройки **Bot traffic / AI bot policies** и проверьте отдельно Search, Agent, Training и Bot Preference Sync. Названия разделов dashboard могут меняться.

Для каждого изменения сохраните hostname/zone, время, старое и новое значение. Настройка на уровне домена может затронуть несколько hostnames. Не меняйте одновременно crawler policy, DNS, cache и правила доступа: иначе сложно установить причину регрессии.

## Bot Preference Sync вместо Managed robots.txt

[Bot Preference Sync](https://blog.cloudflare.com/bot-preference-sync/) объявлен в августе; публикация дополнена 15 сентября. Он синхронизирует предпочтения категорий с генерируемым блоком `robots.txt`, доступен на всех планах и использует обновляемые сведения о ботах. Существующее содержимое файла сохраняется после добавляемого блока.

Сентябрьский переход объявляет Managed Robots.txt устаревшим механизмом и переносит его пользователей в Bot Preference Sync. Наличие legacy-поля `is_robots_txt_managed` в API не следует трактовать как рекомендацию продолжать строить новые инструкции только вокруг него.

**Произвольные сложные WAF-правила не превращаются автоматически в эквивалентный robots.txt.** Синхронизация категорий не заменяет аудит custom rules, исключений по путям и ручных robots-групп.

Перед включением и после миграции проверьте:

- итоговый `robots.txt`, а не только исходный файл на origin;
- отсутствие HTML challenge или страницы входа при HTTP 200;
- сохранность `Sitemap` и существующих правил;
- управляющие tokens нужных операторов;
- staging, служебные hostnames и конфликтующие `Disallow`;
- отличие ответов с CDN и origin, не раскрывая закрытый origin публично.

```bash
curl -sS -D - https://example.com/robots.txt
```

Если получен не текст правил, сначала устраните проблему доставки. Автоматический перенос настройки не является отчётом об успешном обходе сайта поисковиком.

## Политика поведения и Content Signals — разные уровни

| Механизм | Что выражает | Ограничение |
| --- | --- | --- |
| Cloudflare Block / WAF | техническое ограничение HTTP-доступа | может затронуть поисковый обход |
| Disallow AI Training и Bot Preference Sync | настройку доступа и публикацию предпочтений с учётом категории бота | возможности операторов и сроки реализации различаются |
| `robots.txt` и Content Signals | предпочтения владельца по обходу и использованию контента | сами по себе не являются универсальной технической блокировкой |

Разрешение Googlebot в `robots.txt` не отменяет блокировку на edge: origin может вообще не получить запрос. Отсутствие обращения в origin logs не доказывает, что crawler не пытался открыть страницу; проверяйте также события Cloudflare.

## Content Signals

Content Signals добавляют в `robots.txt` машинно-читаемые указания о допустимом использовании контента:

- `search` — построение поискового индекса;
- `ai-input` — передача контента модели во время ответа, например для RAG или grounding;
- `ai-train` — обучение или fine-tuning.

Отдельно Cloudflare тестирует сигнал `use`:

- `use=immediate` — использовать в текущем взаимодействии без хранения и повторного использования;
- `use=reference` — индексировать, цитировать фрагмент и ссылаться на источник;
- `use=full` — суммаризировать и воспроизводить более полно.

Пример выражения предпочтений, а не гарантированного вывода Bot Preference Sync:

```txt
User-agent: *
Content-signal: search=yes, ai-input=yes, ai-train=no, use=reference
Allow: /
```

Это не универсальный веб-стандарт с гарантированным юридическим или техническим enforcement для любого crawler. Возможности экспериментального `use` нужно проверять отдельно.

## Не путать Search и `ai-input`

```text
Content Signal search
    → индекс, ссылки и выдержки

Content Signal ai-input
    → контент попадает в модель во время генерации ответа

Cloudflare Agent category
    → бот действует в реальном времени от имени пользователя
```

Agent может читать страницу для выполнения действия, но это не означает автоматическое совпадение с каждым сценарием `ai-input`. Отказ от обучения не равен универсальному отказу от AI-сводок и grounding.

## Техническая блокировка через AI Crawl Control

AI Crawl Control позволяет анализировать crawlers, запросы `robots.txt`, нарушения directives и объём трафика, а затем выбирать ограничения. Проверяйте поддержку нужных функций своим планом.

Полезная последовательность rollout:

```text
наблюдение без изменения доступа
        ↓
сегментация Search / Agent / Training
        ↓
проверка фактических настроек после миграции
        ↓
осознанный выбор Disallow или Block
        ↓
Bot Preference Sync / robots.txt
        ↓
проверка поискового доступа и ошибок
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

Один agent может выполнять запрос пользователя в реальном времени, а другой crawler того же оператора — строить индекс или собирать обучающие данные. Для владельца сайта эти режимы требуют разных решений.

### Проверка идентичности

Cloudflare проверяет, соответствует ли заявленный способ идентификации реальному трафику. В зависимости от конфигурации используются:

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
    → allow, disallow, block, WAF и Content Signals
```

Принятие в BotBase и Verified status **не дают автоматического доступа** ко всем сайтам Cloudflare. Финальное решение остаётся у владельца каждой zone и её правил. Verified identity также не следует отождествлять с обязательствами Accountable crawler.

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

Глобальная политика может быть слишком широкой. Например:

- статьи доступны Search;
- закрытая база знаний требует авторизации;
- API разрешён только собственному агенту;
- checkout и account не предназначены для свободного обхода;
- публичная документация доступна Agent;
- платный архив требует отдельной модели доступа.

Для таких сценариев могут потребоваться WAF custom rules и исключения. Конкретная доступность и порядок применения зависят от правил и плана. Bot Preference Sync не преобразует эти исключения в точную robots-политику автоматически.

Пример логики, а не готовое универсальное выражение:

```text
если путь начинается с /private/
    → проверить авторизацию и ограничить автоматический доступ

если путь начинается с /docs/
    → проверить доступ нужных Search и Agent

если hostname = api.example.com
    → проверять идентичность и права собственного agent
```

После добавления исключений проверьте порядок правил: более раннее правило может перехватить запрос. Не открывайте приватные endpoints ради успешного crawler-test.

## AI Labyrinth

AI Labyrinth создаёт невидимые `nofollow`-ссылки-ловушки для crawlers, которые не соблюдают ограничения. Cloudflare заявляет, что механизм не меняет внешний вид страницы и не должен влиять на SEO.

Это дополнительный honeypot, а не замена понятной политике:

- сначала настройте robots и AI crawler policy;
- затем включайте Labyrinth;
- отслеживайте false positives;
- не считайте попадание в ловушку единственным доказательством злонамеренности.

## Готовые профили политики

Профили ниже — стартовые гипотезы для собственного тестирования, не гарантия доступа через все правила. Не копируйте их на production без проверки mixed-use crawlers и действующих robots-групп.

| Сценарий | Search | Training | Agent и дополнительная проверка |
| --- | --- | --- | --- |
| Информационный сайт: поиск нужен, обучение нежелательно | Allow | Disallow AI Training | Allow по продуктовой модели; включить и проверить Bot Preference Sync |
| Интернет-магазин с тем же требованием | Allow | Disallow AI Training | Проверять доступ каталога отдельно от checkout/account |
| Рекламный сайт | Allow | Осознанный выбор Disallow AI Training вместо полного Block при необходимости поиска | Проверить Block on pages with ads и правильность определения рекламных URL |
| Полный запрет mixed-use crawling | Не считать Allow исключением из запрета | Block | Принять риск потери поискового обхода; для приватного контента обязательна авторизация |

Для платного контента robots.txt не заменяет контроль доступа на origin. Публичные preview pages и закрытая часть могут требовать разных правил; не пытайтесь решить это только доменным переключателем.

## Мониторинг после изменения

### Серверные метрики

Сравните до и после:

- запросы по verified bot name и классификацию Search / Agent / Training;
- HTTP 401/403/429 и managed challenge;
- запросы `robots.txt` и фактически опубликованные preferences;
- crawl rate, bandwidth и cache hit ratio;
- наиболее посещаемые paths;
- crawlers, нарушающие directives.

Не приписывайте все 401/403/429 AI policy: разделяйте AI block, rate limit, WAF/custom rule, авторизацию приложения и ошибки origin по событию и сработавшему правилу.

### SEO и обнаружение

Отдельно контролируйте Google Search Console, Bing Webmaster Tools, Яндекс Вебмастер, organic traffic, AI referrals и индексацию новых материалов. При анализе логов проверяйте идентичность Google по [официальной методике](https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests), а не только по User-Agent.

Не связывайте любую просадку с AI policy без сегментации. Отсутствие переходов не доказывает отсутствие использования контента для обучения, а доступный поисковик не подтверждает выполнение всех будущих обязательств Accountable.

### SEO-проверки после перехода

| URL или тип страницы | Что проверить |
| --- | --- |
| Главная | Ожидаемый HTTP-ответ и контент, а не challenge или страница входа |
| `/robots.txt` | Текст правил, Content Signals, управляющие tokens и Sitemap |
| Фактический URL sitemap | XML и ссылки на дочерние карты |
| Статья, категория, товар или услуга | Каждый шаблон и отличающиеся правила hostname/path |
| Страницы с рекламой и без неё | Разницу действия ads-only ограничений |

Для важных URL используйте URL Inspection в Search Console и сопоставьте результат с реальными crawler requests в Cloudflare и origin logs. Один успешный fetch не доказывает доступность всех шаблонов и hostnames.

Проверяйте GET и тело ответа: `200` со страницей входа или challenge не считается успешной выдачей контента. Успех обычного `curl` также не подтверждает доступ verified crawler через его путь проверки.

## Rollout без резкого отключения

1. Выгрузить доступную историю bot traffic и сохранить прежнюю конфигурацию.
2. Проверить фактическую миграцию legacy и granular настроек; старый opt-out deadline больше не является текущим действием.
3. Определить, нужен отказ от обучения или полный запрет получения страниц.
4. Для сохранения поиска проверить Training Disallow, Bot Preference Sync и ограничения конкретных операторов.
5. Проверить итоговый `robots.txt`, Content Signals и конфликты ручных групп.
6. Проверить доступ нужных Search crawlers, не ограничиваясь `Search = Allow`.
7. Для Agent проверить реальные сценарии, paths и приватные endpoints.
8. Через 24–72 часа сравнить ошибки, трафик и crawl rate.
9. Проверить WAF-исключения отдельно: синхронизация категорий не заменяет их аудит.
10. Только затем расширять ограничения.

## Проверка конфигурации

```bash
# Правила и заголовки ответа
curl -sS -D - https://example.com/robots.txt

# GET публичной страницы: сохранить заголовки и тело для ручной проверки
curl --max-time 30 -sS -A 'SEO-Recipes-Policy-Test/1.0' \
  -D policy-test.headers -o policy-test.html \
  https://example.com/article/
```

Проверьте код, Content-Type, redirect и содержимое локальных файлов. Не выполняйте полученный HTML как shell-код. Тест со своим User-Agent не имитирует verified crawler и не доказывает выполнение no-training preference оператором.

## Checklist

- [ ] Разделены цели: поисковое обнаружение, Agent, обучение и AI-ответы.
- [ ] Проверена фактическая миграция настроек после 15 сентября.
- [ ] Training Disallow не перепутан с полным Block.
- [ ] Accountable не принят за гарантию реализации всех обещанных функций сегодня.
- [ ] Отдельно учтён срок robots-level поддержки Bing и текущие средства Microsoft.
- [ ] Bot Preference Sync проверен вместо инструкции только по legacy Managed Robots.txt.
- [ ] `robots.txt` возвращает правила, а не HTML, и сохраняет Sitemap.
- [ ] Проверены Google-Extended / Applebot-Extended без поиска несуществующего отдельного HTTP crawler.
- [ ] Проверены несколько типов страниц, рекламные и нерекламные URL.
- [ ] Закрытые материалы защищены авторизацией.
- [ ] Проверены WAF custom rules и исключения независимо от Bot Preference Sync.
- [ ] Для собственного crawler поддерживается актуальная запись BotBase.
- [ ] Verified identity не считается безусловным разрешением доступа.
- [ ] Настроен мониторинг crawler traffic, 401/403/429 и referral.
- [ ] Есть сохранённая конфигурация и проверяемый план возврата доступа.

## Источники

- [Cloudflare, 15 сентября: Accountable mixed-use crawlers и новая миграция настроек](https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers/)
- [Cloudflare: Bot Preference Sync; публикация дополнена 15 сентября](https://blog.cloudflare.com/bot-preference-sync/)
- [Cloudflare API: Bot Management, ai_training и bot_preference_sync_enabled](https://developers.cloudflare.com/api/resources/bot_management/)
- [Google: Google-Extended и common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers#google-extended)
- [Apple: Applebot, Applebot-Extended и управление AI-ответами](https://support.apple.com/ru-ru/119829)
- [Cloudflare: предварительный анонс и прежний opt-out — исторический источник](https://blog.cloudflare.com/content-independence-day-ai-options/)
- [Cloudflare: Configure AI bot policies](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/)
- [Cloudflare AI Crawl Control: Bot reference](https://developers.cloudflare.com/ai-crawl-control/reference/bots/)
- [Google: проверка запросов crawlers и fetchers](https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests)
- [Cloudflare: legacy Managed robots.txt и Content Signals](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)
- [Cloudflare AI Crawl Control](https://developers.cloudflare.com/ai-crawl-control/)
- [Cloudflare: контроль robots.txt directives](https://developers.cloudflare.com/ai-crawl-control/features/track-robots-txt/)
- [Cloudflare: WAF custom rules для bot traffic](https://developers.cloudflare.com/bots/additional-configurations/custom-rules/)
- [Cloudflare AI Labyrinth](https://developers.cloudflare.com/bots/additional-configurations/ai-labyrinth/)
- [Cloudflare: BotBase for Operators](https://blog.cloudflare.com/botbase-for-operators/)
- [Cloudflare: Web Bot Auth](https://developers.cloudflare.com/bots/reference/bot-verification/web-bot-auth/)

При проверке часть общей документации ещё содержала предварительные формулировки. Для изменений 15 сентября использован более поздний датированный анонс; он не подменён утверждением о лично проверенном завершении миграции всех zones.
