'use client';

import { useEffect, useState } from 'react';
import {
  Trophy,
  CheckCircle2,
  Star,
  Award,
  UserCircle,
  Lock,
} from 'lucide-react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { ApiError, User } from '../../../types';
import { Card, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Badge, RoleBadge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Skeleton } from '../../../components/ui/Skeleton';
import { BADGES } from '../../../lib/badges';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileStats {
  closedTasks:   number;
  averageReview: number;
  reviewCount:   number;
}

interface ProfileResponse {
  user:  User;
  stats: ProfileStats;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon:  React.ElementType;
}) {
  return (
    <Card padding="md" className="flex items-center gap-4">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30">
        <Icon className="h-5 w-5 text-primary-800 dark:text-primary-300" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        <p className="truncate text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, refresh } = useAuth();

  // Stats state
  const [profile, setProfile]           = useState<ProfileResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Profile form state
  const [fullName, setFullName]         = useState('');
  const [skillsInput, setSkillsInput]   = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword]       = useState('');
  const [newPassword, setNewPassword]               = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving]         = useState(false);
  const [passwordError, setPasswordError]           = useState('');

  // Populate form from current user
  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setSkillsInput(user.skills.join(', '));
    }
  }, [user]);

  // Fetch gamification stats
  useEffect(() => {
    api
      .get<ProfileResponse>('/users/me/profile')
      .then(({ data }) => setProfile(data))
      .catch((err) => {
        toast.error(
          err instanceof AxiosError
            ? (err.response?.data as ApiError)?.error ?? 'Ошибка загрузки статистики'
            : 'Ошибка загрузки статистики',
        );
      })
      .finally(() => setStatsLoading(false));
  }, []);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const skills = skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await api.patch('/auth/me', { fullName, skills });
      await refresh();
      toast.success('Профиль обновлён');
    } catch (err) {
      toast.error(
        err instanceof AxiosError
          ? (err.response?.data as ApiError)?.error ?? 'Ошибка сохранения'
          : 'Ошибка сохранения',
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Новый пароль должен содержать минимум 6 символов');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }

    setPasswordSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Пароль изменён');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err.response?.data as ApiError)?.error ?? 'Ошибка смены пароля'
          : 'Ошибка смены пароля';
      toast.error(message);
    } finally {
      setPasswordSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const earnedBadges = new Set(profile?.user.badges ?? user.badges);
  const reviewLabel  =
    profile && profile.stats.reviewCount > 0
      ? profile.stats.averageReview.toFixed(1)
      : '—';

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Мой профиль</h1>

      {/* Identity header */}
      <Card padding="md">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xl font-semibold text-primary-800 dark:bg-primary-900/40 dark:text-primary-300">
            {user.fullName[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold text-gray-900 dark:text-gray-100">{user.fullName}</p>
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
          <RoleBadge role={user.role} />
        </div>

        {user.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {user.skills.map((s) => (
              <Badge key={s} variant="info">{s}</Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Edit forms */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Card 1: Profile info */}
        <Card padding="lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-primary-800 dark:text-primary-300" />
              <CardTitle>Информация</CardTitle>
            </div>
          </CardHeader>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <Input
              label="Email"
              value={user.email}
              disabled
              hint="Email нельзя изменить"
            />
            <Input
              label="Имя"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ваше полное имя"
              required
            />
            <Input
              label="Навыки"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="React, TypeScript, Python"
              hint="Через запятую"
            />
            <Button type="submit" loading={profileSaving} className="w-full">
              Сохранить
            </Button>
          </form>
        </Card>

        {/* Card 2: Change password */}
        <Card padding="lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary-800 dark:text-primary-300" />
              <CardTitle>Сменить пароль</CardTitle>
            </div>
          </CardHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label="Текущий пароль"
              type="password"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); }}
              placeholder="••••••••"
              required
            />
            <Input
              label="Новый пароль"
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
              placeholder="Минимум 6 символов"
              required
            />
            <Input
              label="Подтвердить пароль"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => { setConfirmNewPassword(e.target.value); setPasswordError(''); }}
              placeholder="Повторите новый пароль"
              required
            />
            {passwordError && (
              <p className="text-xs text-red-600 dark:text-red-400">{passwordError}</p>
            )}
            <Button type="submit" loading={passwordSaving} className="w-full">
              Сменить пароль
            </Button>
          </form>
        </Card>
      </div>

      {/* Card 3: Stats — uses GET /api/users/me/profile from gamification module */}
      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} padding="md" className="flex items-center gap-4">
              <Skeleton className="h-11 w-11 flex-shrink-0 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-4 w-28" />
              </div>
            </Card>
          ))}
        </div>
      ) : profile ? (
        <section className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Очков"         value={profile.user.points}       icon={Trophy} />
          <StatTile label="Закрыто задач" value={profile.stats.closedTasks} icon={CheckCircle2} />
          <StatTile
            label={`Средний review (${profile.stats.reviewCount})`}
            value={reviewLabel}
            icon={Star}
          />
        </section>
      ) : null}

      {/* Badges grid */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-primary-800 dark:text-primary-300" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Бейджи</h2>
          <span className="ml-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
            {earnedBadges.size} из {Object.keys(BADGES).length}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(BADGES).map(([code, info]) => {
            const earned = earnedBadges.has(code);
            return (
              <Card
                key={code}
                padding="md"
                className={
                  earned
                    ? 'flex flex-col items-center text-center'
                    : 'flex flex-col items-center text-center opacity-50 grayscale'
                }
              >
                <div className="mb-2 text-4xl" aria-hidden>{info.emoji}</div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{info.name}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{info.description}</p>
                <Badge variant={earned ? 'success' : 'default'} className="mt-3">
                  {earned ? 'Получен' : 'Не получен'}
                </Badge>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
