# Student Project Hub — Progress Document

> Создан перед `/compact` для полного восстановления контекста разработки.  
> Дата: 2026-05-02

---

## 1. Стек

### Backend (`backend/`)

| Пакет | Версия | Роль |
|---|---|---|
| Node.js | 20+ (runtime) | Среда выполнения |
| TypeScript | ^5.4.5 | Язык |
| Express | ^4.19.2 | HTTP-фреймворк |
| tsx | ^4.15.6 | Dev-runner с hot reload (`tsx watch`) |
| Prisma | ^5.14.0 | ORM + migration tool |
| @prisma/client | ^5.14.0 | Сгенерированный клиент БД |
| PostgreSQL | 16 (Docker) | База данных |
| bcrypt | ^5.1.1 | Хеширование паролей (cost=10) |
| jsonwebtoken | ^9.0.2 | JWT (алгоритм HS256, expiresIn 7d) |
| zod | ^3.23.8 | Runtime-валидация входных данных |
| dotenv | ^16.4.5 | Загрузка .env через `import 'dotenv/config'` |
| cors | ^2.8.5 | CORS middleware |

**tsconfig:** `target: ES2022`, `module: CommonJS`, `strict: true`, `rootDir: src`, `outDir: dist`

### Frontend (`frontend/`)

| Пакет | Версия | Роль |
|---|---|---|
| Next.js | 14.2.35 | React-фреймворк (App Router) |
| React | ^18 | UI |
| TypeScript | ^5 | Язык |
| Tailwind CSS | ^3.4.1 | Стилизация |
| axios | ^1.15.2 | HTTP-клиент |
| lucide-react | ^1.14.0 | Иконки |
| clsx | ^2.1.1 | Условные CSS-классы |
| react-hot-toast | ^2.6.0 | Уведомления (Toaster в root layout) |
| @dnd-kit/core | ^6.3.1 | Drag-and-drop — используется в KanbanBoard |
| @dnd-kit/sortable | ^10.0.0 | Установлен, не используется (колонки не сортируются) |
| Inter (Google Font) | — | Шрифт с кириллицей |

**Next.js config:** App Router, `src/` directory, без path aliases (`@/*`), ESLint включён.

### Инфраструктура

- **Docker Compose** — PostgreSQL 16-alpine, контейнер `sphub_postgres`
- **Порты:** PostgreSQL `5433:5432` (5432 был занят системным PG), Backend `:4000`, Frontend `:3000`
- **Env Backend:** `DATABASE_URL`, `JWT_SECRET`, `PORT=4000`, `GEMINI_API_KEY` (заглушка)
- **Env Frontend:** `NEXT_PUBLIC_API_URL=http://localhost:4000/api`

---

## 2. Что сделано (промпты 1–12, 14, 16–26, ICS-import)

### Промпт 26 — Анимации переходов и stagger-списки

**Frontend:**
- Установлен `framer-motion`
- `src/components/PageTransition.tsx` — client-компонент, оборачивает `children` в `motion.div` с `initial={{ opacity: 0, y: 10 }}`, `animate={{ opacity: 1, y: 0 }}`, `transition={{ duration: 0.2, ease: 'easeOut' }}`. Fade-in + лёгкий slide вверх при смене страниц.
- `src/app/(app)/layout.tsx` — `<main>` обёрнут в `<PageTransition>`, анимация применяется ко всем страницам приложения.
- `src/components/AnimatedList.tsx` — client-компонент, использует `React.Children.map` для обхода дочерних элементов. Каждый ребёнок оборачивается в `motion.div` со stagger-задержкой `delay: i * 0.05` (волна появления). Принимает опциональный `className` для `motion.div`-обёртки.
- `AnimatedList` применён к спискам:
  - `dashboard/page.tsx` — сетка "Мои команды", сетка "Рекомендуемые проекты", сетка "Доступные проекты" (StudentDashboard), сетка "Мои проекты" (TeacherDashboard). Все с `className="h-full"` для корректной высоты card-ов в grid.
  - `teams/page.tsx` — сетка команд
  - `archive/page.tsx` — сетка архивных команд
  - `projects/[id]/page.tsx` — сетка команд проекта, список студентов-рекомендаций (вкладка "Студенты")
- **НЕ** затронуты: `KanbanBoard`, `TaskCard` (конфликт с dnd-kit), модалки
- Ограничения анимаций: max 300ms, только fade + y-shift (без scale/rotate)

### Промпт 25 — Тёмная тема

**Frontend:**
- `tailwind.config.ts` — добавлен `darkMode: 'class'` (не `'media'` — пользователь переключает руками; класс `dark` навешивается на `<html>`)
- `src/lib/theme.ts` — `getTheme()` (читает localStorage, fallback на `prefers-color-scheme`), `setTheme(theme)` (пишет в localStorage + `<html>.classList.toggle('dark')` + `dataset.theme`), `toggleTheme()`, `hasStoredTheme()`. Все функции guard-ят `typeof window === 'undefined'`.
- `src/components/ThemeProvider.tsx` — client-компонент с React Context (`useTheme()`). На mount синхронизируется с localStorage/system pref. Подписывается на `matchMedia('(prefers-color-scheme: dark)')` — обновляется при смене system pref **только если пользователь явно не выбирал** (`hasStoredTheme()` === false).
- `src/components/ThemeToggle.tsx` — круглая кнопка-иконка (Sun/Moon из lucide-react) в Navbar справа, перед dropdown профиля. По клику вызывает `toggle()`.
- `src/app/layout.tsx`:
  - Добавлен inline `<script>` в `<head>` — выполняется ДО гидратации, читает localStorage/system pref и навешивает класс `dark` на `<html>` (предотвращает flash of light theme при загрузке).
  - `<html suppressHydrationWarning>` — класс `dark` ставится скриптом до React, чтобы не было mismatch.
  - `<body>` обёрнут в `<ThemeProvider>`. Базовые `bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`.
  - Toaster получил `className: '!bg-white !text-gray-900 dark:!bg-gray-800 dark:!text-gray-100'` (через `toastOptions`).
- `src/app/globals.css` — удалён `@media (prefers-color-scheme: dark)` блок (он перетирал ручной выбор пользователя).
- Применены `dark:` классы по правилам:
  - `bg-white` → `dark:bg-gray-800` (карточки), `bg-gray-50` → `dark:bg-gray-950` (фон страницы), `bg-gray-100` → `dark:bg-gray-700`/`dark:bg-gray-800`
  - `text-gray-900` → `dark:text-gray-100`, `text-gray-700` → `dark:text-gray-300`, `text-gray-500` → `dark:text-gray-400`, `text-gray-400` → `dark:text-gray-500`
  - `border-gray-200` → `dark:border-gray-700`, `border-gray-300` → `dark:border-gray-600`, `border-gray-100` → `dark:border-gray-700`
  - `shadow-sm`/`shadow-xl` на карточках/модалках → `dark:shadow-none`
  - Hover: `hover:bg-gray-100` → `dark:hover:bg-gray-800`/`dark:hover:bg-gray-700`
  - Inputs: `bg-white` → `dark:bg-gray-800`, `dark:border-gray-700`, `dark:text-gray-100`, `dark:placeholder-gray-500`
  - Bаджи (`Badge.variantClasses`) — для каждого варианта дополнен `dark:bg-{color}-900/40 dark:text-{color}-300` (приглушены, но цвет сохранён)
  - Канбан (`KanbanBoard.COLUMNS`) — `bg-gray-100` → `dark:bg-gray-800/60`, `bg-blue-50` → `dark:bg-blue-950/30`, `bg-green-50` → `dark:bg-green-950/30`
  - `TaskCard`, `Modal`, `Card` — тёмный фон `gray-800`, рамка `gray-700`, заменён `shadow-sm` на `dark:shadow-none + dark:border`
- Файлы с применением `dark:` классов: `Card`, `Button`, `Input`, `Textarea`, `Badge`, `Modal`, `Skeleton` (был раньше), `Navbar`, `Breadcrumbs`, `KanbanBoard`, `TaskCard`, `TaskModal`, `AIRoadmapModal`, `MatchScoreBar`, `AuthGuard`, скелетоны (`TaskCardSkeleton`, `TeamCardSkeleton`, `KanbanColumnSkeleton`); страницы: `(auth) layout`, `login`, `register`, `(app) layout`, `dashboard`, `teams`, `teams/[id]`, `projects/[id]`, `projects/[id]/import`, `projects/new`, `archive`, `profile`
- Дефолтная тема — light. При первом заходе без сохранённого выбора читается `prefers-color-scheme`. Primary бордовый (`#7B1F2A`) и lucide-react иконки (наследуют `currentColor`) не требуют отдельных dark-вариантов.

