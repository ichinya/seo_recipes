---
title: Инциденты IONOS Cloud в 2026 году
description: Сбои Managed Kubernetes, AI Model Hub, provisioning, Object Storage, IP management и ограничения ёмкости IONOS Cloud в 2026 году
icon: fa-solid fa-triangle-exclamation
category: Хостинг
tag: [Хостинг, Инциденты, IONOS, IONOS Cloud, "2026", Kubernetes, AI Model Hub, Provisioning, Object Storage, IP, Ёмкость]
provider: ionos
year: 2026
---

# Инциденты IONOS Cloud в 2026 году

- [Карточка IONOS](../../providers/ionos.md)
- [Все инциденты 2026 года](./)
- [Официальная status-панель](https://status.ionos.cloud/)
- [DBaaS migrations августа 2026](../../info/ionos-dbaas-migrations-2026.md)

Последняя проверка: **24 августа 2026 года**.

## Краткий вывод

В 2026 году у IONOS Cloud заметны несколько разных классов проблем:

1. деградации управляющего слоя — Managed Kubernetes, Cloud API, Data Center Designer, Object Storage management и IP management;
2. повышенные ошибки и задержка AI Model Hub;
3. ограничения ёмкости, когда существующий сервис работает, но создать или повторно запустить ресурс нельзя;
4. scheduled migrations/deprecations managed services, которые требуют действий клиента, но сами по себе не являются авариями.

Для production это разные риски. Нельзя складывать их в один показатель «аптайм IONOS» и нельзя автоматически считать всё окно status-записи простоем каждого workload.

## Подтверждённые события

| Дата | Сервис | Что произошло | Воздействие | Статус / источник |
| --- | --- | --- | --- | --- |
| 23 августа | Object Storage / DCD | Buckets и Object Storage Keys не отображались в Data Center Designer; через DCD нельзя было получать, изменять, создавать и удалять buckets и keys | Управление Object Storage через DCD было недоступно; status-запись не заявляла потерю уже сохранённых объектов | Устранено; окно status-записи — **5 ч 1 мин**; [IONOS Cloud Status](https://status.ionos.cloud/) |
| 21–23 августа | IP Reservation / DCD / API | Нельзя было резервировать или управлять IP blocks через Data Center Designer и API | Операции IP management были недоступны; уже работающие workloads не заявлены как остановленные | Устранено; окно status-записи — **57 ч 57 мин**; [IONOS Cloud Status](https://status.ionos.cloud/) |
| 14 августа | Provisioning | Операции могли завершаться ошибкой `VDC-14-1836`; провайдер установил hotfix | Создание и изменение ресурсов было временно затруднено | [IONOS Cloud Status](https://status.ionos.cloud/) |
| 13–14 августа | AI Model Hub | Наблюдались повышенное число ошибок и увеличенная задержка API | AI-запросы могли завершаться ошибками или выполняться медленнее более суток | [IONOS Cloud Status](https://status.ionos.cloud/) |
| 11–12 августа | Provisioning, Cloud API, DCD | Увеличилось время обработки операций, соединения с DCD могли прерываться, Cloud API возвращал остаточные ошибки 500 | Создание и изменение ресурсов было затруднено; работающие VDC-ресурсы оставались доступны | [IONOS Cloud Status](https://status.ionos.cloud/) |
| 4–10 августа | Managed Kubernetes | Периодическая недоступность control plane, ошибки и тайм-ауты API | Уже запущенные workloads продолжали работать; управление кластером могло быть недоступно | [IONOS Cloud Status](https://status.ionos.cloud/) |
| 22–23 июня | Managed Kubernetes | Из-за высокого спроса в TXL и FRA временно остановили автоматическое обслуживание, требующее временного клонирования кластеров | Плановые обновления не выполнялись до расширения ёмкости | [IONOS Cloud Status](https://status.ionos.cloud/) |
| с 18 июня | GPU Server | Из-за дефицита ёмкости создание нового GPU-сервера или повторный запуск остановленного мог завершаться ошибкой | Провайдер прямо рекомендовал не выключать работающий GPU-сервер | [IONOS Cloud Status](https://status.ionos.cloud/) |
| с 12 июня | MongoDB DBaaS в `de/fra/2` | Playground и Business Edition нельзя было надёжно создавать из-за ограничения ёмкости | Требовалась другая локация или Enterprise Edition | [IONOS Cloud Status](https://status.ionos.cloud/) |

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

В августе IONOS проводит обязательные PostgreSQL/MariaDB/In-Memory DB migration/deprecation мероприятия.

Они описаны отдельно:

- [IONOS DBaaS — миграции API v1 → v2](../../info/ionos-dbaas-migrations-2026.md)

Пока planned migration проходит в заявленном impact window, её не следует добавлять в таблицу аварий как incident.

Но missed customer deadline может вызвать outage уже на стороне клиента, например:

- старый MariaDB API v1 integration перестаёт работать;
- In-Memory DB v1 выключается 31 августа;
- Terraform использует obsolete endpoint;
- PostgreSQL management automation продолжает использовать BASIC auth.

Это operational risk, но не provider incident в том же смысле, что Cloud API outage.

## Практический вывод

- мониторить data plane и control plane раздельно;
- для Object Storage отдельно проверять S3 requests и management operations;
- IaC pipeline должен иметь retry на временные API errors;
- не считать работающий GPU гарантией возможности повторного запуска;
- перед disaster recovery проверять capacity alternate location;
- AI integration должна иметь timeout/retries/fallback;
- иметь export IaC и план развёртывания у другого provider;
- подписаться на status notifications;
- scheduled migration deadlines переносить в собственный operational calendar;
- подписывать длительность как окно status-записи, если нет независимого измерения фактического impact.

## Связанные материалы

- [IONOS provider card](../../providers/ionos.md)
- [IONOS DBaaS migrations — август 2026](../../info/ionos-dbaas-migrations-2026.md)
- [Методика журнала инцидентов](./coverage.md)

## Источник

- [IONOS Cloud Status](https://status.ionos.cloud/)
