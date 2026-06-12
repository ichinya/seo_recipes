---
title: Скрипты
description: Серверные инструкции и практические скрипты
index: true
icon: fa-solid fa-terminal
---

# Скрипты

Здесь лежат практические серверные инструкции и заметки по настройке Linux, Docker, swap, очистке диска и правилам для поисковых ботов.

## Серверные инструкции

| Тема | Что внутри |
| --- | --- |
| [Обновление Debian 12 до 13](./debian_13_upgrade.md) | Пошаговое обновление Bookworm до Trixie, сторонние репозитории и проверки |
| [Добавление swap в Debian/Ubuntu](./debian_ubuntu_swap.md) | Ручная настройка swap и запуск `swapctl.sh` |
| [Установка Docker на Debian](./docker_install.md) | Минимальная установка Docker Engine из официального репозитория |
| [Очистка мусора на Linux / Debian / Ubuntu](./full-disk-cleanup.md) | Очистка apt, Docker, containerd, журналов и старых ядер через `cleanctl.sh` |
| [Ошибка Repository changed its Label](./ppa_label_update.md) | Исправление ошибки `apt` при изменении метаданных PPA |

## Боты и User-Agent

| Тема | Что внутри |
| --- | --- |
| [Блокирование бота Amazon](./amazon_bot.md) | Пример блокировки AmazonBot через `.htaccess` |
| [Поисковый бот Babbar](./babbar_bot.md) | User-Agent, robots.txt и особенности Barkrowler |
| [Поисковые боты OpenAI](./chatgpt_bot.md) | GPTBot, ChatGPT-User, OAI-SearchBot и варианты ограничения доступа |
| [Блокировка ботов ChatGPT, Claude и Gemini](./block_chatgpt_claude_gemini.md) | Готовые правила для `robots.txt` и `.htaccess` |
| [Подозрительные User Agents](./user_agents.md) | Ссылка на внешний список подозрительных User-Agent |

## Связанные разделы

- [Провайдеры](../providers/)
- [Информационные материалы](../info/)
