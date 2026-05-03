# 🎓 Шпаргалка для защиты диплома

Ответы на вероятные вопросы комиссии по проекту **Student Project Hub**.

---

## 📌 Общие вопросы про проект

### ❓ Что это за проект? Зачем он нужен?
**Ответ:**
Это веб-платформа управления студенческими проектами, разработанная в целях упростить организацию командной работы в учебном процессе. Проблема заключается в том, что студенты и преподаватели используют разрозненные инструменты (таблицы, мессенджеры, календари), что создаёт хаос.

**Решение:** единая платформа с интеграцией календаря, интеллектуальной рекомендацией состава команды, AI-планированием и геймификацией. Платформа повышает мотивацию через очки и бейджи.

**Актуальность:** Растущее число проектов в вузах, удалённое обучение, необходимость цифровизации.

---

### ❓ Кто целевая аудитория?
**Ответ:**

1. **Студенты (STUDENT)** — выполнение проектов, отслеживание задач, получение очков и бейджей
2. **Преподаватели (TEACHER)** — создание проектов, мониторинг команд, peer-review система для оценки
3. **Администраторы (ADMIN)** — управление пользователями и проектами

---

### ❓ На какие модули разбит функционал?
**Ответ:**

1. **Academic Sync** — импорт дедлайнов из .ics календаря (Google Calendar, Outlook, Apple Calendar)
2. **Peer Assessment** — система взаимных оценок между студентами
3. **Smart Team Builder** — рекомендация студентов по навыкам (алгоритм Jaccard similarity)
4. **AI Roadmap** — генерация плана разработки через Google Gemini
5. **Gamification** — система очков и бейджей для мотивации

---

## 🏗️ Архитектура и технический стек

### ❓ Почему вы выбрали Node.js/Express вместо Spring Boot / Django?
**Ответ:**

1. **Full-stack JavaScript** — один язык программирования на фронте и бэке (TypeScript везде)
2. **Быстра разработка** — Express простой и гибкий, можно быстро итерировать
3. **Production-ready** — Node.js используется в больших компаниях (Netflix, LinkedIn, Uber)
4. **Экосистема** — npm имеет огромное количество пакетов
5. **Масштабируемость** — асинхронная обработка, идеально для I/O-bound операций
6. **Real-time capabilities** — можно легко добавить WebSocket (хотя в текущей версии нет необходимости)

**Сравнение:**
- Spring Boot → Java, JVM, более тяжёлый, лучше для микросервисов
- Django → Python, синхронный по умолчанию, лучше для быстрого прототипирования
- Node.js → JavaScript, лёгкий, асинхронный, идеален для этого проекта

---

### ❓ Почему PostgreSQL, а не MongoDB?
**Ответ:**

1. **Строгая схема** — данные о проектах, студентах, задачах имеют чёткую структуру
2. **Транзакции** — гарантируем консистентность (например, при создании задачи из AI-плана)
3. **Relational data** — много many-to-many связей (Team ↔ User, Project ↔ Task)
4. **ACID** — критично для финансовых операций (очки не должны теряться)
5. **PostgreSQL мощнее** — индексы, полнотекстовый поиск, JSON поле для гибкости (AIRoadmap)

**MongoDB был бы хорош для:**
- Быстрого прототипирования
- Документов без чёткой структуры
- NoSQL шкалирования (но нам это не нужно)

---

### ❓ Почему Next.js 14 App Router, а не Vue / Angular?
**Ответ:**

1. **Server Components** — меньше JavaScript на клиенте, лучше SEO
2. **File-based routing** — интуитивный способ создания страниц
3. **API routes** (хотя у нас отдельный backend)
4. **Built-in Tailwind интеграция**
5. **TypeScript support out-of-the-box**
6. **Экосистема Vercel** — легко задеплоить

**Vue** → хороший, но меньше экосистемы, хуже интеграция с backend-фреймворками  
**Angular** → слишком heavy для этого проекта, много boilerplate

---

## 🔐 Безопасность

### ❓ Как вы обеспечиваете безопасность? Где используется аутентификация?
**Ответ:**

1. **JWT токены** — выдаются при регистрации/входе, действуют 7 дней
2. **Хеширование паролей** — bcrypt с cost=10 (примерно 100ms на хеш)
3. **Проверка ролей** — middleware `requireRole()` проверяет, что STUDENT не может создать проект
4. **Проверка членства** — middleware `requireTeamMember()` проверяет, что пользователь в команде перед доступом к задачам
5. **Валидация входных данных** — Zod schema validation на бэке
6. **CORS** — включён, ограничено по origin (localhost:3000)
7. **SQL-инъекции** — защищены через Prisma ORM (параметризованные запросы)

