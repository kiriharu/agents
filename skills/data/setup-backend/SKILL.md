---
name: setup-backend
description: Use when creating a new Python backend project or service. Sets up FastAPI + SQLAlchemy async + PostgreSQL with layered architecture (routes → services → DAO), manual DI, Pydantic v2, and Alembic.
---

# Backend Project Setup

Создание нового Python-бекенда: FastAPI, SQLAlchemy 2.0 async, PostgreSQL, Alembic, Pydantic v2, structlog.

## Структура каталогов

```
project/
├── src/
│   ├── alembic/                  # Миграции БД
│   │   ├── env.py                # Async Alembic env
│   │   └── versions/             # Файлы миграций
│   └── app/
│       ├── main.py               # Точка входа FastAPI: lifespan, CORS, роутеры, /health
│       ├── config.py             # pydantic-settings (Settings класс)
│       ├── database.py           # AsyncEngine, async_session_factory, get_db() генератор
│       ├── exceptions.py         # AppException и подклассы (BadRequestError, NotFoundError, ForbiddenError...)
│       │
│       ├── api/                  # HTTP слой
│       │   ├── exception_handlers.py  # AppException → JSONResponse
│       │   └── routes/           # Модули роутов (по одному на сущность)
│       │       ├── users.py      # CRUD пользователей
│       │       └── ...
│       │
│       ├── models/               # SQLAlchemy ORM (Mapped[] стиль)
│       │   ├── base.py           # DeclarativeBase + TimestampMixin
│       │   └── *.py              # По одному файлу на сущность
│       │
│       ├── schemas/              # Pydantic v2 request/response схемы
│       │   ├── pagination.py     # PaginatedResponse[T], PaginationParams
│       │   └── *.py              # По одному файлу на сущность
│       │
│       ├── dao/                  # Data Access Objects (слой доступа к данным)
│       │   ├── base_dao.py       # PaginationMixin._paginate_query() + BaseDAO
│       │   └── *_dao.py          # По одному DAO на модель
│       │
│       ├── services/             # Бизнес-логика (классовые сервисы)
│       │   ├── *_service.py      # По одному сервису на сущность / действие
│       │   └── entity/           # Сложные сущности: подпапка с сервисами на каждую операцию
│       │
│       ├── di/                   # Dependency Injection (фабрики для FastAPI Depends)
│       │   └── dependencies.py   # get_*_dao(), get_*_service() → возвращают экземпляры
│       │
│       ├── providers/            # Клиенты к внешним сервисам (httpx, docker SDK...)
│       │
│       ├── constants/            # Константы приложения
│       │
│       └── cli.py                # CLI утилиты (Typer)
│
├── tests/                        # pytest тесты
├── scripts/                      # Утилитарные скрипты
├── alembic.ini
├── pyproject.toml
├── Dockerfile
└── docker-compose.yml
```

## Архитектурные паттерны

### Слои (строгая направленность)

```
Route (api/routes/) → Service (services/) → DAO (dao/) → DB
```

- **Routes** — только HTTP: принимают запрос, вызывают сервис, возвращают ответ. Никакой бизнес-логики и прямых запросов к БД.
- **Services** — бизнес-логика. Не знают про HTTP (не принимают Request, не возвращают Response).
- **DAO** — только запросы к БД через SQLAlchemy. Принимают `AsyncSession`, возвращают модели или списки.

### Dependency Injection (ручной, без контейнера)

Фабрики в `di/dependencies.py` создают экземпляры DAO и сервисов. Роуты получают их через `Depends()`:

```python
# di/dependencies.py
def get_user_dao(db: AsyncSession = Depends(get_db)) -> UserDAO:
    return UserDAO(db)

def get_user_service(user_dao: UserDAO = Depends(get_user_dao)) -> UserService:
    return UserService(user_dao)

# api/routes/users.py
@router.get("/users")
async def list_users(service: UserService = Depends(get_user_service)):
    return await service.list_users()
```

### Обработка ошибок

Базовый `AppException(message, status_code)`. Подклассы для конкретных ситуаций:

```python
class NotFoundError(AppException): status_code = 404
class ForbiddenError(AppException): status_code = 403
class BadRequestError(AppException): status_code = 400
```

Глобальный handler в `api/exception_handlers.py` приводит `AppException` к `{"detail": message}` с правильным статусом.

