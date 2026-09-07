---
title: IONOS DBaaS — миграции API v1 → v2 в августе–сентябре 2026
description: Дедлайн PostgreSQL API v1 28 сентября, миграции MariaDB и In-Memory DB, storage, Terraform, Valkey и цены IONOS Cloud
icon: fa-solid fa-database
category: Хостинг
tag: [IONOS, IONOS Cloud, DBaaS, PostgreSQL, MariaDB, Valkey, Redis, Terraform, API, Миграция, 2026]
---

# IONOS DBaaS: обязательные миграции v1 → v2 в августе–сентябре 2026

В августе 2026 года IONOS Cloud переводил несколько DBaaS-продуктов на инфраструктуру/API v2. Проверка актуальных статусов: **7 сентября 2026 года**.

Ближайший дедлайн — **28 сентября, 14:00–16:00 UTC**: окончательное отключение PostgreSQL API v1. Автоматическая миграция кластеров не обновляет API-клиенты, Terraform и SDK пользователя.

## Короткий календарь

| Дата | Сервис | Что происходит |
| --- | --- | --- |
| 4 августа | In-Memory DB | запрещено создание новых v1 clusters |
| 14 августа | PostgreSQL | первоначальный дедлайн перехода programmatic management с BASIC на TOKEN auth перед миграцией |
| 17–31 августа | PostgreSQL | автоматическая infrastructure migration; провайдер отметил завершение 31 августа в 17:00 UTC |
| 17 августа | MariaDB | запрещено создание новых v1 clusters |
| 24–28 августа | MariaDB | автоматическая migration existing clusters на API v2; окно завершено |
| 31 августа | MariaDB | API v1 EOL; мероприятие закрыто в status-панели |
| 31 августа | In-Memory DB | v1 отключается по объявленному плану; требовалась manual migration, мероприятие закрыто в status-панели |
| 1 сентября | In-Memory DB | действуют новые цены snapshot-возможностей v2 |
| 28 сентября, 14:00–16:00 UTC | PostgreSQL | окончательное отключение management API v1; клиентские инструменты должны использовать региональный API v2 и TOKEN auth |