### Промпт 24 — Breadcrumbs навигация

**Frontend:**
- `src/components/Breadcrumbs.tsx` — pure-компонент; принимает `items: {label, href?}[]`; последний элемент `text-gray-500`, остальные `text-primary-800 hover:underline`; мобилка (< sm) — скрывает всё кроме последних 2 элементов, вместо них показывает `…`
- `src/components/BreadcrumbsContainer.tsx` — client-компонент; `usePathname()` → `buildItems(pathname)` → `<Breadcrumbs>`; module-level `Map` кеширует имена проектов и команд; во время загрузки — `<Skeleton className="h-4 w-48" />`; на `/dashboard` — возвращает `null`
- `src/app/(app)/layout.tsx` — добавлен `<BreadcrumbsContainer />` между `<Navbar />` и `<main>`
- Поддерживаемые маршруты: `/teams`, `/teams/[id]`, `/projects/[id]`, `/projects/[id]/review|reviews|import`, `/archive`, `/profile`, `/admin/users`
- Динамические сегменты: `/projects/[id]` → `GET /projects/{id}` (title), `/teams/[id]` → `GET /teams/{id}` (name)

### Промпт 23 — Skeleton loaders

**Frontend:**
- `src/components/ui/Skeleton.tsx` — базовый pulse-компонент
- `src/components/skeletons/ProjectCardSkeleton.tsx`
- `src/components/skeletons/TeamCardSkeleton.tsx`
- `src/components/skeletons/TaskCardSkeleton.tsx`
- `src/components/skeletons/KanbanColumnSkeleton.tsx`
- `src/components/skeletons/ListSkeleton.tsx`
- Заменены все спиннеры `Loader2` на skeleton-блоки в форме реального контента на страницах: `dashboard`, `teams`, `archive`, `projects/[id]`, `teams/[id]`, `profile`
- Кнопки `loading` со спиннером остались без изменений (только page-level лоадеры заменены)

### Промпт 22 — Статусы проектов, архив, удаление ссылки Projects

**Backend:**
- `src/controllers/projects.controller.ts`:
  - `list` — добавлен query-параметр `?status=ACTIVE|COMPLETED|ARCHIVED|all`. По умолчанию (без параметра): ACTIVE для STUDENT и TEACHER, все для ADMIN. Это делает дашборд учителя чистым (только активные), архив вынесен отдельно.
  - `changeStatus` — новый handler `PATCH /api/projects/:id/status`. Zod-валидация `{status: ProjectStatus}`. Доступ: createdBy или ADMIN. Включает gamification-триггер при переходе в COMPLETED.
- `src/controllers/teams.controller.ts`:
  - `TEAM_MINE_INCLUDE.project.select` — добавлен `status: true`
  - `listArchiveTeams` — новый handler `GET /api/teams/archive`. Та же ролевая логика что у `listMyTeams`, но фильтр `project.status IN [COMPLETED, ARCHIVED]`. Сортировка `project.deadline DESC`.
- `src/routes/projects.routes.ts` — добавлен `PATCH /:id/status` (перед `PATCH /:id`)
- `src/routes/teams.routes.ts` — добавлен `GET /archive` (перед `/:id`)

**Frontend:**
- `src/components/KanbanBoard.tsx` — добавлен `readOnly?: boolean` prop:
  - Когда true: `emptySensors` (no drag), скрыта кнопка "+", клик по карточке не открывает модал
  - `KanbanColumn` получает `readOnly` и скрывает кнопку добавления
  - `TaskCard` получает `disabled?: boolean` — скрывает курсор grab, отключает `useDraggable`
- `src/app/(app)/teams/page.tsx`:
  - Тип `TeamMine.project` расширен полем `status`
  - `ProjectStatusBadge` (локальный): COMPLETED → зелёный "✓ Завершён", ARCHIVED → серый "📦 В архиве", ACTIVE → ничего
  - Бейдж показывается в правом верхнем углу карточки команды
- `src/app/(app)/projects/[id]/page.tsx`:
  - Добавлена кнопка "Восстановить" при COMPLETED/ARCHIVED → ACTIVE
  - Все кнопки смены статуса переключены на `PATCH /projects/:id/status`
- `src/app/(app)/teams/[id]/page.tsx`:
  - Вычисляется `isReadOnly = status === 'COMPLETED' || status === 'ARCHIVED'`
  - Жёлтый информационный банер "Проект завершён/в архиве. Доска только для просмотра."
  - Kanban получает `readOnly={isReadOnly}`; скрыты кнопки AI-план, "Покинуть", kick-участника
- `src/app/(app)/archive/page.tsx` — новая страница архива:
  - Заголовок + описание, fetches `GET /api/teams/archive`
  - Loader / empty state с иконкой Archive
  - Grid карточек в приглушённом стиле (opacity-90, серые аватары, серый прогресс-бар)
  - Кнопка "Просмотреть" → `/teams/[id]` (read-only режим)
- `src/components/Navbar.tsx`:
  - Удалена ссылка "Projects" (давала 404)
  - Добавлена "Архив" (иконка Archive) после "Команды"

### Промпт 21 — Страница "Мои команды"

**Backend:**
- `src/controllers/teams.controller.ts` — добавлен `listMyTeams` и новый `TEAM_MINE_INCLUDE`:
  - Лёгкий include: project (id, title, deadline), leader (id, fullName), members с user (id, fullName, email), tasks (только поле status)
  - Для STUDENT: `where = { members: { some: { userId } } }` — команды, где юзер является участником
  - Для TEACHER: `where = { project: { createdById: userId } }` — все команды в его проектах
  - Для ADMIN: `where = {}` — все команды
  - `orderBy: { createdAt: 'desc' }`
- `src/routes/teams.routes.ts` — добавлен `GET /mine` (зарегистрирован **перед** `/:id`, чтобы Express не принял "mine" за id)

**Frontend:**
- `src/app/(app)/teams/page.tsx` — новая страница "Мои команды":
  - Loader на время загрузки
  - Empty state с иконкой Users и подсказкой про код приглашения
  - Grid карточек (1 col mobile / 2 col sm / 3 col lg)
  - `TeamCard`: название + бейдж "Лидер" (если leaderId === currentUser.id), ссылка на проект, дедлайн, аватары участников (до 5 + "+N"), прогресс-бар задач (DONE / total), кнопка "Открыть команду"
  - `MemberAvatars`: цветные инициалы в кружках, -space-x-2 overlap
  - `TaskProgress`: прогресс-бар с анимацией ширины

- `src/components/Navbar.tsx` — добавлена ссылка "Команды" (`/teams`, иконка Users) в NAV_LINKS между Projects и dropdown

### Промпт 20 — Страница профиля и смена пароля

**Backend:**
- `src/controllers/auth.controller.ts` — добавлены два хендлера:
  - `updateProfile` — `PATCH /api/auth/me`: zod-валидация `{fullName?, skills?}`, обновляет текущего юзера через Prisma, возвращает `{user}` без пароля
  - `changePassword` — `POST /api/auth/change-password`: zod-валидация `{currentPassword, newPassword (min 6)}`, bcrypt.compare с текущим хешем, на несовпадение → 400 "Текущий пароль неверен", при успехе хеширует новый и сохраняет, возвращает `{success: true}`
- `src/routes/auth.routes.ts` — подключены под `requireAuth`:
  - `PATCH /api/auth/me` → `updateProfile`
  - `POST /api/auth/change-password` → `changePassword`

**Frontend:**
- `src/app/(app)/profile/page.tsx` — полная переработка:
  - Заголовок "Мой профиль"
  - Identity-header: аватар (инициал), имя, email, RoleBadge, теги навыков
  - Карточка "Информация": email (read-only), форма fullName + skills (через запятую), `PATCH /api/auth/me`, после успеха вызывает `refresh()` из `useAuth`
  - Карточка "Сменить пароль": три поля currentPassword/newPassword/confirmNewPassword, клиентская валидация (мин 6 символов, совпадение), `POST /api/auth/change-password`, очистка полей после успеха
  - Статистика (3 тайла): очки, задачи, средний review — через `GET /api/users/me/profile`
  - Сетка бейджей с grayscale/opacity для незаработанных — без изменений логика

- `src/components/Navbar.tsx` — dropdown по клику на имя:
  - Кнопка с именем пользователя + `ChevronDown` (анимированный rotate-180 при открытии)
  - Клик вне области → закрытие через `useRef` + `document.addEventListener('mousedown')`
  - Dropdown: "Мой профиль" → `/profile`, разделитель `<hr>`, "Выйти" (красный) → `logout()`
  - Убрана отдельная кнопка Logout из правой панели; ссылка на имя теперь заменена на кнопку dropdown

