/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import { 
  LayoutDashboard, 
  CheckCircle2, 
  Circle, 
  Plus, 
  X,
  Target, 
  Calendar, 
  MessageSquare, 
  Settings, 
  ChevronRight,
  Clock,
  Zap,
  Trash2,
  FolderKanban,
  ExternalLink,
  Lightbulb,
  Play,
  Square,
  Tag,
  BarChart3,
  ListTodo,
  Timer,
  Download,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { Project, Goal, Task } from './types';
import { CONFIG } from './config';

// Mock data for initial preview if Supabase is not connected
const MOCK_PROJECTS: Project[] = [
  { id: '1', name: 'Aprender React', description: 'Dominar hooks y patrones avanzados', created_at: new Date().toISOString(), user_id: '1', color: '#3b82f6', status: 'active' },
  { id: '2', name: 'Proyecto PWA', description: 'Crear MAR para organizar tareas', created_at: new Date().toISOString(), user_id: '1', color: '#10b981', status: 'active' },
];

const MOCK_TASKS: Task[] = [
  { id: '1', title: 'Configurar Supabase', description: 'Crear tablas y políticas', is_completed: true, is_focus: false, project_id: '2', goal_id: null, due_date: null, created_at: new Date().toISOString(), user_id: '1', status: 'done', tags: ['Backend'], subtasks: [] },
  { id: '2', title: 'Diseñar UI Principal', description: 'Usar Tailwind y Motion', is_completed: false, is_focus: true, project_id: '2', goal_id: null, due_date: null, created_at: new Date().toISOString(), user_id: '1', scheduled_time: '10:00', is_for_today: true, status: 'in_progress', tags: ['Diseño'], subtasks: [{ id: 's1', title: 'Elegir paleta', is_completed: true }, { id: 's2', title: 'Crear componentes', is_completed: false }] },
  { id: '3', title: '🔔 Recordatorio: Revisar Metas', description: '', is_completed: false, is_focus: false, project_id: '1', goal_id: null, due_date: new Date().toISOString(), created_at: new Date().toISOString(), user_id: '1', scheduled_time: '18:30', reminder_active: true, is_for_today: true, status: 'todo', tags: ['Personal'], subtasks: [] },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'tasks' | 'reminders' | 'stats' | 'admin'>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [isAdminCreatingUser, setIsAdminCreatingUser] = useState(false);
  const [newAdminUser, setNewAdminUser] = useState({ full_name: '', email: '', phone_number: '', subscription_status: 'pending' });
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showQuickAction, setShowQuickAction] = useState(false);
  const [quickActionType, setQuickActionType] = useState<'task' | 'project' | 'reminder' | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDueDate, setNewProjectDueDate] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#000000');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [reminderText, setReminderText] = useState('');
  const [isForToday, setIsForToday] = useState(true);
  const [reminderActive, setReminderActive] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskComments, setNewTaskComments] = useState('');
  const [isKanban, setIsKanban] = useState(false);
  
  // Check if user is already "logged in"
  useEffect(() => {
    // Safety timeout to prevent stuck loading
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout reached, forcing load false');
        setLoading(false);
      }
    }, 5000);

    // Check custom phone auth
    const verifiedPhone = localStorage.getItem('mar_verified_phone');
    const adminAuth = localStorage.getItem('mar_admin_auth');

    if (adminAuth === 'true') {
      setIsAdmin(true);
      setUser({ id: 'admin', email: 'gaorsystempe@gmail.com', full_name: 'Administrador' });
      setLoading(false);
    } else if (verifiedPhone) {
      setUser({ id: verifiedPhone, phone: verifiedPhone });
      // Also check if the phone belongs to the admin
      if (verifiedPhone === '+51999888777') { // Reemplaza con tu número real
        setIsAdmin(true);
      }
      setLoading(false);
    } else {
      setLoading(false);
    }

    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('mar_verified_phone');
    localStorage.removeItem('mar_admin_auth');
    window.location.href = '/'; // Landing page
  };

  // Check if it's first time or user wants help
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('focusflow_onboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('focusflow_onboarding', 'true');
    setShowOnboarding(false);
  };

  // Fetch data
  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        // Fetch or Create Profile
        if (user.phone && !user.subscription_status) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('phone_number', user.phone)
            .single();

          if (profile) {
            setUser((prev: any) => ({ ...prev, ...profile }));
          } else {
            const { data: newProfile } = await supabase
              .from('profiles')
              .insert([{ 
                phone_number: user.phone, 
                full_name: 'Usuario Nuevo',
                subscription_status: 'pending' 
              }])
              .select()
              .single();
            if (newProfile) setUser((prev: any) => ({ ...prev, ...newProfile }));
          }
        }

        const { data: projectsData } = await supabase.from('projects').select('*').eq('user_id', user.id);
        const { data: tasksData } = await supabase.from('tasks').select('*').eq('user_id', user.id);
        
        if (projectsData) setProjects(projectsData);
        if (tasksData) setTasks(tasksData);

        if (isAdmin) {
          const { data: usersData } = await supabase.from('profiles').select('*');
          const { data: paymentsData } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
          if (usersData) setAllUsers(usersData);
          if (paymentsData) setAllPayments(paymentsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.id, isAdmin]);
  
  // ... (Omitting the rest of the functions for brevity in this example)

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white">
            <Lightbulb className="w-6 h-6 fill-white" />
          </div>
          <p className="text-text-sub font-medium">Cargando MAR...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black selection:bg-zinc-200 font-sans">
      {/* Sidebar / Navigation ... (Rest of UI) */}
    </div>
  );
}

// Helper components like TaskItem, NavItem, ...
