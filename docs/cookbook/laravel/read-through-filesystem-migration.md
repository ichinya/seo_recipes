---
title: Миграция S3-хранилища без простоя через Laravel read-through filesystem
description: Перенос файлов из старого S3 или S3-compatible storage в новое хранилище с ленивым продвижением, фоновым копированием, проверкой и откатом
icon: fa-solid fa-cloud-arrow-up
category: Laravel
tag: [Laravel, Laravel 13, S3, Object Storage, Миграция, Flysystem, Бэкапы]
---

# Миграция S3-хранилища без простоя через Laravel read-through filesystem

Laravel 13 добавил драйвер `read-through`, который объединяет два filesystem disk в один логический диск:

- **primary** — новое хранилище, куда сразу идут все новые записи;
- **fallback** — старое хранилище, из которого продолжают читаться ещё не перенесённые файлы.

При первом чтении объекта, которого нет в primary, Laravel может получить его из fallback и скопировать в primary. Такое ленивое копирование называется promotion.

```text
новая загрузка ───────────────────────→ primary
                                             ↑
чтение старого объекта → fallback → promotion
```

Это позволяет переключить приложение на новое хранилище до завершения полного переноса миллионов объектов.

## Когда использовать

Подход подходит для миграций:

```text
Amazon S3 → другое S3
S3 → Cloudflare R2
MinIO → S3-compatible storage
один bucket/prefix → другой bucket/prefix
local disk → object storage
```

Условие: приложение должно обращаться к файлам через Laravel Filesystem. Если браузеры получают старые объекты напрямую по URL исходного CDN или bucket, такой запрос проходит мимо Laravel и promotion не выполняется.

## План миграции

```text
1. Инвентаризация и резервный план
2. Настройка source и destination disks
3. Read-through disk поверх них
4. Все новые записи → destination
5. Горячие объекты переносятся при чтении
6. Холодный хвост копируется фоновыми jobs/утилитой
7. Проверка количества, размеров и checksum
8. Период наблюдения
9. Отключение fallback и отзыв старых ключей
```

## 1. Подготовить исходное и новое хранилище

Для S3-драйвера нужен пакет Flysystem:

```bash
composer require league/flysystem-aws-s3-v3 "^3.0" --with-all-dependencies
```

Используйте разные переменные окружения для source и destination:

```dotenv
FILESYSTEM_DISK=assets

LEGACY_S3_KEY=
LEGACY_S3_SECRET=
LEGACY_S3_REGION=
LEGACY_S3_BUCKET=
LEGACY_S3_ENDPOINT=
LEGACY_S3_URL=
LEGACY_S3_PATH_STYLE=false

PRIMARY_S3_KEY=
PRIMARY_S3_SECRET=
PRIMARY_S3_REGION=
PRIMARY_S3_BUCKET=
PRIMARY_S3_ENDPOINT=
PRIMARY_S3_URL=
PRIMARY_S3_PATH_STYLE=false
```

Не переиспользуйте один набор ключей для двух провайдеров. После миграции доступ к fallback нужно будет отозвать независимо.

Перед переключением соберите inventory:

- количество объектов;
- суммарный объём;
- распределение по размеру;
- самые большие объекты;
- используемые prefixes;
- ACL/visibility;
- `Content-Type`;
- `Cache-Control`;
- `Content-Disposition`;
- custom metadata;
- object versions;
- lifecycle rules;
- CORS;
- CDN configuration;
- egress price исходного провайдера.

## 2. Настроить три disks

`config/filesystems.php`:

```php
<?php

return [
    'default' => env('FILESYSTEM_DISK', 'assets'),

    'disks' => [
        'legacy-s3' => [
            'driver' => 's3',
            'key' => env('LEGACY_S3_KEY'),
            'secret' => env('LEGACY_S3_SECRET'),
            'region' => env('LEGACY_S3_REGION'),
            'bucket' => env('LEGACY_S3_BUCKET'),
            'endpoint' => env('LEGACY_S3_ENDPOINT'),
            'url' => env('LEGACY_S3_URL'),
            'use_path_style_endpoint' => env(
                'LEGACY_S3_PATH_STYLE',
                false,
            ),
            'throw' => true,
        ],

        'primary-s3' => [
            'driver' => 's3',
            'key' => env('PRIMARY_S3_KEY'),
            'secret' => env('PRIMARY_S3_SECRET'),
            'region' => env('PRIMARY_S3_REGION'),
            'bucket' => env('PRIMARY_S3_BUCKET'),
            'endpoint' => env('PRIMARY_S3_ENDPOINT'),
            'url' => env('PRIMARY_S3_URL'),
            'use_path_style_endpoint' => env(
                'PRIMARY_S3_PATH_STYLE',
                false,
            ),
            'throw' => true,
        ],

        'assets' => [
            'driver' => 'read-through',
            'primary' => 'primary-s3',
            'fallback' => 'legacy-s3',
            'throw' => true,
            'throw_on_promotion_failure' => false,
        ],
    ],
];
```

