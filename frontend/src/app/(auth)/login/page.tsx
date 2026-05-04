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

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already authenticated → skip login page
  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login({ email, password });
      // useAuth.login handles toast + redirect
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err.response?.data as ApiError)?.error ?? 'Ошибка входа'
          : 'Ошибка входа';
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Добро пожаловать</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Войдите в свой аккаунт</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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
            placeholder="••••••••"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            size="lg"
            loading={submitting}
            disabled={!email || !password}
            className="mt-2 w-full"
          >
            Войти
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Нет аккаунта?{' '}
          <Link
            href="/register"
            className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-400"
          >
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