Перед выполнением действий проверяйте [status page](https://status.ionos.cloud/) и актуальную product documentation: IONOS может уточнять окна и инструкции. Статус завершения работ провайдера не доказывает успешную миграцию конкретного клиентского приложения.

## PostgreSQL: автоматическая инфраструктурная миграция

IONOS выполнял перенос DBaaS PostgreSQL с v1 infrastructure на v2 с **17 по 31 августа 2026 года**. [Окно миграции](https://status.ionos.cloud/) отмечено завершённым 31 августа в 17:00 UTC.

### Что делает IONOS автоматически

По объявлению миграции:

- cluster migration выполняется провайдером;
- connection endpoint остается прежним;
- для отдельного cluster ожидалось короткое окно недоступности, обычно несколько секунд;
- весь DBaaS service одновременно не выключается.

Это означает, что application должен нормально переживать кратковременный disconnect/reconnect.

### 28 сентября — окончательное отключение PostgreSQL API v1

[Официальное уведомление](https://status.ionos.cloud/incidents/2nwv8pmhc870) задаёт окно **28 сентября 2026, 14:00–16:00 UTC** — **17:00–19:00 МСК**. После отключения обращения к API v1 будут отклоняться. Подготовку нужно завершить до начала окна, а не рассчитывать на работу старого API до 16:00 UTC.

Это выключение **API управления**, а не PostgreSQL-протокола приложения. Провайдер не ожидает простоя уже перенесённых баз. Рабочий SQL-запрос, однако, не проверяет возможность создать кластер или управлять им через CI/CD.

До окна:

1. Найдите обращения к v1 в репозиториях инфраструктуры, cron, CI variables и внутренних панелях. Сохраняйте только имена файлов и настройки endpoint, не содержимое credentials.
2. Выберите региональный v2 endpoint из официальной документации своего региона; не конструируйте его заменой строки `v1` на `v2`.
3. Обновите SDK и Terraform provider/modules, затем проверьте read-only запрос к API и `terraform plan` без применения изменений.
4. Убедитесь, что план не пересоздаёт существующую БД. Протестируйте создание и удаление только отдельного временного кластера.
5. Назначьте ответственного за переключение и мониторинг API-ошибок после окна.

После отключения возврат к API v1 не является rollback. Нужна сохранённая рабочая конфигурация v2, проверенный доступ через поддерживаемые инструменты и резервные копии данных.

### TOKEN authentication для management API

PostgreSQL v2 не поддерживает BASIC authentication для cluster management.

Если PostgreSQL управляется через:

- API scripts;
- SDK;
- Terraform;
- другие IaC tools;

нужно использовать **TOKEN authentication**. Это не требование заменить SQL-пользователя и пароль приложения токеном Cloud API.

Проверить automation:

```text
CI/CD
  ↓
Terraform / API / SDK
  ↓
IONOS authentication
  ↓
региональный PostgreSQL API v2
```

Если внутри pipeline все еще hardcoded BASIC credentials, migration data plane может пройти успешно, но management automation перестанет работать. Токен храните в secret manager, исключите его из debug-логов и подготовьте процедуру ротации.

### SSD Premium становится обязательным

В PostgreSQL v2 используется только **SSD Premium** storage.

Кластеры, которые были на:

- HDD;
- SSD Standard;

автоматически переводятся на SSD Premium и после migration тарифицируются по standard SSD Premium rate.

Это нужно считать не только техническим upgrade, но и **изменением стоимости**.

Сравните сохранённый baseline до миграции с текущим состоянием:

```text
cluster
storage class
allocated GB
monthly storage cost
backup cost
observability cost
```

После migration сравните invoice/detailing.

### Observability

IONOS предлагает optional integration с Logging/Monitoring.

Она тарифицируется отдельно при использовании, поэтому не стоит включать ее автоматически во всех environments без оценки:

- объема metrics/logs;
- retention;
- cardinality;
- стоимости.

## MariaDB: automatic cluster migration, manual API migration

Для MariaDB нужно разделять две вещи:

1. migration самого database cluster;
2. migration клиента/automation с API v1 на API v2.

### 17 августа: v1 provisioning закрыт

После 17 августа новые MariaDB v1 clusters создавать нельзя.

Старый CI pipeline вроде:

```text
terraform apply
  ↓
MariaDB API v1 create cluster
```

будет получать отказ даже до окончательного EOL API.

### 24–28 августа: existing clusters мигрировались автоматически

Для planned migration IONOS заявлял:

- zero downtime для database workload;
- сохранение connection strings;
- отсутствие необходимости ручного переноса cluster.

При этом API clients нужно обновить отдельно. В status-панели окно отмечено завершённым.

### 31 августа: API v1 End of Life

Дедлайн уже прошёл. Должны быть обновлены:

- custom API scripts;
- Terraform configurations/providers;
- SDK integrations;
- internal platform tooling.

Первый аудит ссылок без вывода строк с возможными секретами:

```bash
grep -RlniE 'mariadb.*v1|api.*v1|ionos' . \
  --exclude-dir=.git \
  --exclude-dir=vendor \
  --exclude-dir=node_modules
```

Команда показывает только имена файлов и не гарантирует обнаружение всех references.

### MariaDB versions

В status announcement для v2 перечислены актуальные варианты, включая современные ветки MariaDB. Для MariaDB 10.6 IONOS отдельно требовал запланировать переход на поддерживаемую версию до конца августа. Если такая зависимость осталась, проверьте текущую поддержку и согласуйте миграцию без промедления.

Перед major DB upgrade отдельно проверьте:

- SQL modes;
- collation;
- reserved keywords;
- replication;
- ORM compatibility;
- query plans;
- backup restore.

Не объединяйте API migration и database-engine major upgrade в один production change без необходимости.

## In-Memory DB: дедлайн уже прошёл

IONOS In-Memory DB v1 отличается от PostgreSQL/MariaDB тем, что **automatic migration невозможна**.

Клиент должен вручную создать v2 instance, перенести данные и обновить application endpoint.

### 31 августа — отключение v1

IONOS указывал, что оставшиеся v1 instances будут permanently switched off. Мероприятие отмечено завершённым 31 августа; рассчитывать на работоспособность старого endpoint нельзя.

Если миграция пропущена, сначала уточните у поддержки возможность получения оставшихся данных и восстанавливайте их только из подтверждённого источника. Наличие доступного backup не следует предполагать автоматически.

### v2 основан на Valkey

Новая платформа использует **Valkey**.

IONOS указывает совместимость со стандартными Redis clients, поэтому application code часто не требует существенной переделки.

Но необходимо тестировать:

- protocol compatibility;
- authentication;
- TLS;
- endpoint/port;
- persistence model;
- eviction policy;
- TTL;
- scripts/Lua;
- client-specific options.

### Migration flow

```text
подтверждённый источник данных / backup
      ↓
create v2 Valkey instance
      ↓
copy data if persistence required
      ↓
verify counts / keys / TTL
      ↓
change application endpoint
      ↓
observe errors/latency
      ↓
remove remaining v1 dependencies
```

Исторический план предусматривал переключение до 31 августа. После EOL нельзя обещать rollback на выключенный v1 instance.

### Не все Redis-like данные нужно переносить

Если instance используется только как disposable cache, migration может означать создание пустого v2 и постепенный warm-up.

Если там находятся:

- sessions;
- queues;
- locks;
- rate-limit state;
- durable application data;

нужно отдельно определить migration strategy.

Особенно опасно считать queue/cache одинаково disposable.

## Snapshot pricing

Для In-Memory DB v2 новые snapshot features получают standard pricing с **1 сентября 2026 года**.

Перед включением long retention посчитайте:

```text
number of snapshots
× snapshot size
× retention
× price
```

и сравните с реальной ценностью restore point.

## Что проверить в Terraform

Ищите:

```text
v1 resource types
v1 endpoints
BASIC credentials
old providers/modules
old generated SDK clients
```

В отдельной рабочей ветке, после сохранения lockfile и защищённой копии state:

```bash
terraform init -upgrade
terraform validate
terraform plan
```

Не применяйте `terraform apply` только потому, что plan выглядит коротким: внимательно проверьте, не предлагает ли provider recreate database resource вместо in-place adoption. State и вывод plan могут содержать секреты — не публикуйте их в PR и общедоступных логах.

## Что проверить в CI/CD

Checklist:

```text
[ ] regional API v2 URL configured
[ ] token auth configured
[ ] secrets stored in secret manager
[ ] old BASIC credentials removed from management integrations
[ ] Terraform/provider updated
[ ] SDK version updated
[ ] read-only smoke test uses v2
[ ] test-cluster lifecycle verified
[ ] rollback does not depend on disabled v1
```

## Application resilience во время migration

Даже для «zero downtime» migration application должен уметь пережить краткий network/database hiccup.

### PostgreSQL/MariaDB

Проверьте:

- connection pool;
- reconnect;
- transaction retry policy;
- timeout;
- healthcheck;
- circuit breaker, если используется.

Не делайте автоматический retry всех transactions без проверки idempotency.

### In-Memory DB

Проверьте поведение при:

- temporary connection failure;
- DNS/endpoint switch;
- empty cache;
- partial migrated data;
- old/new cluster race в период переключения.

## Backup до migration

Managed migration не отменяет независимый backup.

Для критичных databases желательно иметь:

```text
provider backup
+
logical export / tested recovery path
+
backup outside same failure domain
```

В зависимости от DB size и RPO/RTO стратегия будет разной.

## Мониторинг

Перед и после migration сравните:

- connection errors;
- query latency;
- connection count;
- storage latency;
- CPU;
- memory;
- backup status;
- failed Terraform/API operations;
- application 5xx.

Зафиксируйте baseline до окна, иначе после migration трудно доказать regression.

## Стоимость

PostgreSQL migration может увеличить storage cost из-за перехода HDD/SSD Standard → SSD Premium.

In-Memory DB меняет snapshot pricing с 1 сентября.

Optional Observability также может иметь отдельную стоимость.

Поэтому migration checklist должен содержать не только техническое «работает», но и:

```text
invoice forecast
usage details
storage class
observability usage
snapshot retention
```

## Отдельно: IP Reservation incident 21–23 августа

Невозможность резервировать и управлять IP blocks через DCD/API была отдельным control-plane incident, а не частью DBaaS migration. Он закрыт 23 августа в 17:49 UTC; актуальная хронология находится в [журнале IONOS Cloud](../incidents/2026/ionos.md).

## Приоритет действий на сентябрь

### P0 — оставшиеся зависимости In-Memory DB и MariaDB v1

Августовские дедлайны прошли. Обновить endpoint/API/Terraform/SDK и проверить необходимые данные, sessions, queues и locks.

### P1 — PostgreSQL management до 28 сентября

Проверить региональный API v2 и TOKEN authentication до 14:00 UTC 28 сентября. Не путать доступность SQL с исправностью management automation.

### P1 — Billing

Сравнить storage/snapshot/observability charges после миграций.

### P2 — cleanup

После успешной migration удалить:

- старые credentials;
- dead code v1;
- legacy endpoints;
- obsolete Terraform modules;
- временные migration flags.

## Итоговый checklist

```text
PostgreSQL
[ ] региональный API v2 до 28 сентября 14:00 UTC
[ ] TOKEN auth для management API
[ ] v2 management works
[ ] cluster reconnected
[ ] SSD Premium cost checked
[ ] backup checked

MariaDB
[ ] no v1 provisioning or management dependencies
[ ] cluster migration verified
[ ] API v2
[ ] Terraform v2
[ ] SDK v2
[ ] DB version reviewed

In-Memory DB
[ ] v2 instance created
[ ] data migration strategy chosen
[ ] data transferred if needed
[ ] endpoint changed
[ ] application verified
[ ] no dependency on decommissioned v1
[ ] snapshot pricing reviewed
```

## Источники

- [IONOS Cloud Status: статусы августовских миграций](https://status.ionos.cloud/)
- [PostgreSQL API v1: отключение 28 сентября](https://status.ionos.cloud/incidents/2nwv8pmhc870)
- [IONOS Token Manager](https://docs.ionos.com/cloud/set-up-ionos-cloud/management/identity-access-management/token-manager)
- [IONOS DBaaS documentation](https://docs.ionos.com/cloud/databases)
- [IONOS In-Memory DB migration documentation](https://docs.ionos.com/cloud/databases/in-memory-db/how-tos/migrate-from-v1-v2)
