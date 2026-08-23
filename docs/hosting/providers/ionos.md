---
title: IONOS
description: Заметка по IONOS VPS, облачной платформе, DBaaS и рискам для пользователей из РФ
icon: fa-solid fa-triangle-exclamation
category: Хостинг
tag: [Хостинг, VPS, IONOS, IONOS Cloud, Германия, Европа, Риски, Инциденты, DBaaS]
---

# IONOS

IONOS — крупный немецкий хостинг и облачный провайдер. В заметку он попал по отзыву от 2 июня 2026 года: «говорят, что IONOS в РФ еще работает».

Это стоит считать не рекомендацией, а кандидатом на проверку. Главный вопрос для пользователя из России — не только характеристики VPS, но и возможность легально и стабильно завести аккаунт, оплатить услугу и не попасть под закрытие из-за резидентства.

## Что есть по тарифам

На немецкой странице VPS на момент проверки были указаны Linux VPS от 2 евро в месяц на первые 6 месяцев. В младшем тарифе `Linux S+` заявлялись:

- 2 vCPU;
- 2 ГБ RAM;
- 80 ГБ NVMe;
- установка 10 евро;
- неограниченный трафик до 1 Гбит/с;
- IPv6-сеть включена;
- 1 IPv4 включен, дополнительные IPv4 — 5 евро в месяц;
- Plesk Obsidian — 5 евро в месяц.

Также заявлены Windows Server, KVM-консоль, Cloud Panel, root-доступ и круглосуточная поддержка. Цены и промопериоды перед покупкой нужно перепроверять.

## Инциденты и операционные риски

В 2026 году официальная status-панель IONOS Cloud фиксировала:

- периодическую недоступность control plane Managed Kubernetes;
- ошибки provisioning, Cloud API и Data Center Designer;
- ограничения свободной емкости GPU;
- невозможность создать некоторые MongoDB-кластеры во Frankfurt East;
- временную остановку автоматического обслуживания Kubernetes из-за высокой нагрузки;
- 21 августа — невозможность резервировать и управлять IP blocks через DCD и API.