Для большинства S3-compatible сервисов достаточно корректно задать credentials, region, bucket и `endpoint`. Некоторые провайдеры требуют path-style URL, другие — virtual-hosted style.

После изменения config:

```bash
php artisan config:clear
php artisan config:cache
```

## 3. Перевести приложение на логический disk

Новые операции должны использовать `assets`, а не имена конкретных провайдеров.

Плохо:

```php
Storage::disk('legacy-s3')->put($path, $contents);
```

Хорошо:

```php
Storage::disk('assets')->put($path, $contents);
```

Если `assets` назначен default disk:

```php
Storage::put($path, $contents);
```

До deploy найдите прямые обращения к старому disk:

```bash
grep -R "legacy-s3\|Storage::disk('s3')" \
  app config routes tests
```

Проверьте также:

- queued jobs;
- scheduled commands;
- import/export;
- image processing;
- mail attachments;
- admin panel;
- signed URLs;
- webhook handlers;
- cleanup jobs;
- отдельные workers со старым config cache.

## 4. Как маршрутизируются операции

| Операция | Куда идёт | Выполняется promotion |
| --- | --- | --- |
| `get`, `read`, `readStream` | primary, затем fallback | Да, по умолчанию |
| `exists`, `size`, `mimeType` | primary, затем fallback | Нет |
| `put`, `writeStream` | primary | Не требуется |
| listing | primary | Нет |
| `delete` | fallback, затем primary | Нет, удаляет из обоих |
| temporary upload URL | primary | Не требуется |
| public/temporary download URL | disk, где найден объект | Нет |

Два следствия особенно важны.

### Listing не показывает остаток fallback

```php
Storage::disk('assets')->allFiles();
```

показывает состояние primary, а не объединённый список двух хранилищ. Для фоновой миграции перечисляйте source напрямую или используйте provider inventory.

### `url()` не переносит объект

```php
$url = Storage::disk('assets')->url($path);
```

Laravel определяет disk, где находится файл, и возвращает его provider URL. Браузер скачивает объект напрямую, поэтому содержимое не проходит через read-through driver и не копируется.

Если большая часть трафика идёт через CDN/direct URLs, горячие объекты могут оставаться в fallback. Нужен background transfer или контролируемый application download endpoint.

## 5. Чтение больших файлов

`get()` загружает объект в PHP-строку. Для больших файлов используйте stream:

```php
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

public function download(string $path): StreamedResponse
{
    abort_unless(
        Storage::disk('assets')->exists($path),
        404,
    );

    $stream = Storage::disk('assets')->readStream($path);

    abort_if($stream === false, 500, 'Unable to open file');

    return response()->streamDownload(
        function () use ($stream): void {
            try {
                fpassthru($stream);
            } finally {
                if (is_resource($stream)) {
                    fclose($stream);
                }
            }
        },
        basename($path),
    );
}
```

Первое чтение fallback-объекта всё равно включает:

1. скачивание из source;
2. загрузку в destination;
3. ответ клиенту.

Учтите timeout, временный диск и egress. Для многогигабайтных файлов лучше выполнить bulk copy до включения пользовательского promotion.

## 6. Поведение при ошибке promotion

По умолчанию:

```php
'throw_on_promotion_failure' => false,
```

Если fallback успешно прочитан, но запись в primary не удалась, пользователь всё равно получает файл. Следующее чтение снова попробует promotion.

Это полезно для доступности, но ошибка не должна остаться незаметной. Добавьте метрики и алерт на рост чтений из fallback.

Строгий режим:

```php
'throw' => true,
'throw_on_promotion_failure' => true,
```

В таком режиме ошибка копирования может превратить успешное чтение fallback в ошибку приложения. Используйте его только если бизнес-логика требует гарантировать, что каждое прочтение одновременно закрепило объект в destination.

## 7. Фоновое копирование холодного хвоста

Read-through переносит активные объекты. Редко используемые файлы могут никогда не прочитаться, поэтому после cutover нужен bulk pass.

Для большого bucket не вызывайте `allFiles()` без оценки объёма: метод формирует массив и может занять много памяти. Надёжнее:

