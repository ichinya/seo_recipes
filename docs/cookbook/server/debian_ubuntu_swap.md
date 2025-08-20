---
title: Добавление swap в Debian/Ubuntu
icon: fa-solid fa-memory
category: Linux
tag: [Linux, swap, Debian, Ubuntu]
---

Самая дешёвая VDS часто имеет всего 512 МБ или 1 ГБ оперативной памяти. Для некоторых задач, например сборки npm-зависимостей, этого недостаточно. Swap позволяет расширить доступную память за счёт диска.

## Вариант 1. Swap-файл

1. Проверим, есть ли уже swap:

```bash
swapon --show
free -h
```

Если вывод пустой — swap не настроен.

2. Создадим файл (например, на 2 ГиБ):

```bash
sudo fallocate -l 2G /swapfile
```

Если `fallocate` недоступен:

```bash
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=progress
```

3. Выставим права:

```bash
sudo chmod 600 /swapfile
```

4. Разметим файл подкачки:

```bash
sudo mkswap /swapfile
```

5. Включим swap:

```bash
sudo swapon /swapfile
```

6. Проверим:

```bash
swapon --show
free -h
```

7. Чтобы swap подключался при загрузке, добавим строку в `/etc/fstab`:

```bash
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Вариант 2. Отдельный раздел

1. Определим раздел:

```bash
lsblk
```

Например, `/dev/sdb2`.

2. Разметим его как swap:

```bash
sudo mkswap /dev/sdb2
```

3. Активируем:

```bash
sudo swapon /dev/sdb2
```

4. Для автоподключения добавим строку в `/etc/fstab`:

```bash
echo '/dev/sdb2 none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Дополнительно

### Настройка swappiness

Параметр `swappiness` определяет, как активно система будет использовать swap. Проверить текущее значение:

```bash
cat /proc/sys/vm/swappiness
```

Чтобы система реже обращалась к swap, можно установить значение 10:

```bash
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```
### Скрипт `swapctl`

Для автоматизации настройки в репозитории есть idempotent‑скрипт `swapctl.sh`. Он создаёт или удаляет swap‑файлы, настраивает `vm.swappiness` и прописывает запись в `/etc/fstab`.

Запуск в одну строку прямо с GitHub:

```bash
curl -fsSL https://raw.githubusercontent.com/Ichinya/seo_recipes/main/scripts/swapctl.sh | sudo bash -s -- --size 4G --swappiness 10
```

Другие примеры:

```bash
curl -fsSL https://raw.githubusercontent.com/Ichinya/seo_recipes/main/scripts/swapctl.sh | sudo bash -s -- --file /swap2 --size 1536M
curl -fsSL https://raw.githubusercontent.com/Ichinya/seo_recipes/main/scripts/swapctl.sh | sudo bash -s -- --remove
curl -fsSL https://raw.githubusercontent.com/Ichinya/seo_recipes/main/scripts/swapctl.sh | sudo bash -s -- --help
```
