'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Task, TaskStatus, TeamMember, ApiError } from '../types';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { triggerAuthRefresh } from '../hooks/useAuth';
import { BADGES } from '../lib/badges';

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  teamId: string;
  members: TeamMember[];
  task?: Task | null;
  initialStatus?: TaskStatus;
  onSaved: (task: Task) => void;
}

const TODAY = new Date().toISOString().split('T')[0];

export function TaskModal({
  open,
  onClose,
  teamId,
  members,
  task,
  initialStatus = 'TODO',
  onSaved,
}: TaskModalProps) {
  const editing = Boolean(task);

  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline]     = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [status, setStatus]         = useState<TaskStatus>(initialStatus);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setDeadline(task.deadline ? task.deadline.split('T')[0] : '');
      setAssigneeId(task.assigneeId ?? '');
      setStatus(task.status);
    } else {
      setTitle('');
      setDescription('');
      setDeadline('');
      setAssigneeId('');
      setStatus(initialStatus);
    }
  }, [open, task, initialStatus]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error('Введите название задачи'); return; }

    const payload = {
      title:       title.trim(),
      description: description.trim() || undefined,
      deadline:    deadline ? new Date(`${deadline}T23:59:59.000Z`).toISOString() : undefined,
      assigneeId:  assigneeId || undefined,
      status,
    };

    setSaving(true);
    try {
      if (editing) {
        const { data } = await api.patch<{
          task: Task;
          pointsDelta: number;
          newBadges: string[];
        }>(`/tasks/${task!.id}`, payload);

        toast.success('Задача обновлена');

        if (data.pointsDelta > 0) {
          toast.success(`+${data.pointsDelta} очков!`, { icon: '🏆' });
          triggerAuthRefresh();
        }
        data.newBadges.forEach((code) => {
          const info = BADGES[code];
          const label = info ? `${info.emoji} ${info.name}` : code;
          toast.success(`Новый бейдж: ${label}`, { duration: 5000, icon: '🎉' });
        });

        onSaved(data.task);
      } else {
        const { data } = await api.post<{ task: Task }>(`/teams/${teamId}/tasks`, payload);
        toast.success('Задача создана');
        onSaved(data.task);
      }
      onClose();
    } catch (err) {
      toast.error(
        err instanceof AxiosError
          ? (err.response?.data as ApiError)?.error ?? 'Ошибка сохранения задачи'
          : 'Ошибка сохранения задачи',
      );
    } finally {
      setSaving(false);
    }
  }

  const STATUS_LABELS: Record<TaskStatus, string> = {
    TODO:        'К выполнению',
    IN_PROGRESS: 'В процессе',
    DONE:        'Готово',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Редактировать задачу' : 'Новая задача'}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Название"
          placeholder="Кратко опишите задачу"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Textarea
          label="Описание"
          placeholder="Подробности, критерии выполнения..."
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <Input
          label="Дедлайн"
          type="date"
          min={TODAY}
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Исполнитель</label>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">— Не назначен —</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user?.fullName ?? m.userId}
              </option>
            ))}
          </select>
        </div>

        {editing && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Статус</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? 'Сохранить' : 'Создать задачу'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