### Промпт 1 — Инициализация проекта
- `docker-compose.yml` — PostgreSQL 16, user/pass: `dev/dev`, db: `sphub`
- `.gitignore` — node_modules, .env*, .next, dist, coverage
- `README.md` — описание, стек, инструкция запуска
- Папки `backend/` и `frontend/` (пустые)

### Промпт 2 — Backend: базовая структура
- `backend/package.json` — зависимости + скрипты dev/build/start
- `backend/tsconfig.json` — строгий TypeScript
- `backend/.env` и `.env.example`
- Структура `src/{routes,controllers,services,middleware,utils,types}`
- `backend/prisma/schema.prisma` — базовый datasource
- `backend/src/server.ts` — Express + CORS + JSON + `GET /api/health` + error handler

### Промпт 3 — Prisma-схема
Полная схема с 7 моделями (см. раздел 5). Одна миграция `init`.

### Промпт 4 — Auth-модуль (backend)
**Новые файлы:**
- `src/utils/AppError.ts` — кастомный Error с `statusCode`
- `src/utils/prisma.ts` — PrismaClient синглтон
- `src/utils/jwt.ts` — `signToken` / `verifyToken`, `getSecret()` ленивая инициализация
- `src/types/express.d.ts` — расширение `Request` полем `user?: {id, role}`
- `src/middleware/auth.middleware.ts` — `requireAuth` + `requireRole(...roles)`
- `src/controllers/auth.controller.ts` — register, login, me
- `src/routes/auth.routes.ts`

**Endpoints:**
- `POST /api/auth/register` — создаёт пользователя, возвращает `{token, user}`
- `POST /api/auth/login` — проверяет credentials, возвращает `{token, user}`
- `GET /api/auth/me` — возвращает текущего пользователя (requireAuth)

### Промпт 5 — Projects-модуль (backend)
**Новые файлы:**
- `src/controllers/projects.controller.ts` — list, getById, create, update, deleteProject
- `src/routes/projects.routes.ts`

**Endpoints:**
- `GET /api/projects` — список (STUDENT→ACTIVE, TEACHER→свои, ADMIN→все)
- `GET /api/projects/:id` — проект + команды + участники
- `POST /api/projects` — создать (только TEACHER)
- `PATCH /api/projects/:id` — обновить (createdBy или ADMIN)
- `DELETE /api/projects/:id` — удалить (createdBy или ADMIN)

### Промпт 6 — Teams-модуль (backend)
**Новые файлы:**
- `src/utils/inviteCode.ts` — генератор 8-символьного кода (crypto.randomBytes, без modulo bias)
- `src/controllers/teams.controller.ts` — create, getById, join, leave, kickMember
- `src/routes/teams.routes.ts`

**Endpoints:**
- `POST /api/projects/:projectId/teams` — создать команду (только STUDENT)
- `GET /api/teams/:id` — команда + проект + лидер + участники + задачи
- `POST /api/teams/join` — вступить по `{inviteCode}`
- `DELETE /api/teams/:id/members/me` — покинуть (лидер не может)
- `DELETE /api/teams/:id/members/:userId` — кик (только лидер)

### Промпт 7 — Tasks-модуль (backend)
**Новые файлы:**
- `src/services/gamification.service.ts` — заглушки `awardForTaskCompletion`, `awardForGoodReview`
- `src/middleware/team.middleware.ts` — `requireTeamMember(param)` фабрика
- `src/controllers/tasks.controller.ts` — list, create, update, deleteTask
- `src/routes/tasks.routes.ts`

**Endpoints:**
- `GET /api/teams/:teamId/tasks` — список задач (только участник)
- `POST /api/teams/:teamId/tasks` — создать задачу (только участник)
- `PATCH /api/tasks/:id` — обновить (любой участник команды)
- `DELETE /api/tasks/:id` — удалить (лидер или создатель проекта)

**Особенность:** при смене статуса → `DONE` автоматически проставляются `completedAt = now()` и `wasOnTime = now <= deadline` (если deadline задан, иначе `true`). Повторный патч с DONE не перезатирает эти поля.

### Промпт 8 — Peer Reviews-модуль (backend)
**Новые файлы:**
- `src/controllers/reviews.controller.ts` — create, listForProject, listMyGiven
- `src/routes/reviews.routes.ts` — с `mergeParams: true`

**Маршрутинг:** reviews router подключён в `projects.routes.ts` через `router.use('/:projectId/reviews', reviewsRouter)` — параметр `:projectId` передаётся через `mergeParams: true`.

**Endpoints:**
- `POST /api/projects/:projectId/reviews` — оставить ревью (reviewer и target — в одной команде)
- `GET /api/projects/:projectId/reviews` — агрегат по студентам (только создатель проекта / ADMIN)
- `GET /api/projects/:projectId/reviews/mine` — мои ревью в этом проекте

**Агрегат** возвращает: `{ user: {id, fullName}, averageScore, count, comments[] }` — имена авторов скрыты.

### Промпт 9 — Frontend: инициализация
**Scaffold:** `npx create-next-app@14` с флагами `--typescript --tailwind --app --src-dir --eslint --no-import-alias`

**Установлены доп. зависимости:** axios, lucide-react, @dnd-kit/core, @dnd-kit/sortable, react-hot-toast, clsx

**Новые файлы:**
- `frontend/.env.local`
- `src/types/index.ts` — все TypeScript-интерфейсы
- `src/lib/auth.ts` — getToken/setToken/removeToken/getUser/setUser/removeUser (localStorage, SSR-safe)
- `src/lib/api.ts` — axios instance + request interceptor (Bearer token) + response interceptor (401→/login)
- `src/hooks/useAuth.ts` — хук `{user, loading, login, logout, register}`
- `src/components/ui/Button.tsx` — варианты primary/secondary/danger/ghost × sm/md/lg + loading spinner
- `src/components/ui/Input.tsx` — label, error, hint
- `src/components/ui/Card.tsx` — padding варианты + CardHeader + CardTitle
- `src/components/ui/Badge.tsx` — 6 вариантов + хелперы RoleBadge/TaskStatusBadge/ProjectStatusBadge
- `src/components/ui/index.ts` — barrel export
- `src/app/layout.tsx` — Inter (cyrillic) + Toaster

### Промпт 10 — Frontend: auth-страницы
**Новые файлы:**
- `src/app/(auth)/layout.tsx` — gradient bg + лого (GraduationCap)
- `src/app/(auth)/login/page.tsx` — форма email/password, toast-ошибки, redirect если уже авторизован
- `src/app/(auth)/register/page.tsx` — форма fullName/email/password/role-radio/skills, skills split(",")
- `src/components/AuthGuard.tsx` — spinner пока loading, redirect на /login если нет user, опциональная проверка `roles[]`

### Промпт 18 — Skill Matching (Jaccard)

**Новые файлы backend:**
- `src/utils/jaccard.ts` — `jaccardScore(a, b): number` (0..1, lowercase+trim нормализация); `matchedSkills(userSkills, projectSkills): string[]`
- `src/controllers/recommendations.controller.ts` — `recommendedProjects` (STUDENT, топ-10 по Jaccard), `suggestedStudents` (TEACHER/ADMIN создатель проекта, топ-15 с буднес-штрафом)
- `src/routes/recommendations.routes.ts` — два GET-маршрута

**Обновлено backend:**
- `src/server.ts` — `app.use('/api/recommendations', recommendationsRouter)`

**Новые endpoints:**
- `GET /api/recommendations/projects` — топ-10 ACTIVE проектов по Jaccard(userSkills, requiredSkills) для STUDENT
- `GET /api/recommendations/projects/:projectId/students` — топ-15 студентов по adjustedScore=Jaccard-0.05×activeTeams для создателя проекта

**Новые файлы frontend:**
- `src/components/MatchScoreBar.tsx` — прогресс-бар (0..1), цвет: зелёный ≥0.6, жёлтый ≥0.3, серый <0.3; `title`-тултип с совпавшими скиллами

**Обновлено frontend:**
- `src/types/index.ts` — добавлены `ProjectRecommendation`, `StudentSuggestion`
- `src/app/(app)/dashboard/page.tsx` — секция «Рекомендуемые проекты» с `MatchScoreBar` и Badge совпавших скиллов (только если score > 0)
- `src/app/(app)/projects/[id]/page.tsx` — таб-панель для owner: «Команды» / «Подобрать состав»; вкладка со списком студентов, `MatchScoreBar`, matchedSkills-badges, активных команд

