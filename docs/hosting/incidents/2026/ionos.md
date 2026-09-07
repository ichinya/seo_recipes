---
title: Инциденты IONOS Cloud в 2026 году
description: Сбои Managed Kubernetes, AI Model Hub, provisioning, Object Storage, IP management, ограничения ёмкости и доступности поддержки IONOS Cloud в 2026 году
icon: fa-solid fa-triangle-exclamation
category: Хостинг
tag: [Хостинг, Инциденты, IONOS, IONOS Cloud, "2026", Kubernetes, AI Model Hub, Provisioning, Object Storage, IP, Ёмкость, Поддержка]
provider: ionos
year: 2026
---

# Инциденты IONOS Cloud в 2026 году

- [Карточка IONOS](../../providers/ionos.md)
- [Все инциденты 2026 года](./)
- [Официальная status-панель](https://status.ionos.cloud/)
- [DBaaS migrations августа–сентября 2026](../../info/ionos-dbaas-migrations-2026.md)

Последняя выборочная проверка S3, Cloud Support и DBaaS-дедлайнов: **7 сентября 2026 года**. Более ранняя хронология сохранена из предыдущих проверок.

## Краткий вывод

В 2026 году у IONOS Cloud заметны несколько разных классов проблем:

1. деградации data plane — повышенная задержка чтения и записи S3 Object Storage;
2. деградации управляющего слоя — Managed Kubernetes, Cloud API, Data Center Designer, Object Storage management и IP management;
3. повышенные ошибки и задержка AI Model Hub;
4. ограничения ёмкости, когда существующий сервис работает, но создать или повторно запустить ресурс нельзя;
5. scheduled migrations/deprecations managed services, которые требуют действий клиента, но сами по себе не являются авариями;
6. ограничение доступности поддержки, которое может затруднить восстановление без отказа инфраструктуры.

Для production это разные риски. Нельзя складывать их в один показатель «аптайм IONOS» и нельзя автоматически считать всё окно status-записи простоем каждого workload.

S3-инцидент `eu-central-1` закрыт **3 сентября**. На проверку 7 сентября открыто ограничение Cloud Support; оно не означает недоступность VM или БД.

## Подтверждённые события

| Дата | Сервис | Что произошло | Воздействие | Статус / источник |
| --- | --- | --- | --- | --- |
| с 4 сентября | Cloud Support | Ограничена телефонная поддержка; 7 сентября провайдер дополнительно сообщил о задержках ответов и изменениях ticketing system | Может увеличиться время получения помощи; это не outage вычислительных ресурсов | На 7 сентября `Identified`; [IONOS Cloud Status](https://status.ionos.cloud/incidents/qhqnj47m1j20) |
| 26 августа — 3 сентября | S3 Object Storage, `eu-central-1` | Повышенная задержка операций чтения и записи в локации DE/FRA | Медленные ответы для части клиентов; полная недоступность и потеря данных не заявлены | `Resolved` 3 сентября в 13:39 UTC; окно между первым и финальным сообщениями — **8 д 3 ч 46 мин**; [IONOS Cloud Status](https://status.ionos.cloud/incidents/rd8ss0f7l3kp) |
| 23 августа | Object Storage / DCD | Buckets и Object Storage Keys не отображались в Data Center Designer; через DCD нельзя было получать, изменять, создавать и удалять buckets и keys | Управление Object Storage через DCD было недоступно; status-запись не заявляла потерю уже сохранённых объектов | Устранено; окно status-записи — **5 ч 1 мин**; [IONOS Cloud Status](https://status.ionos.cloud/) |
| 21–23 августа | IP Reservation / DCD / API | Нельзя было резервировать или управлять IP blocks через Data Center Designer и API | Операции IP management были недоступны; уже работающие workloads не заявлены как остановленные | Устранено; окно status-записи — **57 ч 57 мин**; [IONOS Cloud Status](https://status.ionos.cloud/) |
| 14 августа | Provisioning | Операции могли завершаться ошибкой `VDC-14-1836`; провайдер установил hotfix | Создание и изменение ресурсов было временно затруднено | [IONOS Cloud Status](https://status.ionos.cloud/) |
| 13–14 августа | AI Model Hub | Наблюдались повышенное число ошибок и увеличенная задержка API | AI-запросы могли завершаться ошибками или выполняться медленнее более суток | [IONOS Cloud Status](https://status.ionos.cloud/) |
| 11–12 августа | Provisioning, Cloud API, DCD | Увеличилось время обработки операций, соединения с DCD могли прерываться, Cloud API возвращал остаточные ошибки 500 | Создание и изменение ресурсов было затруднено; работающие VDC-ресурсы оставались доступны | [IONOS Cloud Status](https://status.ionos.cloud/) |
| 4–10 августа | Managed Kubernetes | Периодическая недоступность control plane, ошибки и тайм-ауты API | Уже запущенные workloads продолжали работать; управление кластером могло быть недоступно | [IONOS Cloud Status](https://status.ionos.cloud/) |
| 22–23 июня | Managed Kubernetes | Из-за высокого спроса в TXL и FRA временно остановили автоматическое обслуживание, требующее временного клонирования кластеров | Плановые обновления не выполнялись до расширения ёмкости | [IONOS Cloud Status](https://status.ionos.cloud/) |
| с 18 июня | GPU Server | Из-за дефицита ёмкости создание нового GPU-сервера или повторный запуск остановленного мог завершаться ошибкой | Провайдер прямо рекомендовал не выключать работающий GPU-сервер | [IONOS Cloud Status](https://status.ionos.cloud/) |
| с 12 июня | MongoDB DBaaS в `de/fra/2` | Playground и Business Edition нельзя было надёжно создавать из-за ограничения ёмкости | Требовалась другая локация или Enterprise Edition | [IONOS Cloud Status](https://status.ionos.cloud/) |

## S3 Object Storage latency: 26 августа — 3 сентября

Хронология по [карточке инцидента](https://status.ionos.cloud/incidents/rd8ss0f7l3kp), всё время — UTC:

| Дата и время | Статус и сообщение |
| --- | --- |
| 26 августа, 09:53 | Начало расследования медленных read/write |
| 27 августа, 12:00 | Статус `Identified` |
| 31 августа, 17:08 | Повторяющиеся скачки latency; Storage и Network teams продолжали расследование, техническая root cause ещё не определена |
| 1 сентября, 15:18 | Первые меры улучшили ситуацию для части сервисов; работа над полным исправлением продолжалась |
| 3 сентября, 08:27 | `Monitoring`: время ответа существенно улучшилось |
| 3 сентября, 13:39 | `Resolved`: нормальное время ответа восстановлено |

Между первым и финальным сообщениями прошло **8 дней 3 часа 46 минут**. Это окно status-записи, не доказательство непрерывной недоступности каждого bucket. Финальный update не содержит технического RCA; статус `Identified` 27 августа нельзя подменять утверждением о документально установленной первопричине.

Это **data-plane performance issue**, а не повтор события 23 августа в Data Center Designer:

```text
26 августа — 3 сентября: S3 data plane
    ↓
медленные read/write через endpoint

23 августа: management plane
    ↓
buckets и keys не отображались и не управлялись через DCD
```

### Что проверить клиенту

Synthetic monitoring должен обращаться к реальному endpoint, а не только проверять status-page:

```text
PUT небольшого объекта
    ↓
HEAD / GET
    ↓
проверка размера и checksum
    ↓
LIST по тестовому prefix
    ↓
DELETE тестового объекта
```

Отдельно измеряйте:

- latency p50, p95 и p99;
- HTTP 5xx и timeout;
- скорость `PUT` и `GET`;
- ошибки multipart upload;
- время обработки media jobs;
- backup duration;
- retries и рост очередей приложения;
- поведение из разных сетей и регионов.

После восстановления сравните эти метрики с baseline, проверьте незавершённые multipart uploads, отложенные media jobs и успешность backup. Статус `Resolved` провайдера не заменяет проверку конкретного workload.

Для production полезны ограниченные retries с exponential backoff и jitter, idempotency там, где она поддерживается, контроль общей длительности запроса и независимая резервная копия у другого провайдера.

## Cloud Support: ограничение с 4 сентября

Первое уведомление опубликовано **4 сентября в 16:53 UTC**: телефонная поддержка работает с ограниченной доступностью, провайдер предлагает обращаться по email. **7 сентября в 06:16 UTC** статус изменён на `Identified`; IONOS предупредил о сохраняющемся недостатке покрытия поддержки и изменениях ticketing system, которые могут замедлить ответы.

Источник: [Cloud Support](https://status.ionos.cloud/incidents/qhqnj47m1j20).

Не следует представлять это как прекращение работы поддержки или infrastructure outage. Для аварийного плана полезно заранее проверить альтернативный канал обращения и сохранить номер заявки, временную шкалу и диагностику без секретов. Конкретное время ответа, финальный срок восстановления и изменение SLA в уведомлении не обещаны.

## IP Reservation 21–23 августа

21 августа в 07:52 UTC IONOS сообщил, что невозможно:

- резервировать IP blocks;
- управлять существующими IP blocks;
- выполнять эти операции через DCD;
- выполнять их через API.

В 08:18 UTC проблема была переведена в `Identified`: provider сообщил, что причина найдена и готовится fix. Финальный `Resolved` опубликован 23 августа в 17:49 UTC.

Между первым и финальным сообщениями прошло **57 часов 57 минут**. Это длительность официального окна status-записи, а не доказанная непрерывная недоступность для каждого клиента.

### Что затрагивает operationally

Даже если existing VM продолжает работать, проблема management plane может помешать:

- автоматическому provisioning;
- disaster recovery;
- добавлению IP для нового сервиса;
- IaC pipeline;
- масштабированию;
- срочному созданию replacement resources.

То есть control plane outage — отдельный recovery risk.

## Object Storage management 23 августа

23 августа в 12:47 UTC IONOS сообщил, что buckets и Object Storage Keys не отображаются в Data Center Designer. Через DCD было невозможно:

- получить доступ к buckets и keys;
- изменить их;
- создать новые;
- удалить существующие.

Статус переведён в `Resolved` в 17:48 UTC. Окно записи составило **5 часов 1 минуту**.

Формулировка провайдера относилась к Data Center Designer. Поэтому по одной status-записи нельзя утверждать, что весь S3 data plane или чтение уже сохранённых объектов были недоступны. Для мониторинга это нужно разделять:

```text
S3 data plane
  ↓
PUT / GET / LIST объектов через endpoint

management plane
  ↓
создание bucket, keys, policy и управление через DCD/API
```

Полезно иметь отдельный synthetic check на реальный S3 endpoint и отдельно проверять операции управления.

## AI Model Hub и provisioning 13–14 августа

Деградация AI Model Hub продолжалась с 13 августа до утра 14 августа по UTC. Провайдер сообщал о повышенном уровне ошибок и увеличенной задержке.

Это отдельный класс проблемы: виртуальные машины и сети клиента могли работать нормально, но приложение, зависящее от managed AI API, получало ошибки или медленные ответы.

14 августа отдельно возникала ошибка provisioning с кодом `VDC-14-1836`. IONOS сообщил об установке hotfix. Её нельзя автоматически считать продолжением AI Model Hub incident: затронуты разные компоненты.

Для приложения, использующего AI Model Hub, полезны:

- request timeout;
- retry с exponential backoff;
- circuit breaker;
- резервная model/provider strategy;
- отдельный monitoring error rate и latency.

## Managed Kubernetes 4–10 августа

Провайдер связывал нестабильность control plane с нагрузкой и ограничениями памяти.

В процессе восстановления:

- увеличивались memory limits;
- расширялась инфраструктура;
- customer control planes перераспределялись;
- выполнялась migration на улучшенную infrastructure.

IONOS отдельно указывал, что brief control-plane interruptions не должны были останавливать уже работающие workloads.

Это важно: приложение могло обслуживать traffic, но `kubectl`, API и cluster management — не работать.

## Provisioning 11–12 августа

Проблема относилась к management layer:

- DCD мог терять соединение;
- provisioning выполнялся дольше;
- Cloud API периодически возвращал HTTP 500;
- Terraform, SDK и `ionosctl`, зависящие от API, также могли получать ошибки.

Провайдер сообщил, что доступность уже созданных virtual data center resources не пострадала.

## Ограничения ёмкости — не обычный простой

GPU и MongoDB могли быть частично недоступны не потому, что все existing resources остановились, а потому что отсутствовала свободная capacity для новых instances.

Это создаёт отдельный risk recovery:

```text
resource works now
      ↓
resource stopped/deleted
      ↓
capacity unavailable
      ↓
resource cannot be recreated/restarted
```

Для GPU IONOS прямо рекомендовал не выключать работающий server при дефиците capacity.

## DBaaS migrations не считать авариями

Августовские PostgreSQL/MariaDB/In-Memory DB migration/deprecation мероприятия описаны отдельно вместе с предстоящим отключением PostgreSQL API v1 28 сентября:

- [IONOS DBaaS — миграции API v1 → v2](../../info/ionos-dbaas-migrations-2026.md)

Пока planned migration проходит в заявленном impact window, её не следует добавлять в таблицу аварий как incident.

Но missed customer deadline может вызвать outage уже на стороне клиента, например:

- старый MariaDB API v1 integration перестаёт работать;
- приложение продолжает обращаться к отключённому In-Memory DB v1;
- Terraform использует obsolete endpoint;
- PostgreSQL management automation продолжает использовать BASIC auth.

Это operational risk, но не provider incident в том же смысле, что Cloud API outage.

## Влияние на категорию

IONOS остаётся в категории **«Рискованные»**. Закрытие S3-инцидента — положительное изменение текущего состояния, но основания категории, связанные с аккаунтом, оплатой и санкционной политикой, сохраняются в [карточке провайдера](../../providers/ionos.md). Ограничение поддержки учитывается отдельно от надёжности data plane.

## Практический вывод

- мониторить S3 data plane и Object Storage management plane раздельно;
- для S3 проверять не только availability, но и latency реальных `PUT`/`GET`;
- после закрытия incident фиксировать точную длительность status-окна и результат;
- IaC pipeline должен иметь retry на временные API errors;
- не считать работающий GPU гарантией возможности повторного запуска;
- перед disaster recovery проверять capacity alternate location;
- AI integration должна иметь timeout/retries/fallback;
- иметь export IaC и план развёртывания у другого provider;
- хранить независимую копию критичных объектов и регулярно делать restore-test;
- подписаться на status notifications;
- scheduled migration deadlines переносить в собственный operational calendar;
- подписывать длительность как окно status-записи, если нет независимого измерения фактического impact.

## Связанные материалы

- [IONOS provider card](../../providers/ionos.md)
- [IONOS DBaaS migrations — август–сентябрь 2026](../../info/ionos-dbaas-migrations-2026.md)
- [Методика журнала инцидентов](./coverage.md)

## Источники

- [IONOS Cloud Status](https://status.ionos.cloud/)
- [IONOS: Object Storage — Increased latency in eu-central-1](https://status.ionos.cloud/incidents/rd8ss0f7l3kp)
- [Cloud Support: Limited Phone Support Availability](https://status.ionos.cloud/incidents/qhqnj47m1j20)
- [PostgreSQL API v1 Decommissioning](https://status.ionos.cloud/incidents/2nwv8pmhc870)
