---
title: Изменения хостинг-провайдеров в 2026 году
description: Тарифы, локации, новые услуги, API, SLA и юридические изменения провайдеров в 2026 году
index: true
icon: fa-solid fa-calendar-days
category: Хостинг
tag: [Хостинг, Провайдеры, Изменения, "2026"]
---

# Изменения хостинг-провайдеров в 2026 году

Здесь собрана накопительная хронология значимых неаварийных изменений провайдеров за 2026 год.

Последняя полная перепроверка публичных источников: **2 сентября 2026 года**. Выборочное дополнение по IAM Yandex Cloud и DBaaS IONOS: **7 сентября 2026 года**. Релиз CLO, GPT Model Hub MWS и сетевое окно VMware Selectel добавлены **10 сентября**. Закрытие Serverless Integrations и окна Selectel 16–17 сентября добавлены **11 сентября**. Эти дополнения не являются новой полной проверкой watchlist.

| Провайдер | Основные изменения | Материал |
| --- | --- | --- |
| Yandex Cloud | цены, зона `ru-central1-e`, OAuth и IAM; закрытие Serverless Integrations и миграция EventRouter | [Изменения Yandex Cloud](./yandex-cloud.md) · [Инструкция миграции](../../info/yandex-serverless-integrations-sunset-2026.md) |
| IONOS Cloud | августовские миграции DBaaS; PostgreSQL API v1 отключается 28 сентября, нужны региональный API v2 и TOKEN auth | [DBaaS: сроки и миграция](../../info/ionos-dbaas-migrations-2026.md) |
| CLO | модернизация платформы 8 сентября: IXcellerate, OpenStack/OpenSDN, DPDK, DBaaS и Terraform | [Изменения CLO](./clo.md) |
| MWS | GLM-5.3 в GPT Model Hub: локальное размещение, готовность и тарификация API | [Изменения MWS](./mws.md) |
| Cloud.ru | Kubernetes 1.35, DataPlane V2, ротация сертификатов и security fixes | [Изменения Cloud.ru](./cloudru.md) |
| Sprinthost / Sprintbox | цены, S3 beta, backup Sprintbox и GlobalSign | [Изменения Sprinthost и Sprintbox](./sprinthost.md) |
| Fornex | сеть 300 Мбит/с, NVMe v5, ARM и готовые AI-образы | [Изменения Fornex](./fornex.md) |
| VDSka | рост цен, уменьшение трафика Казахстана, перенос Dallas и плановый перенос оборудования Miami 31 августа | [Изменения VDSka](./vdska.md) |
| SpaceWeb | SLA, почасовой биллинг VPS и новые условия S3 | [Изменения SpaceWeb](./spaceweb.md) |
| Beget | новые VPS/DBaaS, сегмент 152-ФЗ, закрытие Латвии и тарификация CDN-запросов с 15 сентября | [Изменения Beget](./beget.md) |
| Selectel | GPU и готовые приложения; работы BGP/L3VPN/VMware, внешняя сеть MSK-1 и управляющий слой `ru-1` | [Изменения Selectel](./selectel.md) · [Сентябрьские работы](./selectel-2026-09-04.md) |
| AdminVPS | новые лимиты трафика и цены услуг | [Изменения AdminVPS](./adminvps.md) |
| Lincore.kz | НДС 16%, новые кластеры и GPU Blackwell | [Изменения Lincore.kz](./lincore.md) |
| Timeweb Cloud | Kubernetes, App Platform, OpenSearch, CDN/S3 и AI-функции | [Изменения Timeweb Cloud](./timeweb-cloud.md) |
| Aéza | новая локация WAW в Польше и актуальная модель VPS | [Изменения Aéza](./aeza.md) |
| McHost | НДС 5% и рост цен виртуального хостинга | [Изменения McHost](./mchost.md) |
| HostVDS | расчеты европейских серверов в евро и обновление панели | [Изменения HostVDS](./hostvds.md) |
| Wispbyte | миграция румынских IPv4 и новые игровые планы | [Изменения Wispbyte](./wispbyte.md) |

## Что находится в других разделах

- аварии и деградации за 2026 год — в [журнале инцидентов](../../incidents/2026/);
- текущее состояние и итоговая оценка — в [карточках провайдеров](../../providers/);
- общие инструкции и сравнения — в [информационных материалах](../../info/).

Не создается отдельная страница «новостей нет». Если у провайдера не найдено подтвержденного значимого изменения, его карточка остается без шумового обновления.
