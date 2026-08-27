---
title: Миграция Nuxt 3 → 4 без простоя и SEO-регрессий
description: Практический переход проекта с Nuxt 3 на Nuxt 4 — структура app, codemods, useAsyncData, SSR, SEO, Метрика, проверки и откат
icon: fa-brands fa-vuejs
category: Nuxt
tag: [Nuxt, Nuxt 4, VueJS, Миграция, SSR, SEO, Яндекс Метрика]
---

# Миграция Nuxt 3 → 4 без простоя и SEO-регрессий

Nuxt 3 достиг End of Life **31 июля 2026 года** и больше не получает исправления ошибок и уязвимостей. Поэтому переход на Nuxt 4 — уже не косметическое обновление, а обязательная часть сопровождения проекта.

Этот рецепт рассчитан на работающий SSR/SSG-сайт, где нельзя потерять:

- URL и редиректы;
- серверный рендеринг;
- метатеги и canonical;
- индексацию;
- события аналитики;
- совместимость модулей;
- возможность быстро откатиться.

## Что должно получиться

Безопасная миграция выглядит так:

```text
актуальный Nuxt 3
        ↓
проверенный baseline и rollback
        ↓
Nuxt 4 без немедленного перемещения каталогов
        ↓
проверка модулей, SSR и data fetching
        ↓
переход на структуру app/
        ↓
SEO, аналитика и production smoke-test
```

Не стоит одновременно обновлять Nuxt, менять CMS, переписывать дизайн и переносить хостинг. Чем меньше независимых изменений в одном релизе, тем проще найти причину регрессии.

## 1. Зафиксировать исходное состояние

Создайте отдельную ветку и сохраните рабочий lock-файл:

```bash
git switch -c upgrade/nuxt-4
git status --short
node --version
npx nuxi info
```

Перед обновлением должны успешно выполняться текущие проверки проекта:

```bash
npm ci
npx nuxt typecheck
npx nuxt build
```

Для SSG-проекта дополнительно соберите production-версию тем же способом, который используется в CI:

```bash
npx nuxt generate
```

Зафиксируйте:

- версию Node.js;
- версию Nuxt и Vue;
- package manager и его версию;
- Nitro preset;
- список Nuxt-модулей;
- текущие предупреждения сборки;
- количество сгенерированных страниц;
- важные URL и HTTP-статусы;
- Lighthouse/Core Web Vitals baseline;
- события Яндекс Метрики и другой аналитики.

Полезный минимальный набор URL для smoke-test:

```text
/
/robots.txt
/sitemap.xml
/существующая-страница
/страница-с-параметрами?utm_source=test
/старый-url-с-редиректом
/несуществующая-страница
```

## 2. Сначала обновить проект внутри Nuxt 3

Не переходите на Nuxt 4 с сильно устаревшей ветки Nuxt 3. Сначала обновите Nuxt 3 и совместимые зависимости, затем повторите baseline-проверки.

```bash
npx nuxt upgrade
npm install
npx nuxt typecheck
npx nuxt build
```

После этого проверьте устаревшие и конфликтующие пакеты:

```bash
npm outdated
npm ls nuxt vue vue-router
```

Особое внимание нужно уделить модулям, которые вмешиваются в:

- маршрутизацию;
- генерацию sitemap и robots.txt;
- Nuxt Content;
- изображения;
- i18n;
- auth;
- Tailwind/PostCSS;
- Nitro adapters;
- аналитику;
- `useHead` и Unhead.

Если модуль не заявляет поддержку Nuxt 4, не считайте успешную установку доказательством совместимости. Нужны build и runtime-проверка.

## 3. Установить Nuxt 4

Для npm:

```bash
npm install nuxt@^4.0.0
npx nuxt prepare
npx nuxt typecheck
npx nuxt build
```

Для pnpm:

```bash
pnpm add nuxt@^4.0.0
pnpm nuxt prepare
pnpm nuxt typecheck
pnpm nuxt build
```

На первом шаге **не обязательно сразу перемещать каталоги**. Nuxt 4 сохраняет обратную совместимость со старой структурой и умеет её обнаруживать. Это позволяет разделить две группы проблем:

1. несовместимость Nuxt или модулей;
2. ошибки после перемещения файлов.

Сделайте отдельный commit после успешного запуска Nuxt 4 в прежней структуре.

## 4. Перейти на структуру `app/`

В Nuxt 4 код Vue-приложения по умолчанию находится в `app/`, а серверный и общий код остаются в корне.

Пример структуры:

```text
app/
  assets/
  components/
  composables/
  layouts/
  middleware/
  pages/
  plugins/
  utils/
  app.config.ts
  app.vue
  error.vue
content/
layers/
modules/
public/
server/
shared/
nuxt.config.ts
```

