'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, CalendarDays, Loader2, ChevronRight } from 'lucide-react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { ApiError } from '../../../types';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMember {
  teamId:   string;
  userId:   string;
  joinedAt: string;
  user: { id: string; fullName: string; email: string };
}

interface TeamMine {
  id:         string;
  name:       string;
  inviteCode: string;
  projectId:  string;
  leaderId:   string;
  createdAt:  string;
  project: { id: string; title: string; deadline: string | null };
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

function MemberAvatars({ members }: { members: TeamMember[] }) {
  const visible = members.slice(0, 5);
  const extra   = members.length - 5;
  const colors  = [
    'bg-primary-100 text-primary-800',
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-amber-100 text-amber-800',
    'bg-purple-100 text-purple-800',
  ];

  return (
    <div className="flex -space-x-2">
      {visible.map((m, i) => (
        <div
          key={m.userId}
          title={m.user.fullName}
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-white text-xs font-semibold ${colors[i % colors.length]}`}
        >
          {m.user.fullName[0].toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-semibold text-gray-600">
          +{extra}
        </div>
      )}
    </div>
  );
}

function TaskProgress({ tasks }: { tasks: { status: string }[] }) {
  const total   = tasks.length;
  const done    = tasks.filter((t) => t.status === 'DONE').length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Задачи</span>
        <span className="font-medium text-gray-700">
          {done}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-primary-800 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ─── Team card ────────────────────────────────────────────────────────────────

function TeamCard({ team, currentUserId }: { team: TeamMine; currentUserId: string }) {
  const isLeader = team.leaderId === currentUserId;

  return (
    <Card padding="md" className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="truncate text-base font-semibold text-gray-900">
              {team.name}
            </h2>
            {isLeader && (
              <Badge variant="warning">Лидер</Badge>
            )}
          </div>
          <Link
            href={`/projects/${team.project.id}`}
            className="mt-0.5 block truncate text-sm text-gray-500 hover:text-primary-800 transition-colors"
          >
            {team.project.title}
          </Link>
        </div>
      </div>

      {/* Deadline */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <CalendarDays className="h-4 w-4 flex-shrink-0 text-gray-400" />
        <span>{formatDate(team.project.deadline)}</span>
      </div>

      {/* Members */}
      <div className="flex items-center gap-3">
        <MemberAvatars members={team.members} />
        <span className="text-xs text-gray-500">
          {team.members.length}{' '}
          {team.members.length === 1 ? 'участник' : team.members.length < 5 ? 'участника' : 'участников'}
        </span>
      </div>

      {/* Task progress */}
      {team.tasks.length > 0 ? (
        <TaskProgress tasks={team.tasks} />
      ) : (
        <p className="text-xs text-gray-400">Задач пока нет</p>
      )}

      {/* Action */}
      <div className="mt-auto pt-1">
        <Link href={`/teams/${team.id}`}>
          <Button variant="secondary" size="sm" className="w-full gap-1.5">
            Открыть команду
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams]     = useState<TeamMine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ teams: TeamMine[] }>('/teams/mine')
      .then(({ data }) => setTeams(data.teams))
      .catch((err) => {
        toast.error(
          err instanceof AxiosError
            ? (err.response?.data as ApiError)?.error ?? 'Ошибка загрузки команд'
            : 'Ошибка загрузки команд',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Мои команды</h1>

      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-20 text-center">
          <Users className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-base font-medium text-gray-500">
            Вы пока не состоите ни в одной команде
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Создайте команду в разделе проектов или присоединитесь по коду приглашения
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} currentUserId={user?.id ?? ''} />
          ))}
        </div>
      )}
    </div>
  );
}
