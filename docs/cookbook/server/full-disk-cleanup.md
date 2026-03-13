---
title: Очистка мусора на Linux / Debian / Ubuntu
icon: fa-solid fa-trash-can
category: Linux
---

# Очистка мусора на Linux / Debian / Ubuntu

В этой статье разберём, как очистить мусор на сервере Linux и использовать универсальный скрипт автоочистки.

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

Скачать скрипт из репозитория:

* [cleanctl.sh (GitHub)](https://github.com/Ichinya/seo_recipes/blob/main/scripts/cleanctl.sh)
* [cleanctl.sh (raw)](https://raw.githubusercontent.com/Ichinya/seo_recipes/main/scripts/cleanctl.sh)

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

Во время выполнения скрипт показывает:

* что именно очищается
* сколько места освобождено по каждому этапу
* общий объём очистки в мегабайтах

## Возможности

* очистка apt
* очистка docker
* очистка containerd
* очистка журналов
* удаление старых ядер

## Заключение

Скрипт подходит для VPS и серверов с маленьким диском.
