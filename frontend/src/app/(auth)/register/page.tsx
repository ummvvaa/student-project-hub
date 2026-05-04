'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuth } from '../../../hooks/useAuth';
import { ApiError } from '../../../types';

type RegisterRole = 'STUDENT' | 'TEACHER';

export default function RegisterPage() {
  const { register, user, loading } = useAuth();
  const router = useRouter();

  const [fullName, setFullName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [role, setRole]           = useState<RegisterRole>('STUDENT');
  const [skillsRaw, setSkillsRaw] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов');
      return;
    }

    const skills = skillsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      await register({ fullName, email, password, role, skills });
      // useAuth.register handles toast + redirect
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err.response?.data as ApiError)?.error ?? 'Ошибка регистрации'
          : 'Ошибка регистрации';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl bg-white px-8 py-10 shadow-xl shadow-gray-200/60 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 dark:shadow-none">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Создать аккаунт</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Присоединяйтесь к платформе
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Полное имя"
            type="text"
            placeholder="Иван Иванов"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@university.edu"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Пароль"
            type="password"
            placeholder="Минимум 6 символов"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Role picker */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Роль</legend>
            <div className="grid grid-cols-2 gap-3">
              {(['STUDENT', 'TEACHER'] as RegisterRole[]).map((r) => (
                <label
                  key={r}
                  className={[
                    'flex cursor-pointer items-center justify-center rounded-lg border-2 px-4 py-3',
                    'text-sm font-medium transition-colors',
                    role === r
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-300'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-700/40',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="sr-only"
                  />
                  {r === 'STUDENT' ? '🎓 Студент' : '👨‍🏫 Преподаватель'}
                </label>
              ))}
            </div>
          </fieldset>

          <Input
            label="Навыки"
            type="text"
            placeholder="React, TypeScript, PostgreSQL"
            hint="Введите через запятую (необязательно)"
            value={skillsRaw}
            onChange={(e) => setSkillsRaw(e.target.value)}
          />

          <Button
            type="submit"
            size="lg"
            loading={submitting}
            disabled={!fullName || !email || !password}
            className="mt-2 w-full"
          >
            Зарегистрироваться
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Уже есть аккаунт?{' '}
          <Link
            href="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-400"
          >
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
