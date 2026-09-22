---
title: "CrUX: рекламная нагрузка реальных пользователей"
description: "Четыре экспериментальные метрики рекламы, условия ads.txt, запросы CrUX API и History API, p75 и проверка изменений сайта"
icon: fa-solid fa-chart-line
category: Аналитика
tag: [Аналитика, CrUX, Chrome, Реклама, Производительность, API]
---

# CrUX: рекламная нагрузка реальных пользователей

**15 сентября 2026 года** Chrome [анонсировал четыре рекламные метрики CrUX](https://developer.chrome.com/blog/crux-ad-metrics). Документация проверена **21 сентября 2026 года**. Это данные реальных пользователей Chrome, а не результат одного запуска Lighthouse и не статистика показов рекламной сети.

Метрики экспериментальные: названия, методика и охват могут меняться. Они **не входят в Core Web Vitals**, не имеют официальных порогов «хорошо / требуется улучшение / плохо» и сами по себе не доказывают санкцию поисковой системы. Их полезно сопоставлять с LCP, INP, CLS, доходом и поведением аудитории, не заменяя одно другим.

## Четыре показателя

По [справочнику метрик](https://developer.chrome.com/docs/ads/tooling):

| Метрика | Ключ API | Что измеряется за посещение | Единица |
| --- | --- | --- | --- |
| Ad Count | `experimental_ad_count` | Среднее число видимых рекламных элементов по выборкам viewport | Число, возможно дробное |
| Ad Density | `experimental_ad_density` | Средняя доля видимой области страницы, занятая рекламой | Проценты: `30` означает 30%, не 0,30% |
| Ad Weight: CPU | `experimental_ad_cpu` | Накопленное процессорное время рекламных фреймов и workers | Миллисекунды |
| Ad Weight: Network | `experimental_ad_kilobytes` | Накопленный сетевой объём рекламных ресурсов | Килобайты, не байты и не Кбит/с |

Все четыре показателя публикуются как **p75**. Для Count и Density сначала рассчитывается среднее внутри посещения, затем перцентиль по подходящим посещениям. Поэтому p75 Count, равный условным `"2.25"`, не означает максимум в два баннера на каждом экране. Это иллюстрация интерпретации, не измерение SEO Recipes.

[Ad Count](https://developer.chrome.com/docs/ads/metrics/count) и [Ad Density](https://developer.chrome.com/docs/ads/metrics/density) описаны как строки с числовыми значениями; в примерах tooling guide Density также встречается числом. При разборе учитывайте оба представления, а не требуйте только JSON number. Сетевой вес — [объём переданных сжатых ресурсов](https://developer.chrome.com/docs/ads/metrics/weight-network), не полный размер распакованного DOM или счёт хостинг-провайдера.

## Почему данных может не быть

[Методика рекламных измерений](https://developer.chrome.com/docs/ads/methodology) вводит дополнительное условие: у сайта должен быть `ads.txt` **хотя бы с одним авторизованным продавцом**. Отсутствующий файл или только placeholder-запись исключают origin из отчётности по рекламе. Метрики относятся к страницам с рекламными ресурсами.

Также действуют [обычные условия CrUX](https://developer.chrome.com/docs/crux/methodology): публичная доступность и достаточная выборка. Точный порог посещаемости не опубликован; небольшой сайт может не получить запись. Подходящая выборка Chrome не равна всей аудитории сайта: в частности, Chrome на iOS и другие Chromium-браузеры не дают эти данные CrUX.

**Отсутствующая метрика, `null` или ответ `NOT_FOUND` не означают нулевую рекламную нагрузку.** Не добавляйте вымышленного продавца в `ads.txt` ради появления отчёта: указываются только реальные разрешённые партнёры. Наличие Core Web Vitals в CrUX не гарантирует наличие рекламных метрик.

## Где смотреть

| Инструмент | Что использовать | Ограничение |
| --- | --- | --- |
| CrUX Vis | Визуальный просмотр origin/URL и устройств без собственного кода | Проверять фактическое наличие выбранной метрики и периода |
| CrUX API | Последняя агрегация за скользящие 28 дней; обновление ежедневно | Не оперативный мониторинг текущего релиза |
| CrUX History API | Последовательность 28-дневных окон с недельным шагом | Соседние точки перекрываются; новая метрика может иметь короткую историю |
| Chrome DevTools Ads panel | Локальный разбор рекламы в конкретном сеансе | Не field-выборка и не замена CrUX |

Ссылки и доступность инструментов: [tooling guide](https://developer.chrome.com/docs/ads/tooling). На дату проверки рекламные метрики в **CrUX BigQuery ещё только планируются**: нельзя обещать готовый SQL по этим полям. В DevTools измерения могут отображаться даже без `ads.txt`, поскольку фильтр применяется при агрегации CrUX. Это не противоречие между локальным инструментом и API.

## Запросить текущие данные и историю

Понадобятся Bash, `curl`, `jq` и Google Cloud API key для **Chrome UX Report API**. Создание ключа и квоты описаны в [CrUX API](https://developer.chrome.com/docs/crux/api). Ключ ограничьте нужным API и применимыми ограничениями приложения; не размещайте его в VuePress, публичном JavaScript, Git или логах CI.

Сохраните код как `crux-ads.sh`, замените `ORIGIN` своим origin и запустите `bash crux-ads.sh`. В CI передайте `CRUX_API_KEY` через хранилище секретов; при локальном запуске скрипт запросит ключ без отображения. Нужен origin со схемой и хостом, без пути, например `https://www.example.com`.

```bash
#!/usr/bin/env bash
set +x
set -euo pipefail
umask 077

command -v curl >/dev/null
command -v jq >/dev/null
ORIGIN="${ORIGIN:-https://example.com}"
if [[ -z "${CRUX_API_KEY:-}" ]]; then
  read -r -s -p 'CrUX API key: ' CRUX_API_KEY
  printf '\n' >&2
fi
# Ограничение исключает кавычки/переносы строк в конфигурации curl.
[[ "$CRUX_API_KEY" =~ ^[A-Za-z0-9_-]+$ ]] || {
  printf 'Некорректный формат API key\n' >&2; exit 1;
}
OUT=$(mktemp -d ./crux-ads.XXXXXX)
printf 'Файлы запросов и ответов: %s\n' "$OUT"
jq -n --arg origin "$ORIGIN" '{
  origin: $origin, formFactor: "PHONE",
  metrics: ["experimental_ad_count", "experimental_ad_density",
            "experimental_ad_cpu", "experimental_ad_kilobytes"]
}' > "$OUT/current-request.json"
jq '. + {collectionPeriodCount: 40}' "$OUT/current-request.json" \
  > "$OUT/history-request.json"

query_crux() {
  local method="$1" request="$2" output="$3" status
  # Ключ передаётся через stdin-конфигурацию, не в URL или argv curl.
  if ! status=$(printf 'header = "X-Goog-Api-Key: %s"\n' "$CRUX_API_KEY" |
    curl --config - --silent --show-error \
      --connect-timeout 10 --max-time 45 --request POST \
      --header 'Content-Type: application/json' \
      --data-binary "@$request" --output "$output" \
      --write-out '%{http_code}' \
      "https://chromeuxreport.googleapis.com/v1/records:${method}"); then
    printf 'Сетевая ошибка CrUX; результат не является измерением\n' >&2
    return 1
  fi
  if [[ "$status" != "200" ]]; then
    printf 'CrUX HTTP %s; проверьте ответ в %s\n' "$status" "$output" >&2
    return 1
  fi
  jq -e '(.record | type) == "object"' "$output" >/dev/null
}

query_crux queryRecord "$OUT/current-request.json" "$OUT/current.json"
query_crux queryHistoryRecord "$OUT/history-request.json" "$OUT/history.json"
unset CRUX_API_KEY
printf 'Ответы получены. Это не гарантия наличия всех четырёх метрик.\n'
```

Оба endpoint описаны в [CrUX API](https://developer.chrome.com/docs/crux/api) и [History API](https://developer.chrome.com/docs/crux/history-api). Для авторизации использован [рекомендуемый Google заголовок `x-goog-api-key`](https://docs.cloud.google.com/docs/authentication/api-keys-use), а не ключ в URL. Не включайте `bash -x`, `curl -v` или трассировку HTTP с секретами.

Скрипт создаёт отдельный каталог, не перезаписывает предыдущие измерения и прекращает выполнение при ошибке. Он не делает автоматического fallback с URL на origin. Для запроса страницы замените поле `origin` на `url` в JSON и передайте полный адрес страницы; **эти поля взаимоисключающие**. `PHONE`, `DESKTOP` и отсутствие `formFactor` — разные выборки, их нельзя молча склеивать.

## Прочитать результат без подмены пропусков нулями

В следующих командах замените `OUT` путём, напечатанным скриптом. Для текущего ответа значения находятся в `record.metrics.<ключ>.percentiles.p75`, а даты — в `record.collectionPeriod`.

```bash
OUT='./crux-ads.XXXXXX' # замените реальным каталогом
jq --slurpfile request "$OUT/current-request.json" '
  .record as $r |
  {key: $r.key, collectionPeriod: $r.collectionPeriod,
   p75: (reduce $request[0].metrics[] as $m
     ({}; .[$m] = ($r.metrics[$m].percentiles.p75 // null)))}
' "$OUT/current.json"
```

Для истории дата и значение связываются **по одному индексу**, а не по дате скачивания. `null` сохраняется; строковые числа не теряют дробную часть.

```bash
jq --slurpfile request "$OUT/history-request.json" '
  .record as $r |
  {key: $r.key, samples: [
    range(0; ($r.collectionPeriods | length)) as $i |
    {period: $r.collectionPeriods[$i],
     p75: (reduce $request[0].metrics[] as $m
       ({}; .[$m] =
         ($r.metrics[$m].percentilesTimeseries.p75s[$i] // null)))}
  ]}
' "$OUT/history.json"
```

По [справочнику History API](https://developer.chrome.com/docs/crux/history-api) по умолчанию возвращается 25 периодов; `collectionPeriodCount` принимает 1–40. В примере явно запрошены 40, но это **не обещание 40 непустых точек рекламной истории**. Недоступные p75 могут быть `null`. Сохраняйте исходный JSON, ключ выборки, `firstDate`/`lastDate` и время получения; не удаляйте пропуски так, чтобы сдвигались даты.

## Как сравнивать рекламную сетку до и после изменения

Точки History API обновляются по понедельникам и содержат 28-дневные окна. Соседние недельные точки имеют 21 общий день; текущий API также не показывает только сегодняшний день. Резкое изменение сайта будет постепенно входить в выборку. Не выдавайте сравнение соседних точек за независимый A/B-тест и не усредняйте p75 разных страниц как «p75 всего сайта».

Практический порядок: сохранить baseline для одного origin/URL и устройства; записать дату изменения шаблона; проверить его локально; затем сравнить сопоставимые, по возможности неперекрывающиеся окна с учётом состава аудитории. Отдельно следить за LCP/INP/CLS, доходом и ошибками. Внутренний порог регрессии можно установить самим, но назвать его внутренним, не порогом Google.

Для WordPress сравнивайте один шаблон и тип устройства, меняя по одному фактору: рекламный плагин, sticky-блок, lazy loading или refresh. Для Vue SPA [soft navigation не обнуляет рекламное измерение](https://developer.chrome.com/docs/ads/methodology): показатели могут накапливаться за несколько экранов одного посещения. Продолжительность чтения и бесконечная прокрутка тоже влияют на накопленные CPU/network; рост не доказывает, что отдельный креатив стал тяжелее.

## Ошибки и ограничения

| Ситуация | Что делать |
| --- | --- |
| `404` / `NOT_FOUND` | Проверить origin/URL, выборку и eligibility. Это отсутствие записи API, не доказательство HTTP 404 самого сайта |
| HTTP 200, но нет одной метрики или p75 равен `null` | Сохранить «нет данных» и проверить `ads.txt`/охват; не заменять нулём |
| `400` | Проверить JSON, ключи метрик и взаимоисключающие `origin`/`url` |
| `403` | Проверить API key, включённый API и ограничения ключа; это не WAF-ошибка вашего сайта |
| `429` | Уменьшить частоту запросов и проверить квоту проекта; повторы ограничить, без бесконечного цикла |
| Timeout, не-JSON или отсутствующий `record` | Отметить сбой сбора, не публиковать ответ как успешное измерение |

На дату проверки CrUX API документирует **150 запросов в минуту на Google Cloud project** без оплаты; квоту и расход проверяйте в консоли. Для такого мониторинга обычно достаточно ежедневного snapshot и недельного history, а не запроса на каждый page view. Немедленную проверку релиза выполняйте лабораторными тестами, не блокируйте deployment ожиданием обновления CrUX.

## Проверка перед использованием

- [ ] Есть достаточная выборка и действительный `ads.txt` с разрешённым продавцом.
- [ ] Origin, URL и устройство не смешиваются; сохранены даты окна и получения.
- [ ] p75 не принят за среднее по всем пользователям или максимум на экране.
- [ ] Пропуски остаются пропусками, а не нулями; история выровнена по индексам.
- [ ] API key не опубликован; HTTP/сетевые ошибки отделены от результатов.
- [ ] Пороги регрессии названы внутренними; экспериментальные поля не объявлены фактором ранжирования.

Реальные запросы с пользовательским API key, измерения сайта и изменения рекламной конфигурации при подготовке материала не выполнялись. Примеры требуют проверки на собственной выборке.

## Первоисточники

- [Анонс Chrome от 15 сентября 2026](https://developer.chrome.com/blog/crux-ad-metrics)
- [Ключи метрик и доступные инструменты](https://developer.chrome.com/docs/ads/tooling)
- [Методика рекламных измерений, ads.txt и SPA](https://developer.chrome.com/docs/ads/methodology)
- [Общие условия включения в CrUX](https://developer.chrome.com/docs/crux/methodology)
- [CrUX API: запросы, origin/URL и квоты](https://developer.chrome.com/docs/crux/api)
- [CrUX History API: периоды и пропуски](https://developer.chrome.com/docs/crux/history-api)
- [Google Cloud: использование API keys](https://docs.cloud.google.com/docs/authentication/api-keys-use)

Описание методики пересказано и адаптировано по документации Google Chrome for Developers, опубликованной под [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Примеры сбора и обработки выше подготовлены для этого рецепта; данные CrUX при дальнейшей публикации также требуют атрибуции Google.