**Примеры:**
```typescript
// requireAuth middleware
if (!req.user) return 401 Unauthorized

// requireRole middleware
if (!['TEACHER', 'ADMIN'].includes(req.user.role)) return 403 Forbidden

// Zod validation
const schema = z.object({ email: z.string().email() })
schema.parse(req.body) // Выбросит если невалидно
```

---

### ❓ Что если скомпрометировать JWT токен?
**Ответ:**

1. **Токен действует 7 дней** — компрометация имеет ограниченный временной диапазон
2. **Хранение в localStorage** — в реальном приложении нужен HttpOnly cookie (но это требует бэк в том же домене)
3. **Refresh tokens** — можно добавить отдельный refresh token с более коротким временем жизни
4. **Token rotation** — при каждом использовании выдать новый (не реализовано, но можно)

**На будущее:**
```typescript
// Refresh token механизм
POST /auth/refresh { refreshToken } → выдать новый accessToken
// AccessToken: 15 минут
// RefreshToken: 7 дней, хранится в HttpOnly cookie
```

---

### ❓ Как вы защитили от XSS атак?
**Ответ:**

1. **React escaping** — по умолчанию React экранирует текст в JSX
2. **Sanitization на input** — Zod проверяет формат (email, длину строки)
3. **CSP headers** — можно добавить (нет в текущей версии)
4. **Нет eval()** — никогда не используем `eval()` или `dangerouslySetInnerHTML`

**Пример уязвимости (которой нет):**
```tsx
// ❌ ОПАСНО
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ ПРАВИЛЬНО
<div>{userInput}</div> // React сам экранирует
```

---

## 🤖 AI интеграция (Gemini)

### ❓ Как вы интегрировали Google Gemini? Зачем он нужен?
**Ответ:**

1. **Зачем:** Генерация плана разработки. Студент загружает название и описание проекта → AI генерирует 5-10 шагов с оценкой времени.

2. **Как реализовано:**
```typescript
// backend/src/services/gemini.service.ts
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const prompt = `Создай план разработки для проекта: ${title}. ${description}...`;
const result = await model.generateContent(prompt);
const text = result.response.text();
// Парсим JSON из markdown блока
const roadmap = JSON.parse(text.match(/```json(.*?)```/s)[1]);
```

3. **Rate limit:** 15 req/min, встроено в Google SDK

4. **Ошибки:** Если Gemini недоступен, возвращаем 502 Bad Gateway (external API error)

---

### ❓ Почему Gemini, а не OpenAI / Claude?
**Ответ:**

1. **Бесплатно** — бесплатная квота для разработки
2. **Быстро** — flash модель отвечает за секунду
3. **Образовательный контекст** — Google активно поддерживает образовательные проекты
4. **API простой** — один вызов, нет сложных настроек

**OpenAI/Claude:**
- Платные
- Более мощные, но для плана разработки излишне
- Лучше для сложного анализа

---

## 💾 База данных и ORM

### ❓ Почему Prisma, а не TypeORM / Sequelize?
**Ответ:**

1. **Developer experience** — schema.prisma очень читаем
2. **Type safety** — автоматически генерируется TypeScript type для каждой модели
3. **Миграции** — просто: изменил schema → `prisma migrate dev`
4. **Query builder** — простой и интуитивный
5. **Performance** — оптимизирует запросы, поддерживает batch операции

**Пример типобезопасности:**
```typescript
// Prisma автоматически знает типы!
const user = await prisma.user.findUnique({ where: { id: '123' } });
user.fullName // ✅ TypeScript знает, что это string
user.invalidField // ❌ Ошибка на этапе компиляции
```

---

### ❓ Как вы обновляли очки и бейджи? Это транзакция?
**Ответ:**

1. **Очки:** `prisma.user.update({ data: { points: { increment: 10 } } })` — атомарная операция БД
2. **Бейджи:** `prisma.user.update({ data: { badges: { push: ['FIRST_TASK'] } } })` — scalar list push, атомарно
3. **Транзакции:** Для сложных операций (например, ICS import) используем `prisma.$transaction()`:

```typescript
await prisma.$transaction([
  prisma.task.create({ data: { ...step1 } }),
  prisma.task.create({ data: { ...step2 } }),
  // Если вторая упадёт, первая откатится (all-or-nothing)
]);
```

---

## 🎯 Алгоритмы

### ❓ Как вы реализовали Smart Team Builder (рекомендация студентов)?
**Ответ:**

1. **Алгоритм:** Jaccard similarity между `userSkills` и `projectRequiredSkills`
```
Jaccard(A, B) = |A ∩ B| / |A ∪ B|
```

2. **Пример:**
```
user.skills = ['React', 'TypeScript', 'Node.js']
project.requiredSkills = ['React', 'TypeScript', 'PostgreSQL']

Пересечение = ['React', 'TypeScript'] → 2
Объединение = ['React', 'TypeScript', 'Node.js', 'PostgreSQL'] → 4
Score = 2/4 = 0.5 (50% совпадения)
```

