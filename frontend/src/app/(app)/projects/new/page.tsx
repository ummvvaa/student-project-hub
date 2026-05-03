'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import api from '../../../../lib/api';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Textarea } from '../../../../components/ui/Textarea';
import { Card } from '../../../../components/ui/Card';
import { ApiError } from '../../../../types';

const TODAY = new Date().toISOString().split('T')[0];

export default function NewProjectPage() {
  const router = useRouter();

  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline]     = useState('');
  const [skillsRaw, setSkillsRaw]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!deadline) {
      toast.error('Укажите дедлайн');
      return;
    }

    const requiredSkills = skillsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      await api.post('/projects', {
        title,
        description,
        // date input gives "YYYY-MM-DD" — convert to end-of-day ISO string
        deadline: new Date(`${deadline}T23:59:59.000Z`).toISOString(),
        requiredSkills,
      });

      toast.success('Проект создан!');
      router.push('/dashboard');
    } catch (err) {
      toast.error(
        err instanceof AxiosError
          ? (err.response?.data as ApiError)?.error ?? 'Ошибка создания проекта'
          : 'Ошибка создания проекта',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = title.trim() && description.trim() && deadline;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к Dashboard
      </Link>

      <Card padding="lg">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Новый проект</h1>
          <p className="mt-1 text-sm text-gray-500">
            Заполните информацию о проекте. Студенты смогут найти его и вступить в команды.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <Input
            label="Название проекта"
            placeholder="Например: Система управления студенческими проектами"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Textarea
            label="Описание"
            placeholder="Опишите цели проекта, задачи, ожидаемые результаты..."
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Input
            label="Дедлайн"
            type="date"
            min={TODAY}
            required
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />

          <Input
            label="Требуемые навыки"
            placeholder="React, TypeScript, PostgreSQL"
            hint="Перечислите через запятую — поможет студентам найти подходящий проект"
            value={skillsRaw}
            onChange={(e) => setSkillsRaw(e.target.value)}
          />

          {/* Divider */}
          <hr className="border-gray-200" />

          <div className="flex items-center justify-end gap-3">
            <Link href="/dashboard">
              <Button type="button" variant="secondary">
                Отмена
              </Button>
            </Link>
            <Button
              type="submit"
              loading={submitting}
              disabled={!canSubmit}
            >
              Создать проект
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