**Ключевые детали:**
- Busyness penalty: `adjustedScore = max(0, jaccardScore − 0.05 × activeTeamCount)`; activeTeamCount = число команд в ACTIVE проектах
- Рекомендации фильтруются на фронте: `score > 0` (студент без скиллов или проект без requiredSkills → не показываем)
- Студенческие suggestions загружаются лениво при первом переключении на вкладку (не повторно)

### Промпт 14 — AI Roadmap (Gemini)

**Установлен пакет:**
- `backend`: `@google/generative-ai`

**Новые файлы backend:**
- `src/services/gemini.service.ts` — `generateRoadmap({title,description,deadline})` → `RoadmapStep[]`; модель `gemini-1.5-flash`; извлечение JSON из markdown-блока; обработка rate-limit и parse-ошибок (AppError 502)
- `src/controllers/roadmap.controller.ts` — `generate`, `getLast`, `importToTasks`
- `src/routes/roadmap.routes.ts` — `mergeParams: true`, монтируется в `projects.routes.ts`

**Обновлено backend:**
- `src/routes/projects.routes.ts` — `router.use('/:projectId/ai-roadmap', roadmapRouter)`

**Новые endpoints:**
- `POST /api/projects/:projectId/ai-roadmap` — генерирует и сохраняет план (STUDENT в команде проекта или TEACHER)
- `GET /api/projects/:projectId/ai-roadmap` — последний сохранённый план
- `POST /api/projects/:projectId/ai-roadmap/import` — импорт шагов в задачи команды; body: `{teamId, steps[], startDate}`; дедлайны накопительные от startDate

**Новые файлы frontend:**
- `src/components/AIRoadmapModal.tsx` — фазы: `idle → generating → review/importing`; редактируемые строки шагов (title + estimatedDays); checkboxes выбора; поле startDate; кнопки «Сгенерировать» и «Импортировать (N)»

**Обновлено frontend:**
- `src/types/index.ts` — добавлены `RoadmapStep`, `AIRoadmap`
- `src/app/(app)/teams/[id]/page.tsx` — кнопка «AI-план» (Sparkles) для участников команды

**Ключевые детали:**
- `AIRoadmap` в БД — `@unique` на `projectId` (один роадмап на проект), upsert при повторной генерации
- Rate-limit из Gemini определяется по слову `quota`/`rate` в сообщении ошибки → AppError 502
- Дедлайны задач: cumulative — шаг 1: start+3д, шаг 2: start+3+5=8д и т.д.
- `GEMINI_API_KEY` читается лениво (при первом вызове generateRoadmap)

### Промпты 16+17 — Геймификация (points + badges) + страница профиля

**Изменено backend:**
- `src/services/gamification.service.ts` — полностью переписан (был стаб):
  - `awardForTaskCompletion(userId, wasOnTime)` → +10 если в срок, +5 если опоздал
  - `awardForGoodReview(targetUserId, score)` → +score×2
  - `awardForProjectFinish(userId)` → +20
  - Все три возвращают `{pointsDelta, newBadges}` и после инкремента points вызывают `checkBadges(userId)`
  - `checkBadges(userId)` — проверяет 4 условия и пушит новые коды через `prisma.user.update({data: {badges: {push: ...}}})`, без дубликатов; возвращает массив новых кодов
  - Экспорт `BADGE_CODES` (FIRST_TASK / ON_FIRE / TEAM_PLAYER / PROJECT_DONE) и `AwardResult`
