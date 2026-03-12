---
title: Полная очистка диска на Linux / Debian / Ubuntu
icon: fa-solid fa-trash-can
category: Linux
---

# Полная очистка диска на Linux / Debian / Ubuntu

В этой статье разберём как очистить диск на сервере Linux и использовать универсальный скрипт автоочистки.

## Почему заканчивается место

Чаще всего место занимают:

* docker
* containerd
* apt cache
* журналы
* старые ядра
* npm / cargo

## Скрипт автоочистки

Скрипт позволяет безопасно очистить систему.

Пример запуска:

```
./cleanctl.sh
```

или

```
./cleanctl.sh --force
```

А также, как и с другими утилитами, есть однострочный вариант запуска прямо с GitHub:

```
curl -fsSL https://raw.githubusercontent.com/Ichinya/seo_recipes/main/scripts/cleanctl.sh | sudo bash
```

## Возможности

* очистка apt
* очистка docker
* очистка containerd
* очистка журналов
* удаление старых ядер

## Заключение

Скрипт подходит для VPS и серверов с маленьким диском.
