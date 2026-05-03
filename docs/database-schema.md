# 🗄️ Database Schema

PostgreSQL 16 схема для Student Project Hub.

> Подробнее в `backend/prisma/schema.prisma`

---

## 📊 Диаграмма сущностей (ERD)

```
┌─────────────┐
│    User     │
├─────────────┤
│ id (PK)     │
│ email (U)   │
│ fullName    │
│ password    │
│ role        │
│ skills      │
│ points      │
│ badges      │
│ createdAt   │
└─────────────┘
      ▲
      │ createdBy
      │ reviewerId
      │ targetUserId
      │ leaderId
      │ assigneeId
      │
┌─────────────────────────────────────────────────────┐
│             Project                                  │
├─────────────────────────────────────────────────────┤
│ id (PK)                                             │
│ title                                               │
│ description                                         │
│ deadline                                            │
│ status (ACTIVE, COMPLETED, ARCHIVED)               │
│ createdById (FK → User)                            │
│ requiredSkills (String[])                          │
│ createdAt                                          │
└─────────────────────────────────────────────────────┘
      ▲
      │ projectId
      │
┌─────────────────────────────────────────────────────┐
│             Team                                     │
├─────────────────────────────────────────────────────┤
│ id (PK)                                             │
│ name                                                │
│ projectId (FK → Project)                           │
│ leaderId (FK → User)                               │
│ inviteCode (U)                                      │
│ createdAt                                          │
│                                                     │
│  ┌──────────────────────────────────────────┐     │
│  │        TeamMember (junction)              │     │
│  ├──────────────────────────────────────────┤     │
│  │ teamId (FK → Team)                       │     │
│  │ userId (FK → User)                       │     │
│  │ joinedAt                                  │     │
│  └──────────────────────────────────────────┘     │
│                                                     │
│  ┌──────────────────────────────────────────┐     │
│  │        Task                               │     │
│  ├──────────────────────────────────────────┤     │
│  │ id (PK)                                   │     │
│  │ teamId (FK → Team)                       │     │
│  │ title                                     │     │
│  │ description                               │     │
│  │ status (TODO, IN_PROGRESS, DONE)         │     │
│  │ deadline                                  │     │
│  │ assigneeId (FK → User, nullable)         │     │
│  │ completedAt (nullable)                    │     │
│  │ wasOnTime (boolean, nullable)              │     │
│  │ createdAt                                 │     │
│  └──────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│        PeerReview                         │
├──────────────────────────────────────────┤
│ id (PK)                                  │
│ projectId (FK → Project)                │
│ reviewerId (FK → User)                  │
│ targetUserId (FK → User)                │
│ score (1-5)                             │
│ comment                                 │
│ createdAt                               │
│ @unique [projectId, reviewerId, target] │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│        AIRoadmap                         │
├──────────────────────────────────────────┤
│ id (PK)                                  │
│ projectId (FK → Project, @unique)       │
│ generatedSteps (JSON[])                 │
│ createdAt                               │
│ updatedAt                               │
└──────────────────────────────────────────┘
```

---

## 📋 Таблицы

### User

Пользователь системы (студент, преподаватель, администратор).

| Поле | Тип | Ограничения | Описание |
|------|-----|-----------|---------|
| `id` | UUID | PK | Уникальный идентификатор |
| `email` | String | U, Indexed | Email адрес (уникальный) |
| `fullName` | String | — | Полное имя |
| `password` | String | — | Хэшированный пароль (bcrypt) |
| `role` | Enum | — | STUDENT, TEACHER, ADMIN |
| `skills` | String[] | — | Навыки, разделённые запятой (нормализуются при сохранении) |
| `points` | Int | Default: 0 | Количество очков (за задачи, рецензии) |
| `badges` | String[] | Default: [] | Коды заработанных бейджей |
| `createdAt` | DateTime | Indexed | Время создания |

**Индексы:**
- `email` (unique)
- `createdAt` (для сортировки)