- `src/controllers/tasks.controller.ts` — теперь `await awardForTaskCompletion(...)` и возвращает `{task, pointsDelta, newBadges}` (для не-DONE-обновлений: 0 / `[]`)
- `src/controllers/projects.controller.ts` — `updateSchema` теперь явно содержит `status` (раньше отбрасывался Zod'ом!); при переходе ACTIVE/ARCHIVED → COMPLETED итерация по уникальным `userId` всех `TeamMember` проекта + `Promise.all(awardForProjectFinish(...))`
- `src/controllers/reviews.controller.ts` — `awardForGoodReview(...).catch(console.error)` вместо `void` (избегаем unhandled rejection)

**Новые файлы backend:**
- `src/controllers/profile.controller.ts` — `getProfile`: возвращает `{user, stats: {closedTasks, averageReview, reviewCount}}`
- `src/routes/users.routes.ts` — `requireAuth` + `GET /me/profile`

**Обновлено backend:**
- `src/server.ts` — `app.use('/api/users', usersRouter)`

**Новые endpoints:**
- `GET /api/users/me/profile` — profile + stats для текущего пользователя

**Изменено в существующих endpoints:**
- `PATCH /api/tasks/:id` — теперь в ответе добавлены `pointsDelta: number` и `newBadges: string[]`
- `PATCH /api/projects/:id` — поддерживает `status` в теле (раньше игнорировался); при переходе в COMPLETED начисляет +20 каждому участнику + проверяет PROJECT_DONE

**Новые файлы frontend:**
- `src/lib/badges.ts` — словарь `BADGES: Record<string, {emoji, name, description}>` для 4 кодов
- `src/app/(app)/profile/page.tsx` — header с аватаром/ролью/скиллами; 3 stat-tile (очки / закрыто задач / средний review); сетка бейджей (`grid-cols-2 lg:grid-cols-4`) — полученные цветные, остальные `opacity-50 grayscale` с описанием как получить

**Обновлено frontend:**
- `src/hooks/useAuth.ts` — добавлен `refresh()` метод + module-level pub-sub `triggerAuthRefresh()`: вызов из любого места заставляет все смонтированные `useAuth()` инстансы перезапросить `/auth/me`
- `src/components/Navbar.tsx` — points-бейдж и имя пользователя стали `<Link href="/profile">` (real points обновляются через useAuth refresh)
- `src/components/KanbanBoard.tsx` — после PATCH `/tasks/:id` (drag-and-drop) обрабатывает `pointsDelta` (toast «+N очков!» + `triggerAuthRefresh()`) и `newBadges` (toast «🎉 Новый бейдж: emoji name» с duration 5000)
- `src/components/TaskModal.tsx` — то же при сохранении через форму редактирования

**Ключевые детали:**
- Бейджи в БД хранятся как `String[]` на `User.badges`; используется Prisma scalar-list operator `{push: [...]}` для атомарного добавления
- `checkBadges` сначала проверяет `existing.has(code)`, чтобы не делать лишних запросов и не пушить дубли
- ON_FIRE: запрос `findMany({where: {assigneeId, status: DONE, completedAt: {not: null}}, orderBy: {completedAt: desc}, take: 5})`; бейдж выдаётся только если 5 задач закрыто И все `wasOnTime === true`
- TEAM_PLAYER: один `aggregate({_avg, _count})` запрос вместо `findMany + reduce`
- PROJECT_DONE: проверяется на любого participant'а проекта при переходе проекта в COMPLETED — кликает teacher в `PATCH /projects/:id`, бэк сам начисляет всем
- pub-sub в useAuth — простейший способ синхронизировать `points` в Navbar после изменения в KanbanBoard, без введения React Context

### ICS Import — Импорт дедлайнов из .ics файла

**Установлены пакеты backend:**
- `multer`, `node-ical`, `@types/multer`

**Новые файлы backend:**
- `src/middleware/upload.middleware.ts` — multer с memoryStorage, лимит 1 МБ, фильтр `.ics`; экспортирует `handleIcsUpload` — обёртку, которая конвертирует ошибки multer в AppError(400)
- `src/controllers/ics.controller.ts` — `parseFile`: парсит .ics через `node-ical.sync.parseICS`, возвращает `{events[{uid, title, description, start, end}]}`; `confirmImport`: создаёт Task'и через `$transaction` (deadline = start события)
- `src/routes/ics.routes.ts` — `mergeParams: true`, `requireRole(TEACHER, ADMIN)` на всех маршрутах

**Обновлено backend:**
- `src/routes/projects.routes.ts` — монтирует `icsRouter` по пути `/:projectId/import-ics`

**Новые endpoints:**
- `POST /api/projects/:projectId/import-ics` — `multipart/form-data`, поле `file`; только TEACHER/ADMIN; возвращает `{events[]}`
- `POST /api/projects/:projectId/import-ics/confirm` — `{teamId, events[{title, description, start}]}`; только createdBy/ADMIN; создаёт задачи, дедлайн = start

**Новые файлы frontend:**
- `src/app/(app)/projects/[id]/import/page.tsx` — 3-шаговый wizard: шаг 1 (file input drag-drop), шаг 2 (список событий с чекбоксами + выбор команды), шаг 3 (подтверждение + редирект)

**Обновлено frontend:**
- `src/app/(app)/projects/[id]/page.tsx` — кнопка «Импорт из календаря» (CalendarDays) в шапке для isOwner

**Ключевые детали:**
- `ParameterValue` в node-ical может быть `string | {val: string, params: {...}}` — хелпер `paramToString` нормализует оба варианта
- Пустой календарь (0 VEVENT) → 400 «Календарь не содержит событий»
- Повреждённый файл → try/catch вокруг `parseICS` → 400
- Файл не .ics → multer fileFilter → AppError(400) через wrapper
- Файл > 1 МБ → `LIMIT_FILE_SIZE` → AppError(400)
- На шаге 2 все события выбраны по умолчанию; есть «Выбрать все» / «Снять все»
- Команды нет в проекте → алерт с предупреждением, кнопка «Импортировать» задизейблена
- После успеха: кнопки «К проекту» и «Открыть команду»

### Промпт 19 — Полная документация для защиты

**Новые файлы:**
- `README.md` (root) — полная документация проекта
  - Описание проекта, стек, архитектура (3-tier с диаграммой)
  - 5 модулей (Academic Sync, Peer Assessment, Smart Team Builder, AI Roadmap, Gamification) с привязкой к коду
  - Инструкция запуска (Docker → backend → frontend)
  - Переменные окружения
  - Основные сущности и фишки
  - Скриншоты (плейсхолдеры)

- `backend/README.md` — API документация
  - Все 30+ endpoints с request/response примерами
  - Error codes и обработка ошибок
  - Rate limiting, CORS, аутентификация
  - Примеры curl/JSON

- `docs/database-schema.md` — описание БД
  - 7 таблиц (User, Project, Team, TeamMember, Task, PeerReview, AIRoadmap)
  - ERD диаграмма (ASCII)
  - Описание полей, индексов, ограничений
  - Примеры SQL запросов
  - Информация о транзакциях и миграциях

- `docs/defense-cheatsheet.md` — шпаргалка для защиты
  - Ответы на 40+ вероятных вопросов комиссии
  - Почему выбраны технологии (Node vs Spring, PostgreSQL vs MongoDB, Next.js vs Vue)
  - Как реализована безопасность (JWT, bcrypt, валидация, CORS)
  - Как интегрирован Gemini (prompt, rate limit, ошибки)
  - Алгоритмы (Jaccard, ON_FIRE, TEAM_PLAYER, бейджи)
  - Drag-and-drop на мобильных
  - Pub-Sub для real-time очков
  - Что можно улучшить (тесты, WebSocket, CI/CD)

**Обновлено:**
- Все файлы типизированы, структурированы для быстрого поиска
- Примеры копируемые и рабочие
- Ссылки на конкретные файлы в репо

**Ключевые детали:**
- README с диаграммой 3-tier архитектуры (presentation → application → data)
- backend/README содержит весь API, включая примеры для каждого endpoint
- database-schema содержит ERD и описание каждого поля, индекса, констрейнта
- defense-cheatsheet содержит полные ответы на технические и концептуальные вопросы

### Промпт 18 — Финальная полировка

**Backend:**
- `src/server.ts` — централизованный error handler расширен: `ZodError` → 400 (первое сообщение); `Prisma.PrismaClientKnownRequestError` P2025 → 404 «Запись не найдена», P2002 → 409 «Запись с такими данными уже существует»; прочее → 500

**Frontend:**
- `tailwind.config.ts` — кастомный цвет `primary` (бордовый #7B1F2A как 800-шейд) со шкалой 50–950
- `public/favicon.svg` — SVG-иконка (шапочка выпускника на бордовом фоне) для `<link rel="icon">`
- `src/app/layout.tsx` — `title.template = '%s | SPHub'`, `title.default = 'SPHub — Платформа студенческих проектов'`, `icons: { icon: '/favicon.svg' }`; цвет Toaster success-иконки → `#7B1F2A`
- `src/components/ui/Button.tsx` — primary-вариант переключён на `bg-primary-800 hover:bg-primary-700`
- `src/components/ui/Input.tsx`, `Textarea.tsx` — фокус-кольцо `focus:ring-primary-700`
- `src/components/TaskModal.tsx` — select'ы: `focus:ring-primary-700`
- `src/components/Navbar.tsx` — логотип `bg-primary-800`; активная ссылка `bg-primary-50 text-primary-800`; имя hover → `hover:text-primary-800`
- `src/components/KanbanBoard.tsx` — мобильный горизонтальный скролл: `overflow-x-auto flex gap-3` с `min-w-[272px]` колонками; на `sm+` остаётся `grid grid-cols-3`
- `src/app/(app)/projects/[id]/page.tsx` — хлебные крошки «Dashboard › Название проекта» вместо ссылки «← Dashboard»
- `src/app/(app)/teams/[id]/page.tsx` — хлебные крошки «Dashboard › Название проекта › Название команды»; `team.project?.title` берётся из данных (уже включено в TEAM_FULL_INCLUDE)

**Ключевые детали:**
- Шкала `primary`: 50=`#fff5f5` … 800=`#7B1F2A` (бренд) … 950=`#3d0c13`
- Мобильный Kanban: `−mx-4 px-4` pull-out чтобы колонки уходили за паддинг страницы, `pb-4` для скролл-индикатора; обёртка `min-w-[272px]` не влияет на droppable-zone (ref внутри KanbanColumn)
- Хлебные крошки используют `ChevronRight` из lucide-react (вместо `ArrowLeft`); `line-clamp-1 max-w-[180px]` для длинных названий
- Централизованный Prisma-обработчик в server.ts работает, т.к. контроллеры передают ошибку через `next(err)` в catch

### Промпт 12 — Frontend: Kanban-доска + страницы проекта и команды

**Новые файлы:**
- `src/components/ui/Modal.tsx` — переиспользуемая модалка: backdrop, Escape-key, body scroll lock
- `src/components/TaskCard.tsx` — `useDraggable`, title, deadline (красный если просрочен), avatar assignee; `opacity-30` когда dragging оригинал; `rotate + scale` в overlay
- `src/components/KanbanBoard.tsx` — `DndContext` + `PointerSensor` (activationConstraint distance:8), 3 колонки через `useDroppable`, `DragOverlay`, оптимистичный PATCH `/api/tasks/:id` с rollback
- `src/components/TaskModal.tsx` — создание (POST `/teams/:teamId/tasks`) и редактирование (PATCH `/tasks/:id`); поля: title, description, deadline, assignee select из членов команды, status (только при edit)
- `src/app/(app)/projects/[id]/page.tsx` — детали проекта: статус/badges, дедлайн, навыки, список команд с аватарами; STUDENT (не в команде) видит кнопки «Создать команду» и «Вступить по коду»; лидер видит invite-code badge с copy; TEACHER/ADMIN — кнопки «Завершить» и «В архив»
- `src/app/(app)/teams/[id]/page.tsx` — сайдбар с участниками (avatar + crown для лидера + kick button для лидера), invite code box (только лидеру), скиллы команды; Kanban + TaskModal

**Обновлено:**
- `src/components/ui/index.ts` — добавлен export Modal

### Промпт 11 — Frontend: Dashboard + Navbar
**Новые файлы:**
- `src/components/ui/Textarea.tsx` — аналог Input для textarea
- `src/components/Navbar.tsx` — sticky header, логотип, nav links (active highlight), points badge, RoleBadge, Logout
- `src/app/(app)/layout.tsx` — AuthGuard + Navbar + max-w-7xl main
- `src/app/(app)/dashboard/page.tsx` — ветвление STUDENT/TEACHER
- `src/app/(app)/projects/new/page.tsx` — форма создания проекта (только TEACHER)

**Логика StudentDashboard:** `GET /api/projects` → `Promise.all(projects.map(GET /api/projects/:id))` → filter teams where `member.userId === user.id`

**Логика TeacherDashboard:** `GET /api/projects` → статистика из данных (totalTeams = sum of `_count.teams`)

---

## 3. Структура проекта

```
student-project-hub/
├── docker-compose.yml
├── .gitignore
├── README.md                        ← Полная документация (архитектура, стек, модули, запуск)
├── docs/
│   ├── PROGRESS.md                  ← История разработки (этот файл)
│   ├── database-schema.md           ← Описание таблиц (ERD, поля, индексы, примеры SQL)
│   └── defense-cheatsheet.md        ← Шпаргалка для защиты (40+ Q&A для комиссии)
├── backend/
│   ├── .env                         ← DATABASE_URL, JWT_SECRET, PORT, GEMINI_API_KEY
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── README.md                    ← API документация (30+ endpoints, примеры, error codes)
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── server.ts                ← точка входа
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   ├── projects.controller.ts
│       │   ├── teams.controller.ts
│       │   ├── tasks.controller.ts
│       │   ├── reviews.controller.ts
│       │   ├── roadmap.controller.ts  ← generate, getLast, importToTasks
│       │   ├── recommendations.controller.ts ← recommendedProjects, suggestedStudents
│       │   ├── ics.controller.ts      ← parseFile, confirmImport
│       │   └── profile.controller.ts  ← getProfile (points, badges, stats)
│       ├── routes/
│       │   ├── auth.routes.ts
│       │   ├── projects.routes.ts     ← монтирует reviewsRouter + roadmapRouter
│       │   ├── teams.routes.ts        ← содержит и task-маршруты /:teamId/tasks
│       │   ├── tasks.routes.ts        ← PATCH/DELETE /api/tasks/:id
│       │   ├── reviews.routes.ts      ← mergeParams: true
│       │   ├── roadmap.routes.ts      ← mergeParams: true
│       │   ├── recommendations.routes.ts
│       │   ├── ics.routes.ts          ← mergeParams: true, requireRole(TEACHER, ADMIN)
│       │   └── users.routes.ts        ← GET /me/profile
│       ├── middleware/
│       │   ├── auth.middleware.ts     ← requireAuth, requireRole
│       │   ├── team.middleware.ts     ← requireTeamMember(param)
│       │   └── upload.middleware.ts   ← handleIcsUpload (multer + error wrapper)
│       ├── services/
│       │   ├── gamification.service.ts ← awardForTaskCompletion / awardForGoodReview / awardForProjectFinish + checkBadges
│       │   └── gemini.service.ts      ← generateRoadmap → RoadmapStep[]
│       ├── types/
│       │   └── express.d.ts           ← расширение Request.user
│       └── utils/
│           ├── AppError.ts
│           ├── inviteCode.ts
│           ├── jaccard.ts             ← jaccardScore + matchedSkills
│           ├── jwt.ts
│           └── prisma.ts
└── frontend/
    ├── .env.local                     ← NEXT_PUBLIC_API_URL
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts             ← кастомный цвет primary (#7B1F2A)
    ├── public/
    │   └── favicon.svg                ← бордовая иконка с шапочкой выпускника
    └── src/
        ├── app/
        │   ├── layout.tsx             ← Inter + Toaster (root)
        │   ├── page.tsx               ← дефолтная (скаффолд, не тронута)
        │   ├── globals.css
        │   ├── (auth)/
        │   │   ├── layout.tsx         ← gradient bg + лого
        │   │   ├── login/page.tsx
        │   │   └── register/page.tsx
        │   └── (app)/
        │       ├── layout.tsx         ← AuthGuard + Navbar
        │       ├── dashboard/page.tsx
        │       ├── profile/page.tsx   ← очки, статистика, сетка бейджей
        │       ├── projects/
        │       │   ├── new/page.tsx
        │       │   └── [id]/
│       │       ├── page.tsx   ← детали проекта + create/join team modals + кнопка импорта
│       │       └── import/page.tsx ← 3-шаговый ICS wizard (только TEACHER)
        │       └── teams/
        │           └── [id]/page.tsx  ← команда + Kanban + TaskModal + AI-план кнопка
        ├── components/
        │   ├── AuthGuard.tsx
        │   ├── Navbar.tsx
        │   ├── KanbanBoard.tsx        ← DndContext, 3 колонки, DragOverlay
        │   ├── AIRoadmapModal.tsx     ← генерация + редактирование + импорт шагов
        │   ├── MatchScoreBar.tsx      ← прогресс-бар Jaccard 0..1 с тултипом
        │   ├── TaskCard.tsx           ← useDraggable, deadline highlight, assignee
        │   ├── TaskModal.tsx          ← create/edit задачи
        │   └── ui/
        │       ├── index.ts           ← barrel export
        │       ├── Button.tsx
        │       ├── Input.tsx
        │       ├── Textarea.tsx
        │       ├── Card.tsx
        │       ├── Badge.tsx
        │       └── Modal.tsx          ← backdrop, Escape, scroll lock
        ├── hooks/
        │   └── useAuth.ts
        ├── lib/
        │   ├── api.ts                 ← axios instance
        │   ├── auth.ts                ← localStorage helpers
        │   └── badges.ts              ← словарь {code → {emoji, name, description}}
        └── types/
            └── index.ts
```

---

## 4. API Endpoints

### Auth — `/api/auth`

| Метод | Путь | Auth | Тело запроса | Ответ |
|---|---|---|---|---|
| GET | `/api/health` | — | — | `{status, timestamp}` |
| POST | `/api/auth/register` | — | `{fullName, email, password, role?, skills?}` | `{token, user}` |
| POST | `/api/auth/login` | — | `{email, password}` | `{token, user}` |
| GET | `/api/auth/me` | Bearer | — | `{user}` |

### Projects — `/api/projects`

| Метод | Путь | Auth | Кто может | Ответ |
|---|---|---|---|---|
| GET | `/api/projects` | Bearer | все | `{projects[]}` — STUDENT видит только ACTIVE; TEACHER — только свои; ADMIN — все |
| GET | `/api/projects/:id` | Bearer | все | `{project}` с `teams[{leader, members[]}]` |
| POST | `/api/projects` | Bearer | TEACHER | `{project}` |
| PATCH | `/api/projects/:id` | Bearer | createdBy / ADMIN | `{project}` |
| DELETE | `/api/projects/:id` | Bearer | createdBy / ADMIN | 204 |

### Teams — `/api/teams` и `/api/projects/:projectId/teams`

| Метод | Путь | Auth | Кто может | Ответ |
|---|---|---|---|---|
| POST | `/api/projects/:projectId/teams` | Bearer | STUDENT | `{team}` — создаёт команду, лидер = req.user, inviteCode генерируется |
| GET | `/api/teams/:id` | Bearer | все | `{team}` с `{project, leader, members[], tasks[]}` |
| POST | `/api/teams/join` | Bearer | все | `{team}` — тело: `{inviteCode}` |
| DELETE | `/api/teams/:id/members/me` | Bearer | участник (не лидер) | 204 |
| DELETE | `/api/teams/:id/members/:userId` | Bearer | лидер | 204 |

### Tasks — `/api/teams/:teamId/tasks` и `/api/tasks`

| Метод | Путь | Auth | Кто может | Ответ |
|---|---|---|---|---|
| GET | `/api/teams/:teamId/tasks` | Bearer + teamMember | участник | `{tasks[]}` |
| POST | `/api/teams/:teamId/tasks` | Bearer + teamMember | участник | `{task}` |
| PATCH | `/api/tasks/:id` | Bearer | любой участник команды | `{task}` |
| DELETE | `/api/tasks/:id` | Bearer | лидер команды или createdBy проекта | 204 |

### Peer Reviews — `/api/projects/:projectId/reviews`

| Метод | Путь | Auth | Кто может | Ответ |
|---|---|---|---|---|
| POST | `/api/projects/:projectId/reviews` | Bearer | участник одной команды с targetUser | `{review}` |
| GET | `/api/projects/:projectId/reviews` | Bearer | TEACHER (createBy) / ADMIN | `{aggregate[]}` — анонимные |
| GET | `/api/projects/:projectId/reviews/mine` | Bearer | любой авторизованный | `{reviews[]}` |

### Recommendations — `/api/recommendations`

| Метод | Путь | Auth | Кто может | Ответ |
|---|---|---|---|---|
| GET | `/api/recommendations/projects` | Bearer | STUDENT | `{recommendations[{project, score, matchedSkills}]}` — топ-10 по Jaccard |
| GET | `/api/recommendations/projects/:projectId/students` | Bearer | createdBy / ADMIN | `{suggestions[{user, score, matchedSkills, activeTeamCount, adjustedScore}]}` — топ-15 |

### AI Roadmap — `/api/projects/:projectId/ai-roadmap`

| Метод | Путь | Auth | Кто может | Ответ |
|---|---|---|---|---|
| POST | `/api/projects/:projectId/ai-roadmap` | Bearer | STUDENT в команде проекта или TEACHER | `{roadmap}` с `generatedSteps[]` |
| GET | `/api/projects/:projectId/ai-roadmap` | Bearer | все авторизованные | `{roadmap}` или 404 |
| POST | `/api/projects/:projectId/ai-roadmap/import` | Bearer | участник teamId | `{tasks[]}` — body: `{teamId, steps[], startDate}` |

### ICS Import — `/api/projects/:projectId/import-ics`

| Метод | Путь | Auth | Кто может | Ответ |
|---|---|---|---|---|
| POST | `/api/projects/:projectId/import-ics` | Bearer | TEACHER / ADMIN | `{events[{uid, title, description, start, end}]}` — multipart, поле `file` |
| POST | `/api/projects/:projectId/import-ics/confirm` | Bearer | createdBy / ADMIN | `{tasks[]}` — body: `{teamId, events[{title, description, start}]}` |

### Users / Profile — `/api/users`

| Метод | Путь | Auth | Кто может | Ответ |
|---|---|---|---|---|
| GET | `/api/users/me/profile` | Bearer | все авторизованные | `{user, stats: {closedTasks, averageReview, reviewCount}}` |

### Изменения в существующих endpoints (промпт 16)

- `PATCH /api/tasks/:id` — добавлены в ответ поля `pointsDelta: number` и `newBadges: string[]`. Не-DONE-обновление возвращает `0` и `[]`. При завершении (transition в DONE) — реальные значения.
- `PATCH /api/projects/:id` — теперь поддерживает `status: ProjectStatus` в теле; при переходе в COMPLETED начисляется `+20` всем уникальным участникам команд проекта (`awardForProjectFinish`).

---

## 5. Модели Prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  STUDENT
  TEACHER
  ADMIN
}

enum ProjectStatus {
  ACTIVE
  COMPLETED
  ARCHIVED
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

model User {
  id        String   @id @default(cuid())
  fullName  String
  email     String   @unique
  password  String
  role      Role     @default(STUDENT)
  skills    String[]
  points    Int      @default(0)
  badges    String[]
  createdAt DateTime @default(now())

  createdProjects Project[]
  ledTeams        Team[]       @relation("TeamLeader")
  teamMemberships TeamMember[]
  assignedTasks   Task[]
  givenReviews    PeerReview[] @relation("Reviewer")
  receivedReviews PeerReview[] @relation("TargetUser")
}

model Project {
  id             String        @id @default(cuid())
  title          String
  description    String
  deadline       DateTime
  status         ProjectStatus @default(ACTIVE)
  createdById    String
  requiredSkills String[]
  createdAt      DateTime      @default(now())

  createdBy   User         @relation(fields: [createdById], references: [id], onDelete: Restrict)
  teams       Team[]
  peerReviews PeerReview[]
  aiRoadmap   AIRoadmap?
}

model Team {
  id         String   @id @default(cuid())
  name       String
  inviteCode String   @unique
  projectId  String
  leaderId   String
  createdAt  DateTime @default(now())

  project Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  leader  User         @relation("TeamLeader", fields: [leaderId], references: [id], onDelete: Restrict)
  members TeamMember[]
  tasks   Task[]
}

model TeamMember {
  teamId   String
  userId   String
  joinedAt DateTime @default(now())

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([teamId, userId])
}

model Task {
  id          String     @id @default(cuid())
  title       String
  description String
  status      TaskStatus @default(TODO)
  deadline    DateTime?
  teamId      String
  assigneeId  String?
  completedAt DateTime?
  wasOnTime   Boolean?
  createdAt   DateTime   @default(now())

  team     Team  @relation(fields: [teamId], references: [id], onDelete: Cascade)
  assignee User? @relation(fields: [assigneeId], references: [id], onDelete: SetNull)
}

model PeerReview {
  id           String   @id @default(cuid())
  projectId    String
  reviewerId   String
  targetUserId String
  score        Int      // 1–5, валидируется Zod
  comment      String
  createdAt    DateTime @default(now())

  project    Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  reviewer   User    @relation("Reviewer", fields: [reviewerId], references: [id], onDelete: Cascade)
  targetUser User    @relation("TargetUser", fields: [targetUserId], references: [id], onDelete: Cascade)

  @@unique([projectId, reviewerId, targetUserId])
}

model AIRoadmap {
  id             String   @id @default(cuid())
  projectId      String   @unique
  generatedSteps Json
  createdAt      DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

**Политика onDelete:**
- `Restrict` — Project→User (нельзя удалить автора с проектами), Team→User (нельзя удалить лидера)
- `Cascade` — Team→Project, TeamMember→Team, TeamMember→User, Task→Team, PeerReview→Project/Users, AIRoadmap→Project
- `SetNull` — Task→User (assignee): удаление пользователя снимает назначение, задача остаётся

---

## 6. Типы фронта (`src/types/index.ts`)

```typescript
export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  skills: string[];
  points: number;
  badges: string[];
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: ProjectStatus;
  createdById: string;
  requiredSkills: string[];
  createdAt: string;
  createdBy?: Pick<User, 'id' | 'fullName' | 'email' | 'role'>;
  _count?: { teams: number };
}

export interface TeamMember {
  teamId: string;
  userId: string;
  joinedAt: string;
  user?: Pick<User, 'id' | 'fullName' | 'email' | 'skills'>;
}

export interface Team {
  id: string;
  name: string;
  inviteCode: string;
  projectId: string;
  leaderId: string;
  createdAt: string;
  project?: Pick<Project, 'id' | 'title' | 'status' | 'deadline'>;
  leader?: Pick<User, 'id' | 'fullName' | 'email'>;
  members?: TeamMember[];
  tasks?: Task[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  deadline: string | null;
  teamId: string;
  assigneeId: string | null;
  completedAt: string | null;
  wasOnTime: boolean | null;
  createdAt: string;
  assignee?: Pick<User, 'id' | 'fullName' | 'email'> | null;
}

export interface PeerReview {
  id: string;
  projectId: string;
  reviewerId: string;
  targetUserId: string;
  score: number;
  comment: string;
  createdAt: string;
  targetUser?: Pick<User, 'id' | 'fullName' | 'email'>;
}

export interface ReviewAggregate {
  user: Pick<User, 'id' | 'fullName'>;
  averageScore: number;
  count: number;
  comments: string[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
}
```

---

## 7. Конвенции кода

### Backend

#### Структура контроллера
Каждый контроллер экспортирует именованные async-функции с сигнатурой `(req, res, next): Promise<void>`. Все ошибки передаются через `next(err)` — никаких `throw` вне `try/catch`. Паттерн:

```typescript
export async function handlerName(req, res, next): Promise<void> {
  try {
    // 1. Валидация через Zod safeParse
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { next(new AppError(400, ...)); return; }

    // 2. Проверки существования (404)
    const entity = await prisma.model.findUnique(...);
    if (!entity) { next(new AppError(404, '...')); return; }

    // 3. Проверки прав (403)
    if (!canMutate(...)) { next(new AppError(403, 'Forbidden')); return; }

    // 4. Бизнес-логика
    const result = await prisma.model.create/update/delete(...);
    res.status(201).json({ result });
  } catch (err) {
    next(err); // error handler в server.ts обработает
  }
}
```

#### Zod-валидация
- `z.string().min(1)` для обязательных строк (не просто `z.string()`)
- `z.string().datetime()` для дат в ISO 8601
- `z.nativeEnum(EnumName)` для Prisma-перечислений
- `.optional().default(value)` для полей с дефолтами
- Всегда `safeParse`, а не `parse` (не бросает исключение)
- Ошибка из `parsed.error.errors[0].message` — берём первую

#### AppError
```typescript
class AppError extends Error {
  constructor(public readonly statusCode: number, message: string)
}
```
Error handler в `server.ts` проверяет `instanceof AppError` и возвращает `{error: message}` с правильным статусом. Всё остальное → 500.

#### Авторизация
- Маршрут-уровень: `requireAuth` (проверяет Bearer токен), `requireRole(...roles)` (проверяет роль из токена)
- Контроллер-уровень: проверка `req.user.id === entity.createdById` для ownership
- `requireTeamMember(param)` — middleware-фабрика, читает `req.params[param]`, проверяет TeamMember в БД

#### Prisma
- Один синглтон `src/utils/prisma.ts`
- `USER_PUBLIC_SELECT` / `TEAM_FULL_INCLUDE` — переиспользуемые объекты select/include
- `TEAM_FULL_INCLUDE satisfies Prisma.TeamInclude` — TypeScript проверяет тип на compile-time
- P2002 (unique constraint) обрабатывается явно в create-хендлерах

### Frontend

#### axios instance (`src/lib/api.ts`)
```typescript
const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });
// request interceptor: добавляет Authorization: Bearer <token>
// response interceptor: на 401 → removeToken + removeUser + redirect /login
```
`api` — единственный способ делать HTTP-запросы. Прямой `axios.get` не используется.

#### localStorage helpers (`src/lib/auth.ts`)
Все функции проверяют `typeof window === 'undefined'` — Next.js рендерит серверные компоненты без браузера. Ключи: `'token'` и `'user'`.

#### useAuth
Жизненный цикл:
1. Mount: читаем `token` из localStorage
2. Если нет — `setLoading(false)`, user = null
3. Если есть — сначала показываем кэшированного user из localStorage (избегаем flash)
4. Параллельно делаем `GET /auth/me` для верификации токена
5. На успех — обновляем user в state и localStorage
6. На ошибку — очищаем токен и user (interceptor делает redirect)

`login()` и `register()` — `useCallback` с `[router]` в deps. После успеха — toast + `router.push('/dashboard')`.

#### Компоненты UI
- Все используют `clsx` для вариантов (не template literals с тернарными)
- `Button` и `Input` — `forwardRef` для возможности передачи ref снаружи
- Варианты задаются через `Record<Variant, string>` объекты — легко добавлять новые
- `Badge` — 6 вариантов + 3 domain-хелпера (`RoleBadge`, `TaskStatusBadge`, `ProjectStatusBadge`)
- `Skeleton` (`src/components/ui/Skeleton.tsx`) — базовый pulse-блок (`animate-pulse bg-gray-200`), принимает `className`

#### Skeleton-компоненты (`src/components/skeletons/`)
- `ProjectCardSkeleton` — полоски заголовка, описания, даты, скиллов; используется в `dashboard` и `projects/[id]`
- `TeamCardSkeleton` — заголовок, дедлайн, аватары, прогресс-бар, кнопка; используется в `dashboard`, `teams`, `archive`, `projects/[id]`
- `TaskCardSkeleton` — заголовок, подзаголовок, аватар; используется внутри `KanbanColumnSkeleton`
- `KanbanColumnSkeleton` — заголовок колонки + 3 × `TaskCardSkeleton`; используется в `teams/[id]`
- `ListSkeleton` — универсальный список из N строк (props: `count`, `height`); доступен для будущих страниц
- Все страницы с async-загрузкой (`dashboard`, `teams`, `archive`, `projects/[id]`, `teams/[id]`, `profile`) заменили спиннер `Loader2` на skeleton-блоки в форме реального контента

#### Breadcrumbs
- `Breadcrumbs` (pure) + `BreadcrumbsContainer` (client, данные) — разделение ответственности
- Кеш имён — module-level `Map<string, string>`, живёт на весь SPA-сеанс
- Мобильный collapse через две группы элементов с `hidden sm:block` / `sm:hidden`
- `(app)/layout.tsx` — единственное место монтирования; автоматически работает на всех app-страницах

#### Kanban drag-and-drop (KanbanBoard.tsx)
- `PointerSensor` с `activationConstraint: { distance: 8 }` — предотвращает случайный drag при клике
- `useDroppable({ id: status })` — каждая колонка = droppable zone с id = TaskStatus
- `useDraggable({ id: task.id })` — каждая карточка; при `overlay=true` — disabled, чтобы не было двойного drag
- Оптимистичный PATCH: сохраняем snapshot → обновляем state → делаем PATCH → на ошибку rollback к snapshot
- DragOverlay рендерит `<TaskCard overlay>` — карточка с `rotate(2deg) scale(1.03)` под курсором

#### Route groups (Next.js App Router)
- `(auth)` — страницы без Navbar, с gradient layout
- `(app)` — страницы с AuthGuard + Navbar, `max-w-7xl` main container
- Route groups не влияют на URL (скобки игнорируются)

#### Тёмная тема
- Tailwind `darkMode: 'class'` — класс `dark` на `<html>` управляет всеми `dark:` модификаторами
- `src/lib/theme.ts` + `ThemeProvider` + `ThemeToggle` — чтение/запись в localStorage (`'theme'`), fallback на `prefers-color-scheme`
- Inline `<script>` в `<head>` (`src/app/layout.tsx`) ставит класс до гидратации — нет flash светлой темы
- При смене system pref **только если пользователь явно не выбирал** — иначе ручной выбор priority
- Правила применения dark-классов: см. промпт 25 в разделе 2

#### Error handling на фронте
```typescript
try {
  await someApiCall();
} catch (err) {
  const message = err instanceof AxiosError
    ? (err.response?.data as ApiError)?.error ?? 'Fallback message'
    : 'Fallback message';
  toast.error(message);
}
```

---

## 8. Что НЕ сделано (промпты 13, 15, 19)

Следующие фичи предстоит реализовать:

- **Промпт 13** — Страница `/projects` (список проектов): фильтрация по статусу/навыкам, поиск, пагинация
- **Промпт 15** — Peer Review UI: форма выставления оценки, страница `/projects/[id]/reviews` с агрегатом для преподавателя
- **Промпт 19** — Финализация: CI/CD конфиг, production Docker Compose, деплой на Railway/Vercel, финальный README

---

## 9. Известные особенности и нестандартные решения

### Порт PostgreSQL: 5433 вместо 5432
При запуске `docker compose up -d` порт 5432 оказался занят системным PostgreSQL. Решение: в `docker-compose.yml` изменён маппинг на `5433:5432`. Внутри контейнера PG слушает на 5432, снаружи — на 5433. `DATABASE_URL` в `.env` использует порт 5433.

### JWT payload
```typescript
interface TokenPayload {
  id: string;    // cuid пользователя
  role: Role;    // 'STUDENT' | 'TEACHER' | 'ADMIN'
}
```
Роль хранится в токене, чтобы не делать запрос в БД на каждый запрос. При смене роли (редкое событие) токен нужно перевыпустить. Срок жизни: **7 дней**.

### Invite-код генерация
- Алфавит: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 символа, без `0/O, 1/I/L`)
- `crypto.randomBytes(8)` — криптографически стойкий ГПСЧ
- `256 % 32 === 0` — нет modulo bias, все символы равновероятны
- При коллизии (уже существует такой код): повторная генерация до 10 раз
- Функция `resolveUniqueInviteCode()` в teams controller

### mergeParams для Reviews router
`reviews.routes.ts` создаётся с `Router({ mergeParams: true })`, чтобы унаследовать `:projectId` из родительского projects router. Без этого флага параметр был бы `undefined`.

### Не `req.params.id` а `req.params.teamId` для task-маршрутов
В `teams.routes.ts` task-маршруты используют `:teamId` (а не `:id` как остальные team-маршруты), чтобы контроллер мог читать `req.params.teamId` явно, и чтобы `requireTeamMember('teamId')` работал корректно.

### DONE-переход в Tasks
При `PATCH /api/tasks/:id` со статусом `DONE`:
- Проставляется `completedAt = new Date()` (серверное время)
- `wasOnTime = task.deadline !== null ? now <= task.deadline : true`
- Повторный PATCH с `status: 'DONE'` не перезатирает `completedAt/wasOnTime` (проверка `task.status !== TaskStatus.DONE`)

### Лидер не может покинуть команду
`DELETE /api/teams/:id/members/me` возвращает 400 если `team.leaderId === req.user.id`. Для удаления команды нужно DELETE команды (не реализован endpoint) или переназначение лидера (тоже не реализовано — задел на будущее).

### Task не хранит createdById
В Prisma-схеме у `Task` нет поля `createdById`. "Создатель задачи" в контексте delete-прав интерпретирован как `project.createdById` (учитель-владелец проекта). Лидер команды также может удалять задачи.

### Dashboard: N+1 для студентов
`StudentDashboard` делает `GET /api/projects` + `Promise.all(projects.map(GET /api/projects/:id))` для нахождения команд пользователя. Это N+1 запрос, допустимый для MVP. Оптимизация — добавить `GET /api/users/me/teams` endpoint в будущем.

### Нет `/projects` страницы
На фронте пока нет страницы `/projects` (список всех проектов). Навбар содержит ссылку `href="/projects"` которая ведёт на несуществующую страницу — это задел для промпта 14.

### `RegisterRole = 'STUDENT' | 'TEACHER'`
На странице регистрации тип роли сужен до `'STUDENT' | 'TEACHER'` (локальный тип `RegisterRole`), потому что `ADMIN` нельзя выбрать при регистрации. Это TypeScript-ограничение, не только UI.

### Gamification — заглушки
`awardForTaskCompletion(userId, wasOnTime)` и `awardForGoodReview(targetUserId, score)` — пустые async-функции в `gamification.service.ts`. Вызываются через `void` (fire-and-forget) из tasks и reviews контроллеров. Реализация — промпт 16.

### `version: '3.9'` убран из docker-compose.yml
Docker выводил предупреждение `attribute 'version' is obsolete`. Убрали.
