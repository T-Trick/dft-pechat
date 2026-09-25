# ARCHITECTURE
Карта связей проекта для ИИ-агентов: читайте этот файл вместо обхода кода. README отсутствует; по составу это автономная копия лендинга «DFT печать» (аналог `index.*` из проекта `Web/`).

## Назначение
Одностраничный лендинг «DFT печать» (черновик/standalone-версия): формы заказов, чат по заказу, админка, счётчик визитов. Чистый статический HTML/CSS/JS без сборки; данные — Supabase (реалтайм-чат) с fallback на localStorage. Запуск — открыть `index.html` в браузере.

## Точки входа
| Вход | Что это | Куда ведёт |
|---|---|---|
| `index.html` | страница сайта | `<link href="index.css">`, Supabase CDN SDK, `<script src="index.js">` |
| `index.js` | вся логика сайта | Supabase-клиент + localStorage-обёртки `get/set` |

## Граф связей
```
index.html ──> index.css            (стили, инлайн-стилей почти нет)
    ├─> CDN @supabase/supabase-js@2 (script-тег)
    └─> index.js
          ├─ SUPABASE_URL = https://uhkftbrlcxinnmpbogku.supabase.co (тот же проект, что в Web/)
          ├─ fetchOrders/saveOrder/fetchChats/saveChat/subscribeToChat/recordVisit
          │      таблицы: orders / chats / visits   (DDL — в проекте Web: supabase-schema.sql)
          └─ fallback localStorage: dft.v1.orders / dft.v1.chats / dft.v1.visits / dft.v1.today
```
- Схема БД в этом проекте НЕ хранится — её источник истины `Web/supabase-schema.sql`; здесь только код обращения.
- Оба проекта (этот и `Web/`) пишут в одну и ту же Supabase-базу — данные общие.

## Что менять вместе с чем (контракты)
| Изменили | Обновите обязательно |
|---|---|
| поля формы заказа в `index.html` | `saveOrder/fetchOrders` в `index.js` + схему `orders` (в `Web/supabase-schema.sql` и в Supabase) |
| формат сообщения чата | `saveChat/fetchChats/subscribeToChat` + ключ `dft.v1.chats` и таблицу `chats` |
| anon-ключ/URL проекта Supabase в `index.js` | тот же проект в `Web/index.js` (общая база) и RLS-политики |

## Конфигурация и данные
- `SUPABASE_URL`, `SUPABASE_ANON` (публичный ключ) — прямо в `index.js`, env-файлов нет.
- Supabase недоступен → вся работа уходит в localStorage (`dft.v1.*`), сайт остаётся функциональным локально.

## Тесты
Тестов нет.

## Ограничения, важные при правках
- Проект — черновик/копия: дублирует логику `Web/index.js`, но отстаёт от него; правки выбора «где жить фиче» делайте осознанно, синхронизации между проектами нет.
- Supabase CDN-скрипт должен загрузиться до `index.js` (порядок тегов в `index.html` — контракт).
