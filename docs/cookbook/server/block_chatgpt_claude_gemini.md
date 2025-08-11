---
title: Блокировка ботов ChatGPT, Claude и Gemini
icon: fa-solid fa-robot
category: Поисковые боты
tag: [боты, ChatGPT, Claude, Gemini, robots.txt, htaccess]
---

# Блокировка ботов ChatGPT, Claude и Gemini

## Зачем блокировать

Генеративные ИИ‑платформы активно сканируют сайты для обучения своих моделей. Если не ограничить доступ, боты могут создавать ненужную нагрузку и использовать ваш контент без разрешения. Ниже приведены простые инструкции, как отключить доступ GPTBot, ClaudeBot и Google‑Extended.

## robots.txt

```robots.txt
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
User-agent: Claude-Web
Disallow: /

User-agent: Google-Extended
Disallow: /
```

## .htaccess

```apacheconf
# Блокировка ChatGPT, Claude и Gemini
SetEnvIfNoCase User-Agent "GPTBot" bad_bot
SetEnvIfNoCase User-Agent "ClaudeBot" bad_bot
SetEnvIfNoCase User-Agent "Claude-Web" bad_bot
SetEnvIfNoCase User-Agent "Google-Extended" bad_bot

<Limit GET POST HEAD>
  Order Allow,Deny
  Allow from all
  Deny from env=bad_bot
</Limit>
```

Эти правила не позволят указанным ботам получать содержимое сайта, что поможет уменьшить нагрузку на сервер и исключить использование ваших материалов при обучении моделей.

Также смотрите статью [Поисковые боты OpenAI](/cookbook/server/chatgpt_bot) для подробностей о других роботах.
