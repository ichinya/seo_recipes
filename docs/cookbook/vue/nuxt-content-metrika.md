---
title: Установка Яндекс Метрики на Nuxt Content
icon: fa-brands fa-yandex
category: Nuxt Content
tag: [Nuxt Content, VueJS, Метрика, Legacy]
---

# Установка Яндекс Метрики на сайт с движком Nuxt Content

::: warning Актуальность
Этот материал сохраняет старый ручной способ установки счётчика и использует конструкции прежних версий Nuxt. Nuxt 3 достиг End of Life 31 июля 2026 года. Перед переносом кода в актуальный проект сначала выполните [миграцию Nuxt 3 → 4](./nuxt-3-to-4.md), а browser-only интеграцию разместите в `app/plugins/*.client.ts`.
:::

Любопытно, но при использовании плагина статистика считается, но код счетчика не определяется Яндексом. Так что я решил установить код в ручную в тему.

Делается это довольно просто. В начале создаем файл `components/YandexMetrika.vue`, куда вписываем данный код Метрики. Нужно лишь поменять слово `КОД` в примере на свой номер счетчика. 

```vue{4,26}
<template>
  <div>
    <!-- Yandex.Metrika counter -->
    <img src="https://mc.yandex.ru/watch/КОД" style="position:absolute; left:-9999px;" alt=""/>
    <!-- /Yandex.Metrika counter -->
  </div>
</template>

<script>
if (process.client) {
  (function (m, e, t, r, i, k, a) {
    m[i] = m[i] || function () {
      (m[i].a = m[i].a || []).push(arguments)
    };
    var z = null;
    m[i].l = 1 * new Date();
    for (var j = 0; j < document.scripts.length; j++) {
      if (document.scripts[j].src === r) {
        return;
      }
    }
    k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a)
  })
  (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

  ym(КОД, "init", {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true
  });
}

export default {
  name: "YandexMetrika",
}
</script>

<style scoped>

</style>
```
По факту мы создали глобальный компонент, который можно использовать в любом месте сайта. Теперь надо просто вписать его в тему. Например, в файл `app.vue`. В принципе данный счетчик допускается использовать в любом месте сайта между тегов `head` или `body`. Мы как раз и впишем его в конец сайта.

```vue{7}
<template>
  <div>
    <SiteHeader/>
    <div>
      <NuxtPage/>
    </div>
    <YandexMetrika/>
  </div>
</template>
<script>
export default {
  components: {}
}
</script>

```

Вот такая простая установка счетчика Яндекс Метрики. По подобию можно установить любой другой счетчик или нужный код - например рекламный блок.
