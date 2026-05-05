import Groq from 'groq-sdk';

export interface RoadmapStep {
  title: string;
  description: string;
  estimatedDays: number;
}

function getClient(): Groq {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not set');
  return new Groq({ apiKey: key });
}

function extractJson(raw: string): string {
  // Strip markdown ```json ... ``` wrapper if present
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  return raw.trim();
}

export async function generateRoadmap(project: {
  title: string;
  description: string;
  deadline: string;
}): Promise<RoadmapStep[]> {
  const client = getClient();

  const deadlineStr = new Date(project.deadline).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const prompt = `Разбей студенческий проект на 5-8 последовательных подзадач для команды.
Проект: ${project.title}
Описание: ${project.description}
Дедлайн: ${deadlineStr}
Верни СТРОГО JSON-массив без пояснений: [{"title":"...","description":"...","estimatedDays":N}]`;

  let raw: string;
  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Ты помощник по управлению студенческими проектами. Отвечай ТОЛЬКО валидным JSON без markdown-обёрток.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });
    raw = completion.choices[0]?.message?.content ?? '';
  } catch (err: unknown) {
    console.error('=== GROQ AI ERROR ===');
    console.error(err);
    console.error('====================');

    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('429') || msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('quota')) {
      throw new Error('AI rate limit exceeded — попробуйте позже');
    }
    throw new Error(`AI API error: ${msg}`);
  }

  let steps: RoadmapStep[];
  try {
    const json = extractJson(raw);
    const parsed = JSON.parse(json) as unknown;

    // Groq json_object mode may wrap the array in a root key
    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as Record<string, unknown>).steps)
        ? (parsed as Record<string, unknown>).steps
        : Object.values(parsed as Record<string, unknown>).find(Array.isArray);

    if (!Array.isArray(arr)) throw new Error('Expected array');

    steps = (arr as Record<string, unknown>[]).map((item, i) => {
      if (
        typeof item.title !== 'string' ||
        typeof item.description !== 'string' ||
        typeof item.estimatedDays !== 'number'
      ) {
        throw new Error(`Step ${i} has invalid shape`);
      }
      return {
        title: item.title,
        description: item.description,
        estimatedDays: Math.max(1, Math.round(item.estimatedDays)),
      };
    });
  } catch (parseErr: unknown) {
    const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    throw new Error(`Failed to parse AI response: ${msg}. Raw: ${raw.slice(0, 200)}`);
  }

  return steps;
}
