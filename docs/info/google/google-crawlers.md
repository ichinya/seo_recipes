---
title: Google crawlers и user-triggered fetchers
description: Как различать клиентов Google в логах, проверять IP и DNS и обрабатывать webhook-запросы APIs-Google
icon: fa-brands fa-google
category: Google
tag: [Google, Googlebot, User-Agent, robots.txt, Логи, API]
---

# Клиенты Google в логах: классификация и проверка

Запрос со словом `Google` в User-Agent может относиться к поиску, рекламной проверке, пользовательскому приложению или webhook. Для диагностики нужны три отдельных ответа: **кто заявил о себе, подтверждён ли источник запроса и какую функцию он выполняет**. Совпадение строки User-Agent само по себе не подтверждает отправителя.

Проверено **24 ноября 2026 года** по официальной документации Google. Изменение справочника от **23 ноября** описывает уже существовавших клиентов; это не запуск новых роботов.

## Три категории

В [обзоре Google](https://developers.google.com/crawling/docs/crawlers-fetchers/overview-google-crawlers) используются следующие группы:

| Категория | Для чего используется | Что проверять в robots.txt |
| --- | --- | --- |
| Common crawlers | Обычное сканирование продуктов Google; пример — Googlebot | При автоматическом обходе соблюдают robots.txt |
| Special-case crawlers | Специальные функции продукта, договорённости с сайтом или проверки злоупотреблений | Поведение зависит от конкретного клиента |
| User-triggered fetchers | Действие инициировано пользователем или настроенным им сервисом | Не переносить правила Googlebot на fetcher; смотреть документацию конкретного клиента |

Название категории не заменяет справочник. Например, [Google-InspectionTool](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers#google-inspectiontool) находится среди common crawlers, хотя используется инструментами проверки страниц. [AdsBot](https://developers.google.com/crawling/docs/crawlers-fetchers/google-special-case-crawlers#adsbot) игнорирует глобальную группу `User-agent: *`, но учитывает адресованные ему правила. Это отличается от полного игнорирования robots.txt.

## Что уточнили 23 ноября

[Журнал изменений](https://developers.google.com/crawling/docs/changelog) добавил в справочник следующие существующие клиенты:

| Группа | Добавленные имена |
| --- | --- |
| Special-case crawlers | `Google-analytics-postbacks`, `Google-Calendar-Importer`, `GoogleDocs`, `Google-Edu`, `pageburst`, `PlayStore-Google` |
| User-triggered fetchers | `AppEngine-Google`, `Google-Apps-Script`, `Google-Cloud-Tasks`, `GoogleImageProxy`, `Google Web Preview`, `Chrome-Lighthouse` |

`APIs-Google` перенесён из special-case в user-triggered fetchers; в документированной строке User-Agent исправлена пропущенная точка с запятой. В старом классификаторе нужно исправить и группу, и точное строковое сопоставление, если оно использовалось.

Назначения помогают объяснить необычные запросы:

- В [special-case справочнике](https://developers.google.com/crawling/docs/crawlers-fetchers/google-special-case-crawlers) `GoogleDocs` связан с импортом внешних данных в Sheets, `Google-Calendar-Importer` — с подписанными внешними календарями, `PlayStore-Google` — с проверкой адресов из карточек приложений. Для каждого из этих трёх клиентов явно указано игнорирование robots.txt.
- В [user-triggered справочнике](https://developers.google.com/crawling/docs/crawlers-fetchers/google-user-triggered-fetchers) `Google-Apps-Script` связан с `UrlFetchApp`, `Google-Cloud-Tasks` — с HTTP-задачами, `GoogleImageProxy` — с изображениями в письмах и документах, `Chrome-Lighthouse` — с запрошенной проверкой PageSpeed Insights. Такие обращения нельзя автоматически засчитывать как поисковое сканирование или обучение AI.

## APIs-Google: доставка уведомлений

Документированная [строка User-Agent](https://developers.google.com/crawling/docs/crawlers-fetchers/google-user-triggered-fetchers#apis-google):

```text
APIs-Google; (+https://developers.google.com/webmasters/APIs-Google.html)
```

По [отдельному руководству](https://developers.google.com/crawling/docs/crawlers-fetchers/apis-user-agent), `APIs-Google` отправляет push-уведомления через **HTTPS POST**. При временных ошибках он повторяет доставку с экспоненциальной задержкой, вплоть до нескольких дней. Серверу нужен действующий доверенный TLS-сертификат; обработчик должен отвечать быстро, в пределах секунд.

Этот конкретный клиент **игнорирует robots.txt**, поскольку доставляет настроенные пользователем webhooks. Чтобы прекратить ожидаемые уведомления, отключают исходную подписку. Неожиданные запросы нужно расследовать: некоторые сервисы позволяют настроить push endpoint без проверки владения его доменом; в руководстве есть ссылка для сообщения о злоупотреблении.

Практический разбор всплеска:

1. Отделить POST к webhook от GET страниц и ресурсов.
2. Найти владельца интеграции, подписку и ожидаемый endpoint.
3. Проверить ответы обработчика и TLS: повторные ошибки могут увеличивать число доставок.
4. Подтвердить происхождение IP по следующему разделу.
5. Проверить авторизацию и формат уведомления по документации **того продукта**, который создал подписку. Подтверждённая инфраструктура Google не доказывает, что эту подписку настроила ваша организация.

Не исправляйте webhook добавлением `Disallow` и не выдавайте ему доступ к закрытым разделам только на основании User-Agent.

## Проверка IP и DNS

[Google описывает два способа](https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests): обратный DNS с обязательной прямой проверкой либо сопоставление IP с опубликованными CIDR. Для массового анализа удобнее актуальные JSON-списки; проверять нужно IPv4 и IPv6 как адреса и сети, а не подстроки.

| Семейство | Ожидаемая форма обратного DNS | Официальный список IP |
| --- | --- | --- |
| Common crawlers | `crawl-….googlebot.com` или `geo-crawl-….geo.googlebot.com` | [common-crawlers.json](https://developers.google.com/static/crawling/ipranges/common-crawlers.json) |
| Special-case crawlers | `rate-limited-proxy-….google.com` | [special-crawlers.json](https://developers.google.com/static/crawling/ipranges/special-crawlers.json) |
| User-triggered fetchers, управляемые пользователями | `….gae.googleusercontent.com` | [user-triggered-fetchers.json](https://developers.google.com/static/crawling/ipranges/user-triggered-fetchers.json) |
| User-triggered fetchers, управляемые Google | `google-proxy-….google.com` | [user-triggered-fetchers-google.json](https://developers.google.com/static/crawling/ipranges/user-triggered-fetchers-google.json) |

Для `Google-Agent` опубликован дополнительный [user-triggered-agents.json](https://developers.google.com/static/crawling/ipranges/user-triggered-agents.json); это отдельная запись в [справочнике fetchers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-user-triggered-fetchers#google-agent), а не основание проверять любого клиента по этому списку.

### Разовая проверка

Возьмите фактический IP соединения из доверенного access log. Если перед приложением стоит CDN или reverse proxy, сначала проверьте настройку передачи клиентского IP: произвольный входной `X-Forwarded-For` не является доказательством источника.

В оболочке с установленной командой `host`:

```bash
read -r -p 'IP из access log: ' request_ip
host "$request_ip"
```

Проверьте PTR-имя по таблице, затем выполните прямой запрос для **этого же имени**:

```bash
read -r -p 'Проверенное PTR-имя: ' request_hostname
host "$request_hostname"
```

Среди возвращённых A/AAAA должен быть исходный IP. Проверяйте границу домена: `google.com.example.org` не относится к `google.com`. Один PTR без обратного подтверждения недостаточен. Ошибка DNS оставляет проверку незавершённой, а не автоматически подтверждает подделку.

### Автоматическая проверка

Рекомендации для собственного обработчика логов:

- хранить время загрузки официального списка и результат сопоставления;
- при ошибке обновления явно отмечать устаревшую копию;
- различать неподтверждённый источник, несовпадение с выбранным семейством и успешную проверку;
- не заменять crawler-списки общим списком адресов Google Cloud;
- не превращать принадлежность сети в безусловное правило обхода WAF или авторизации.

JSON описывает диапазоны инфраструктуры. Сам по себе он не подтверждает назначение каждого запроса, индексирование страницы или разрешение на доступ к её данным.

## Как учитывать в аналитике ботов

Для собственного реестра полезно сохранять отдельно:

| Поле | Зачем нужно |
| --- | --- |
| Исходный User-Agent | Повторно разобрать запрос после изменения справочника |
| Клиент и категория | Различать Googlebot, webhook, preview и другие функции |
| Метод и результат проверки | Не смешивать заявление клиента с подтверждённым источником |
| Дата справочника и IP-списка | Воспроизвести классификацию за прошлый период |
| HTTP-метод, путь, статус и время | Найти повторы webhook, ошибки и нагрузку на конкретный endpoint |

Это рекомендуемые поля внутреннего отчёта, не схема API Google. Перед изменением фильтра возьмите небольшой сохранённый набор запросов: подтверждённый Googlebot, `APIs-Google`, неподтверждённый Google-подобный UA и обычный браузер. Сравните старую и новую классификацию. Результат считается полезным, если webhook перестал попадать в поисковое сканирование, а неподтверждённые запросы не получили доверие только по имени.

`Google-Extended` храните отдельно от HTTP-клиентов: это [product token для robots.txt](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers#google-extended), у которого нет собственного HTTP User-Agent. Исключение из генеративных функций Search настраивается через [Search generative AI control](./ai-mode-controls.md), а не новым правилом распознавания бота.

Команды здесь показывают процедуру проверки. Production-логи и правила доступа конкретного сайта при подготовке статьи не проверялись.

## Связанные материалы

- [Google AI Mode: управление показом, индексированием и сниппетами](./ai-mode-controls.md)
- [Search Console в 2026 году](./search-console-2026.md)
- [Google-CloudVertexBot](./google-cloudvertexbot.md)

## Официальные источники

- [Обзор crawlers и fetchers](https://developers.google.com/crawling/docs/crawlers-fetchers/overview-google-crawlers)
- [Журнал изменений от 23 ноября 2026 года](https://developers.google.com/crawling/docs/changelog)
- [Common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)
- [Special-case crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-special-case-crawlers)
- [User-triggered fetchers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-user-triggered-fetchers)
- [APIs-Google](https://developers.google.com/crawling/docs/crawlers-fetchers/apis-user-agent)
- [Проверка Google requests](https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests)
