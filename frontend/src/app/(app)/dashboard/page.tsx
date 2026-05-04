'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FolderOpen,
  Users,
  Plus,
  Calendar,
  ChevronRight,
  Trophy,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../../components/ui/Button';
import { Badge, ProjectStatusBadge, RoleBadge } from '../../../components/ui/Badge';
import { Card, CardHeader, CardTitle } from '../../../components/ui/Card';
import { MatchScoreBar } from '../../../components/MatchScoreBar';
import { ProjectCardSkeleton } from '../../../components/skeletons/ProjectCardSkeleton';
import { TeamCardSkeleton } from '../../../components/skeletons/TeamCardSkeleton';
import { Project, Team, TeamMember, User, ApiError, ProjectRecommendation } from '../../../types';

// ─── Local extended types ─────────────────────────────────────────────────────

interface TeamDetail extends Team {
  members: (TeamMember & { user: Pick<User, 'id' | 'fullName' | 'email' | 'skills'> })[];
}

interface ProjectDetail extends Project {
  teams: TeamDetail[];
}

interface TeamWithContext extends TeamDetail {
  projectTitle: string;
  projectId: string;
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  text,
  action,
}: {
  icon: React.ElementType;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center py-14 text-center">
      <Icon className="mb-3 h-10 w-10 text-gray-300" />
      <p className="mb-4 text-sm text-gray-500">{text}</p>
      {action}
    </Card>
  );
}

function StudentDashboardSkeleton() {
  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 h-6 w-32 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TeamCardSkeleton /><TeamCardSkeleton /><TeamCardSkeleton />
        </div>
      </section>
      <section>
        <div className="mb-4 h-6 w-44 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ProjectCardSkeleton /><ProjectCardSkeleton /><ProjectCardSkeleton />
        </div>
      </section>
    </div>
  );
}

function TeacherDashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
            <div className="h-11 w-11 animate-pulse rounded-xl bg-gray-200 flex-shrink-0" />
            <div className="space-y-1.5">
              <div className="h-7 w-12 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
      <section>
        <div className="mb-4 h-6 w-36 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ProjectCardSkeleton /><ProjectCardSkeleton /><ProjectCardSkeleton />
        </div>
      </section>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const deadline = new Date(project.deadline);
  const overdue = deadline < new Date() && project.status === 'ACTIVE';

  return (
    <Link href={`/projects/${project.id}`} className="block h-full">
      <Card
        padding="md"
        className="group flex h-full cursor-pointer flex-col transition-shadow hover:shadow-md"
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <ProjectStatusBadge status={project.status} />
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-indigo-500" />
        </div>

        <h3 className="mb-1 line-clamp-2 font-semibold text-gray-900">
          {project.title}
        </h3>
        <p className="mb-3 line-clamp-2 flex-1 text-sm text-gray-500">
          {project.description}
        </p>

        <div
          className={`mb-3 flex items-center gap-1.5 text-xs ${overdue ? 'text-red-500' : 'text-gray-400'}`}
        >
          <Calendar className="h-3.5 w-3.5" />
          {deadline.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>

        {project.requiredSkills.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {project.requiredSkills.slice(0, 3).map((s) => (
              <Badge key={s} variant="info">
                {s}
              </Badge>
            ))}
            {project.requiredSkills.length > 3 && (
              <Badge variant="default">+{project.requiredSkills.length - 3}</Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Users className="h-3.5 w-3.5" />
          {project._count?.teams ?? 0} команд
        </div>
      </Card>
    </Link>
  );
}

function TeamCard({ team, userId }: { team: TeamWithContext; userId: string }) {
  const isLeader = team.leaderId === userId;
  const memberCount = team.members?.length ?? 0;

  return (
    <Link href={`/teams/${team.id}`} className="block h-full">
      <Card
        padding="md"
        className="group flex h-full cursor-pointer flex-col transition-shadow hover:shadow-md"
      >
        <CardHeader>
          <CardTitle className="line-clamp-1">{team.name}</CardTitle>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-indigo-500" />
        </CardHeader>

        <p className="mb-3 text-sm text-gray-500 line-clamp-1">{team.projectTitle}</p>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Users className="h-3.5 w-3.5" />
            {memberCount} участников
          </div>
          {isLeader && <Badge variant="purple">Лидер</Badge>}
        </div>

        <div className="mt-3 flex -space-x-2">
          {team.members?.slice(0, 5).map((m) => (
            <div
              key={m.userId}
              title={m.user?.fullName}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-indigo-100 text-xs font-semibold text-indigo-700"
            >
              {m.user?.fullName?.[0] ?? '?'}
            </div>
          ))}
          {memberCount > 5 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs text-gray-500">
              +{memberCount - 5}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

// ─── Student dashboard ────────────────────────────────────────────────────────

function StudentDashboard({ user }: { user: User }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [myTeams, setMyTeams] = useState<TeamWithContext[]>([]);
  const [recommendations, setRecommendations] = useState<ProjectRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [{ data: pd }, { data: recData }] = await Promise.all([
          api.get<{ projects: Project[] }>('/projects'),
          api
            .get<{ recommendations: ProjectRecommendation[] }>('/recommendations/projects')
            .catch(() => ({ data: { recommendations: [] } })),
        ]);

        setProjects(pd.projects);
        // Only show recs with score > 0 (user has matching skills)
        setRecommendations(recData.recommendations.filter((r) => r.score > 0));

        // Parallel fetch of project details to find user's teams
        const details = await Promise.all(
          pd.projects.map((p) =>
            api
              .get<{ project: ProjectDetail }>(`/projects/${p.id}`)
              .then((r) => r.data.project)
              .catch(() => null),
          ),
        );

        const found: TeamWithContext[] = [];
        for (const detail of details) {
          if (!detail) continue;
          for (const team of detail.teams) {
            if (team.members.some((m) => m.userId === user.id)) {
              found.push({ ...team, projectTitle: detail.title, projectId: detail.id });
            }
          }
        }
        setMyTeams(found);
      } catch (err) {
        toast.error(
          err instanceof AxiosError
            ? (err.response?.data as ApiError)?.error ?? 'Ошибка загрузки'
            : 'Ошибка загрузки',
        );
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [user.id]);

  if (loading) return <StudentDashboardSkeleton />;

  return (
    <div className="space-y-10">
      {/* My teams */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Мои команды</h2>
        {myTeams.length === 0 ? (
          <EmptyState
            icon={Users}
            text="Вы пока не состоите ни в одной команде"
            action={
              <Link href="/projects">
                <Button variant="secondary" size="sm">
                  Найти проект
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myTeams.map((t) => (
              <TeamCard key={t.id} team={t} userId={user.id} />
            ))}
          </div>
        )}
      </section>

      {/* Recommended projects */}
      {recommendations.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900">Рекомендуемые проекты</h2>
            <span className="ml-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
              по вашим навыкам
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map(({ project, score, matchedSkills }) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="block h-full">
                <Card
                  padding="md"
                  className="group flex h-full cursor-pointer flex-col transition-shadow hover:shadow-md"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <ProjectStatusBadge status={project.status} />
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-indigo-500" />
                  </div>

                  <h3 className="mb-1 line-clamp-2 font-semibold text-gray-900">
                    {project.title}
                  </h3>
                  <p className="mb-3 line-clamp-2 flex-1 text-sm text-gray-500">
                    {project.description}
                  </p>

                  <div className="mb-3">
                    <p className="mb-1 text-xs text-gray-400">Совпадение навыков</p>
                    <MatchScoreBar score={score} matchedSkills={matchedSkills} />
                  </div>

                  {matchedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {matchedSkills.slice(0, 3).map((s) => (
                        <Badge key={s} variant="success">{s}</Badge>
                      ))}
                      {matchedSkills.length > 3 && (
                        <Badge variant="default">+{matchedSkills.length - 3}</Badge>
                      )}
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Available projects */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Доступные проекты
        </h2>
        {projects.length === 0 ? (
          <EmptyState icon={FolderOpen} text="Активных проектов нет" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Teacher dashboard ────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <Card padding="md" className="flex items-center gap-4">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50">
        <Icon className="h-5 w-5 text-indigo-600" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </Card>
  );
}

function TeacherDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ projects: Project[] }>('/projects')
      .then(({ data }) => setProjects(data.projects))
      .catch(() => toast.error('Ошибка загрузки проектов'))
      .finally(() => setLoading(false));
  }, []);

  const totalTeams = projects.reduce((acc, p) => acc + (p._count?.teams ?? 0), 0);
  const activeCount = projects.filter((p) => p.status === 'ACTIVE').length;

  if (loading) return <TeacherDashboardSkeleton />;

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Всего проектов" value={projects.length} icon={FolderOpen} />
        <StatTile label="Активных" value={activeCount} icon={ClipboardList} />
        <StatTile label="Команд" value={totalTeams} icon={Users} />
      </div>

      {/* Projects */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Мои проекты</h2>
          <Link href="/projects/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Создать проект
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            text="Проектов пока нет"
            action={
              <Link href="/projects/new">
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  Создать первый проект
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const greeting = user.fullName.split(' ')[0];

  const subtitle: Record<string, string> = {
    STUDENT: 'Твои команды и доступные проекты',
    TEACHER: 'Управляй своими проектами и командами',
    ADMIN:   'Обзор всей платформы',
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Привет, {greeting}!</h1>
        <p className="mt-1 text-sm text-gray-500">{subtitle[user.role]}</p>
      </div>

      {user.role === 'STUDENT' && <StudentDashboard user={user} />}
      {(user.role === 'TEACHER' || user.role === 'ADMIN') && <TeacherDashboard />}
    </>
  );
}
