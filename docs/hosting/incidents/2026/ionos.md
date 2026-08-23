---
title: Инциденты IONOS Cloud в 2026 году
description: Сбои Managed Kubernetes, AI Model Hub, provisioning, IP management и ограничения ёмкости IONOS Cloud в 2026 году
icon: fa-solid fa-triangle-exclamation
category: Хостинг
tag: [Хостинг, Инциденты, IONOS, IONOS Cloud, "2026", Kubernetes, AI Model Hub, Provisioning, IP, Ёмкость]
provider: ionos
year: 2026
---

# Инциденты IONOS Cloud в 2026 году

- [Карточка IONOS](../../providers/ionos.md)
- [Все инциденты 2026 года](./)
- [Официальная status-панель](https://status.ionos.cloud/)
- [DBaaS migrations августа 2026](../../info/ionos-dbaas-migrations-2026.md)

Последняя проверка: **23 августа 2026 года**.

## Краткий вывод

В 2026 году у IONOS Cloud заметны несколько разных классов проблем:

1. деградации управляющего слоя — Managed Kubernetes, Cloud API, Data Center Designer и IP management;
2. повышенные ошибки и задержка AI Model Hub;
3. ограничения ёмкости, когда существующий сервис работает, но создать или повторно запустить ресурс нельзя;
4. scheduled migrations/deprecations managed services, которые требуют действий клиента, но сами по себе не являются авариями.

Для production это разные риски. Нельзя складывать их в один показатель «аптайм IONOS».

## Подтвержденные события

| Дата | Сервис | Что произошло | Воздействие | Статус / источник |
| --- | --- | --- | --- | --- |
| с 21 августа | IP Reservation / DCD / API | Нельзя резервировать или управлять IP blocks через Data Center Designer и API | Операции IP management недоступны; уже работающие workloads не заявлены как остановленные | На проверку 23 августа статус оставался `Identified`; [IONOS Cloud Status](https://status.ionos.cloud/) |
| 14 августа | Provisioning | Операции могли завершаться ошибкой `VDC-14-1836`; провайдер установил hotfix | Создание и изменение ресурсов было временно затруднено | [IONOS Cloud Status](https://status.ionos.cloud/) |
| 13–14 августа | AI Model Hub | Наблюдались повышенное число ошибок и увеличенная задержка API | AI-запросы могли завершаться ошибками или выполняться медленнее более суток | [IONOS Cloud Status](https://status.ionos.cloud/) |
| 11–12 августа | Provisioning, Cloud API, DCD | Увеличилось время обработки операций, соединения с DCD могли прерываться, Cloud API возвращал остаточные ошибки 500 | Создание и изменение ресурсов было затруднено; работающие VDC-ресурсы оставались доступны | [IONOS Cloud Status](https://status.ionos.cloud/) |
| 4–10 августа | Managed Kubernetes | Периодическая недоступность control plane, ошибки и тайм-ауты API | Уже запущенные workloads продолжали работать; управление кластером могло быть недоступно | [IONOS Cloud Status](https://status.ionos.cloud/) |
| 22–23 июня | Managed Kubernetes | Из-за высокого спроса в TXL и FRA временно остановили автоматическое обслуживание, требующее временного клонирования кластеров | Плановые обновления не выполнялись до расширения ёмкости | [IONOS Cloud Status](https://status.ionos.cloud/) |
| с 18 июня | GPU Server | Из-за дефицита ёмкости создание нового GPU-сервера или повторный запуск остановленного мог завершаться ошибкой | Провайдер прямо рекомендовал не выключать работающий GPU-сервер | [IONOS Cloud Status](https://status.ionos.cloud/) |
| с 12 июня | MongoDB DBaaS в `de/fra/2` | Playground и Business Edition нельзя было надежно создавать из-за ограничения ёмкости | Требовалась другая локация или Enterprise Edition | [IONOS Cloud Status](https://status.ionos.cloud/) |

## IP Reservation с 21 августа

21 августа в 07:52 UTC IONOS сообщил, что невозможно:

- резервировать IP blocks;
- управлять существующими IP blocks;
- выполнять эти операции через DCD;
- выполнять их через API.

В 08:18 UTC проблема была переведена в `Identified`: provider сообщил, что причина найдена и готовится fix.

На момент проверки **23 августа** отдельного `Resolved` update на status page не было.

### Почему не указана «длительность простоя»

Открытая status-запись может жить дольше фактического воздействия на каждого клиента.

Поэтому нельзя писать:

```text
инцидент длился N часов
```

только вычитая timestamp создания из текущего времени.

Корректная формулировка до закрытия:

> событие остается открытым на status page; финальная длительность воздействия не установлена.

### Что затрагивает operationally

Даже если existing VM продолжает работать, проблема management plane может помешать:

- автоматическому provisioning;
- disaster recovery;
- добавлению IP для нового сервиса;
- IaC pipeline;
- масштабированию;
- срочному созданию replacement resources.

То есть control plane outage — отдельный recovery risk.

## AI Model Hub и provisioning 13–14 августа

Деградация AI Model Hub продолжалась с 13 августа до утра 14 августа по UTC. Провайдер сообщал о повышенном уровне ошибок и увеличенной задержке.

Это отдельный класс проблемы: виртуальные машины и сети клиента могли работать нормально, но приложение, зависящее от managed AI API, получало ошибки или медленные ответы.

14 августа отдельно возникала ошибка provisioning с кодом `VDC-14-1836`. IONOS сообщил об установке hotfix. Ее нельзя автоматически считать продолжением AI Model Hub incident: затронуты разные компоненты.

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

Это создает отдельный risk recovery:

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

Пока planned migration проходит в заявленном impact window, ее не следует добавлять в таблицу аварий как incident.

Но missed customer deadline может вызвать outage уже на стороне клиента, например:

- старый MariaDB API v1 integration перестает работать;
- In-Memory DB v1 выключается 31 августа;
- Terraform использует obsolete endpoint;
- PostgreSQL management automation продолжает использовать BASIC auth.

Это operational risk, но не provider incident в том же смысле, что Cloud API outage.

## Практический вывод

- мониторить data plane и control plane раздельно;
- IaC pipeline должен иметь retry на временные API errors;
- не считать работающий GPU гарантией возможности повторного запуска;
- перед disaster recovery проверять capacity alternate location;
- AI integration должна иметь timeout/retries/fallback;
- иметь export IaC и план развёртывания у другого provider;
- подписаться на status notifications;
- scheduled migration deadlines переносить в собственный operational calendar;
- не вычислять downtime по возрасту незакрытой status-page записи.

## Связанные материалы

- [IONOS provider card](../../providers/ionos.md)
- [IONOS DBaaS migrations — август 2026](../../info/ionos-dbaas-migrations-2026.md)
- [Методика журнала инцидентов](./coverage.md)

## Источник

- [IONOS Cloud Status](https://status.ionos.cloud/)