**Примечания:**
- Пароль хэшируется через bcrypt с cost=10
- Навыки хранятся как `String[]` (Prisma scalar list)
- Бейджи: FIRST_TASK, ON_FIRE, TEAM_PLAYER, PROJECT_DONE

---

### Project

Проект (создаётся преподавателем, выполняется командами студентов).

| Поле | Тип | Ограничения | Описание |
|------|-----|-----------|---------|
| `id` | UUID | PK | Уникальный идентификатор |
| `title` | String | — | Название проекта |
| `description` | String | — | Подробное описание |
| `deadline` | DateTime | — | Дедлайн проекта |
| `status` | Enum | Default: ACTIVE | ACTIVE, COMPLETED, ARCHIVED |
| `createdById` | UUID | FK(User) | ID создателя (преподавателя) |
| `requiredSkills` | String[] | Default: [] | Требуемые навыки |
| `createdAt` | DateTime | Indexed | Время создания |

**Индексы:**
- `createdById` (для фильтрации по автору)
- `status` (для фильтрации ACTIVE)
- `createdAt` (для сортировки)

**Связи:**
- `createdBy` → User (один создатель)
- `teams` → Team[] (много команд)
- `reviews` → PeerReview[] (много рецензий)

**Примечания:**
- При переходе в COMPLETED триггер начисляет +20 очков всем участникам
- status = ARCHIVED скрывает проект из списков

---

### Team

Команда студентов для выполнения проекта.

| Поле | Тип | Ограничения | Описание |
|------|-----|-----------|---------|
| `id` | UUID | PK | Уникальный идентификатор |
| `name` | String | — | Название команды |
| `projectId` | UUID | FK(Project), Indexed | ID проекта |
| `leaderId` | UUID | FK(User) | ID лидера команды |
| `inviteCode` | String(8) | U, Indexed | 8-символьный код (алфавит 0-9A-Z) |
| `createdAt` | DateTime | — | Время создания |

**Индексы:**
- `inviteCode` (unique, для быстрого поиска при вступлении)
- `projectId` (для фильтрации по проекту)
- `leaderId` (для поиска команд лидера)

**Связи:**
- `project` → Project (один проект)
- `leader` → User (один лидер)
- `members` → TeamMember[] (много участников)
- `tasks` → Task[] (много задач)

**Примечания:**
- Лидер создаёт команду и не может её покинуть
- inviteCode генерируется случайно и проверяется на уникальность
- При удалении проекта удаляются все его команды (cascade delete)

---

### TeamMember

Вспомогательная таблица для связи User ↔ Team (many-to-many).

| Поле | Тип | Ограничения | Описание |
|------|-----|-----------|---------|
| `teamId` | UUID | FK(Team), PK | ID команды |
| `userId` | UUID | FK(User), PK | ID пользователя |
| `joinedAt` | DateTime | Default: now() | Время присоединения |

**Индексы:**
- `teamId + userId` (composite primary key)
- `userId` (для поиска команд пользователя)

**Примечания:**
- Студент не может быть в двух командах одного проекта (проверяется на application level)
- При удалении команды удаляются все члены (cascade)

---

### Task

Задача в команде (часть разработки проекта).

| Поле | Тип | Ограничения | Описание |
|------|-----|-----------|---------|
| `id` | UUID | PK | Уникальный идентификатор |
| `teamId` | UUID | FK(Team), Indexed | ID команды |
| `title` | String | — | Название задачи |
| `description` | String | — | Подробное описание |
| `status` | Enum | Default: TODO | TODO, IN_PROGRESS, DONE |
| `deadline` | DateTime | Nullable | Дедлайн (может быть не установлен) |
| `assigneeId` | UUID | FK(User), Nullable | ID исполнителя (или никому) |
| `completedAt` | DateTime | Nullable | Время завершения (заполняется при DONE) |
| `wasOnTime` | Boolean | Nullable | true если deadline не превышен |
| `createdAt` | DateTime | Indexed | Время создания |