В `app/` переносятся:

- `assets/`;
- `components/`;
- `composables/`;
- `layouts/`;
- `middleware/`;
- `pages/`;
- `plugins/`;
- `utils/`;
- `app.vue`;
- `error.vue`;
- `app.config.ts`.

В корне остаются:

- `content/`;
- `layers/`;
- `modules/`;
- `public/`;
- `server/`;
- `shared/`;
- `nuxt.config.ts`.

Официальный codemod:

```bash
npx codemod@latest nuxt/4/file-structure
```

Запускайте его только на чистой рабочей директории:

```bash
git status --short
npx codemod@latest nuxt/4/file-structure
git diff --stat
git diff
```

Codemod ускоряет перенос, но не проверяет бизнес-логику, конфигурацию сторонних инструментов и все самописные aliases.

### Изменение alias `~`

После перехода `~` указывает на `app/`.

```ts
import MyCard from '~/components/MyCard.vue'
```

будет разрешаться как:

```text
app/components/MyCard.vue
```

Для файлов из корня проекта используйте подходящий Nuxt alias или явный URL относительно `import.meta.url`. Не переносите `server/` внутрь `app/` только ради сохранения старого импорта: клиент и Nitro должны оставаться разными контекстами.

Проверьте отдельно:

```text
tsconfig
eslint
tailwind.config
postcss
vitest
playwright
storybook
CI scripts
Dockerfile
```

## 5. Проверить `useAsyncData` и `useFetch`

Nuxt 4 изменяет несколько значений по умолчанию и делает ошибки ключей заметнее.

### Ключ должен однозначно описывать данные

Небезопасный вариант для динамической страницы:

```ts
const { data } = await useAsyncData('article', () => {
  return $fetch(`/api/articles/${route.params.slug}`)
})
```

Один ключ `article` может связывать разные страницы с разными данными.

Безопаснее:

```vue
<script setup lang="ts">
const route = useRoute()
const slug = computed(() => String(route.params.slug))
const key = computed(() => `article:${slug.value}`)

const { data: article, error } = await useAsyncData(
  key,
  () => $fetch(`/api/articles/${slug.value}`),
)

if (error.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Статья не найдена',
  })
}
</script>
```

### Данные по умолчанию могут быть shallow

Если код изменяет вложенные поля результата напрямую, проверьте реактивность. При необходимости включите глубокую реактивность явно:

```ts
const { data } = await useAsyncData(
  'settings',
  () => $fetch('/api/settings'),
  {
    deep: true,
  },
)
```

Лучше не мутировать ответ API без необходимости, а вычислять производное состояние через `computed`.

### `immediate: false`

При `immediate: false` первый запрос нужно запустить явно:

```ts
const { data, execute } = await useFetch('/api/report', {
  immediate: false,
})

await execute()
```

Проверьте формы поиска, фильтры, lazy-loading и запросы, которые раньше запускались только из-за изменения reactive key.

## 6. Удалить обращения к `window.__NUXT__`

После hydration глобальный объект `window.__NUXT__` больше не является стабильным публичным API.

Плохо:

```ts
const payload = window.__NUXT__
```

Используйте Nuxt composables:

```ts
const nuxtApp = useNuxtApp()
const config = useRuntimeConfig()
const state = useState('example')
```

Проверьте не только код приложения, но и самописные плагины аналитики, consent management и интеграции с виджетами.

## 7. Проверить `<head>` и SEO

Nuxt 4 использует Unhead 2. Низкоуровневые старые свойства `hid` и `vmid` больше не нужны.

Старый вариант:

```ts
useHead({
  meta: [
    {
      hid: 'description',
      name: 'description',
      content: description,
    },
  ],
})
```

Актуальный вариант:

```vue
<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()

const title = 'Название страницы'
const description = 'Описание страницы'
const canonical = computed(() => {
  return new URL(route.path, config.public.siteUrl).toString()
})

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
})

useHead({
  link: [
    {
      rel: 'canonical',
      href: canonical,
    },
  ],
})
</script>
```

После миграции проверьте в **готовом HTML**, а не только в DOM после JavaScript:

- `<title>`;
- `description`;
- canonical;
- Open Graph;
- `robots`;
- hreflang;
- JSON-LD;
- HTTP-код страницы;
- редиректы;
- sitemap;
- robots.txt.

Пример быстрой проверки:

```bash
curl -fsSL https://staging.example.com/article | grep -E \
  '<title>|description|canonical|application/ld\+json'
```

Для 404 важно проверить именно статус:

```bash
curl -I https://staging.example.com/definitely-not-found
```

Страница с текстом «не найдено» и HTTP 200 остаётся soft 404.

