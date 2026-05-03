function normalize(skills: string[]): Set<string> {
  return new Set(
    skills
      .map((s) => s.toLowerCase().trim())
      .filter(Boolean),
  );
}

export function jaccardScore(a: string[], b: string[]): number {
  const setA = normalize(a);
  const setB = normalize(b);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function matchedSkills(userSkills: string[], projectSkills: string[]): string[] {
  const setUser = normalize(userSkills);
  return projectSkills.filter((s) => setUser.has(s.toLowerCase().trim()));
}
