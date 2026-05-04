'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronRight,
  Calendar,
  CalendarDays,
  Users,
  Copy,
  Check,
  Plus,
  Loader2,
  Lock,
  UserSearch,
} from 'lucide-react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import api from '../../../../lib/api';
import { useAuth } from '../../../../hooks/useAuth';
import { Project, Team, TeamMember, User, ApiError, StudentSuggestion } from '../../../../types';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Badge, ProjectStatusBadge } from '../../../../components/ui/Badge';
import { Card, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Modal } from '../../../../components/ui/Modal';
import { MatchScoreBar } from '../../../../components/MatchScoreBar';
import { ProjectCardSkeleton } from '../../../../components/skeletons/ProjectCardSkeleton';
import { TeamCardSkeleton } from '../../../../components/skeletons/TeamCardSkeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamDetail extends Team {
  members: (TeamMember & { user: Pick<User, 'id' | 'fullName' | 'email' | 'skills'> })[];
  _count?: { tasks: number };
}

interface ProjectDetail extends Project {
  teams: TeamDetail[];
}

// ─── InviteCode display ───────────────────────────────────────────────────────

function InviteCodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-mono font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
      title="Скопировать код приглашения"
    >
      {code}
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Team card ────────────────────────────────────────────────────────────────

function TeamCard({
  team,
  userId,
}: {
  team: TeamDetail;
  userId: string;
}) {
  const isLeader = team.leaderId === userId;

  return (
    <Link href={`/teams/${team.id}`} className="block">
      <Card
        padding="md"
        className="group cursor-pointer transition-shadow hover:shadow-md"
      >
        <CardHeader>
          <CardTitle className="line-clamp-1">{team.name}</CardTitle>
          {isLeader && <InviteCodeBadge code={team.inviteCode} />}
        </CardHeader>

        <div className="mt-2 flex items-center gap-3">
          <div className="flex -space-x-2">
            {team.members.slice(0, 5).map((m) => (
              <div
                key={m.userId}
                title={m.user?.fullName}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-indigo-100 text-xs font-semibold text-indigo-700"
              >
                {m.user?.fullName?.[0] ?? '?'}
              </div>
            ))}
          </div>
          <span className="text-xs text-gray-500">
            {team.members.length} участников
          </span>
          {team._count && (
            <span className="text-xs text-gray-400">
              {team._count.tasks} задач
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function CreateTeamModal({
  open,
  onClose,
  projectId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onCreated: (team: TeamDetail) => void;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) { toast.error('Введите название команды'); return; }
    setSaving(true);
    try {
      const { data } = await api.post<{ team: TeamDetail }>(`/projects/${projectId}/teams`, { name: name.trim() });
      toast.success('Команда создана!');
      onCreated(data.team);
      onClose();
    } catch (err) {
      toast.error(
        err instanceof AxiosError
          ? (err.response?.data as ApiError)?.error ?? 'Ошибка создания команды'
          : 'Ошибка создания команды',
      );
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { if (!open) setName(''); }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Создать команду">
      <div className="flex flex-col gap-4">
        <Input
          label="Название команды"
          placeholder="Например: Команда А"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSubmit} loading={saving}>Создать</Button>
        </div>
      </div>
    </Modal>
  );
}

function JoinTeamModal({
  open,
  onClose,
  onJoined,
}: {
  open: boolean;
  onClose: () => void;
  onJoined: () => void;
}) {
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleJoin() {
    if (!code.trim()) { toast.error('Введите код приглашения'); return; }
    setSaving(true);
    try {
      await api.post('/teams/join', { inviteCode: code.trim().toUpperCase() });
      toast.success('Вы вступили в команду!');
      onJoined();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof AxiosError
          ? (err.response?.data as ApiError)?.error ?? 'Неверный код или ошибка'
          : 'Неверный код или ошибка',
      );
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { if (!open) setCode(''); }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Вступить в команду">
      <div className="flex flex-col gap-4">
        <Input
          label="Код приглашения"
          placeholder="XXXXXXXX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
        />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button onClick={handleJoin} loading={saving}>Вступить</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'teams' | 'students'>('teams');
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsFetched, setSuggestionsFetched] = useState(false);

  async function load() {
    try {
      const { data } = await api.get<{ project: ProjectDetail }>(`/projects/${id}`);
      setProject(data.project);
    } catch (err) {
      toast.error(
        err instanceof AxiosError
          ? (err.response?.data as ApiError)?.error ?? 'Ошибка загрузки'
          : 'Ошибка загрузки',
      );
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <ProjectCardSkeleton />
        <div className="grid gap-4 sm:grid-cols-2">
          <TeamCardSkeleton /><TeamCardSkeleton />
        </div>
      </div>
    );
  }

  if (!project || !user) return null;

  const deadline = new Date(project.deadline);
  const overdue = deadline < new Date() && project.status === 'ACTIVE';
  const isOwner = user.role === 'ADMIN' || project.createdById === user.id;
  const isStudent = user.role === 'STUDENT';
  const isMemberAnywhere = project.teams.some((t) =>
    t.members.some((m) => m.userId === user.id),
  );

  async function handleStudentsTab() {
    setActiveTab('students');
    if (suggestionsFetched) return;
    setSuggestionsLoading(true);
    try {
      const { data } = await api.get<{ suggestions: StudentSuggestion[] }>(
        `/recommendations/projects/${id}/students`,
      );
      setSuggestions(data.suggestions);
      setSuggestionsFetched(true);
    } catch (err) {
      toast.error(
        err instanceof AxiosError
          ? (err.response?.data as ApiError)?.error ?? 'Ошибка загрузки'
          : 'Ошибка загрузки',
      );
    } finally {
      setSuggestionsLoading(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-4xl">
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500">
          <Link href="/dashboard" className="hover:text-gray-800 transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="font-medium text-gray-900 line-clamp-1 max-w-[260px]">
            {project.title}
          </span>
        </nav>

        {/* Project header */}
        <Card padding="lg" className="mb-6">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <ProjectStatusBadge status={project.status} />
            {isOwner && (
              <div className="flex flex-wrap gap-2">
                <Link href={`/projects/${id}/import`}>
                  <Button size="sm" variant="secondary">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Импорт из календаря
                  </Button>
                </Link>
                {project.status === 'ACTIVE' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await api.patch(`/projects/${id}/status`, { status: 'COMPLETED' });
                        setProject((p) => p ? { ...p, status: 'COMPLETED' } : p);
                        toast.success('Проект завершён');
                      } catch { toast.error('Ошибка'); }
                    }}
                  >
                    Завершить
                  </Button>
                )}
                {(project.status === 'COMPLETED' || project.status === 'ARCHIVED') && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await api.patch(`/projects/${id}/status`, { status: 'ACTIVE' });
                        setProject((p) => p ? { ...p, status: 'ACTIVE' } : p);
                        toast.success('Проект восстановлен');
                      } catch { toast.error('Ошибка'); }
                    }}
                  >
                    Восстановить
                  </Button>
                )}
                {project.status !== 'ARCHIVED' && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      try {
                        await api.patch(`/projects/${id}/status`, { status: 'ARCHIVED' });
                        setProject((p) => p ? { ...p, status: 'ARCHIVED' } : p);
                        toast.success('Проект архивирован');
                      } catch { toast.error('Ошибка'); }
                    }}
                  >
                    В архив
                  </Button>
                )}
              </div>
            )}
          </div>

          <h1 className="mb-2 text-2xl font-bold text-gray-900">{project.title}</h1>
          <p className="mb-4 text-sm text-gray-600">{project.description}</p>

          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <div className={`flex items-center gap-1.5 ${overdue ? 'text-red-500' : ''}`}>
              <Calendar className="h-4 w-4" />
              {deadline.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {overdue && ' — просрочено'}
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {project.teams.length} команд
            </div>
          </div>

          {project.requiredSkills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {project.requiredSkills.map((s) => (
                <Badge key={s} variant="info">{s}</Badge>
              ))}
            </div>
          )}
        </Card>

        {/* Tab bar — only for owner */}
        {isOwner && (
          <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'teams'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-4 w-4" />
              Команды ({project.teams.length})
            </button>
            <button
              onClick={handleStudentsTab}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'students'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserSearch className="h-4 w-4" />
              Подобрать состав
            </button>
          </div>
        )}

        {/* Teams tab */}
        {activeTab === 'teams' && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              {!isOwner && (
                <h2 className="text-lg font-semibold text-gray-900">
                  Команды ({project.teams.length})
                </h2>
              )}
              {isStudent && project.status === 'ACTIVE' && (
                <div className="flex gap-2 ml-auto">
                  {!isMemberAnywhere && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setJoinOpen(true)}>
                        <Lock className="h-3.5 w-3.5" />
                        Вступить по коду
                      </Button>
                      <Button size="sm" onClick={() => setCreateOpen(true)}>
                        <Plus className="h-3.5 w-3.5" />
                        Создать команду
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {project.teams.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-14 text-center">
                <Users className="mb-3 h-10 w-10 text-gray-300" />
                <p className="mb-4 text-sm text-gray-500">Команд пока нет</p>
                {isStudent && project.status === 'ACTIVE' && !isMemberAnywhere && (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Создать первую команду
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {project.teams.map((team) => (
                  <TeamCard key={team.id} team={team} userId={user.id} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Students suggestion tab */}
        {activeTab === 'students' && (
          <section>
            {suggestionsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
              </div>
            ) : suggestions.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-14 text-center">
                <UserSearch className="mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500">
                  Студентов с подходящими навыками не найдено
                </p>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {suggestions.map(({ user: s, score, matchedSkills, activeTeamCount, adjustedScore }) => (
                  <Card key={s.id} padding="md" className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {/* Avatar + name */}
                    <div className="flex items-center gap-3 sm:w-48">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                        {s.fullName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{s.fullName}</p>
                        <p className="truncate text-xs text-gray-400">{s.email}</p>
                      </div>
                    </div>

                    {/* Match bar */}
                    <div className="flex-1">
                      <p className="mb-1 text-xs text-gray-400">
                        Совпадение{activeTeamCount > 0 ? ` · ${activeTeamCount} активных команд` : ''}
                      </p>
                      <MatchScoreBar score={adjustedScore} matchedSkills={matchedSkills} />
                    </div>

                    {/* Matched skills */}
                    <div className="flex flex-wrap gap-1 sm:w-56 sm:justify-end">
                      {matchedSkills.length > 0 ? (
                        matchedSkills.slice(0, 4).map((sk) => (
                          <Badge key={sk} variant="success">{sk}</Badge>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">нет совпадений</span>
                      )}
                      {matchedSkills.length > 4 && (
                        <Badge variant="default">+{matchedSkills.length - 4}</Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <CreateTeamModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={id}
        onCreated={(team) => {
          setProject((p) => p ? { ...p, teams: [...p.teams, team] } : p);
        }}
      />

      <JoinTeamModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={load}
      />
    </>
  );
}
