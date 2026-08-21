---
title: Google Preferred Sources
description: Как помочь читателям добавить сайт в предпочитаемые источники Google Search и встроить интерактивную кнопку
icon: fa-brands fa-google
category: Google
tag: [Google, Preferred Sources, SEO, AI Mode, AI Overviews, Top Stories]
---

# Google Preferred Sources

**Preferred Sources** — функция Google Search, с помощью которой пользователь может явно отметить сайт как предпочитаемый источник. После выбора материалы такого сайта могут чаще появляться у этого пользователя в **Top Stories** и получать отметку preferred. В **AI Mode** и **AI Overviews** выбранный источник также может быть выделен отметкой preferred там, где функция доступна.

20 августа 2026 года Google обновил документацию и добавил полноценный интерактивный JavaScript-вариант кнопки. Теперь владельцу сайта не обязательно отправлять пользователя на отдельную страницу и просить вручную искать домен: кнопку можно встроить прямо в страницу, а после подтверждения пользователь возвращается обратно.

Это не новый ranking factor и не способ гарантировать место в выдаче. Выбор действует для конкретного пользователя и прежде всего помогает работать с уже существующей аудиторией: читателями блога, подписчиками рассылки, посетителями из соцсетей и постоянными пользователями сайта.

## Где работает Preferred Sources

По документации Google функция доступна:

- глобально в **Top Stories** во всех языках Google Search;
- в **AI Mode** и **AI Overviews** в тех языках и регионах, где доступны сами AI-функции;
- только для домена или поддомена — отдельный каталог вроде `example.com/blog/` нельзя зарегистрировать как самостоятельный источник, а `blog.example.com` можно.

Перед добавлением CTA стоит открыть инструмент Source Preferences и проверить, находится ли домен через поиск. Если сайта там нет, кнопка не создаст отдельную регистрацию автоматически.

## Вариант 1. Стандартная JavaScript-кнопка

Google рекомендует стандартную интерактивную реализацию. Она локализуется автоматически, открывает flow выбора источника и после завершения возвращает пользователя на исходную страницу.

Добавьте библиотеку, желательно в `<head>`:

```html
<script async src="https://news.google.com/swg/js/v1/publisher.js"></script>
```

В нужном месте страницы добавьте контейнер:

```html
<div google-add-preferred-source-btn></div>
```

### Темная тема

```html
<div google-add-preferred-source-btn data-theme="dark"></div>
```

### Фиксированный язык

По умолчанию язык выбирается по браузеру пользователя. При необходимости его можно переопределить:

```html
<div google-add-preferred-source-btn data-lang="ru"></div>
```

Для большинства сайтов лучше оставить автоматический язык, особенно если страницы мультиязычные.

## Вариант 2. Собственная кнопка

Если стандартная кнопка плохо вписывается в дизайн, Google позволяет запускать тот же flow программно.

Для современных frontend-проектов можно подключить ESM-модуль и вызвать `addPreferredSource()` из обработчика своей кнопки. Для обычных сайтов есть вариант через стандартный script и callback queue.

Практически это полезно, если CTA нужно встроить:

- в блок подписки;
- рядом с Telegram/VK/RSS;
- в меню или footer;
- в экран после прочтения статьи;
- в интерфейс Vue/React-приложения.

При собственной реализации важно не маскировать действие: пользователь должен понимать, что кнопка открывает Google и меняет его персональную настройку источников.

## Вариант 3. Deeplink без JavaScript

Если добавлять сторонний JavaScript нежелательно, можно использовать обычную ссылку:

```text
https://www.google.com/preferences/source?q=example.com
```

Пример:

```html
<a href="https://www.google.com/preferences/source?q=example.com">
    Добавить сайт в Preferred Sources
</a>
```

Deeplink особенно удобен:

- в email-рассылке;
- в Telegram или VK;
- на статическом сайте;
- в CMS, где нельзя удобно подключить JavaScript;
- как запасной вариант при блокировке внешнего скрипта.

## Пример для VuePress

В VuePress кнопку логичнее вынести в отдельный клиентский компонент, чтобы внешний скрипт не вставлялся в каждую Markdown-страницу вручную.

Упрощенный вариант компонента:

```vue
<template>
  <div google-add-preferred-source-btn></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  if (document.querySelector('script[data-google-preferred-source]')) {
    return
  }

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://news.google.com/swg/js/v1/publisher.js'
  script.dataset.googlePreferredSource = '1'
  document.head.appendChild(script)
})
</script>
```

Для глобального CTA можно подключить компонент в layout/footer. Для SEO Recipes разумнее сначала проверить наличие домена в Source Preferences и только после этого добавлять кнопку на продакшен.

## Пример для WordPress

Если CTA нужен на всем сайте, библиотеку можно подключить через `wp_enqueue_script`, а кнопку вывести shortcode-ом.

```php
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_script(
        'google-preferred-source',
        'https://news.google.com/swg/js/v1/publisher.js',
        [],
        null,
        false
    );
});

add_shortcode('google_preferred_source', function () {
    return '<div google-add-preferred-source-btn></div>';
});
```

После этого в контент можно вставить:

```text
[google_preferred_source]
```

Если CTA нужен только на одной странице, не стоит загружать внешний скрипт на всем сайте.

## Что проверить перед установкой

1. Найти домен через Source Preferences.
2. Проверить кнопку в обычном и приватном окне браузера.
3. Проверить мобильную версию.
4. Проверить язык и светлую/темную тему.
5. Убедиться, что сторонний скрипт не блокируется CSP.
6. Посмотреть влияние на Lighthouse/PageSpeed и загрузку main thread.
7. Добавить fallback deeplink, если JavaScript не загрузился.
8. Не ставить кнопку поверх основного контента и не делать её навязчивой.

## Что измерять

Google не обещает отдельный отчет по нажатиям на Preferred Sources. Поэтому для собственного CTA полезно отправлять событие в аналитику до запуска Google flow.

Например:

```js
document.querySelector('#preferred-source-button')?.addEventListener('click', () => {
  // Здесь можно отправить событие в собственную аналитику.
});
```

Важно не считать клик подтвержденным добавлением: пользователь может открыть flow и не завершить его.

## Когда функция особенно полезна

Preferred Sources имеет смысл продвигать сайтам с возвращающейся аудиторией:

- новостным и тематическим изданиям;
- экспертным блогам;
- сайтам с регулярными обзорами и инструкциями;
- проектам, которые уже получают подписчиков через Telegram, RSS или email;
- нишевым ресурсам, которым важно сохранять связь с читателем при росте AI-ответов в поиске.

Для нового сайта без постоянной аудитории эффект будет ограниченным: сначала нужно дать пользователю причину захотеть видеть этот источник чаще.

## Чего Preferred Sources не делает

- не гарантирует индексацию;
- не заменяет техническое SEO;
- не делает сайт автоматически источником AI Overview;
- не повышает позиции одинаково для всех пользователей;
- не требует специальной Schema.org-разметки;
- не заменяет Search Console, sitemap, внутреннюю перелинковку и работу с качеством контента.

## Источники

- [Google Search Central: Preferred Sources](https://developers.google.com/search/docs/appearance/preferred-sources)
- [Google Search Central: последние изменения документации](https://developers.google.com/search/updates)
- [Source Preferences](https://www.google.com/preferences/source)
