---
title: "Cloud.ru в 2026 году: Kubernetes, безопасность и OpenClaw 2.0"
description: "Обновления Cloud.ru Advanced и отдельный образ OpenClaw 2.0 в Marketplace: условия, границы ответственности и безопасная проверка"
icon: fa-solid fa-cloud
category: Хостинг
tag: [Хостинг, Cloud.ru, Kubernetes, CCE, DataPlane V2, Terraform, Безопасность, OpenClaw, "2026"]
---

# Cloud.ru в 2026 году: Kubernetes, безопасность и OpenClaw 2.0

- [Основная карточка Cloud.ru](../../providers/cloudru.md)

Cloud.ru публикует отдельные release notes для платформ Advanced и Evolution. Их нельзя смешивать: одинаковое название сервиса не гарантирует одинаковые версии, интерфейс, API и сроки появления функции.

## 10 сентября — публичное тестирование OpenClaw 2.0

**10 сентября 2026 года** опубликован [анонс Cloud.ru о публичном тестировании OpenClaw 2.0](https://cisoclub.ru/cloud-ru-odnim-iz-pervyh-v-rossii-otkryl-dostup-k-openclaw-2-0-v-oblachnom-marketplejse/) в авторском блоге компании. Доступность и условия [отдельного образа Marketplace](https://cloud.ru/marketplace/products/openclaw-2-0) проверены **14 сентября**. Это дата анонса облачного предложения, а не дата upstream-релиза OpenClaw или обновления всех установленных экземпляров.

Новая версия разворачивается на отдельной VM параллельно прежней. Образ бесплатный, оплачивается инфраструктура; расходы на выбранную модель учитывайте отдельно. Это не бесплатная VM и не обещание включённых LLM-токенов. Параллельный тест позволяет проверить сценарии до миграции, не обновляя рабочую установку автоматически.

### Доступ и границы ответственности

Официальная карточка описывает доступ к веб-панели через SSH-туннель на `localhost:18789`, токен в `/etc/openclaw/credentials` и конфигурацию модели в `/opt/openclaw/.env`, заявленную как доступную только root. Без ключа модели панель открывается, но агент не отвечает.

Cloud.ru прямо указывает, что не является разработчиком OpenClaw и не контролирует его обновления и уязвимости. Размещение в Marketplace не является гарантией безопасности агента. Поддержка инфраструктуры и сопровождение стороннего ПО — разные зоны ответственности.

### Что проверить перед использованием

- Не открывайте панель на весь интернет: ограничьте SSH и проверьте фактический bind адрес и security group, а не только наличие инструкции про туннель.
- Проверьте права файлов, ротацию токенов и содержимое логов. Не копируйте реальные credentials в issue, чат или вывод теста.
- Используйте отдельную VM, fixture-данные и минимальные разрешения tools; не подключайте production-аккаунты для первого эксперимента.
- Зафиксируйте версии образа и агента, ответственного за обновления, лимиты расходов и внешние адресаты данных. Облачное размещение VM само по себе не означает локальную обработку всех запросов модели.
- Перед переносом проверьте backup/restore конфигурации и повторяемость нужных сценариев; старую установку сохраняйте до проверки новой, не допускайте двойного выполнения задач.

Это план испытаний, не выполненный тест. Категория Cloud.ru **«Рекомендую»** сохраняется: новый образ не доказывает ни улучшения, ни ухудшения надёжности остальных услуг.

## Август: Kubernetes 1.35

В августе 2026 года Cloud.ru Advanced добавил поддержку Kubernetes **1.35**.

Кластеры версии 1.34 можно обновить до 1.35 автоматически. Перед обновлением production-кластера нужно проверить:

- поддерживаемые версии ingress controller и CSI;
- deprecated API через `kubent`, `pluto` или аналогичный инструмент;
- PodDisruptionBudget;
- совместимость admission webhooks и operators;
- состояние нод и запас ресурсов;
- backup etcd и прикладных данных;
- rollback или план пересоздания кластера.

Managed upgrade не отменяет проверки workload. Провайдер обновляет control plane и инфраструктурные компоненты, но не гарантирует совместимость пользовательских manifests и приложений.

## DataPlane V2 для CCE Turbo

DataPlane V2 стал доступен для кластеров CCE Turbo. В июльском обновлении Terraform-провайдера также появилась поддержка DataPlane V2 для типа container network `vpc-router`.

Перед включением нужно отдельно проверить:

- требования к версии кластера;
- поддержку существующих network policies;
- маршрутизацию pod-to-pod и pod-to-service;
- доступ к внешним адресам;
- LoadBalancer и Ingress;
- MTU, fragmentation и large responses;
- observability сетевого слоя;
- поведение при rollback.

Переход сетевого data plane нельзя объединять с обновлением Kubernetes и изменением ingress в одно окно без необходимости. Лучше выполнить изменения поэтапно и сохранять результаты тестов после каждого шага.

## Ротация сертификата при обновлении

Cloud.ru добавил возможность ротировать сертификат во время обновления кластера. Новый сертификат действует пять лет.

Это требует проверки всех мест, где мог сохраниться старый kubeconfig или CA:

```text
CI/CD runners
локальные kubeconfig
GitOps controllers
monitoring и backup agents
внешние automation scripts
секреты в Vault/Kubernetes
```

После ротации нужно убедиться, что старые credentials больше не дают доступ и что аварийный break-glass доступ не потерян.

## Исправления Linux Kernel

В августовских release notes отдельно указано устранение уязвимостей повышения привилегий в Linux Kernel:

- Copy Fail — CVE-2026-31431;
- Dirty Frag — CVE-2026-43284;
- Dirty Frag — CVE-2026-43500.

Для managed Kubernetes важно проверить не только факт исправления в release notes, но и фактическую версию образов нод после обновления.

Пример inventory:

```bash
kubectl get nodes -o wide
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\t"}{.status.nodeInfo.osImage}{"\n"}{end}'
```

## Другие изменения Advanced в 2026 году

Среди заметных обновлений:

- январь — DNS Resolver для связи локальных и облачных DNS;
- апрель — Kubernetes 1.34 и HTTPS health checks для Service/Ingress;
- июнь — IoT Device Access в Preview;
- июль — запуск GeminiDB и Terraform Provider 1.12.20;
- июль — исправление Terraform-проблемы с обновлением сертификата CCE.

Эти функции нужно проверять в документации конкретной платформы и региона. Не стоит считать release notes Advanced автоматически применимыми к Evolution.

## Что это меняет в оценке

Категорию **«Рекомендую»** менять не требуется. Обновления показывают активное развитие платформы и закрытие security-проблем, но для практической оценки всё равно важны:

- цена минимальной рабочей конфигурации;
- SLA конкретного сервиса;
- доступность русскоязычной документации;
- квоты и свободная ёмкость;
- сложность миграции между Advanced и Evolution;
- качество Terraform/API;
- внешний backup и restore-test.

## Checklist обновления CCE

- [ ] Проверены deprecated Kubernetes API.
- [ ] Сохранены manifests, Helm values и CRD.
- [ ] Проверена совместимость operators и webhooks.
- [ ] Сделан backup прикладных данных.
- [ ] Проверен запас ресурсов для rolling update.
- [ ] DataPlane V2 тестируется отдельно от version upgrade.
- [ ] Проверены Ingress, LoadBalancer и NetworkPolicy.
- [ ] Инвентаризированы kubeconfig и automation credentials.
- [ ] После ротации сертификата проверен CI/CD и GitOps.
- [ ] Зафиксированы версии kernel и node images.

## Источники

- [Анонс публичного тестирования OpenClaw 2.0, автор Cloud.ru, 10 сентября](https://cisoclub.ru/cloud-ru-odnim-iz-pervyh-v-rossii-otkryl-dostup-k-openclaw-2-0-v-oblachnom-marketplejse/)
- [Официальная карточка OpenClaw 2.0 и инструкция запуска](https://cloud.ru/marketplace/products/openclaw-2-0)
- [Что нового в Cloud.ru Advanced](https://cloud.ru/docs/advanced/overview/release-notes)
- [Release notes Terraform для Advanced](https://cloud.ru/docs/terraform/ug/topics/overview__release-notes)
- [Документация Cloud.ru Advanced](https://cloud.ru/docs/advanced)
- [Release notes Cloud.ru Evolution](https://cloud.ru/docs/evolution/overview/topics/overview__release-notes)
