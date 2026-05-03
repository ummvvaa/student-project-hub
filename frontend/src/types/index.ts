export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  skills: string[];
  points: number;
  badges: string[];
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: ProjectStatus;
  createdById: string;
  requiredSkills: string[];
  createdAt: string;
  createdBy?: Pick<User, 'id' | 'fullName' | 'email' | 'role'>;
  _count?: { teams: number };
}

export interface TeamMember {
  teamId: string;
  userId: string;
  joinedAt: string;
  user?: Pick<User, 'id' | 'fullName' | 'email' | 'skills'>;
}

export interface Team {
  id: string;
  name: string;
  inviteCode: string;
  projectId: string;
  leaderId: string;
  createdAt: string;
  project?: Pick<Project, 'id' | 'title' | 'status' | 'deadline'>;
  leader?: Pick<User, 'id' | 'fullName' | 'email'>;
  members?: TeamMember[];
  tasks?: Task[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  deadline: string | null;
  teamId: string;
  assigneeId: string | null;
  completedAt: string | null;
  wasOnTime: boolean | null;
  createdAt: string;
  assignee?: Pick<User, 'id' | 'fullName' | 'email'> | null;
}

export interface PeerReview {
  id: string;
  projectId: string;
  reviewerId: string;
  targetUserId: string;
  score: number;
  comment: string;
  createdAt: string;
  targetUser?: Pick<User, 'id' | 'fullName' | 'email'>;
}

export interface ReviewAggregate {
  user: Pick<User, 'id' | 'fullName'>;
  averageScore: number;
  count: number;
  comments: string[];
}

export interface ProjectRecommendation {
  project: Project;
  score: number;
  matchedSkills: string[];
}

export interface StudentSuggestion {
  user: Pick<User, 'id' | 'fullName' | 'email' | 'skills' | 'points'>;
  score: number;
  matchedSkills: string[];
  activeTeamCount: number;
  adjustedScore: number;
}

export interface RoadmapStep {
  title: string;
  description: string;
  estimatedDays: number;
}

export interface AIRoadmap {
  id: string;
  projectId: string;
  generatedSteps: RoadmapStep[];
  createdAt: string;
}

// ─── API response wrappers ────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
}
