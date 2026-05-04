'use client';

import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Sparkles, CheckSquare, Square, Calendar } from 'lucide-react';
import api from '../lib/api';
import { RoadmapStep, Task, TeamMember, ApiError } from '../types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

// ─── Editable step row ────────────────────────────────────────────────────────

interface EditableStep extends RoadmapStep {
  selected: boolean;
  // local edits
  editTitle: string;
  editDays: number;
}

function StepRow({
  step,
  index,
  onChange,
}: {
  step: EditableStep;
  index: number;
  onChange: (patch: Partial<EditableStep>) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <button
        type="button"
        onClick={() => onChange({ selected: !step.selected })}
        className="mt-0.5 flex-shrink-0 text-indigo-600 dark:text-indigo-400"
      >
        {step.selected ? (
          <CheckSquare className="h-5 w-5" />
        ) : (
          <Square className="h-5 w-5 text-gray-300 dark:text-gray-600" />
        )}
      </button>

      <div className="min-w-0 flex-1 space-y-1.5">
        <input
          type="text"
          value={step.editTitle}
          onChange={(e) => onChange({ editTitle: e.target.value })}
          className="w-full rounded-lg border border-transparent bg-gray-50 px-2 py-1 text-sm font-medium text-gray-900 focus:border-indigo-300 focus:bg-white focus:outline-none dark:bg-gray-900 dark:text-gray-100 dark:focus:bg-gray-900 dark:focus:border-indigo-500"
          placeholder="Название шага"
        />
        <p className="text-xs text-gray-400 line-clamp-2 dark:text-gray-500">{step.description}</p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        <Calendar className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
        <input
          type="number"
          min={1}
          max={365}
          value={step.editDays}
          onChange={(e) => onChange({ editDays: Math.max(1, Number(e.target.value)) })}
          className="w-12 rounded-lg border border-gray-200 bg-white px-1.5 py-1 text-center text-sm text-gray-700 focus:border-indigo-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        />
        <span className="text-xs text-gray-400 dark:text-gray-500">д.</span>
      </div>

      <div className="flex-shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
        {index + 1}
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface AIRoadmapModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  teamId: string;
  members: TeamMember[];
  onTasksImported: (tasks: Task[]) => void;
}

const TODAY = new Date().toISOString().split('T')[0];

export function AIRoadmapModal({
  open,
  onClose,
  projectId,
  teamId,
  members: _members,
  onTasksImported,
}: AIRoadmapModalProps) {
  const [phase, setPhase] = useState<'idle' | 'generating' | 'review' | 'importing'>('idle');
  const [steps, setSteps] = useState<EditableStep[]>([]);
  const [startDate, setStartDate] = useState(TODAY);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setPhase('idle');
      setSteps([]);
      setStartDate(TODAY);
    }
  }, [open]);

  async function handleGenerate() {
    setPhase('generating');
    try {
      const { data } = await api.post<{ roadmap: { generatedSteps: RoadmapStep[] } }>(
        `/projects/${projectId}/ai-roadmap`,
      );
      const rawSteps = data.roadmap.generatedSteps;
      setSteps(
        rawSteps.map((s) => ({
          ...s,
          selected: true,
          editTitle: s.title,
          editDays: s.estimatedDays,
        })),
      );
      setPhase('review');
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as ApiError)?.error ?? 'Ошибка генерации'
          : 'Ошибка генерации';
      toast.error(msg);
      setPhase('idle');
    }
  }

  async function handleImport() {
    const selected = steps.filter((s) => s.selected);
    if (selected.length === 0) {
      toast.error('Выберите хотя бы один шаг');
      return;
    }
    if (!startDate) {
      toast.error('Укажите дату начала');
      return;
    }

    setPhase('importing');
    try {
      const { data } = await api.post<{ tasks: Task[] }>(
        `/projects/${projectId}/ai-roadmap/import`,
        {
          teamId,
          startDate: new Date(`${startDate}T00:00:00.000Z`).toISOString(),
          steps: selected.map((s) => ({
            title:         s.editTitle || s.title,
            description:   s.description,
            estimatedDays: s.editDays,
          })),
        },
      );
      toast.success(`Создано ${data.tasks.length} задач!`);
      onTasksImported(data.tasks);
      onClose();
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as ApiError)?.error ?? 'Ошибка импорта'
          : 'Ошибка импорта';
      toast.error(msg);
      setPhase('review');
    }
  }

  const selectedCount = steps.filter((s) => s.selected).length;

  function patchStep(index: number, patch: Partial<EditableStep>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function toggleAll() {
    const allSelected = steps.every((s) => s.selected);
    setSteps((prev) => prev.map((s) => ({ ...s, selected: !allSelected })));
  }

  return (
    <Modal
      open={open}
      onClose={phase === 'generating' || phase === 'importing' ? () => {} : onClose}
      title="AI-план проекта"
      className="max-w-2xl mx-4"
    >
      {/* ── Idle / generating phase ── */}
      {(phase === 'idle' || phase === 'generating') && (
        <div className="flex flex-col items-center gap-6 py-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-900/30">
            {phase === 'generating' ? (
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Sparkles className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            )}
          </div>
          <div>
            <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
              {phase === 'generating'
                ? 'Генерирую план...'
                : 'Сгенерировать AI-план для команды'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {phase === 'generating'
                ? 'Gemini разбивает проект на задачи — займёт несколько секунд'
                : 'Gemini разобьёт проект на 5–8 последовательных шагов с оценкой времени'}
            </p>
          </div>
          {phase === 'idle' && (
            <Button onClick={handleGenerate}>
              <Sparkles className="h-4 w-4" />
              Сгенерировать план
            </Button>
          )}
        </div>
      )}

      {/* ── Review / importing phase ── */}
      {(phase === 'review' || phase === 'importing') && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Отредактируйте названия и сроки, выберите шаги для импорта
            </p>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {steps.every((s) => s.selected) ? 'Снять всё' : 'Выбрать всё'}
            </button>
          </div>

          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
            {steps.map((step, i) => (
              <StepRow
                key={i}
                step={step}
                index={i}
                onChange={(patch) => patchStep(i, patch)}
              />
            ))}
          </div>

          {/* Start date */}
          <div className="border-t border-gray-100 pt-3 dark:border-gray-700">
            <Input
              label="Дата начала"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              hint="Дедлайны считаются накопительно от этой даты"
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPhase('idle')}
              >
                Перегенерировать
              </Button>
            </div>
            <Button
              onClick={handleImport}
              disabled={selectedCount === 0}
              loading={phase === 'importing'}
            >
              Импортировать {selectedCount > 0 ? `(${selectedCount})` : ''}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