- [Инциденты IONOS Cloud в 2026 году](../incidents/2026/ionos.md)
- [Официальная status-панель](https://status.ionos.cloud/)

Важно различать control plane и workloads: уже запущенные приложения могли работать, когда API управления кластером или создание новых ресурсов были недоступны.

## DBaaS: обязательные миграции августа 2026

В августе IONOS одновременно переводит несколько database services на v2.

Это отдельный operational risk, потому что часть изменений выполняется автоматически, а часть требует действий клиента.

Подробно:

- [IONOS DBaaS — миграции API v1 → v2 в августе 2026](../info/ionos-dbaas-migrations-2026.md)

### PostgreSQL

С 17 по 31 августа проходит автоматическая infrastructure migration DBaaS PostgreSQL v1 → v2.

Ключевые изменения:

- management API требует TOKEN authentication вместо BASIC;
- HDD/SSD Standard clusters автоматически переводятся на SSD Premium;
- после migration применяется цена SSD Premium;
- optional Observability оплачивается отдельно;
- endpoint database connection остается прежним, но на cluster возможен короткий disconnect во время migration.

Если PostgreSQL управляется через Terraform/API/SDK, automation нужно проверить отдельно от самой доступности базы.

### MariaDB

- с 17 августа нельзя создавать новые v1 clusters;
- 24–28 августа existing v1 clusters автоматически мигрируются на v2;
- 31 августа MariaDB API v1 достигает EOL;
- API scripts, Terraform и SDK должны быть переведены на v2.

Сам database cluster может быть мигрирован автоматически, но это не обновляет клиентский IaC-код.

### In-Memory DB / Valkey

Самый жесткий deadline:

- новые v1 instances запрещены с 4 августа;
- 31 августа v1 полностью выключается;
- automatic migration невозможна;
- клиент должен создать v2 instance, перенести необходимые данные и изменить endpoint;
- v2 использует Valkey;
- с 1 сентября начинает применяться pricing новых snapshot-возможностей.

Если In-Memory DB используется для sessions/queues/locks, migration нужно считать production-critical, а не обычной заменой cache.

## Что проверить пользователю IONOS Cloud до 31 августа

```text
[ ] PostgreSQL TOKEN auth
[ ] PostgreSQL storage class / new cost
[ ] MariaDB API v2
[ ] MariaDB Terraform/SDK v2
[ ] In-Memory DB v1 отсутствует
[ ] Valkey endpoint tested
[ ] DB backups checked
[ ] IaC plan tested
[ ] invoice forecast reviewed
```

## Плюсы

- крупный европейский провайдер, не мелкий реселлер;
- есть VPS, облачные серверы и managed-сервисы;
- есть Linux и Windows;
- есть публичная информация по дата-центрам;
- инфраструктура IONOS Cloud размещается в США и Европе;
- есть открытая status-панель с техническими обновлениями;
- status page заранее публикует часть migration/deprecation deadlines.

## Минусы и риски

- официальная позиция IONOS по России остается жесткой: компания писала, что не принимает новые клиентские контракты из России и прекращает существующие отношения с российскими клиентами;
- даже если сайт открывается и заказ технически проходит, аккаунт может попасть под проверку или закрытие позже;
- оплата российскими картами, адрес биллинга, телефон и документы могут стать проблемой;
- цены в евро, возможны НДС и комиссии;
- дополнительный IPv4 и панели управления могут быть платными;
- в облаке встречались сбои управляющего слоя и ограничения свободной емкости;
- остановленный GPU-сервер при дефиците ресурсов может не запуститься повторно;
- managed products могут иметь обязательные API migrations с жестким deadline;
- автоматическая infrastructure migration не гарантирует, что Terraform/SDK/API automation обновится автоматически;
- PostgreSQL migration может изменить storage class и стоимость;
- In-Memory DB v1 требует manual migration до отключения.

## Что проверить

### Аккаунт и санкционные риски

- открывается ли сайт и личный кабинет напрямую из РФ;
- можно ли зарегистрировать новый аккаунт с российскими данными;
- какие страны доступны в биллинге;
- проходит ли оплата выбранным способом;
- не приходит ли запрос на KYC после оплаты;
- не блокируют ли аккаунт после запуска VPS.

### Инфраструктура

- какой дата-центр реально выдается;
- какой пинг и трассировка из РФ;
- можно ли быстро выгрузить бэкап или образ;
- достаточно ли свободной емкости в резервной локации;
- как приложение переживает недоступность Cloud API или Kubernetes control plane.

### DBaaS

- нет ли ресурсов на v1 API;
- нет ли hardcoded BASIC auth;
- Terraform provider/modules актуальны;
- In-Memory DB переведен на v2;
- стоимость storage/snapshots после migration приемлема;
- restore процедуры проверены.

## Итог

Технически IONOS выглядит сильнее многих небольших VPS-провайдеров: это крупная компания, развитая инфраструктура и понятные дата-центры. Но для пользователя из РФ главный риск — аккаунт, оплата и санкционная политика.

Для IONOS Cloud дополнительно нужно учитывать:

- доступность управляющего слоя;
- свободную емкость;
- migration/deprecation lifecycle managed services;
- возможность роста стоимости после infrastructure upgrade.

Категорию **«Рискованные»** менять не нужно: новые DBaaS migration deadlines добавляют operational risk, но основной санкционный риск уже был достаточным основанием для этой категории.

Для важных проектов обязательны независимые бэкапы, IaC export и готовый план переезда.

## Источники

- [IONOS VPS](https://www.ionos.de/server/vps)
- [IONOS Newsroom: We stand with Ukraine](https://www.ionos.com/newsroom/news/we-stand-with-ukraine/)
- [IONOS Cloud Data Centers](https://cloud.ionos.com/data-centers)
- [IONOS Cloud Status](https://status.ionos.cloud/)
- [IONOS DBaaS migration checklist](../info/ionos-dbaas-migrations-2026.md)