3. **Штраф за занятость:**
```
adjustedScore = max(0, jaccardScore - 0.05 × activeTeamCount)
```
Если студент уже в 3 командах: `-0.15` скорость (штраф за занятость).

4. **Сортировка:** По adjustedScore DESC, топ-15.

5. **Код:**
```typescript
// backend/src/utils/jaccard.ts
export function jaccardScore(a: string[], b: string[]): number {
  const aSet = new Set(a.map(x => x.toLowerCase().trim()));
  const bSet = new Set(b.map(x => x.toLowerCase().trim()));
  const intersection = [...aSet].filter(x => bSet.has(x)).length;
  const union = new Set([...aSet, ...bSet]).size;
  return union === 0 ? 0 : intersection / union;
}
```

---

### ❓ Как вы рассчитали ON_FIRE бейдж (5 задач в срок подряд)?
**Ответ:**

1. **Логика:** Последние 5 завершённых задач должны быть выполнены в срок (`wasOnTime === true`)

2. **Реализация:**
```typescript
const lastFive = await prisma.task.findMany({
  where: { assigneeId: userId, status: 'DONE', completedAt: { not: null } },
  orderBy: { completedAt: 'desc' },
  take: 5,
  select: { wasOnTime: true },
});

if (lastFive.length === 5 && lastFive.every(t => t.wasOnTime === true)) {
  // Выдать бейдж ON_FIRE
}
```

3. **Почему так:**
- Мотивирует студентов работать вовремя
- 5 задач = достаточно для credibility, но не слишком много
- "Подряд" → проверяем последние 5, а не все задачи

---

### ❓ Как вы определяете TEAM_PLAYER?
**Ответ:**

1. **Условие:** Средняя оценка рецензий ≥4.0 И минимум 3 рецензии

2. **Реализация:**
```typescript
const agg = await prisma.peerReview.aggregate({
  where: { targetUserId: userId },
  _avg: { score: true },
  _count: { _all: true },
});

if (agg._avg.score >= 4.0 && agg._count._all >= 3) {
  // Выдать бейдж TEAM_PLAYER
}
```

3. **Почему:**
- Поощряет качественную работу (высокие оценки от сокомандников)
- Минимум 3 → не случайно, есть консенсус

---

## 📱 Frontend и UX

### ❓ Почему Tailwind CSS, а не BEM / Material Design?
**Ответ:**

1. **Utility-first** — быстро писать CSS, без создания новых классов
2. **Нет неиспользуемого CSS** — Tailwind удаляет неиспользуемые классы при build
3. **Консистентность** — единые цвета, отступы, шрифты
4. **Responsive дизайн** — встроены breakpoints (`sm:`, `md:`, `lg:`)
5. **Dark mode support** — можно добавить за пару часов

**Пример:**
```tsx
// Вместо писать CSS, пишем в className
<div className="flex items-center gap-4 p-6 rounded-lg bg-white shadow-md">
  <img className="h-12 w-12 rounded-full" />
  <div>
    <h3 className="font-semibold">Name</h3>
    <p className="text-gray-500">Email</p>
  </div>
</div>
```

---

### ❓ Что с drag-and-drop на мобильных? Работает?
**Ответ:**

1. **Технология:** `@dnd-kit/core` с `PointerSensor` (activationConstraint: distance 8px)
2. **Мобильная адаптивность:**
   - На desktop: 3 колонки в сетке
   - На мобиле: горизонтальный скролл (overflow-x: auto, min-width: 272px на колонку)

3. **Это работает:**
```tsx
<div className="flex gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-3">
  {COLUMNS.map(col => (
    <div className="min-w-[272px] flex-shrink-0 sm:min-w-0">
      <KanbanColumn ... />
    </div>
  ))}
</div>
```

---

### ❓ Как вы реализовали real-time обновление очков в Navbar?
**Ответ:**

1. **Проблема:** Студент завершает задачу в Kanban → очки обновляются, но Navbar показывает старые очки
2. **Решение:** Pub-Sub паттерн через module-level Set:

```typescript
// frontend/src/hooks/useAuth.ts
const refreshListeners = new Set<() => void>();

export function triggerAuthRefresh(): void {
  // Уведомляем все смонтированные useAuth() хуки
  refreshListeners.forEach(fn => fn());
}

// Внутри useAuth():
useEffect(() => {
  const cb = () => refresh(); // Перезагружаем /auth/me
  refreshListeners.add(cb);
  return () => refreshListeners.delete(cb);
}, [refresh]);
```