**Индексы:**
- `teamId` (для фильтрации по команде)
- `assigneeId` (для поиска задач пользователя)
- `status` (для фильтрации)
- `createdAt` (для сортировки)

**Связи:**
- `team` → Team (одна команда)
- `assignee` → User (один исполнитель, может быть null)

**Примечания:**
- При переходе в DONE автоматически заполняются completedAt и wasOnTime
- Повторный PATCH с DONE не перезатирает эти поля
- wasOnTime = completedAt ≤ deadline (если deadline не задан, то true)
- Завершение триггерит gamification (очки и бейджи)

---

### PeerReview

Рецензия одного студента на другого в контексте проекта.

| Поле | Тип | Ограничения | Описание |
|------|-----|-----------|---------|
| `id` | UUID | PK | Уникальный идентификатор |
| `projectId` | UUID | FK(Project), Indexed | ID проекта |
| `reviewerId` | UUID | FK(User) | ID автора рецензии |
| `targetUserId` | UUID | FK(User), Indexed | ID целевого студента |
| `score` | Int | 1-5 | Оценка качества работы |
| `comment` | String | — | Текстовый комментарий |
| `createdAt` | DateTime | Indexed | Время создания |
| `@unique` | — | projectId + reviewerId + targetUserId | Одна рецензия на пару |

**Индексы:**
- `projectId` (для фильтрации по проекту)
- `targetUserId` (для поиска рецензий на пользователя)
- `createdAt` (для сортировки)
- `(projectId, reviewerId, targetUserId)` (unique constraint)

**Связи:**
- `project` → Project
- `reviewer` → User
- `targetUser` → User

**Примечания:**
- Рецензер и целевой должны быть в одной команде проекта
- Одна пара = одна рецензия (нельзя оставить две)
- При создании триггерит gamification (очки целевому + бейдж TEAM_PLAYER)

---

### AIRoadmap

Сгенерированный AI план разработки проекта.

| Поле | Тип | Ограничения | Описание |
|------|-----|-----------|---------|
| `id` | UUID | PK | Уникальный идентификатор |
| `projectId` | UUID | FK(Project), U | ID проекта (unique) |
| `generatedSteps` | JSON[] | — | Массив шагов с title, description, estimatedDays |
| `createdAt` | DateTime | — | Время генерации |
| `updatedAt` | DateTime | — | Время последнего обновления (upsert) |

**Индексы:**
- `projectId` (unique, один план на проект)

**Примечания:**
- При повторной генерации старый план заменяется (upsert)
- JSON структура: `{title: string, description: string, estimatedDays: number}[]`

---

## 🔑 Ограничения целостности

### Unique Constraints
- `User.email` — уникальный email
- `Team.inviteCode` — уникальный код приглашения
- `PeerReview.(projectId, reviewerId, targetUserId)` — одна рецензия на пару
- `AIRoadmap.projectId` — один план на проект

### Foreign Keys (Cascade Delete)
- `Project.createdById` → `User` (delete project → delete все связанные)
- `Team.projectId` → `Project` (delete project → delete все команды)
- `Team.leaderId` → `User` (никогда не удаляем user, но если → мягкое удаление)
- `Task.teamId` → `Team` (delete team → delete все задачи)
- `Task.assigneeId` → `User` (nullable, так что OK)
- `PeerReview.projectId` → `Project`
- `PeerReview.reviewerId` → `User`
- `PeerReview.targetUserId` → `User`
- `AIRoadmap.projectId` → `Project` (delete project → delete план)

---

## 📈 Индексы производительности

