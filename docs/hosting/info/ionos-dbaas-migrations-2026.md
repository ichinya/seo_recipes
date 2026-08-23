---
title: IONOS DBaaS — миграции API v1 → v2 в августе 2026
description: Дедлайны PostgreSQL, MariaDB и In-Memory DB, изменения storage, API, Terraform, Valkey и цен в IONOS Cloud
icon: fa-solid fa-database
category: Хостинг
tag: [IONOS, IONOS Cloud, DBaaS, PostgreSQL, MariaDB, Valkey, Redis, Terraform, API, Миграция, 2026]
---

# IONOS DBaaS: обязательные миграции v1 → v2 в августе 2026

В августе 2026 года IONOS Cloud одновременно переводит несколько DBaaS-продуктов на инфраструктуру/API v2.

Для владельца приложения это важнее обычного product update: часть migration автоматическая, но **API, Terraform, SDK, authentication и endpoints** в отдельных сервисах требуют действий клиента до конца августа.

## Короткий календарь

| Дата | Сервис | Что происходит |
| --- | --- | --- |
| 4 августа | In-Memory DB | запрещено создание новых v1 clusters |
| 14 августа | PostgreSQL | дедлайн перехода programmatic management с BASIC на TOKEN auth был до начала migration |
| 17 августа | PostgreSQL | началась автоматическая migration v1 → v2 |
| 17 августа | MariaDB | запрещено создание новых v1 clusters |
| 24–28 августа | MariaDB | автоматическая migration existing clusters на API v2 |
| 31 августа | PostgreSQL | завершается окно общей infrastructure migration |
| 31 августа | MariaDB | API v1 EOL; integrations должны использовать v2 |
| 31 августа | In-Memory DB | v1 полностью выключается; требуется manual migration |
| 1 сентября | In-Memory DB | начинает действовать pricing новых snapshot-возможностей v2 |

Перед выполнением действий проверяйте status page и актуальную product documentation: IONOS может уточнять окна и инструкции.

# PostgreSQL: автоматическая инфраструктурная миграция

IONOS запланировал автоматический перенос DBaaS PostgreSQL с v1 infrastructure на v2 с **17 по 31 августа 2026 года**.

## Что делает IONOS автоматически

По status page:

- cluster migration выполняется провайдером;
- connection endpoint остается прежним;
- для отдельного cluster ожидается короткое окно недоступности, обычно несколько секунд;
- весь DBaaS service одновременно не выключается.

Это означает, что application должен нормально переживать кратковременный disconnect/reconnect.

## TOKEN authentication для management API

PostgreSQL v2 не поддерживает BASIC authentication для cluster management.

Если PostgreSQL управляется через:

- API scripts;
- SDK;
- Terraform;
- другие IaC tools;

нужно использовать **TOKEN authentication**.

Проверить automation:

```text
CI/CD
  ↓
Terraform / API / SDK
  ↓
IONOS authentication
  ↓
PostgreSQL management endpoint
```

Если внутри pipeline все еще hardcoded BASIC credentials, migration data plane может пройти успешно, но management automation перестанет работать.

## SSD Premium становится обязательным

В PostgreSQL v2 используется только **SSD Premium** storage.

Кластеры, которые были на:

- HDD;
- SSD Standard;

автоматически переводятся на SSD Premium и после migration тарифицируются по standard SSD Premium rate.

Это нужно считать не только техническим upgrade, но и **изменением стоимости**.

Перед migration сохраните текущий baseline:

```text
cluster
storage class
allocated GB
monthly storage cost
backup cost
observability cost
```

После migration сравните invoice/detailing.

## Observability

IONOS предлагает optional integration с Logging/Monitoring.

Она тарифицируется отдельно при использовании, поэтому не стоит включать ее автоматически во всех environments без оценки:

- объема metrics/logs;
- retention;
- cardinality;
- стоимости.

# MariaDB: automatic cluster migration, manual API migration

Для MariaDB нужно разделять две вещи:

1. migration самого database cluster;
2. migration клиента/automation с API v1 на API v2.

## 17 августа: v1 provisioning закрыт

После 17 августа новые MariaDB v1 clusters создавать нельзя.

Старый CI pipeline вроде:

```text
terraform apply
  ↓
MariaDB API v1 create cluster
```

будет получать отказ даже до окончательного EOL API.

## 24–28 августа: existing clusters мигрируются автоматически

IONOS заявляет:

- zero downtime для database workload в рамках planned migration;
- connection strings остаются прежними;
- cluster migration не требует ручного действия.

При этом API clients нужно обновить отдельно.

## 31 августа: API v1 End of Life

До дедлайна должны быть обновлены:

- custom API scripts;
- Terraform configurations/providers;
- SDK integrations;
- internal platform tooling.

Проверка репозитория:

```bash
grep -RniE 'mariadb.*v1|api.*v1|ionos' . \
  --exclude-dir=.git \
  --exclude-dir=vendor \
  --exclude-dir=node_modules
```

Команда не гарантирует обнаружение всех references, но полезна как первый аудит.

