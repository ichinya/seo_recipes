---
title: "Vite+ в Laravel starter kits: новый frontend workflow"
description: "Что изменилось в 21 варианте Laravel starter kits, как теперь работают vp dev, vp build и vp check и стоит ли мигрировать существующее приложение"
icon: fa-brands fa-laravel
category: Laravel
tag: [Laravel, Vite+, Vite, Vue, React, Svelte, Livewire, Frontend, CI]
---

# Vite+ в Laravel starter kits: новый frontend workflow

28 августа 2026 года в `laravel/maestro` был объединён переход всех **21 вариантов Laravel starter kits** на **Vite+ 0.3**.

Изменение затрагивает генератор новых starter kits и их комбинации с React, Vue, Svelte и Livewire. Для Inertia-наборов сборка, форматирование и linting теперь объединены вокруг Vite+, а отдельные конфигурации ESLint и Prettier удалены из шаблонов.

Это не означает, что уже созданное Laravel-приложение обновится автоматически. Существующий проект может продолжать работать на обычном Vite, ESLint и Prettier. Миграцию нужно рассматривать как отдельное изменение toolchain с собственным тестированием.

## Что такое Vite+

Vite+ — единая точка входа для frontend toolchain. Проект объединяет вокруг команды `vp` несколько задач:

- dev server;
- production build;
- форматирование;
- linting;
- тесты;
- управление frontend-инструментами и конфигурацией.

Внутри экосистемы используются Vite, Rolldown, Oxlint, Oxfmt, Vitest и другие компоненты. Для Laravel важно не столько количество встроенных инструментов, сколько переход от нескольких разрозненных команд к одному workflow.

## Что поменялось в starter kits

Основные scripts в Inertia-вариантах выглядят так:

```json
{
    "scripts": {
        "dev": "vp dev",
        "build": "vp build",
        "build:ssr": "vp build && vp build --ssr",
        "check": "vp check",
        "check:fix": "vp check --fix",
        "types:check": "vue-tsc --noEmit"
    }
}
```

Для React вместо `vue-tsc` используется `tsc --noEmit`, для Svelte — `svelte-check`. Поэтому в Laravel starter kits `vp check` не следует автоматически считать полной заменой framework-specific type checking: отдельный `types:check` остаётся частью CI.

| Задача | Раньше в шаблонах | Теперь |
| --- | --- | --- |
| Dev server | `vite` | `vp dev` |
| Production build | `vite build` | `vp build` |
| SSR build | отдельные вызовы Vite | `vp build && vp build --ssr` |
| Lint | `eslint .` | входит в `vp check` |
| Format check | `prettier --check .` | входит в `vp check` |
| Autofix | отдельные lint/format scripts | `vp check --fix` |
| Type check | `tsc`, `vue-tsc` или `svelte-check` | остаётся отдельным `types:check` |

В `composer.json` Inertia kits старые `lint:check` и `format:check` заменены на:

```json
{
    "scripts": {
        "ci:check": [
            "Composer\\Config::disableProcessTimeout",
            "npm run check",
            "npm run types:check",
            "@test"
        ]
    }
}
```

## Изменение `vite.config.ts`

В актуальных шаблонах конфигурация импортируется из `vite-plus`, а плагины оборачиваются в `lazyPlugins`:

```ts
import vue from '@vitejs/plugin-vue';
import laravel from 'laravel-vite-plugin';
import { defineConfig, lazyPlugins } from 'vite-plus';

export default defineConfig({
    plugins: lazyPlugins(() => [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.ts'],
            refresh: true,
        }),
        vue(),
    ]),
});
```

Полную конфигурацию не стоит копировать между Vue, React и Svelte: у каждого starter kit свои плагины, formatter options, lint rules и type-check command.

## Что стало с ESLint и Prettier

В Inertia-шаблонах удалены отдельные:

- `eslint.config.js`;
- `.prettierrc`;
- `.prettierignore`;
- scripts для раздельного lint и format check;
- соответствующие зависимости, которые больше не нужны новому workflow.

Настройки форматирования и linting переносятся в `vite.config.ts`. Это уменьшает число конфигурационных файлов, но требует проверить кастомные правила. Не каждое правило ESLint и не каждый Prettier plugin имеет прямой эквивалент в Oxlint или Oxfmt.

Особенно внимательно проверьте:

- правила импортов;
- сортировку Tailwind classes;
- framework-specific lint rules;
- форматирование Vue templates и Svelte components;
- generated Wayfinder files;
- каталоги, которые раньше находились в ignore-файлах;
- custom parser и плагины ESLint;
- pre-commit hooks и IDE integration.

## Новый проект

Для нового приложения сначала посмотрите, какой frontend stack реально сгенерирован:

```bash
cat package.json
cat vite.config.ts
```

Затем выполните базовую проверку:

```bash
npm install
npm run check
npm run types:check
npm run build
php artisan test
```

Если проект использует SSR:

```bash
npm run build:ssr
```

После запуска dev server проверьте HMR, обработку CSS, маршруты Inertia, формы, Wayfinder types и browser console.

## Нужно ли мигрировать существующий проект

### Оставить текущий Vite

Это нормальный вариант, если:

- сборка стабильна;
- ESLint и Prettier настроены под проект;
- используются редкие плагины;
- нет времени на regression testing;
- команда не получает пользы от унификации;
- переход нужен только потому, что изменился starter kit.

Starter kit — начальная точка, а не обязательная конфигурация каждого существующего Laravel-приложения.

### Мигрировать на Vite+

Переход полезнее, если:

- проект новый или frontend-конфигурация ещё небольшая;
- хочется единого `check` и меньшего числа зависимостей;
- правила ESLint/Prettier можно перенести без потерь;
- команда готова проверить production build и SSR;
- несколько Laravel-проектов нужно привести к одному workflow;
- нейроагенты и CI должны использовать небольшой, предсказуемый набор команд.

## Безопасная миграция существующего Laravel-приложения

### 1. Зафиксировать baseline

До изменения сохраните результаты:

```bash
npm ci
npm run build
npm run lint
npm run format:check
npm run types:check
php artisan test
```

Названия scripts могут отличаться. Важно получить чистый baseline до замены toolchain.

### 2. Создать отдельную ветку

Не смешивайте переход на Vite+ с обновлением Laravel, Node.js, Tailwind и frontend framework. Иначе источник regression будет трудно определить.

### 3. Запустить официальный migration helper

Vite+ предоставляет команду:

```bash
vp migrate
```

Она помогает перенести существующую конфигурацию, но результат нужно рассматривать как черновик. После migration сравните `package.json`, lockfile, `vite.config.ts`, ignore patterns и scripts.

### 4. Свериться с актуальным starter kit

Сравните свой stack с соответствующим вариантом Laravel Maestro:

- React с React;
- Vue с Vue;
- Svelte с Svelte;
- Inertia и Livewire отдельно;
- SSR только с SSR-вариантом.

Не переносите конфигурацию другого framework только ради одинакового файла.

### 5. Проверить статические проверки

```bash
npm run check
npm run types:check
```

Первый запуск `vp check --fix` может изменить много файлов. Сначала выполните обычный `vp check`, оцените diff и только затем применяйте autofix.

```bash
npm run check:fix
git diff --stat
git diff
```

### 6. Проверить production build

```bash
rm -rf public/build
npm run build
php artisan optimize:clear
```

Проверьте:

- наличие `public/build/manifest.json`;
- CSS и JavaScript assets;
- dynamic imports;
- aliases;
- preload directives;
- CSP и SRI, если они используются;
- cache busting;
- загрузку assets через CDN;
- production environment variables.

### 7. Проверить CI

Минимальная последовательность для Inertia starter kit:

```bash
npm ci
npm run check
npm run types:check
npm run build
php artisan test
```

Если CI устанавливает `vp` отдельным action или глобально, зафиксируйте версию. Если команда вызывается из локальной зависимости через npm script, убедитесь, что lockfile закоммичен и используется `npm ci`.

## Возможные проблемы

### Старые scripts вызываются из Composer

Проверьте `composer.json`, GitHub Actions, Makefile, Dockerfile и deployment scripts на упоминания:

```text
npm run lint
npm run lint:check
npm run format
npm run format:check
npx vite
vite build
```

### Кастомные ESLint rules исчезли

Удаление `eslint.config.js` из официального starter kit не означает, что его можно без проверки удалить из зрелого проекта. Сначала составьте список действительно важных правил и найдите эквивалент либо оставьте отдельный lint step.

### Formatting создаёт большой diff

Не объединяйте массовое форматирование с функциональными изменениями. Лучше сделать отдельный commit, чтобы review не скрывал реальные правки.

### Plugin ожидает обычный Vite

Проверьте плагины, которые:

- импортируют внутренние API Vite;
- жёстко завязаны на конкретную версию;
- меняют Rollup output;
- работают только в SSR;
- запускают собственный watcher;
- модифицируют manifest.

## Rollback

До merge сохраните старые:

- `package.json`;
- lockfile;
- `vite.config.ts`;
- ESLint/Prettier configs;
- CI scripts.

Rollback должен возвращать весь набор одновременно. Частичный откат, при котором scripts уже вызывают `vp`, а зависимости и config вернулись к Vite, оставит сборку в нерабочем состоянии.

## Чек-лист

- [ ] Подтверждено, что проект использует нужный вариант Laravel starter kit.
- [ ] Миграция выполняется отдельно от обновления framework и Node.js.
- [ ] Сохранён чистый baseline старой сборки.
- [ ] Проверены scripts в `package.json` и `composer.json`.
- [ ] Кастомные ESLint/Prettier rules не потеряны молча.
- [ ] Выполнены `npm run check` и framework-specific `types:check`.
- [ ] Проверены HMR и production build.
- [ ] Для SSR выполнен отдельный build и smoke-test.
- [ ] Проверены CI, Docker и deployment scripts.
- [ ] Lockfile обновлён и закоммичен.
- [ ] Есть понятный rollback одним commit или revert.

## Источники

- [Laravel Maestro PR #60: Migrate all starter kits to Vite+](https://github.com/laravel/maestro/pull/60)
- [Vite+: официальный репозиторий и документация](https://github.com/voidzero-dev/vite-plus)
- [Vite+: `vp check`](https://github.com/voidzero-dev/vite-plus/blob/main/docs/guide/check.md)
