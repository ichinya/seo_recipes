---
title: Selectel отключает legacy DNS — как проверить и перенести домены
onThisPage: false
description: "Проверка делегирования на ns1–ns4.selectel.ru, миграция зон в DNS-хостинг actual, замена NS у регистратора и диагностика через dig"
icon: fa-solid fa-network-wired
category: Хостинг
tag: [Selectel, DNS, DNS-хостинг, Миграция, NS, dig, Домены]
---

# Selectel отключает legacy DNS — как проверить и перенести домены

Актуальность графика повторно проверена **2 октября 2026 года** по официальной документации Selectel, изменённой 22 сентября. Legacy DNS отключается поэтапно. По опубликованному графику **1 октября 2026 года** должен быть отключён API и раздел legacy в панели, а неделегированные зоны — удалены. Авторитетные legacy NS-серверы `ns1–ns4.selectel.ru` должны прекратить работу только **1 декабря 2026 года**.

Это важно: текущая документация **не подтверждает**, что authoritative legacy NS уже остановлены. До 1 декабря их нельзя считать долгосрочным резервом, но и прежняя формулировка SEO Recipes о полном отключении 1 августа была неверной.

Если домен всё ещё делегирован на:

```text
ns1.selectel.ru
ns2.selectel.ru
ns3.selectel.ru
ns4.selectel.ru
```

его нужно считать требующим срочной проверки. Новая версия DNS-хостинга (actual) использует:

```text
a.ns.selectel.ru
b.ns.selectel.ru
c.ns.selectel.ru
d.ns.selectel.ru
```

Это плановый retirement старого сервиса, а не авария Selectel. Категория провайдера из-за него не меняется, но для владельца старого домена последствия могут быть такими же, как при DNS outage.

## Этапы отключения legacy

| Дата | Что отключено |
| --- | --- |
| 1 марта 2025 года | Создание новых доменов в legacy |
| 1 июля 2026 года | Редактирование существующих записей и доменов |
| 1 октября 2026 года | API и legacy-раздел панели; неделегированные зоны должны быть удалены |
| 1 декабря 2026 года | Авторитетные legacy NS-серверы должны прекратить работу |

После 1 октября управление legacy-зоной через старый API и раздел панели по опубликованному графику уже не должно быть доступно. Если домен всё ещё делегирован на `ns1–ns4.selectel.ru`, используйте оставшееся до 1 декабря окно только для миграции: подготовьте рабочую зону в actual или у другого DNS-провайдера и обновите NS у регистратора заранее. Не рассматривайте legacy NS как надёжный rollback после даты окончательного отключения.

## Быстро проверить один домен

```bash
DOMAIN="example.com"

dig +short "$DOMAIN" NS
```

Проблемный результат:

```text
ns1.selectel.ru.
ns2.selectel.ru.
ns3.selectel.ru.
ns4.selectel.ru.
```

Ожидаемый для DNS-хостинга actual:

```text
a.ns.selectel.ru.
b.ns.selectel.ru.
c.ns.selectel.ru.
d.ns.selectel.ru.
```

Проверка пути делегирования от корневых серверов:

```bash
dig +trace "$DOMAIN" NS
```

`dig +short "$DOMAIN" NS` может показать кэш рекурсивного resolver. `+trace` помогает увидеть, какие NS реально опубликованы в родительской зоне.

## Проверить список доменов

Создайте `domains.txt`, по одному домену в строке:

```text
example.com
example.org
example.net
```

Проверка:

```bash
while IFS= read -r domain; do
  [ -z "$domain" ] && continue

  printf '\n=== %s ===\n' "$domain"
  dig +short "$domain" NS | sort

done < domains.txt
```

Поиск legacy Selectel NS:

```bash
while IFS= read -r domain; do
  [ -z "$domain" ] && continue

  if dig +short "$domain" NS \
    | grep -Eqi '^ns[1-4]\.selectel\.ru\.?$'; then
    printf 'LEGACY: %s\n' "$domain"
  fi
done < domains.txt
```

Скрипт помогает отобрать кандидатов, но финальное решение принимайте после `dig +trace` и проверки панели регистратора.

## Порядок миграции

### 1. Создать или проверить зону в DNS-хостинге actual

В панели Selectel откройте актуальный DNS-хостинг и убедитесь, что зона существует.

Официальный сценарий миграции предполагает копирование данных в actual до отключения старого интерфейса. После этапа 1 октября legacy-раздел и API по опубликованному графику уже не должны быть доступны. Если копирование через старый интерфейс недоступно, восстановите записи из:

- zone export или IaC;
- конфигурации web/mail-сервера;
- старых скриншотов/бэкапа;
- данных текущего resolver cache;
- другого authoritative DNS, если зона дублировалась.

Не полагайтесь только на случайно сохранившийся кэш: TTL истечёт.

### 2. Сравнить ресурсные записи

Официальный перенос не копирует root-записи `NS` и `SOA`: actual создаёт их автоматически со своими значениями.

Отдельно проверьте важные типы:

- `A` и `AAAA`;
- `CNAME` и `ALIAS`;
- `MX`;
- `TXT`, включая SPF и verification records;
- `DKIM` и `_dmarc`;
- `CAA`;
- `SRV`, `HTTPS`, `SVCB`, `SSHFP`, если используются;
- записи поддоменов и wildcard.