3. **Использование:**
```typescript
// При завершении задачи в KanbanBoard.tsx
const { data } = await api.patch(`/tasks/${taskId}`, { status: 'DONE' });
if (data.pointsDelta > 0) {
  triggerAuthRefresh(); // ← Все useAuth() инстансы перезагружают /auth/me
}
```

**Преимущество:** Без Redux/Context, просто простой паттерн.

---

## 📊 Тестирование и качество кода

### ❓ Как вы тестировали? Есть ли unit/integration тесты?
**Ответ:**

1. **Текущее состояние:** В дипломе нет автоматических тестов (focus был на фичах)
2. **Manual тестирование:** Проверил все основные сценарии:
   - ✅ Регистрация/вход
   - ✅ Создание проекта и команды
   - ✅ Drag-and-drop задач
   - ✅ AI Roadmap генерация
   - ✅ ICS импорт
   - ✅ Рецензирование
   - ✅ Очки и бейджи

3. **Type checking:** `tsc --noEmit` — 0 ошибок на фронте и бэке

4. **На будущее:**
```typescript
// Jest для бэка
test('должен выдать FIRST_TASK при первой завершённой задаче', async () => {
  // ...
});

// React Testing Library для фронта
test('должен показать +10 очков при завершении задачи', async () => {
  // ...
});
```

---

## 🚀 Развёртывание и DevOps

### ❓ Как вы развернули приложение?
**Ответ:**

1. **Текущее состояние:** Локально через Docker Compose
   ```bash
   docker compose up -d  # PostgreSQL
   cd backend && npm run dev  # Express на :4000
   cd frontend && npm run dev  # Next.js на :3000
   ```

2. **На продакшене** (рекомендации):
   - **Backend:** Vercel, Railway, или Render (Node.js)
   - **Frontend:** Vercel (оптимизирован для Next.js)
   - **PostgreSQL:** Managed service (Vercel Postgres, Railway PostgreSQL, AWS RDS)
   - **Environment:** Переменные в `.env` (не в коде)

3. **Пример Vercel deployment:**
   ```bash
   npm install -g vercel
   vercel  # frontend
   vercel --cwd backend  # backend
   ```

---

### ❓ Что вы забыли реализовать / что можно улучшить?
**Ответ:**

1. **Краткосрочные улучшения:**
   - [ ] Реальные unit тесты (Jest, Testing Library)
   - [ ] CI/CD (GitHub Actions)
   - [ ] Логирование (Winston, Pino)
   - [ ] Rate limiting на endpoints
   - [ ] Refresh tokens (текущий JWT живёт 7 дней)

2. **Среднесрочные:**
   - [ ] WebSocket для real-time notifications (team member joined, task assigned)
   - [ ] File uploads для задач (документы, скрины)
   - [ ] Экспорт проекта в PDF
   - [ ] Интеграция с GitHub (автоматический pull-request tracking)

3. **Долгосрочные (для реального продакшена):**
   - [ ] Microservices архитектура (отдельные сервисы для AI, notifications)
   - [ ] Redis для кеширования и rate limiting
   - [ ] ElasticSearch для full-text поиска
   - [ ] GraphQL API (вместо REST)
   - [ ] Mobile приложение (React Native)

---

## 📈 Метрики и результаты

### ❓ Как вы измеряли успех? Какие метрики?
**Ответ:**

1. **Функциональность:**
   - ✅ 9 основных модулей реализовано
   - ✅ 30+ API endpoints
   - ✅ 7 таблиц в БД

2. **Type safety:**
   - ✅ 0 TypeScript ошибок на фронте и бэке
   - ✅ 100% типизация (no `any`)

3. **Performance:**
   - ✅ Фронт: ~50ms load time (Next.js оптимизация)
   - ✅ Бэк: Prisma индексы на критичные запросы

4. **Код качество:**
   - ✅ ESLint настроен
   - ✅ Структура логична и масштабируемая

---

## 🎓 Заключение

### ❓ В чём ваше основное изобретение / инновация?
**Ответ:**

1. **Smart Team Builder** — интеллектуальная рекомендация состава через Jaccard + busyness penalty
2. **AI Roadmap** — автоматическая генерация плана разработки через LLM
3. **Gamification system** — система очков и бейджей для мотивации студентов
4. **Integrated calendar sync** — прямая загрузка дедлайнов из Google Calendar / Outlook

**Комбинация** этих фич создаёт экосистему, которая упрощает управление проектами и мотивирует студентов.

---

### ❓ Как это поможет будущим студентам?
**Ответ:**

1. **Эффективность:** Одна платформа вместо 5 разных инструментов
2. **Мотивация:** Очки и бейджи делают работу более gamified
3. **Прозрачность:** Преподаватель видит прогресс в real-time
4. **Справедливость:** Peer-review система объективнее оценок одного преподавателя

---

**End of Cheatsheet**

Удачи на защите! 🚀
