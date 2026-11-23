---
title: "ImageDeliveryAudit: проверка доставки Cloudflare Images"
description: "Аналитика hosted images, SQL с проверкой схемы, ошибки, варианты изображений и небольшой пилот для WordPress"
icon: fa-solid fa-images
category: Хостинг
tag: [Cloudflare, Images, WordPress, Аналитика, Тестирование, "2026"]
---

# ImageDeliveryAudit: что происходит с изображениями после загрузки

**Источники, API и тарифы проверены 23 ноября 2026 года.** Рецепт помогает найти проблемные изображения и варианты, проверить доставку и собрать данные для решения о внедрении. Запросы к клиентскому аккаунту и тесты WordPress при подготовке материала не выполнялись.

20 ноября Cloudflare [добавила аналитику доставки hosted images](https://developers.cloudflare.com/changelog/post/2026-11-20-hosted-image-delivery-analytics/). В разделе **Images & Stream → Hosted images → Analytics** доступны данные до 30 дней: запросы, HTTP-статусы, оригиналы и конфигурации доставки, источники трафика и характеристики клиентов. Срок хранения и доступность конкретного SQL dataset проверяются отдельно для аккаунта.

Результат аудита — список конкретных ошибок с затронутыми изображениями, перечень используемых вариантов, замеры небольшой выборки и сравнение расходов за согласованный период. Количество запросов само по себе не показывает размер переданных файлов, ускорение страницы или экономию.

## 1. Определите способ доставки

| Как устроены изображения | Что проверять | Откуда брать данные |
| --- | --- | --- |
| Оригиналы загружены в Cloudflare Images | Доставку hosted images и используемые варианты | Hosted images → Analytics; `events.imagesHostedRequests` |
| Оригиналы остаются на WordPress, в R2 или другом origin и проходят через Images transformations | Запросы преобразований, origin, конфигурации и Workers | Transformations → Analytics; `events.imagesTransformations` |
| Обычные `/wp-content/uploads/` без Images | Доставку текущего хостинга/CDN и поведение браузера | Access logs, доступная аналитика CDN и Network в браузере |

[Cloudflare разделяет собственное хранилище Images и обработку удалённых оригиналов](https://developers.cloudflare.com/images/). Обычное проксирование домена через Cloudflare не загружает медиабиблиотеку в Images и не превращает её в hosted images.

Типичный [URL hosted image](https://developers.cloudflare.com/images/optimization/hosted-images/serve-uploaded-images/) имеет вид `https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT_NAME>`. Возможна [доставка через свой домен](https://developers.cloudflare.com/images/optimization/hosted-images/serve-from-custom-domains/), поэтому одного hostname для классификации недостаточно: сверьте настройки и путь запроса. **Images account hash для URL и account ID/tag для API — разные значения.**

[Remote transformations](https://developers.cloudflare.com/images/optimization/transformations/overview/) оптимизируют исходники на другом origin. Их кеширование и учёт использования нельзя переносить на hosted delivery. [Аналитика transformations](https://developers.cloudflare.com/changelog/post/2026-09-23-transformation-analytics/) показывает оценку трафика запросов, в том числе отдельно URL-based и Images binding requests.

## 2. Подготовьте доступ и окно наблюдения

Для account-scoped SQL требуется **Account Analytics Read**, ограниченный нужным аккаунтом. [Документация доступа](https://developers.cloudflare.com/analytics/sql-api/get-started/) предупреждает, что отдельные datasets и поля могут требовать дополнительных продуктовых разрешений. Это базовое право, а не обещание доступа ко всем полям Images. Для чтения аналитики не выдавайте права на удаление изображений, редактирование зон или полный доступ к аккаунту.

Понадобятся Bash, `curl`, `jq` и установленный, авторизованный **Cloudflare CLI с командой `cf sql query`**. Настройте секреты штатным способом клиента или CI; токен не должен попадать в статью, репозиторий и журнал команд. SQL API обозначен в документации как Beta; сохраните версию CLI и дату проверки схемы.

В примере ниже — час 22 ноября, **00:00–01:00 UTC / 05:00–06:00 Екатеринбурга**. Замените его на своё завершённое окно внутри доступного срока хранения. Account tag возьмите из своего аккаунта:

```bash
IMAGE_AUDIT_ACCOUNT='<ACCOUNT_TAG>'
IMAGE_AUDIT_START='2026-11-22T00:00:00Z'
IMAGE_AUDIT_END='2026-11-22T01:00:00Z'

image_audit_query() {
  cf sql query "$1" \
    --scope-account "$IMAGE_AUDIT_ACCOUNT" \
    --time-since "$IMAGE_AUDIT_START" \
    --time-until "$IMAGE_AUDIT_END"
}
```

[Обе границы CLI включаются в выборку](https://developers.cloudflare.com/analytics/sql-api/get-started/). При суммировании соседних окон исключите повторный учёт общей границы. Не дублируйте scope или временные условия внутри SQL, когда они уже заданы флагами.

### Сначала получите реальную схему

У [SQL API есть introspection endpoint](https://developers.cloudflare.com/analytics/sql-api/datasets/). Следующая команда сохраняет названия, типы и описания полей hosted dataset. Токен вводится скрыто; заголовок передаётся `curl` через stdin, без значения секрета в аргументах процесса:

```bash
(
  set +x
  umask 077
  IFS= read -r -s -p 'Read-only API token: ' IMAGE_AUDIT_TOKEN
  printf '\n' >&2
  test -n "$IMAGE_AUDIT_TOKEN" || exit 1

  printf 'Authorization: Bearer %s\n' "$IMAGE_AUDIT_TOKEN" |
    curl --fail-with-body --silent --show-error --max-time 20 \
      --get 'https://api.cloudflare.com/client/v4/analytics/sql/introspection' \
      --header @- \
      --data-urlencode "account_tag=$IMAGE_AUDIT_ACCOUNT" \
      --data-urlencode 'dataset_name=events.imagesHostedRequests' \
      --data-urlencode 'include_columns=true' \
      --output images-hosted-schema.json
)

jq -r '.datasets[]
  | select(.name == "events.imagesHostedRequests")
  | .columns[]
  | [.name, .data_type, .description]
  | @tsv' images-hosted-schema.json
```

Продолжайте только после успешного ответа и проверки его структуры. Для transformations повторите introspection с `dataset_name=events.imagesTransformations`, сохранив результат отдельно. Наличие поля в каталоге ещё не гарантирует разрешение выполнить запрос к нему.

Сохраните `kind.events.sampling`: для `adaptive` SQL API применяет веса к поддерживаемым агрегатам, включая `COUNT`. Такой результат отмечайте как оценку; выгрузка отдельных строк не восстанавливает пропущенные события.

## 3. Измерьте статусы hosted delivery

Поле `httpStatus` и dataset подтверждены [официальным примером Images](https://developers.cloudflare.com/changelog/post/2026-11-20-hosted-image-delivery-analytics/). В той же Bash-сессии, где определена функция:

```bash
# Общий объём: отдельный знаменатель, без усечения до top-N.
image_audit_query 'SELECT COUNT(*) AS delivery_requests
  FROM events.imagesHostedRequests'

# Частые статусы: ограниченный список для поиска проблем.
image_audit_query 'SELECT httpStatus, COUNT(*) AS request_count
  FROM events.imagesHostedRequests
  GROUP BY httpStatus
  ORDER BY request_count DESC
  LIMIT 20'

# Все HTTP 4xx/5xx за то же окно, независимо от попадания в top-20.
image_audit_query 'SELECT COUNT(*) AS error_requests
  FROM events.imagesHostedRequests
  WHERE httpStatus >= 400 AND httpStatus < 600'
```

Доля HTTP-ошибок вычисляется как `error_requests / delivery_requests` при ненулевом знаменателе и одинаковом scope/окне. Не складывайте top-20 как полное количество запросов. Если аккаунт обслуживает несколько сайтов, эти цифры относятся ко всему выбранному аккаунту: для проекта нужен проверенный фильтр по его объектам или срез в интерфейсе.

## 4. Найдите оригиналы, варианты и referrers

В опубликованном примере Cloudflare **не приведены точные SQL-имена этих трёх измерений**. Не подставляйте предположительные `imageId`, `variant` или `referrer`. Выберите поля по описаниям в полученной схеме, затем выполните группировку. Функция ниже принимает только существующее строковое поле с простым именем:

```bash
image_audit_top() {
  local IMAGE_AUDIT_COLUMN="$1"
  if [[ ! "$IMAGE_AUDIT_COLUMN" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    printf 'Недопустимое имя колонки\n' >&2
    return 1
  fi
  if ! jq -e --arg column "$IMAGE_AUDIT_COLUMN" '
    [.datasets[]
      | select(.name == "events.imagesHostedRequests")
      | .columns[]
      | select(.name == $column and .data_type == "String")]
    | length == 1' images-hosted-schema.json >/dev/null; then
    printf 'Строковое поле не подтверждено схемой\n' >&2
    return 1
  fi
  image_audit_query "SELECT $IMAGE_AUDIT_COLUMN, COUNT(*) AS request_count
    FROM events.imagesHostedRequests
    GROUP BY $IMAGE_AUDIT_COLUMN
    ORDER BY request_count DESC
    LIMIT 20"
}

read -r -p 'Поле оригинала из схемы: ' IMAGE_AUDIT_ORIGINAL_COLUMN
image_audit_top "$IMAGE_AUDIT_ORIGINAL_COLUMN"
read -r -p 'Поле варианта/конфигурации из схемы: ' IMAGE_AUDIT_VARIANT_COLUMN
image_audit_top "$IMAGE_AUDIT_VARIANT_COLUMN"
read -r -p 'Поле referrer из схемы: ' IMAGE_AUDIT_REFERRER_COLUMN
image_audit_top "$IMAGE_AUDIT_REFERRER_COLUMN"
```

Имена и смысл выбранных полей запишите рядом с результатом. Проверка принадлежности схеме защищает от ошибочной подстановки имени, но не выбирает за оператора семантику поля и не проверяет доступность его значений. Если нужного строкового поля нет, оно находится в составной структуре или запрос запрещён, используйте соответствующий срез **Hosted images → Analytics**. Неподтверждённый SQL не заменяет данные интерфейса.

| Наблюдение | Следующая проверка |
| --- | --- |
| Один оригинал получает много 4xx | Сопоставить image ID с записью медиабиблиотеки, проверить реальный URL, существование объекта и доступ к нему |
| Редкий вариант получает непропорционально много запросов | Проверить шаблон, `srcset`/`sizes` и фактический `currentSrc` в браузере |
| Изменились referrers, ASN или страны | Проверить источник переходов и профиль трафика; отсутствие referrer само по себе не доказывает бота |
| Выросли 5xx | Сохранить время, конкретный URL и ответ, сопоставить с собственными логами и статусом провайдера; причина требует отдельного подтверждения |

Полные referrers и пути могут содержать пользовательские данные. Для общего отчёта оставьте необходимые домены и агрегаты; исходную выгрузку храните с ограниченным доступом.

## 5. Отделите transformations от hosted delivery

Следующий запрос использует поля из официального changelog. Запускайте его только если этот способ обработки действительно используется:

```bash
image_audit_query 'SELECT isBindingRequest, originHost, scriptName,
    COUNT(*) AS transformation_requests
  FROM events.imagesTransformations
  GROUP BY isBindingRequest, originHost, scriptName
  ORDER BY transformation_requests DESC
  LIMIT 10'
```

Сопоставьте строки с конкретным Worker или origin. **`transformation_requests` — число запросов/его оценка, не число оплачиваемых уникальных преобразований.** Не складывайте его с hosted requests как один показатель доставки: этапы и правила учёта различаются.

В [ответе SQL API](https://developers.cloudflare.com/analytics/sql-api/query-api/) `statistics.bytes_read` означает работу хранилища при выполнении запроса. Это **не исходящий трафик изображений**. Для объёма доставки требуется подходящая подтверждённая метрика или отдельные измерения; нельзя переименовать служебную статистику в экономию CDN.

Ошибки аналитического API также не равны ошибкам доставки изображений. По [документации](https://developers.cloudflare.com/analytics/sql-api/errors/) `403` требует проверки прав/плана/полей, `422` — исправления запроса. При `429` учитывайте `Retry-After`; при превышении [лимитов](https://developers.cloudflare.com/analytics/sql-api/limits/) сокращайте окно или объём результата. Не записывайте неудачный запрос как ноль событий.

## 6. Проверьте эффект на небольшой выборке WordPress

Это предложенный порядок эксперимента SEO Recipes, а не отчёт о выполненном внедрении:

1. Выберите 10–20 публичных изображений с 2–3 тестовых страниц: фотографию, прозрачный PNG, маленькую миниатюру и крупное изображение. Сохраните соответствие `attachment → оригинальный URL → image ID`; исходники остаются на месте.
2. Снимите исходный результат на desktop и mobile: визуальное качество, `currentSrc`, размеры файла и отображения, Content-Type, HTTP-статус, переданные байты и время загрузки. Фиксируйте браузер, размер viewport, DPR, сеть и состояние кеша.
3. Для hosted-пилота загрузите только выбранные копии. Задайте два [именованных варианта](https://developers.cloudflare.com/images/optimization/hosted-images/create-variants/), например `audit-small` шириной 480 px и `audit-large` шириной 1280 px, с `scale-down`. Это пример параметров: используйте размеры реальных блоков и проверьте обрезку/прозрачность. Не делайте приватные изображения публичными ради теста.
4. Подмените URL только на тестовых страницах. Проверьте `srcset`/`sizes`, alt-текст и отсутствие битых ссылок. У hosted Images выходной формат зависит от клиента и исходника: проверяйте фактический Content-Type и изображение, не требуйте одного формата во всех случаях.
5. Повторите те же сценарии и соберите аналитику за выбранное завершённое окно. При малом трафике или sampling отдельно отметьте недостаточность данных. Лабораторный выигрыш одного файла не доказывает улучшение пользовательских метрик всего сайта.
6. Верните исходные URL, если качество или функциональность ухудшились. Массовый перенос медиабиблиотеки, удаление оригиналов и глобальное переписывание URL в БД в этот пилот не входят.

Если Images ещё не используется, начните с третьей строки таблицы способов доставки. Проверить лишние размеры, ошибки и объём загрузки можно по своим логам и браузеру; для этого не требуется заранее мигрировать все изображения в новый сервис.

## 7. Сравните расходы отдельно от трафика

[Тарифная страница Cloudflare Images](https://developers.cloudflare.com/images/pricing/), проверка **23.11.2026**:

| Метрика | Опубликованная ставка и правила |
| --- | --- |
| Images Stored | $5 за блок 100 000 хранимых изображений в месяц; учитываются загруженные оригиналы, не число заданных вариантов |
| Images Delivered | $1 за 100 000 доставок; для hosted images оплачивается ответ **HTTP 200 размером больше 1 024 байт** |
| Images Transformed | Первые 5 000 уникальных преобразований в месяц включены; далее на Paid — $0.50 за 1 000 |

Уникальность transformations считается по исходнику и параметрам в календарном месяце; повторы не добавляют новую единицу, `format` и `quality` исключены из определения уникальности. Hosted delivery URL относится к Images Delivered; обработка через Images binding учитывается как Images Transformed. Хранение в Images требует Paid.

Не умножайте общий `COUNT(*)` на ставку доставки: в выборку входят ответы с иными статусами и размерами, а доступные агрегаты могут быть оценочными. Для финансового итога сверяйте usage/billing аккаунта, текущие условия и один расчётный период. Отдельно добавьте затраты origin/R2/Workers и другие реально используемые услуги. Снижение байтов не обязано снижать стоимость доставки, тарифицируемой по запросам.

## Что сохранить в отчёте

| Раздел | Достаточное свидетельство |
| --- | --- |
| Условия | Дата, аккаунт/проект, способ доставки, UTC-окно, версия CLI, схема и sampling, применённые фильтры |
| Ошибки | Полный знаменатель, число 4xx/5xx, затронутые объекты и проверенные URL; отдельно ошибки получения аналитики |
| Оригиналы и варианты | Top-списки, реальные имена полей или скриншоты срезов, связь с шаблонами сайта |
| Качество и скорость | Одинаковая выборка до/после, фактические байты, размеры, формат и визуальная проверка |
| Стоимость | Usage и счёт по отдельным метрикам; измеренная сумма либо явное «не проверено» |
| Решение | Исправить конкретный URL/вариант, расширить пилот или отложить; условие повторной проверки |

Рецепт считается проверенным на конкретном сайте после успешных запросов к его аккаунту, сопоставления нескольких результатов с браузером и воспроизводимого пилота. Синтаксическая проверка примеров и чтение документации не подтверждают API-доступ, качество изображения или экономию на production.

Связанный материал: [проверка фактической очистки CDN-кеша](./cloudflare-cache-purge-2026-11-20.md). Идея и критерии рецепта: [issue #235](https://github.com/ichinya/seo_recipes/issues/235).
