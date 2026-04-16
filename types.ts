export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  user_id: string;
  color: string;
  due_date?: string;
  status: 'active' | 'completed' | 'cancelled';
}

export interface Goal {
  id: string;
  project_id: string;
  title: string;
  description: string;
  is_completed: boolean;
  due_date: string | null;
  created_at: string;
}

export interface Subtask {
  id: string;
  title: string;
  is_completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  is_completed: boolean;
  is_focus: boolean;
  project_id: string | null;
  goal_id: string | null;
  due_date: string | null;
  created_at: string;
  user_id: string;
  reminder_active?: boolean;
  is_for_today?: boolean;
  scheduled_time?: string;
  comments?: string;
  status: 'todo' | 'in_progress' | 'done';
  tags: string[];
  subtasks: Subtask[];
  timer_start?: string | null;
  total_time_spent?: number;
}
