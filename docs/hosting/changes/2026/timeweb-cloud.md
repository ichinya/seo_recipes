---
title: "Timeweb Cloud в 2026 году: Kubernetes, App Platform, OpenSearch и новые сетевые сервисы"
description: "Отдельная продуктовая хронология Timeweb Cloud без смешивания с журналом инфраструктурных инцидентов"
icon: fa-solid fa-cloud
category: Хостинг
tag: [Хостинг, Timeweb Cloud, Kubernetes, App Platform, OpenSearch, CDN, S3, AI, "2026"]
---

# Timeweb Cloud в 2026 году: Kubernetes, App Platform, OpenSearch и новые сетевые сервисы

- [Основной обзор Timeweb Cloud](../../providers/timeweb-cloud.md)
- [Инциденты Timeweb Cloud в 2026 году](../../incidents/2026/timeweb-cloud.md)
- [AI Gateway Timeweb Cloud](../../providers/timeweb-ai-gateway.md)

Эта страница фиксирует продуктовые изменения. Она не заменяет отдельный журнал аварий: запуск новых функций и надёжность инфраструктуры нужно оценивать раздельно.

## Сетевые сервисы и новые локации в мае

В майском пакете обновлений Timeweb Cloud сообщил о запуске:

- CDN;
- сетевых дисков в Москве, первоначально для Kubernetes;
- виртуальных роутеров во Франкфурте;
- сервиса мониторинга;
- облачных серверов в США;
- IPv6 в Германии и США.

Для нового региона или сетевого сервиса нужно проверить не только наличие в панели:

- SLA;
- исходящий трафик;
- DDoS-защиту;
- latency до РФ;
- резервную локацию;
- поддержку Terraform/API;
- процедуру переноса данных;
- условия удаления и биллинга.

## Изменение конфигурации worker groups

25 августа появилась возможность менять конфигурацию worker-группы Kubernetes после создания.

Ограничения:

- переход возможен только на более высокий тариф или конфигуратор;
- переключение между разными тарифными линейками недоступно;
- worker nodes перезагружаются последовательно.

Последовательный reboot снижает риск полного отключения, но не гарантирует доступность приложения. Перед resize нужно проверить:

- количество реплик;
- PodDisruptionBudget;
- anti-affinity;
- readiness probes;
- запас capacity;
- local volumes;
- время rescheduling;
- поведение single-replica workloads.

```bash
kubectl get pdb -A
kubectl get pods -A -o wide
kubectl top nodes
```

## CSI driver и комментарии к дискам

В том же обновлении CSI driver начал автоматически добавлять в комментарий диска сведения о его назначении.

Это улучшает inventory, но комментарий не заменяет labels, tags и собственный CMDB. После обновления полезно проверить:

- создание нового PVC;
- attach/detach;
- resize;
- snapshot;
- восстановление;
- удаление PV с разными reclaim policies.

## App Platform: web server и private load balancer

21 августа Timeweb Cloud добавил изменение параметров web server приложения:

- redirects;
- HTTP headers;
- compression;
- SPA fallback;
- maximum request body size;
- timeout ожидания response headers.

Также приложение можно подключить к load balancer по private IP.

### Что проверить для сайта

- canonical redirects;
- HTTP→HTTPS;
- `www`/non-`www`;
- cache headers;
- CSP и security headers;
- gzip/brotli;
- корректный fallback только для SPA routes;
- 404 для несуществующих статических файлов;
- upload limits;
- timeout длинных API-запросов;
- реальный client IP через proxy headers.

Private connection к балансировщику уменьшает необходимость публиковать backend, но нужно проверить network ACL, health checks и доступность из разных availability domains.

## OpenSearch 3.7 и асинхронные операции

18 августа Managed OpenSearch получил версию **3.7.0**.

Одновременно для пользователей и баз данных появились явные статусы, а операции переведены на асинхронную модель. Теперь принятие API request не следует трактовать как немедленное завершение изменения.

Automation должна:

1. отправить операцию;
2. получить идентификатор или состояние сущности;
3. дождаться terminal status;
4. обработать timeout и failure;
5. проверить фактический результат.

Нельзя завершать deployment только по HTTP 2xx, если операция ещё выполняется.

## CDN и S3

В течение года развивались CDN и S3:

- создание S3 bucket из схемы инфраструктуры;
- выбор поддоменов раздачи CDN;
- настройка chunk size для больших файлов;
- выбор кэшируемых HTTP methods;
- улучшение статусов выпуска TLS-сертификатов.

Перед production:

- проверить invalidation;
- `Range` requests;
- CORS;
- signed URLs;
- cache key;
- методы, которые разрешено кэшировать;
- поведение больших файлов;
- origin failover;
- стоимость трафика и операций.

Кэширование `POST`, `PUT` или других нестандартных методов нельзя включать без понимания идемпотентности и cache key.

## AI-функции

Timeweb Cloud регулярно добавляет модели и функции AI-сервисов. В августе появились, среди прочего:

- GLM 5.3 и GLM-5.3 Flash;
- OpenSearch-backed и агентный поиск по базе знаний;
- новые модели Qwen, Gemini и Grok;
- отдельный AI Gateway, описанный в другой статье.

Наличие модели в каталоге не гарантирует одинаковую поддержку streaming, tools, structured output и context limits. Для каждого model ID нужны контрактные тесты.

## Влияние на категорию

Timeweb Cloud остаётся в категории **«Рискованные / спорные»**.

Продукт развивается быстро, но новые возможности не отменяют накопившиеся в 2026 году инциденты:

- storage degradation;
- DDoS и фильтрация;
- проблемы сети;
- аварии внешних площадок и узлов;
- события Amsterdam, Germany, Moscow и Saint Petersburg.

Выбор нужно делать по конкретному сервису и локации, с независимым backup и внешним мониторингом.

## Checklist

- [ ] Продуктовая функция отделена от оценки надёжности.
- [ ] Worker resize протестирован на staging.
- [ ] У workload есть реплики и PDB.
- [ ] Проверены CSI attach/detach/snapshot/restore.
- [ ] App Platform redirects и SPA fallback не ломают SEO.
- [ ] Backend за private LB не опубликован случайно наружу.
- [ ] Асинхронные OpenSearch operations ожидаются до terminal status.
- [ ] CDN проверен на Range, cache key и invalidation.
- [ ] AI model IDs проходят контрактные тесты.
- [ ] Настроен backup у другого провайдера.

## Источники

- [Журнал обновлений Timeweb Cloud](https://timeweb.cloud/changelog)
- [Журнал обновлений за май 2026 года](https://timeweb.cloud/changelog/page-6)
- [Журнал обновлений за март 2026 года](https://timeweb.cloud/changelog/page-7)
- [Документация балансировщика нагрузки](https://timeweb.cloud/docs/load-balancer)
- [Managed Service for OpenSearch](https://timeweb.cloud/services/opensearch)