Пример прямой проверки нового authoritative server до смены делегирования:

```bash
DOMAIN="example.com"

for type in A AAAA MX TXT CAA; do
  echo "--- $type ---"
  dig @a.ns.selectel.ru "$DOMAIN" "$type" +noall +answer
  echo
done
```

Для DKIM, DMARC и других служебных имён используйте их полный hostname:

```bash
dig @a.ns.selectel.ru _dmarc.example.com TXT +noall +answer
dig @a.ns.selectel.ru selector1._domainkey.example.com TXT +noall +answer
```

### 3. Проверить ответы всех actual NS

```bash
DOMAIN="example.com"

for ns in \
  a.ns.selectel.ru \
  b.ns.selectel.ru \
  c.ns.selectel.ru \
  d.ns.selectel.ru; do
  echo "=== $ns ==="
  dig @"$ns" "$DOMAIN" SOA +noall +answer
  dig @"$ns" "$DOMAIN" A +noall +answer
done
```

Все серверы должны отдавать ожидаемую зону. Если хотя бы один отвечает `SERVFAIL`, `REFUSED` или возвращает пустой неожиданный ответ, делегирование пока не меняйте.

### 4. Проверить DNSSEC до смены NS

Проверьте, опубликована ли DS-запись в родительской зоне:

```bash
DOMAIN="example.com"

dig +short "$DOMAIN" DS
```

Если ответ не пустой, у домена включён DNSSEC на уровне регистратора/реестра. Не удаляйте DS вслепую и не меняйте NS, пока не определён корректный DNSSEC-сценарий для новой зоны: несовпадение ключей приводит к `SERVFAIL` у validating resolvers.

### 5. Заменить NS у регистратора

Для actual укажите четыре сервера:

```text
a.ns.selectel.ru
b.ns.selectel.ru
c.ns.selectel.ru
d.ns.selectel.ru
```

Каждый NS — отдельной записью. Менять нужно делегирование у регистратора, а не создавать произвольные NS-записи внутри старой зоны.

Официальная документация предупреждает, что распространение может занимать до **72 часов**.

### 6. Проверить делегирование после изменения

```bash
DOMAIN="example.com"

dig +trace "$DOMAIN" NS
dig @1.1.1.1 "$DOMAIN" NS +noall +answer
dig @8.8.8.8 "$DOMAIN" NS +noall +answer
dig @9.9.9.9 "$DOMAIN" NS +noall +answer
```

Затем проверьте рабочие записи:

```bash
dig @1.1.1.1 "$DOMAIN" A +noall +answer
dig @1.1.1.1 "www.$DOMAIN" A +noall +answer
dig @1.1.1.1 "$DOMAIN" MX +noall +answer
dig @1.1.1.1 "$DOMAIN" TXT +noall +answer
```

Для DNSSEC-домена дополнительно:

```bash
dig +dnssec "$DOMAIN" A
```

## Что проверить снаружи

После смены NS недостаточно увидеть домен только со своего компьютера. Проверьте:

1. сайт по HTTPS;
2. API и отдельные поддомены;
3. получение и отправку почты;
4. ACME/TLS renewal;
5. webhook/callback hostnames;
6. DNS через несколько независимых resolver;
7. monitoring из другой сети или региона.

Для критичного домена оставьте усиленный мониторинг минимум на 72 часа.

## Типичные ошибки

### Зона создана, но registrar NS не изменены

Наличие зоны в панели actual само по себе не меняет делегирование.

### Изменены NS внутри зоны, а не у регистратора

Родительская зона продолжает направлять запросы на legacy servers.

### Потеря почтовых записей

Сайт открывается, но забыты `MX`, SPF, DKIM или DMARC.

### Не проверены поддомены

Корневой `A` работает, а `api`, `mail`, `cdn`, wildcard или verification records отсутствуют.

### DNSSEC оставлен со старыми ключами

Validating resolvers возвращают `SERVFAIL`, хотя прямой ответ authoritative server выглядит нормальным.

### Ожидание rollback на legacy

До 1 декабря legacy NS ещё указаны в официальном графике как работающие, но это переходное окно, а не стратегия rollback. После окончательного отключения возврат старого делегирования не будет рабочим вариантом. Исправляйте actual-зону или переключайтесь на заранее подготовленного другого DNS-провайдера.

## Итоговый checklist

- [ ] `dig +trace "$DOMAIN" NS` не показывает `ns1–ns4.selectel.ru`;
- [ ] зона создана в actual;
- [ ] все важные resource records перенесены;
- [ ] `a–d.ns.selectel.ru` отвечают одинаково;
- [ ] DNSSEC/DS проверен;
- [ ] NS изменены у регистратора;
- [ ] сайт, API, почта и TLS работают через внешние resolvers;
- [ ] включён мониторинг на период распространения;
- [ ] сохранён export актуальной зоны.

## Связанные материалы

- [Карточка Selectel](./selectel.md)
- [Инциденты Selectel в 2026 году](../incidents/2026/selectel.md)

## Источники

- [Selectel — общая информация о DNS-хостинге](https://docs.selectel.ru/dns-hosting/about-dns/)
- [Selectel — перенос из DNS-хостинга legacy в actual](https://docs.selectel.ru/dns-hosting/move-domain/move-from-legacy-to-actual/)
