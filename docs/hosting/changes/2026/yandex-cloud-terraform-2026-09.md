---
title: "Yandex Cloud Terraform Provider 0.226.0–0.228.0"
description: "Изменения Terraform Provider Yandex Cloud 7–14 сентября 2026 года: PostgreSQL, ClickHouse Connection Manager, Airflow GitSync, MongoDB и исправления restore"
icon: fa-solid fa-code-branch
category: Хостинг
tag: [Хостинг, Yandex Cloud, Terraform, PostgreSQL, ClickHouse, Airflow, MongoDB, IaC, "2026"]
---

# Yandex Cloud Terraform Provider 0.226.0–0.228.0

- [Основная карточка Yandex Cloud](../../providers/yandex-cloud.md)
- [Изменения Yandex Cloud в 2026 году](./yandex-cloud.md)

В сентябре 2026 года Yandex Cloud выпустил несколько заметных версий Terraform Provider. Для инфраструктуры как кода это полезнее фиксировать отдельно от маркетинговых новостей: изменения затрагивают схемы managed services, restore и работу с секретами.

Дополнение по **0.228.0 от 14 сентября** проверено **15 сентября 2026 года**. Сведения о 0.226.0–0.227.0 сохранены; адрес статьи не меняется.

## 0.228.0 — 14 сентября 2026

По [официальным release notes](https://yandex.cloud/en/docs/terraform/release-notes) добавлена поддержка каталогов Connection Manager для Managed ClickHouse:

- `connection_manager` — в `yandex_mdb_clickhouse_cluster_v2`;
- `user_connection_manager` — в `yandex_mdb_clickhouse_user`.

Для `yandex_mdb_postgresql_cluster_v2` исправлена проверка `statements_sampling_interval`: допустимый диапазон теперь **1–86400 секунд**, в соответствии с API и ресурсом `yandex_mdb_postgresql_cluster`. Это исправление схемы Terraform-ресурса, а не изменение версии PostgreSQL или заявление об аварии базы данных.

Перед обновлением сравните `terraform plan` на прежнем и новом provider в тестовом workspace. Для ClickHouse проверьте выбранный каталог Connection Manager и необходимые права; для PostgreSQL — существующее значение `statements_sampling_interval`, в том числе граничные значения в отдельной тестовой конфигурации. Не меняйте рабочую настройку только ради проверки валидатора и не выполняйте `apply`, если план неожиданно предлагает замену кластера.

## 0.227.0 — 10 сентября 2026

Официальные release notes указывают три изменения:

- **Managed PostgreSQL:** добавлена поддержка PostgreSQL 19;
- **Managed Airflow:** GitSync-источник DAG теперь поддерживает аутентификацию по `username + password`;
- **Managed MongoDB:** для `yandex_mdb_mongodb_user` добавлены write-only атрибуты пароля.

### Почему это важно

Поддержка PostgreSQL 19 убирает один из барьеров для описания новых кластеров через Terraform. Write-only password attributes уменьшают необходимость держать чувствительное значение в читаемом состоянии внутри конфигурации провайдера, но сами по себе не отменяют требования к защите Terraform state и backend.

Для Airflow GitSync появление username/password удобно для приватных Git-источников, однако перед production-использованием нужно отдельно проверить, где именно сохраняются credentials и что попадает в state/plan/logs.

## 0.226.0 — 7 сентября 2026

Предыдущий релиз также содержит несколько практически важных изменений:

- MongoDB: блок `operation_profiling` с `slow_op_threshold` и `slow_op_sample_rate` для `mongos`;
- OpenSearch: новый data source пользователя с Connection Manager connection ID;
- MySQL: `restore.source_cluster_id`;
- MySQL: `restore.time` больше не подставляет текущее время автоматически;
- MySQL: добавлена runtime-проверка непустого `restore.backup_id`;
- PostgreSQL: корректировки `subnet_id` в `yandex_mdb_postgresql_cluster_v2`;
- CDN: чтение ресурсов допускается даже при недоступности shielding API.

Исправление `restore.time` особенно важно для автоматизации восстановления: поведение restore не должно незаметно зависеть от момента запуска `terraform apply`.

## Что проверить перед обновлением provider

1. Зафиксировать текущую версию provider в `required_providers` и сохранить `.terraform.lock.hcl`.
2. Обновить provider сначала в тестовом workspace.
3. Выполнить `terraform init -upgrade` и внимательно проверить `terraform plan`.
4. Отдельно проверить managed PostgreSQL, MongoDB, MySQL restore и Airflow GitSync, если они используются; для 0.228.0 — ClickHouse Connection Manager и `statements_sampling_interval` в PostgreSQL v2.
5. Не считать write-only поля полноценным secret manager: state, CI-логи и доступ к backend всё равно требуют защиты.
6. Для restore-сценариев выполнить отдельный тест восстановления, а не ограничиваться отсутствием diff в плане.

## Влияние на оценку провайдера

Оснований менять категорию Yandex Cloud **«Рекомендую»** нет. Это положительное развитие официального IaC-инструментария. При этом новая возможность в provider не является гарантией доступности соответствующей версии или функции во всех зонах и конфигурациях — поддержку конкретного managed service нужно проверять отдельно.

## Источник

- [Yandex Cloud — Terraform provider release notes](https://yandex.cloud/en/docs/terraform/release-notes)