- S3 Inventory;
- paginated provider API;
- `rclone`;
- `mc mirror`;
- managed migration service;
- manifest с одним key на строку.

Ниже команда читает заранее подготовленный manifest и ставит jobs в очередь.

```bash
php artisan make:command DispatchStorageMigration
php artisan make:job CopyStorageObject
```

Команда:

```php
<?php

namespace App\Console\Commands;

use App\Jobs\CopyStorageObject;
use Illuminate\Console\Command;
use Illuminate\Support\LazyCollection;
use RuntimeException;

class DispatchStorageMigration extends Command
{
    protected $signature = 'storage:migrate-manifest
        {manifest : Text file with one object key per line}
        {--queue=storage-migration}
        {--limit=0 : 0 means no limit}
        {--dry-run}';

    protected $description =
        'Dispatch idempotent object-copy jobs from a manifest';

    public function handle(): int
    {
        $manifest = realpath((string) $this->argument('manifest'));

        if ($manifest === false || ! is_readable($manifest)) {
            throw new RuntimeException('Manifest is not readable');
        }

        $handle = fopen($manifest, 'rb');

        if ($handle === false) {
            throw new RuntimeException('Unable to open manifest');
        }

        $limit = max(0, (int) $this->option('limit'));
        $count = 0;

        try {
            $paths = LazyCollection::make(
                function () use ($handle): \Generator {
                    while (($line = fgets($handle)) !== false) {
                        $path = trim($line);

                        if ($path !== '') {
                            yield $path;
                        }
                    }
                },
            );

            foreach ($paths as $path) {
                if ($limit > 0 && $count >= $limit) {
                    break;
                }

                if ($this->option('dry-run')) {
                    $this->line($path);
                } else {
                    CopyStorageObject::dispatch($path)
                        ->onQueue((string) $this->option('queue'));
                }

                $count++;
            }
        } finally {
            fclose($handle);
        }

        $this->info("Processed paths: {$count}");

        return self::SUCCESS;
    }
}
```

Job:

```php
<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class CopyStorageObject implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public function __construct(
        public readonly string $path,
    ) {
    }

    public function handle(): void
    {
        $source = Storage::disk('legacy-s3');
        $destination = Storage::disk('primary-s3');

        // Новые uploads после cutover важнее старой копии.
        if ($destination->exists($this->path)) {
            return;
        }

        if (! $source->exists($this->path)) {
            return;
        }

        $stream = $source->readStream($this->path);

        if ($stream === false) {
            throw new RuntimeException(
                "Unable to read {$this->path}",
            );
        }

        try {
            $written = $destination->writeStream(
                $this->path,
                $stream,
            );
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }

        if (! $written) {
            throw new RuntimeException(
                "Unable to write {$this->path}",
            );
        }

        $sourceSize = $source->size($this->path);
        $destinationSize = $destination->size($this->path);

        if ($sourceSize !== $destinationSize) {
            $destination->delete($this->path);

            throw new RuntimeException(
                "Size mismatch for {$this->path}",
            );
        }
    }

    public function failed(?Throwable $exception): void
    {
        logger()->error('Storage migration failed', [
            'path' => $this->path,
            'error' => $exception?->getMessage(),
        ]);
    }
}
```

### Защита от race condition

Проверка `exists()` и последующий `writeStream()` не являются одной атомарной операцией. Между ними приложение может записать новый объект с тем же key.

Наиболее безопасный вариант:

- использовать immutable/versioned keys;
- не перезаписывать один и тот же path;
- использовать conditional PUT `If-None-Match: *`, если destination поддерживает его;
- на время bulk-copy координировать mutable writes;
- никогда не включать безусловный overwrite для уже существующего primary key.

## 8. Удаление файлов

Read-through driver удаляет path сначала из fallback, затем из primary. Это защищает от «воскрешения» файла последующим promotion.

Но если source credential сделан read-only, обычный вызов:

```php
Storage::disk('assets')->delete($path);
```

может завершиться ошибкой ещё на fallback и не удалить primary-объект.

Варианты:

1. дать migration credential право delete;
2. хранить tombstones в базе и отложить физическое удаление;
3. запретить destructive operations на коротком этапе cutover;
4. выполнять удаление отдельным контролируемым workflow.

Не выдавайте широкое delete-разрешение только ради удобства без отдельной оценки риска.

## 9. Metadata, ACL и CDN

Promotion использует общий контракт Flysystem. Provider-specific metadata может не сохраниться автоматически:

- исходный `Cache-Control`;
- `Content-Disposition`;
- storage class;
- custom metadata;
- точный `Last-Modified`;
- object tags;
- legal hold;
- version history.

Destination применяет свои defaults. Поэтому перед отключением source сравните headers на реальных объектах:

```bash
curl -I https://old-cdn.example.com/path/file.pdf
curl -I https://new-cdn.example.com/path/file.pdf
```

Проверьте:

- MIME type;
- скачивание вместо inline;
- CORS;
- Range requests;
- cache lifetime;
- ETag;
- signed URL;
- доступность private objects;
- invalidation после обновления.

## 10. Интеграционный тест

Underlying disks можно подменить fake-дисками:

```php
use Illuminate\Support\Facades\Storage;

it('reads a legacy object and promotes it', function (): void {
    Storage::fake('legacy-s3');
    Storage::fake('primary-s3');

    Storage::forgetDisk('assets');

    Storage::disk('legacy-s3')->put(
        'avatars/42.jpg',
        'legacy-content',
    );

    expect(
        Storage::disk('primary-s3')->exists('avatars/42.jpg'),
    )->toBeFalse();

    expect(
        Storage::disk('assets')->get('avatars/42.jpg'),
    )->toBe('legacy-content');

    Storage::disk('primary-s3')
        ->assertExists('avatars/42.jpg');
});
```

Отдельно протестируйте:

- новый upload попадает только в primary;
- primary имеет приоритет;
- fallback miss возвращает ожидаемую ошибку;
- promotion failure в best-effort и strict режимах;
- delete;
- large stream;
- public URL;
- temporary URL;
- race с обновлением mutable key.

## 11. Метрики миграции

Минимальный dashboard:

```text
fallback reads
promotion success
promotion failure
bytes promoted
bulk copied keys
bulk skipped keys
bulk failed keys
source egress
destination writes
p95/p99 первого чтения
очередь и retry count
```

Без метрик невозможно понять, завершилась ли миграция или только перестали поступать жалобы.

## 12. Проверка завершения

Слабая проверка:

```text
object count source ≈ object count destination
```

Сильнее:

- сравнить полный набор keys;
- сравнить размеры;
- использовать checksum там, где он надёжен;
- отдельно проверить multipart objects;
- проверить metadata и ACL;
- выполнить выборочное скачивание;
- проверить самые большие и самые старые объекты;
- выполнить restore/download через production path.

ETag не всегда равен MD5, особенно для multipart uploads и некоторых S3-compatible провайдеров.

## 13. Отключение fallback

После bulk-copy и периода наблюдения:

1. остановите dispatch новых migration jobs;
2. дождитесь пустой очереди;
3. повторно сравните inventories;
4. убедитесь, что fallback reads равны нулю;
5. переключите приложение с `assets` прямо на `primary-s3`;
6. очистите config cache;
7. выполните smoke-test;
8. сохраните source на оговорённый retention period;
9. отзовите fallback credentials;
10. удалите read-through config после окончания rollback window.

Не удаляйте source bucket сразу после первого успешного deploy.

## Rollback

Пока source не удалён, rollback прост:

```text
FILESYSTEM_DISK=legacy-s3
```

Но все новые uploads уже появились в primary. Перед полным возвратом нужно решить, как вернуть их в source или продолжить dual-read.

Поэтому предпочтительнее откатывать приложение, сохраняя read-through disk, а не снова делать старое хранилище единственным writable target.

## Итоговый checklist

- [ ] приложение использует Laravel Filesystem, а не raw SDK во всех критичных paths;
- [ ] source и destination имеют разные credentials;
- [ ] новые writes идут только в primary;
- [ ] CDN/direct URL сценарий учтён;
- [ ] большие объекты не читаются через `get()` без оценки памяти;
- [ ] promotion failures наблюдаемы;
- [ ] mutable keys защищены от overwrite race;
- [ ] delete semantics проверена;
- [ ] metadata и headers сравнены;
- [ ] bulk-copy не загружает весь bucket listing в память;
- [ ] очередь имеет retries и failed jobs;
- [ ] inventories и размеры совпадают;
- [ ] выполнен реальный download/restore-test;
- [ ] source сохранён на rollback window;
- [ ] старые credentials отозваны только после проверки.

## Источники

- [Laravel: Object storage migrations with read-through filesystem](https://laravel.com/blog/object-storage-migrations-with-laravels-read-through-filesystem)
- [Laravel 13: File Storage](https://laravel.com/framework/docs/13.x/filesystem)