## 8. Проверить Яндекс Метрику и SPA-переходы

Перенос plugins в `app/plugins/` может отключить аналитику без ошибки сборки. Для browser-only кода используйте суффикс `.client.ts`.

Пример отдельной отправки SPA-переходов:

```ts
// app/plugins/yandex-metrika.client.ts
declare global {
  interface Window {
    ym?: (
      counterId: number,
      method: 'hit',
      url: string,
      options?: { title?: string; referer?: string },
    ) => void
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const counterId = Number(config.public.yandexMetrikaId)

  let initialNavigation = true

  nuxtApp.hook('page:finish', () => {
    if (initialNavigation) {
      initialNavigation = false
      return
    }

    window.ym?.(counterId, 'hit', window.location.href, {
      title: document.title,
    })
  })
})
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL,
      yandexMetrikaId: process.env.NUXT_PUBLIC_YANDEX_METRIKA_ID,
    },
  },
})
```

Пропуск первого `page:finish` нужен только если основной код счётчика уже автоматически отправляет просмотр первоначальной страницы. Если инициализация выполняется с отключённым автоматическим просмотром, первый hit пропускать нельзя.

Проверьте в браузере:

1. первоначальное открытие URL;
2. переход через `<NuxtLink>`;
3. back/forward;
4. изменение query-параметров;
5. отсутствие двойных просмотров;
6. отсутствие отправки preview/staging в production-счётчик.

## 9. Проверить SSR и hydration

Ошибки hydration часто не ломают build, но меняют HTML и поведение страницы.

Ищите в console:

```text
Hydration completed but contains mismatches
Client-only API used during SSR
window is not defined
document is not defined
```

Типовые причины:

- `Date.now()` или `Math.random()` прямо в template;
- разные locale/timezone на сервере и клиенте;
- обращение к `localStorage` без `.client`;
- conditional markup, зависящий от viewport;
- browser extension или third-party widget, изменяющий DOM до hydration.

Для тяжёлого browser-only компонента:

```vue
<ClientOnly>
  <BrowserWidget />

  <template #fallback>
    <div class="widget-placeholder" aria-hidden="true" />
  </template>
</ClientOnly>
```

Fallback должен резервировать место, иначе после hydration ухудшится CLS.

## 10. Проверить маршруты и редиректы

Сохраните список production URL до миграции и сравните его со staging.

Минимальный сценарий:

```bash
while read -r path; do
  curl -sS -o /dev/null \
    -w "%{http_code} %{url_effective}\n" \
    "https://staging.example.com${path}"
done < important-paths.txt
```

Проверьте:

- динамические routes;
- optional parameters;
- trailing slash;
- регистр URL;
- encoded characters;
- старые 301/308;
- query-параметры;
- middleware;
- route rules;
- страницы Nuxt Content.

Не меняйте URL только потому, что изменилась файловая структура.

## 11. Production checklist

Перед слиянием:

- [ ] Nuxt 4 установлен из актуального lock-файла;
- [ ] все модули поддерживают Nuxt 4;
- [ ] `npx nuxt typecheck` проходит;
- [ ] production build проходит;
- [ ] Nitro запускается с production preset;
- [ ] каталоги перенесены в `app/` осознанно;
- [ ] aliases и внешние конфиги обновлены;
- [ ] `useAsyncData` использует уникальные ключи;
- [ ] проверено поведение shallow data;
- [ ] нет обращений к `window.__NUXT__`;
- [ ] SSR HTML содержит SEO-теги;
- [ ] 404 возвращает 404;
- [ ] редиректы сохраняют ожидаемые коды;
- [ ] sitemap и robots.txt доступны;
- [ ] Метрика не теряет и не дублирует SPA-просмотры;
- [ ] console не содержит hydration/runtime errors;
- [ ] проверены изображения, fonts и public assets;
- [ ] есть deploy preview;
- [ ] подготовлен rollback.

## Откат

Самый надёжный rollback — предыдущий deploy artifact и предыдущий lock-файл.

До production-релиза сохраните:

```text
commit до обновления
lock-файл до обновления
образ/container tag
переменные окружения
миграционную ветку
список изменённых redirect rules
```

Миграция Nuxt сама по себе не должна требовать необратимой миграции базы данных. Если релиз одновременно меняет schema или формат контента, откат становится сложнее — такие изменения лучше выпускать отдельно.

## Источники

- [Nuxt 3: уведомление об окончании поддержки](https://nuxt.com/docs/3.x/migration/overview)
- [Nuxt 4: официальное руководство по обновлению](https://nuxt.com/docs/4.x/getting-started/upgrade)
- [Codemod для структуры Nuxt 4](https://nuxt.com/docs/4.x/getting-started/upgrade#new-directory-structure)
