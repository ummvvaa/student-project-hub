import { GoogleGenerativeAI } from '@google/generative-ai';

export interface RoadmapStep {
  title: string;
  description: string;
  estimatedDays: number;
}

function getClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  return new GoogleGenerativeAI(key);
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
  const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
    const result = await model.generateContent(prompt);
    raw = result.response.text();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Surface rate-limit errors distinctly
    if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate')) {
      throw new Error('Gemini rate limit exceeded — попробуйте позже');
    }
    throw new Error(`Gemini API error: ${msg}`);
  }

  let steps: RoadmapStep[];
  try {
    const json = extractJson(raw);
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) throw new Error('Expected array');

    steps = (parsed as Record<string, unknown>[]).map((item, i) => {
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
    throw new Error(`Failed to parse Gemini response: ${msg}. Raw: ${raw.slice(0, 200)}`);
  }

  return steps;
}