## MariaDB versions

В status announcement для v2 перечислены актуальные варианты, включая современные ветки MariaDB. Если используется MariaDB 10.6, IONOS отдельно предлагает запланировать переход на более новую доступную версию до конца августа.

Перед major DB upgrade отдельно проверьте:

- SQL modes;
- collation;
- reserved keywords;
- replication;
- ORM compatibility;
- query plans;
- backup restore.

Не объединяйте API migration и database-engine major upgrade в один production change без необходимости.

# In-Memory DB: самый критичный дедлайн

IONOS In-Memory DB v1 отличается от PostgreSQL/MariaDB тем, что **automatic migration невозможна**.

Клиент должен вручную создать v2 instance, перенести данные и обновить application endpoint.

## 31 августа v1 выключается

IONOS прямо указывает, что оставшиеся v1 instances будут permanently switched off.

Если приложение все еще использует старый endpoint, после дедлайна это уже не «deprecated warning», а service interruption.

## v2 основан на Valkey

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

## Migration flow

```text
v1 In-Memory DB
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
keep rollback window
      ↓
remove v1 dependency before 31 Aug
```

## Не все Redis-like данные нужно переносить

Если instance используется только как disposable cache, migration может означать создание пустого v2 и постепенный warm-up.

Если там находятся:

- sessions;
- queues;
- locks;
- rate-limit state;
- durable application data;

нужно отдельно определить migration strategy.

Особенно опасно считать queue/cache одинаково disposable.

# Snapshot pricing

Для In-Memory DB v2 новые snapshot features получают standard pricing с **1 сентября 2026 года**.

Перед включением long retention посчитайте:

```text
number of snapshots
× snapshot size
× retention
× price
```

и сравните с реальной ценностью restore point.

# Что проверить в Terraform

Ищите:

```text
v1 resource types
v1 endpoints
BASIC credentials
old providers/modules
old generated SDK clients
```

Перед production:

```bash
terraform init -upgrade
terraform validate
terraform plan
```

Не применяйте `terraform apply` только потому, что plan выглядит коротким: внимательно проверьте, не предлагает ли provider recreate database resource вместо in-place adoption.

# Что проверить в CI/CD

Checklist:

```text
[ ] API URL updated
[ ] token auth configured
[ ] secrets stored in secret manager
[ ] old BASIC credentials removed
[ ] Terraform/provider updated
[ ] SDK version updated
[ ] smoke test uses v2
[ ] rollback documented
```

# Application resilience во время migration

Даже для «zero downtime» migration application должен уметь пережить краткий network/database hiccup.

## PostgreSQL/MariaDB

Проверьте:

- connection pool;
- reconnect;
- transaction retry policy;
- timeout;
- healthcheck;
- circuit breaker, если используется.

Не делайте автоматический retry всех transactions без проверки idempotency.

## In-Memory DB

Проверьте поведение при:

- temporary connection failure;
- DNS/endpoint switch;
- empty cache;
- partial migrated data;
- old/new cluster race.

# Backup до migration

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

# Мониторинг

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

# Стоимость

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

# Отдельно: IP Reservation incident 21 августа

21 августа 2026 года IONOS status page зафиксировала отдельный control-plane incident: невозможно было резервировать и управлять IP blocks через DCD и API.

Это **не часть DBaaS migration**.

Событие важно как пример того, почему management plane нужно мониторить отдельно от работающих workloads.

На момент проверки 23 августа status page все еще показывала событие как identified без финального resolved update.

Не следует вычислять «длительность простоя» по времени открытой status-записи, пока provider не закрыл incident и не уточнил фактическое воздействие.

# Приоритет действий до 31 августа

## P0 — In-Memory DB v1

Если используется — manual migration обязательна до отключения.

## P0 — MariaDB automation на API v1

Обновить API/Terraform/SDK до v2.

## P1 — PostgreSQL management auth

Проверить TOKEN authentication и стоимость SSD Premium после migration.

## P1 — Billing

Сравнить storage/snapshot/observability charges.

## P2 — cleanup

После успешной migration удалить:

- старые credentials;
- dead code v1;
- legacy endpoints;
- obsolete Terraform modules;
- временные migration flags.

# Итоговый checklist

```text
PostgreSQL
[ ] TOKEN auth
[ ] v2 management works
[ ] cluster reconnected
[ ] SSD Premium cost checked
[ ] backup checked

MariaDB
[ ] no new v1 provisioning
[ ] cluster migration monitored
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
[ ] v1 removed before Aug 31
[ ] snapshot pricing reviewed
```

# Источники

- [IONOS Cloud Status](https://status.ionos.cloud/)
- [IONOS Token Manager](https://docs.ionos.com/cloud/set-up-ionos-cloud/management/identity-access-management/token-manager)
- [IONOS DBaaS documentation](https://docs.ionos.com/cloud/databases)
- [IONOS In-Memory DB migration documentation](https://docs.ionos.com/cloud/databases/in-memory-db/how-tos/migrate-from-v1-v2)
