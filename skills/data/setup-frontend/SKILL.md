---
name: setup-frontend
description: Use when creating a new Next.js frontend project. Sets up Next.js 14 App Router with feature-based modules, Zustand, Formik + Yup, i18next, Tailwind CSS with design tokens, and a monolithic ApiClient with JWT refresh.
---

# Frontend Project Setup

Создание нового Next.js фронтенда по архитектуре CloverPanel: App Router, feature-модули, Zustand, central API client, i18next, Tailwind CSS с дизайн-токенами.

## Структура каталогов

```
project/
├── src/
│   ├── app/                          # Next.js App Router (страницы и лейауты)
│   │   ├── layout.tsx                # Корневой layout: тема, I18nProvider, AuthBoundary, Toaster
│   │   ├── page.tsx                  # Главная / дашборд
│   │   ├── globals.css               # CSS custom properties + Tailwind директивы
│   │   ├── not-found.tsx
│   │   ├── login/page.tsx
│   │   ├── <entity>/
│   │   │   ├── page.tsx              # Список
│   │   │   ├── new/page.tsx          # Создание
│   │   │   └── [id]/
│   │   │       ├── (detail)/         # Route group с общим layout (табы/хедер)
│   │   │       │   ├── layout.tsx
│   │   │       │   └── page.tsx
│   │   │       └── edit/page.tsx
│   │   └── ...
│   │
│   ├── features/                     # Feature-based модули (доменная логика)
│   │   └── <domain>/
│   │       ├── api/<domain>.api.ts   # Функции вызовов API для этого домена
│   │       ├── components/           # UI компоненты домена
│   │       ├── hooks/                # React-хуки домена
│   │       ├── store/<domain>.store.ts  # Zustand store
│   │       ├── types.ts              # TypeScript типы
│   │       ├── utils.ts              # Утилиты (опционально)
│   │       ├── permissions.ts        # RBAC-константы (опционально)
│   │       ├── constants.ts          # Константы домена (опционально)
│   │       └── index.ts              # Barrel export
│   │
│   ├── shared/                       # Переиспользуемый код
│   │   ├── api/
│   │   │   ├── client.ts            # ApiClient класс (JWT, рефреш, все эндпоинты)
│   │   │   ├── types.ts
│   │   │   ├── constants.ts
│   │   │   └── index.ts
│   │   ├── components/              # Shared UI компоненты
│   │   │   ├── Layout.tsx           # App shell (Sidebar + Header + main)
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Button.tsx, Input.tsx, Modal.tsx, Card.tsx
│   │   │   ├── Spinner.tsx, EmptyState.tsx, Badge.tsx, Alert.tsx
│   │   │   ├── Pagination.tsx, SearchInput.tsx
│   │   │   ├── ServerSelector.tsx, KeyValueEditor.tsx
│   │   │   └── index.ts
│   │   ├── hooks/                   # Shared хуки (usePagination, ...)
│   │   ├── types/                   # Shared типы (pagination, ...)
│   │   ├── nav/                     # Конфиг навигации (menu-items.ts)
│   │   └── index.ts
│   │
│   ├── i18n/                         # Интернационализация
│   │   ├── instance.ts              # i18next конфигурация
│   │   ├── I18nProvider.tsx         # React провайдер
│   │   ├── useLocaleBootstrap.ts
│   │   └── locales/
│   │       ├── en/                  # Английские переводы (разбиты по доменам)
│   │       └── ru/                  # Русские переводы
│   │
│   └── lib/                          # Устаревшее / утилитарное (минимизировать)
│
├── public/                           # Статика
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── .eslintrc.json
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── Dockerfile                        # Multi-stage (deps → builder → runner)
```

## Архитектурные паттерны

### Feature-based модули

Каждый домен — независимый модуль со своим API-слоем, компонентами, хуками, стейтом и типами. Страницы (`app/`) — тонкие, только импортируют фичи:

```typescript
// app/servers/page.tsx
import { ServerList } from "@/features/servers"

export default function ServersPage() {
  return <ServerList />
}
```

### Центральный API-клиент (ApiClient)

`shared/api/client.ts` — монолитный класс, инкапсулирующий всю логику HTTP:

```typescript
class ApiClient {
  private baseUrl: string
  private accessToken: string | null
  private refreshToken: string | null
  private refreshInFlight: Promise<string> | null  // дедупликация рефреша

  // Управление токенами
  setTokens(accessToken, refreshToken): void
  clearTokens(): void
  getAccessToken(): string | null

  // JWT рефреш с дедупликацией (refreshInFlight)
  private async refreshAccessToken(): Promise<string>

  // Универсальный запрос с авто-рефрешем
  private async request<T>(method, path, body?, params?): Promise<T>

  // Методы для каждой сущности
  async getServers(params): Promise<PaginatedResponse<Server>>
  async createServer(data): Promise<Server>
  // ...
}

export const apiClient = new ApiClient()
```

- Токены хранятся в `localStorage`.
- При 401 автоматически делает рефреш через `refreshInFlight` (дедупликация: второй запрос ждет тот же промис, а не делает параллельный рефреш).
- Хранит состояние в классе, не в сторе.

### Аутентификация на фронте

`features/auth/store/auth.store.ts` — Zustand store:

```typescript
interface AuthState {
  accessToken: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  userId: string | null
  login: (accessToken, refreshToken) => void
  logout: () => void
  syncSessionFromStorage: () => void  // восстановление при монтировании
}
```

