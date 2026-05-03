'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  Upload,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import api from '../../../../../lib/api';
import { useAuth } from '../../../../../hooks/useAuth';
import { Project, Team, TeamMember, User, ApiError, Task } from '../../../../../types';
import { Button } from '../../../../../components/ui/Button';
import { Card } from '../../../../../components/ui/Card';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedEvent {
  uid: string;
  title: string;
  description: string;
  start: string;
  end: string | null;
}

interface TeamDetail extends Team {
  members: (TeamMember & { user: Pick<User, 'id' | 'fullName' | 'email' | 'skills'> })[];
}

interface ProjectDetail extends Project {
  teams: TeamDetail[];
}

type Step = 'upload' | 'review' | 'done';

const STEPS: Step[] = ['upload', 'review', 'done'];
const STEP_LABELS: Record<Step, string> = {
  upload: 'Загрузить файл',
  review: 'Выбрать события',
  done:   'Готово',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportIcsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('upload');
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);

  // Step 1
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [teamId, setTeamId] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Step 3
  const [createdCount, setCreatedCount] = useState(0);

  useEffect(() => {
    api
      .get<{ project: ProjectDetail }>(`/projects/${id}`)
      .then(({ data }) => {
        setProject(data.project);
        if (data.project.teams.length > 0) {
          setTeamId(data.project.teams[0].id);
        }
      })
      .catch(() => {
        toast.error('Ошибка загрузки проекта');
        router.push(`/projects/${id}`);
      })
      .finally(() => setProjectLoading(false));
  }, [id, router]);

  async function handleUpload() {
    if (!file) { toast.error('Выберите .ics файл'); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<{ events: ParsedEvent[] }>(
        `/projects/${id}/import-ics`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setEvents(data.events);
      setSelected(new Set(data.events.map((e) => e.uid)));
      setStep('review');
    } catch (err) {
      toast.error(
        err instanceof AxiosError
          ? (err.response?.data as ApiError)?.error ?? 'Ошибка загрузки файла'
          : 'Ошибка загрузки файла',
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirm() {
    if (selected.size === 0) { toast.error('Выберите хотя бы одно событие'); return; }
    if (!teamId) { toast.error('Выберите команду'); return; }

    const chosenEvents = events
      .filter((e) => selected.has(e.uid))
      .map(({ title, description, start }) => ({ title, description, start }));

    setConfirming(true);
    try {
      const { data } = await api.post<{ tasks: Task[] }>(
        `/projects/${id}/import-ics/confirm`,
        { teamId, events: chosenEvents },
      );
      setCreatedCount(data.tasks.length);
      toast.success(`Создано ${data.tasks.length} задач из календаря`);
      setStep('done');
    } catch (err) {
      toast.error(
        err instanceof AxiosError
          ? (err.response?.data as ApiError)?.error ?? 'Ошибка импорта'
          : 'Ошибка импорта',
      );
    } finally {
      setConfirming(false);
    }
  }

  function toggleEvent(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!project || !user) return null;

  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
    router.replace(`/projects/${id}`);
    return null;
  }

  const stepIndex = STEPS.indexOf(step);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back link */}
      <Link
        href={`/projects/${id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" />
        {project.title}
      </Link>

      {/* Title */}
      <div className="mb-6 flex items-center gap-3">
        <CalendarDays className="h-6 w-6 text-indigo-600" />
        <h1 className="text-xl font-bold text-gray-900">Импорт из календаря</h1>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                i < stepIndex
                  ? 'bg-indigo-100 text-indigo-600'
                  : i === stepIndex
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-8 ${i < stepIndex ? 'bg-indigo-200' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
        <span className="ml-3 text-sm text-gray-500">{STEP_LABELS[step]}</span>
      </div>

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <Card padding="lg">
          <h2 className="mb-2 text-base font-semibold text-gray-900">Загрузите .ics файл</h2>
          <p className="mb-5 text-sm text-gray-500">
            Экспортируйте календарь из Google Calendar, Apple Calendar или Outlook в формате{' '}
            <span className="font-mono text-xs">.ics</span> и загрузите его здесь.
          </p>

          <label
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 transition-colors ${
              file
                ? 'border-indigo-300 bg-indigo-50'
                : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className={`h-9 w-9 ${file ? 'text-indigo-500' : 'text-gray-300'}`} />
            {file ? (
              <div className="text-center">
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} КБ</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Нажмите, чтобы выбрать файл</p>
                <p className="mt-0.5 text-xs text-gray-400">Только .ics · максимум 1 МБ</p>
              </div>
            )}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          {file && (
            <button
              onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              className="mt-2 text-xs text-gray-400 hover:text-gray-600"
            >
              Выбрать другой файл
            </button>
          )}

          <div className="mt-6 flex justify-end">
            <Button onClick={handleUpload} loading={uploading} disabled={!file}>
              Продолжить
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 2: Review events ── */}
      {step === 'review' && (
        <div className="flex flex-col gap-4">
          {/* Event list */}
          <Card padding="lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Найдено событий: {events.length}
              </h2>
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setSelected(new Set(events.map((e) => e.uid)))}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  Выбрать все
                </button>
                <span className="text-gray-300">·</span>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Снять все
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto pr-1">
              <div className="flex flex-col gap-2">
                {events.map((ev) => {
                  const start = new Date(ev.start);
                  const isSelected = selected.has(ev.uid);
                  return (
                    <label
                      key={ev.uid}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        isSelected
                          ? 'border-indigo-200 bg-indigo-50'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleEvent(ev.uid)}
                        className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium text-gray-900">
                          {ev.title}
                        </p>
                        {ev.description && (
                          <p className="line-clamp-1 text-xs text-gray-500">{ev.description}</p>
                        )}
                        <p className="mt-0.5 text-xs text-gray-400">
                          {start.toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-400">
              Выбрано: {selected.size} из {events.length}
            </p>
          </Card>

          {/* Team selection */}
          <Card padding="lg">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Команда-получатель</h2>
            {project.teams.length === 0 ? (
              <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  В этом проекте пока нет команд. Задачи можно будет импортировать после создания
                  команды.
                </span>
              </div>
            ) : (
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                {project.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setStep('upload')}>
              Назад
            </Button>
            <Button
              onClick={handleConfirm}
              loading={confirming}
              disabled={selected.size === 0 || !teamId || project.teams.length === 0}
            >
              Импортировать ({selected.size})
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 'done' && (
        <Card padding="lg" className="flex flex-col items-center py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-7 w-7 text-emerald-600" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Импорт завершён!</h2>
          <p className="mb-6 text-sm text-gray-500">
            Создано задач: <span className="font-semibold text-gray-900">{createdCount}</span>
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.push(`/projects/${id}`)}>
              К проекту
            </Button>
            {teamId && (
              <Button onClick={() => router.push(`/teams/${teamId}`)}>
                Открыть команду
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
