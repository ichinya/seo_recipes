---
title: "Yandex Cloud: Serverless Integrations и IoT Core — изменения жизненного цикла 2026"
description: "Сроки завершения сервисов и рекомендации по миграции"
icon: fa-solid fa-cloud
category: Хостинг
tag: [Хостинг, Yandex Cloud, Sunset, Migration, "2026"]
provider: yandex-cloud
year: 2026
---

# Yandex Cloud: изменения жизненного цикла сервисов

## Serverless Integrations

Yandex Cloud объявил завершение жизненного цикла Serverless Integrations.

Ключевые даты:

- 15 сентября 2026 — EventRouter становится доступен только для чтения;
- 8 октября 2026 — прекращение работы Serverless Integrations.

Перед миграцией нужно проверить:

- используемые event flows;
- зависимости между сервисами;
- Terraform/CLI automation;
- backup и возможность восстановления.

## IoT Core

Для Yandex IoT Core также опубликован план завершения:

- сервис закрыт для новых пользователей;
- 1 ноября 2026 — read-only режим;
- 1 декабря 2026 — прекращение работы.

Для миграции нужно проверить:

- MQTT broker;
- устройства и сертификаты;
- retained messages;
- правила маршрутизации;
- monitoring.

## Вывод

При использовании managed-сервисов нужно учитывать не только технические возможности, но и lifecycle policy провайдера.

Для критичных систем стоит иметь:

- экспорт конфигурации;
- независимый backup;
- план миграции;
- тестовый контур.

## Источники

- официальная документация Yandex Cloud