`AuthBoundary` — компонент в корневом `layout.tsx`: если `!isAuthenticated` → редирект на `/login`. Если в пути `/login` и уже залогинен → редирект на `/`.

### Формы (Formik + Yup)

```typescript
import { useFormik } from "formik"
import * as Yup from "yup"

const validationSchema = Yup.object({
  name: Yup.string().required().min(2).max(100),
  port: Yup.number().integer().required().min(1).max(65535),
})

const formik = useFormik({
  initialValues: { name: "", port: 25565 },
  validationSchema,
  onSubmit: async (values) => {
    await apiClient.createServer(values)
  },
})
```

### Стейт-менеджмент (Zustand)

Zustand store на каждый домен в `features/<domain>/store/`:

```typescript
import { create } from "zustand"

interface ServersState {
  servers: Server[]
  isLoading: boolean
  error: string | null
  fetchServers: () => Promise<void>
}

export const useServersStore = create<ServersState>((set) => ({
  servers: [],
  isLoading: false,
  error: null,
  fetchServers: async () => {
    set({ isLoading: true, error: null })
    try {
      const servers = await apiClient.getServers({ limit: 100 })
      set({ servers, isLoading: false })
    } catch (e) {
      set({ error: e.message, isLoading: false })
    }
  },
}))
```

### Пагинация

Shared хук `usePagination` в `shared/hooks/usePagination.ts`:

```typescript
const { page, limit, total, setPage, setLimit, offset } = usePagination({ defaultLimit: 20 })
```

Shared компонент `<Pagination>` в `shared/components/Pagination.tsx`.

### Интернационализация (i18next)

- Два языка: `en`, `ru`.
- Переводы разбиты по доменам: `locales/en/servers.ts`, `locales/en/auth.ts`, `locales/en/nav.ts` и т.д.
- `I18nProvider.tsx` оборачивает все приложение.
- При логине/логауте язык сбрасывается на `en`.

### Стилизация (Tailwind CSS + дизайн-токены)

CSS custom properties в `globals.css` задают палитру:

```css
:root {
  --background: #0f0f0f;
  --foreground: #f0f0f0;
  --accent: #6366f1;
  --danger: #ef4444;
  --success: #22c55e;
  --warning: #f59e0b;
  --muted: #6b7280;
  --border: #1f1f1f;
  --card: #1a1a1a;
  --ring: #6366f1;
}
```

`tailwind.config.ts` расширяет Tailwind этими токенами:

```typescript
colors: {
  background: "var(--background)",
  foreground: "var(--foreground)",
  accent: "var(--accent)",
  // ...
}
```

Темная тема включена по умолчанию (`class="dark"` в `<html>`).

### Shared компоненты

Компоненты в `shared/components/` следуют единому паттерну:
- Один компонент на файл
- TypeScript Props интерфейс
- `forwardRef` где необходимо
- `index.ts` — barrel export всех компонентов

Ключевой набор: `Layout`, `Sidebar`, `Header`, `Button`, `Input`, `Modal`, `Card`, `Spinner`, `EmptyState`, `Badge`, `Alert`, `Pagination`, `SearchInput`.

### Навигация

`shared/nav/menu-items.ts` — массив `NavItem[]`:

```typescript
interface NavItem {
  href: string
  labelKey: string    // ключ в i18n nav-переводах
  icon: LucideIcon
  adminOnly?: boolean
}
```

`Sidebar` рендерит пункты меню, фильтруя `adminOnly` для не-администраторов.

## Технологический стек

| Компонент | Выбор |
|-----------|-------|
| Язык | TypeScript 5.4 (strict) |
| Фреймворк | Next.js 14 (App Router) |
| UI | React 18 |
| Стилизация | Tailwind CSS 3.4 + CSS custom properties |
| Стейт | Zustand |
| Формы | Formik + Yup |
| Иконки | Lucide React |
| Тосты | Sonner |
| i18n | i18next + react-i18next |
| Пакетный менеджер | pnpm (workspace) |
| Линтер | ESLint (next/core-web-vitals) |
| Типизация | tsc --noEmit |

## Порядок создания новой фичи (пример: Widgets)

1. Создать `features/widgets/` со структурой:
   - `api/widgets.api.ts` — вызовы к API через `apiClient`
   - `types.ts` — интерфейсы Widget, CreateWidgetDTO, etc.
   - `store/widgets.store.ts` — Zustand store (опционально, если нужен клиентский стейт)
   - `hooks/useWidgets.ts` — хук, агрегирующий API + store
   - `components/WidgetList.tsx`, `WidgetCard.tsx` — UI
   - `index.ts` — barrel
2. Создать страницы в `app/widgets/`:
   - `page.tsx` — список (импорт `WidgetList` из фичи)
   - `new/page.tsx` — создание
   - `[id]/page.tsx` — детали
3. Добавить переводы в `i18n/locales/en/widgets.ts` и `ru/widgets.ts`
4. Добавить пункт меню в `shared/nav/menu-items.ts`

## Докеризация

Multi-stage Dockerfile: deps → builder → runner (node:22-alpine):

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

`next.config.mjs`: `output: "standalone"` для production-сборки.

## Линтинг и проверка типов

```bash
pnpm lint          # ESLint
npx tsc --noEmit   # Проверка типов
```