| Таблица | Индекс | Тип | Причина |
|---------|--------|-----|---------|
| User | email | Unique | Логин по email |
| User | createdAt | B-tree | Сортировка пользователей |
| Project | createdById | B-tree | Фильтр "мои проекты" |
| Project | status | B-tree | Фильтр ACTIVE проектов |
| Team | inviteCode | Unique | Быстрый поиск при вступлении |
| Team | projectId | B-tree | Список команд проекта |
| Team | leaderId | B-tree | Команды лидера |
| Task | teamId | B-tree | Список задач команды |
| Task | assigneeId | B-tree | Мои задачи |
| Task | status | B-tree | Фильтр по статусу |
| PeerReview | projectId | B-tree | Рецензии проекта |
| PeerReview | targetUserId | B-tree | Рецензии на пользователя |
| AIRoadmap | projectId | Unique | Один план на проект |

---

## 🔄 Транзакции

### Task Completion (PATCH /tasks/:id → DONE)
1. Обновить status, completedAt, wasOnTime
2. Начислить очки (awardForTaskCompletion)
3. Проверить бейджи (checkBadges)
4. Вернуть {task, pointsDelta, newBadges}

**Гарантия:** Атомарность через Prisma транзакцию.

### PeerReview Creation
1. Проверить что оба в одной команде проекта
2. Создать review
3. Начислить очки целевому (awardForGoodReview)
4. Проверить бейдж TEAM_PLAYER
5. Вернуть review

**Гарантия:** Атомарность, но можно закончить частично. На практике OK, т.к. очки = nice-to-have.

### Project Completion (PATCH /projects/:id → COMPLETED)
1. Обновить status
2. Найти всех уникальных участников всех команд проекта
3. Для каждого: awardForProjectFinish (async, неблокирующий)
4. Вернуть проект

**Гарантия:** Project update атомарен, awards async (могут упасть, но логируются).

### ICS Import (POST /import-ics/confirm)
1. Для каждого события: создать Task
2. Все создания в одной транзакции (`$transaction`)
3. Если одна задача упадёт — все откатываются

**Гарантия:** All-or-nothing.

---

## 🔐 Безопасность

### Уровень БД
- Все связи проверяются на application level (Prisma + middleware)
- Нет прямых DELETE-запросов (все через API)
- Пароли хэшируются перед сохранением (никогда не в БД в открытом виде)

### Уровень приложения
- JWT токены для аутентификации
- Проверка ролей (STUDENT, TEACHER, ADMIN)
- Проверка членства в команде (requireTeamMember middleware)
- Валидация входных данных (Zod)

---

## 📊 Примеры запросов

### Получить все задачи пользователя со статусом TODO

```sql
SELECT t.* 
FROM "Task" t
JOIN "Team" tm ON t."teamId" = tm.id
JOIN "TeamMember" member ON tm.id = member."teamId"
WHERE member."userId" = $1 AND t.status = 'TODO'
ORDER BY t.deadline ASC;
```

### Получить топ студентов по очкам в проекте

```sql
SELECT u.id, u."fullName", u.points, COUNT(DISTINCT t.id) as task_count
FROM "User" u
JOIN "TeamMember" member ON u.id = member."userId"
JOIN "Team" team ON member."teamId" = team.id
JOIN "Task" t ON team.id = t."teamId"
WHERE team."projectId" = $1 AND t.status = 'DONE'
GROUP BY u.id
ORDER BY u.points DESC
LIMIT 10;
```

### Получить среднюю оценку за рецензии по проекту

```sql
SELECT "targetUserId", AVG(score) as avg_score, COUNT(*) as review_count
FROM "PeerReview"
WHERE "projectId" = $1
GROUP BY "targetUserId"
ORDER BY avg_score DESC;
```

---

## 📚 Миграции

Все миграции хранятся в `backend/prisma/migrations/`.

### Текущая версия
- Последняя миграция: `init` — полная схема с 7 таблицами

Для новых изменений:
```bash
cd backend
npx prisma migrate dev --name migration_name
```

Prisma автоматически создаст миграцию SQL.

---

## 🔗 Связанные файлы

- `backend/prisma/schema.prisma` — исходная схема (Prisma DSL)
- `backend/README.md` — API документация
- `docs/PROGRESS.md` — история разработки

