'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronRight,
  Users,
  Loader2,
  LogOut,
  UserMinus,
  Crown,
  Sparkles,
} from 'lucide-react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import api from '../../../../lib/api';
import { useAuth } from '../../../../hooks/useAuth';
import { Team, TeamMember, Task, TaskStatus, User, ApiError } from '../../../../types';
import { Button } from '../../../../components/ui/Button';
import { Badge, RoleBadge } from '../../../../components/ui/Badge';
import { Card } from '../../../../components/ui/Card';
import { KanbanBoard } from '../../../../components/KanbanBoard';
import { TaskModal } from '../../../../components/TaskModal';
import { AIRoadmapModal } from '../../../../components/AIRoadmapModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamDetail extends Team {
  members: (TeamMember & { user: Pick<User, 'id' | 'fullName' | 'email' | 'skills'> })[];
  tasks: Task[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Task modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addStatus, setAddStatus] = useState<TaskStatus>('TODO');

  // AI roadmap modal
  const [roadmapOpen, setRoadmapOpen] = useState(false);

  async function load() {
    try {
      const { data } = await api.get<{ team: TeamDetail }>(`/teams/${id}`);
      setTeam(data.team);
      setTasks(data.team.tasks ?? []);
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
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!team || !user) return null;

  const isLeader = team.leaderId === user.id;
  const isMember = team.members.some((m) => m.userId === user.id);

  function openAddTask(status: TaskStatus) {
    setEditingTask(null);
    setAddStatus(status);
    setModalOpen(true);
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  function handleTaskSaved(saved: Task) {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
  }

  async function handleLeave() {
    if (!confirm('Покинуть команду?')) return;
    try {
      await api.delete(`/teams/${id}/members/me`);
      toast.success('Вы покинули команду');
      router.push(`/projects/${team!.projectId}`);
    } catch (err) {
      toast.error(
        err instanceof AxiosError
          ? (err.response?.data as ApiError)?.error ?? 'Ошибка'
          : 'Ошибка',
      );
    }
  }

  async function handleKick(memberId: string, memberName: string) {
    if (!confirm(`Исключить ${memberName}?`)) return;
    try {
      await api.delete(`/teams/${id}/members/${memberId}`);
      setTeam((t) =>
        t ? { ...t, members: t.members.filter((m) => m.userId !== memberId) } : t,
      );
      toast.success('Участник исключён');
    } catch (err) {
      toast.error(
        err instanceof AxiosError
          ? (err.response?.data as ApiError)?.error ?? 'Ошибка'
          : 'Ошибка',
      );
    }
  }

  return (
    <>
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumbs */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500">
          <Link href="/dashboard" className="hover:text-gray-800 transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <Link
            href={`/projects/${team.projectId}`}
            className="hover:text-gray-800 transition-colors line-clamp-1 max-w-[180px]"
          >
            {team.project?.title ?? 'Проект'}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="font-medium text-gray-900 line-clamp-1 max-w-[180px]">
            {team.name}
          </span>
        </nav>

        {/* Team header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {team.members.length} участников · {tasks.length} задач
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isMember && (
              <Button variant="secondary" size="sm" onClick={() => setRoadmapOpen(true)}>
                <Sparkles className="h-4 w-4" />
                AI-план
              </Button>
            )}
            {isMember && !isLeader && (
              <Button variant="danger" size="sm" onClick={handleLeave}>
                <LogOut className="h-4 w-4" />
                Покинуть команду
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
          {/* Members sidebar */}
          <aside>
            <Card padding="md">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-900">Участники</h2>
              </div>
              <ul className="space-y-3">
                {team.members.map((m) => {
                  const isThisLeader = m.userId === team.leaderId;
                  const isMe = m.userId === user.id;
                  return (
                    <li
                      key={m.userId}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                          {m.user?.fullName?.[0] ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {m.user?.fullName ?? 'Неизвестно'}
                            {isMe && (
                              <span className="ml-1 text-xs text-gray-400">(вы)</span>
                            )}
                          </p>
                          {isThisLeader && (
                            <div className="flex items-center gap-1 text-xs text-amber-600">
                              <Crown className="h-3 w-3" />
                              Лидер
                            </div>
                          )}
                        </div>
                      </div>
                      {isLeader && !isMe && (
                        <button
                          onClick={() =>
                            handleKick(m.userId, m.user?.fullName ?? 'участника')
                          }
                          className="flex-shrink-0 rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Исключить"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>

              {isLeader && (
                <div className="mt-4 rounded-lg bg-indigo-50 p-3">
                  <p className="mb-1 text-xs font-medium text-indigo-700">
                    Код приглашения
                  </p>
                  <p className="font-mono text-base font-bold tracking-widest text-indigo-900">
                    {team.inviteCode}
                  </p>
                </div>
              )}

              {team.members[0]?.user?.skills &&
                team.members.flatMap((m) => m.user?.skills ?? []).length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-gray-500">
                      Навыки команды
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(
                        new Set(team.members.flatMap((m) => m.user?.skills ?? [])),
                      ).map((skill) => (
                        <Badge key={skill} variant="info">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </Card>
          </aside>

          {/* Kanban board */}
          <div>
            <KanbanBoard
              tasks={tasks}
              onTasksChange={setTasks}
              onAddTask={openAddTask}
              onEditTask={openEditTask}
            />
          </div>
        </div>
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        teamId={id}
        members={team.members}
        task={editingTask}
        initialStatus={addStatus}
        onSaved={handleTaskSaved}
      />

      <AIRoadmapModal
        open={roadmapOpen}
        onClose={() => setRoadmapOpen(false)}
        projectId={team.projectId}
        teamId={id}
        members={team.members}
        onTasksImported={(newTasks) => setTasks((prev) => [...prev, ...newTasks])}
      />
    </>
  );
}
