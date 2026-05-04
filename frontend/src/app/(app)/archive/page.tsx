'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Archive, CalendarDays, ChevronRight } from 'lucide-react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { ApiError } from '../../../types';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { TeamCardSkeleton } from '../../../components/skeletons/TeamCardSkeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMember {
  teamId:   string;
  userId:   string;
  joinedAt: string;
  user: { id: string; fullName: string; email: string };
}

interface TeamArchive {
  id:         string;
  name:       string;
  projectId:  string;
  leaderId:   string;
  createdAt:  string;
  project: { id: string; title: string; deadline: string | null; status: string };
  leader:  { id: string; fullName: string };
  members: TeamMember[];
  tasks:   { status: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return 'Без дедлайна';
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'COMPLETED') {
    return <Badge variant="success">✓ Завершён</Badge>;
  }
  return <Badge variant="default">📦 В архиве</Badge>;
}

function MemberAvatars({ members }: { members: TeamMember[] }) {
  const visible = members.slice(0, 5);
  const extra   = members.length - 5;

  return (
    <div className="flex -space-x-2">
      {visible.map((m) => (
        <div
          key={m.userId}
          title={m.user.fullName}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-semibold text-gray-600"
        >
          {m.user.fullName[0].toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-semibold text-gray-500">
          +{extra}
        </div>
      )}
    </div>
  );
}

function TaskSummary({ tasks }: { tasks: { status: string }[] }) {
  const total = tasks.length;
  const done  = tasks.filter((t) => t.status === 'DONE').length;

  if (total === 0) return <p className="text-xs text-gray-400">Задач не было</p>;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Выполнено задач</span>
        <span className="font-medium">{done}/{total}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gray-400 transition-all duration-300"
          style={{ width: total > 0 ? `${Math.round((done / total) * 100)}%` : '0%' }}
        />
      </div>
    </div>
  );
}

// ─── Archive card ─────────────────────────────────────────────────────────────

function ArchiveCard({ team, currentUserId }: { team: TeamArchive; currentUserId: string }) {
  const isLeader = team.leaderId === currentUserId;

  return (
    <Card padding="md" className="flex flex-col gap-4 opacity-90">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="truncate text-base font-semibold text-gray-700">
              {team.name}
            </h2>
            {isLeader && <Badge variant="default">Лидер</Badge>}
          </div>
          <Link
            href={`/projects/${team.project.id}`}
            className="mt-0.5 block truncate text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            {team.project.title}
          </Link>
        </div>
        <div className="flex-shrink-0">
          <StatusBadge status={team.project.status} />
        </div>
      </div>

      {/* Deadline */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400">
        <CalendarDays className="h-4 w-4 flex-shrink-0" />
        <span>{formatDate(team.project.deadline)}</span>
      </div>

      {/* Members */}
      <div className="flex items-center gap-3">
        <MemberAvatars members={team.members} />
        <span className="text-xs text-gray-400">
          {team.members.length}{' '}
          {team.members.length === 1 ? 'участник' : team.members.length < 5 ? 'участника' : 'участников'}
        </span>
      </div>

      {/* Task summary */}
      <TaskSummary tasks={team.tasks} />

      {/* Action */}
      <div className="mt-auto pt-1">
        <Link href={`/teams/${team.id}`}>
          <Button variant="secondary" size="sm" className="w-full gap-1.5 text-gray-500">
            Просмотреть
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ArchivePage() {
  const { user } = useAuth();
  const [teams, setTeams]     = useState<TeamArchive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ teams: TeamArchive[] }>('/teams/archive')
      .then(({ data }) => setTeams(data.teams))
      .catch((err) => {
        toast.error(
          err instanceof AxiosError
            ? (err.response?.data as ApiError)?.error ?? 'Ошибка загрузки архива'
            : 'Ошибка загрузки архива',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-1 h-4 w-64 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TeamCardSkeleton /><TeamCardSkeleton /><TeamCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Архив проектов</h1>
        <p className="mt-1 text-sm text-gray-500">
          Завершённые и архивированные проекты ваших команд
        </p>
      </div>

      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-20 text-center">
          <Archive className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-base font-medium text-gray-500">В архиве пока пусто</p>
          <p className="mt-1 text-sm text-gray-400">
            Здесь появятся завершённые и архивированные проекты
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <ArchiveCard key={team.id} team={team} currentUserId={user?.id ?? ''} />
          ))}
        </div>
      )}
    </div>
  );
}