### Пагинация

`PaginationParams(limit, offset)` как query-параметры. `PaginatedResponse[T]` — generic-ответ с `items`, `total`, `limit`, `offset`. `PaginationMixin._paginate_query()` в `base_dao.py` делает `SELECT` + `count()` за один вызов.

## Опциональные компоненты

### Аутентификация + RBAC

Добавляется когда нужен контроль доступа. Каталоги:

```
app/
├── api/
│   ├── auth.py              # verify_auth(), require_admin (JWT / X-API-Token)
│   └── deps/                # RBAC-зависимости (server_rbac.py, group_permission.py)
├── security/
│   ├── auth_context.py      # AuthContext (user_id / api_token_id)
│   └── authorization.py     # Проверка прав
├── models/user.py           # Модель пользователя
├── models/token.py          # API-токены
├── models/role.py           # Роли + права
└── constants/rbac.py        # Permission slugs
```

Паттерны:
- Двойная аутентификация: `Bearer <JWT>` (логин) + `X-API-Token` (машинная).
- RBAC: права → роли → группы/пользователи. Проверки на уровне роутов через `Depends`. Администраторы обходят проверки.
- Технологии: PyJWT HS256, passlib[bcrypt].

### Фоновые задачи (Taskiq)

Добавляется когда нужны отложенные/периодические задачи. Каталоги:

```
app/
├── taskiq_broker.py         # Redis broker + scheduler
└── tasks/                   # Файлы с @broker.task()
```

```python
# app/taskiq_broker.py
from taskiq import TaskiqScheduler
from taskiq_redis import ListQueueBroker, RedisScheduleSource

broker = ListQueueBroker("redis://localhost:6379/1")
scheduler = TaskiqScheduler(
    broker=broker,
    sources=[RedisScheduleSource(broker)],
)

# app/tasks/cleanup.py
from app.taskiq_broker import broker

@broker.task(schedule=[{"cron": "0 3 * * *"}])
async def cleanup_old_sessions():
    ...
```

Docker Compose: отдельные контейнеры для worker и scheduler.

## Технологический стек

| Компонент | Выбор |
|-----------|-------|
| Язык | Python 3.13+ |
| Фреймворк | FastAPI (ASGI, uvicorn) |
| ORM | SQLAlchemy 2.0 async (asyncpg драйвер) |
| БД | PostgreSQL 16 |
| Миграции | Alembic (асинхронный) |
| Валидация | Pydantic v2 |
| Конфиг | pydantic-settings (.env + env vars) |
| HTTP клиент | httpx (для внешних вызовов)
| Логирование | structlog |
| CLI | Typer |
| Линтер | Ruff |
| Тесты | pytest (async, без фреймворков) |
| Пакетный менеджер | uv |
| *Аутентификация* | *PyJWT HS256 + passlib[bcrypt]* |
| *Фоновые задачи* | *Taskiq (Redis broker + scheduler)* |

## Типовой Config (pydantic-settings)

```python
# app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/db"
    log_level: str = "INFO"
```

С опциональным auth добавляются `jwt_secret`, `jwt_algorithm`, `access_token_expire_minutes`, `refresh_token_expire_days`.

С опциональным Taskiq добавляется `redis_url`.

## Шаблон новой сущности (пример: Product)

1. **model** — `app/models/product.py`: SQLAlchemy модель (Mapped[])
2. **schema** — `app/schemas/product.py`: Pydantic схемы (Create, Read, Update, Response)
3. **DAO** — `app/dao/product_dao.py`: запросы к БД, наследует `BaseDAO`
4. **Service** — `app/services/product_service.py`: бизнес-логика
5. **DI factory** — добавить в `di/dependencies.py`: `get_product_dao()`, `get_product_service()`
6. **Routes** — `app/api/routes/products.py`: CRUD эндпоинты
7. **Router registration** — зарегистрировать в `main.py`

## Линтинг и тестирование

```bash
ruff format .          # Форматирование
ruff check . --fix     # Линтинг
pytest                 # Тесты (из корня проекта)
```

## Health check

```python
# app/main.py
@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    await db.execute(text("SELECT 1"))
    return {"status": "ok"}
```

Используется Docker `HEALTHCHECK` и Kubernetes liveness/readiness probes.
