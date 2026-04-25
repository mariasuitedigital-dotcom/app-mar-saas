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
  ChevronDown,
  Clock,
  Zap,
  Trash2,
  FolderKanban,
  ExternalLink,
  ArrowLeft,
  Lightbulb,
  Play,
  Square,
  Tag,
  BarChart3,
  ListTodo,
  Timer,
  Download,
  FileSpreadsheet,
  FileText,
  Users,
  Send,
  GraduationCap,
  Briefcase,
  Brain,
  Waves,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Volume2,
  LogOut,
  Star
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from './lib/supabase';
import { Project, Goal, Task } from './types';
import { CONFIG } from './config';

const LATAM_COUNTRIES = [
  { code: '+51', name: 'Perú', flag: '🇵🇪' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴' },
  { code: '+52', name: 'México', flag: '🇲🇽' },
  { code: '+591', name: 'Bolivia', flag: '🇧🇴' },
  { code: '+55', name: 'Brasil', flag: '🇧🇷' },
  { code: '+506', name: 'Costa Rica', flag: '🇨🇷' },
  { code: '+53', name: 'Cuba', flag: '🇨🇺' },
  { code: '+593', name: 'Ecuador', flag: '🇪🇨' },
  { code: '+503', name: 'El Salvador', flag: '🇸🇻' },
  { code: '+502', name: 'Guatemala', flag: '🇬🇹' },
  { code: '+504', name: 'Honduras', flag: '🇭🇳' },
  { code: '+505', name: 'Nicaragua', flag: '🇳🇮' },
  { code: '+507', name: 'Panamá', flag: '🇵🇦' },
  { code: '+595', name: 'Paraguay', flag: '🇵🇾' },
  { code: '+1', name: 'Puerto Rico', flag: '🇵🇷' },
  { code: '+1', name: 'Rep. Dominicana', flag: '🇩🇴' },
  { code: '+598', name: 'Uruguay', flag: '🇺🇾' },
  { code: '+58', name: 'Venezuela', flag: '🇻🇪' },
];

const SOCIAL_LINKS = {
  instagram: 'https://instagram.com/mar_global',
  facebook: 'https://facebook.com/marglobal'
};
const WHATSAPP_NUMBER = '51999999999';

// Audio Haptics Helper
const playHaptic = (type: 'success' | 'click' | 'focus') => {
  const sounds = {
    success: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    click: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    focus: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'
  };
  const audio = new Audio(sounds[type]);
  audio.volume = 0.2;
  audio.play().catch(() => {}); // Ignore interaction errors
};

// AI Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
  const hostname = window.location.hostname;
  const isSaaS = true; // Forzamos true para que se vea el App principal en este entorno de desarrollo
  
  // Log inmediato
  console.log('DEBUG: hostname=', hostname, 'isSaaS=', isSaaS);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'tasks' | 'reminders' | 'stats' | 'admin'>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is already "logged in"
  useEffect(() => {
    console.log('DEBUG: Iniciando verificación de sesión consolidada...');
    
    // Check custom phone auth
    const verifiedPhone = localStorage.getItem('mar_verified_phone');
    const adminAuth = localStorage.getItem('mar_admin_auth');

    if (adminAuth === 'true') {
      setIsAdmin(true);
      setUser({ id: 'admin', email: 'gaorsystempe@gmail.com', full_name: 'Administrador' });
    } else if (verifiedPhone) {
      setUser({ id: verifiedPhone, phone: verifiedPhone });
      if (verifiedPhone === '+51999888777') {
        setIsAdmin(true);
      }
    }
    
    setLoading(false);
    console.log('DEBUG: Verificación finalizada. User=', user, 'isAdmin=', isAdmin);
  }, []);

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
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskComments, setNewTaskComments] = useState('');
  const [isKanban, setIsKanban] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [smartCaptureText, setSmartCaptureText] = useState('');
  
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
    localStorage.removeItem('mar_auth');
    localStorage.removeItem('mar_temp_user');
    localStorage.removeItem('mar_pending_phone');
    // For safety in this environment, we reload or redirect to landing
    window.location.reload();
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
            .schema('mar')
            .from('profiles')
            .select('*')
            .eq('phone_number', user.phone)
            .single();

          if (profile) {
            setUser((prev: any) => ({ ...prev, ...profile }));
          } else {
            const { data: newProfile } = await supabase
              .schema('mar')
              .from('profiles')
              .insert([{ 
                id: crypto.randomUUID(),
                phone_number: user.phone, 
                full_name: 'Usuario Nuevo',
                subscription_status: 'pending' 
              }])
              .select()
              .single();
            if (newProfile) setUser((prev: any) => ({ ...prev, ...newProfile }));
          }
        }

        const { data: projectsData } = await supabase.schema('mar').from('projects').select('*').eq('user_id', user.id);
        const { data: tasksData } = await supabase.schema('mar').from('tasks').select('*').eq('user_id', user.id);
        
        if (projectsData) setProjects(projectsData);
        if (tasksData) setTasks(tasksData);

        if (isAdmin) {
          const { data: usersData } = await supabase.schema('mar').from('profiles').select('*');
          const { data: paymentsData } = await supabase.schema('mar').from('payments').select('*').order('created_at', { ascending: false });
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

  const updateUserSubscription = async (userId: string, status: string) => {
    const { error } = await supabase
      .schema('mar')
      .from('profiles')
      .update({ subscription_status: status })
      .eq('id', userId);
    
    if (!error) {
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription_status: status } : u));
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    const { error } = await supabase.schema('mar').from('profiles').delete().eq('id', userId);
    if (!error) {
      setAllUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  const validatePayment = async (paymentId: string, userId: string, status: 'active' | 'rejected') => {
    try {
      const { error: payError } = await supabase
        .schema('mar')
        .from('payments')
        .update({ status: status === 'active' ? 'validated' : 'rejected' })
        .eq('id', paymentId);

      if (payError) throw payError;

      const { error: userError } = await supabase
        .schema('mar')
        .from('profiles')
        .update({ subscription_status: status })
        .eq('id', userId);

      if (userError) throw userError;

      setAllPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: status === 'active' ? 'validated' : 'rejected' } : p));
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription_status: status } : u));

      alert(status === 'active' ? 'Usuario activado con éxito' : 'Pago rechazado');
    } catch (err) {
      alert('Error al procesar la validación');
    }
  };

  const createManualUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.schema('mar').from('profiles').insert([{
      ...newAdminUser,
      id: crypto.randomUUID(),
      updated_at: new Date().toISOString()
    }]).select();

    if (!error && data) {
      setAllUsers(prev => [...prev, data[0]]);
      setIsAdminCreatingUser(false);
      setNewAdminUser({ full_name: '', email: '', phone_number: '', subscription_status: 'pending' });
    } else {
      console.error('Error creating user:', error);
    }
  };

  const focusTask = useMemo(() => tasks.find(t => t.is_focus && !t.is_completed), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.is_completed).length, [tasks]);
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const toggleTask = (id: string) => {
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === id) {
          if (!t.is_completed) playHaptic('success');
          return { ...t, is_completed: !t.is_completed };
        }
        return t;
      });
      return updated;
    });
  };

  const handleSmartCapture = async () => {
    if (!smartCaptureText.trim()) return;
    setIsAILoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const response = await model.generateContent([
        `Analiza esta tarea y extrae los datos en formato JSON: "${smartCaptureText}". Hoy es ${new Date().toLocaleDateString()}.
        
        Formato requerido:
        {
          "title": "título corto",
          "description": "descripción opcional",
          "is_for_today": boolean,
          "scheduled_time": "HH:MM",
          "tags": ["tag1", "tag2"]
        }`
      ]);

      const text = response.response.text();
      // Limpiar markdown si existe
      const cleanText = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleanText);
      
      const newTask = {
        title: result.title,
        description: result.description || '',
        user_id: user.id,
        project_id: selectedProjectId,
        due_date: result.is_for_today ? new Date().toISOString() : null,
        is_for_today: result.is_for_today ?? true,
        scheduled_time: result.scheduled_time || '09:00',
        status: 'todo',
        tags: result.tags || [],
        subtasks: []
      };

      const { data, error } = await supabase.schema('mar').from('tasks').insert(newTask).select().single();
      if (data) {
        setTasks([data, ...tasks]);
        setSmartCaptureText('');
        playHaptic('click');
        setShowQuickAction(false);
      }
    } catch (err) {
      console.error(err);
      // Fallback simple si falla la IA
      addTask();
    } finally {
      setIsAILoading(false);
    }
  };

  const addTask = async () => {
    if (!newTaskTitle.trim() || !user) return;
    const newTask = {
      title: newTaskTitle,
      user_id: user.id === 'admin' ? '00000000-0000-0000-0000-000000000000' : user.id,
      project_id: selectedProjectId,
      due_date: newTaskDueDate || (isForToday ? new Date().toISOString() : null),
      is_for_today: isForToday,
      reminder_active: reminderActive,
      scheduled_time: scheduledTime,
      comments: newTaskComments,
      status: 'todo',
      tags: [],
      total_time_spent: 0
    };

    const { data, error } = await supabase.schema('mar').from('tasks').insert(newTask).select().single();
    
    if (data) {
      setTasks([data, ...tasks]);
      setNewTaskTitle('');
      setNewTaskDueDate('');
      setNewTaskComments('');
      setIsAddingTask(false);
      setQuickActionType(null);
      setShowQuickAction(false);
      setSelectedProjectId(null);
      setIsForToday(true);
      setReminderActive(false);
      setScheduledTime('09:00');
    } else if (error) {
       console.error('Task creation failed:', error.message);
    }
  };

  const addProject = async () => {
    if (!newProjectName.trim() || !user) return;
    const newProject = {
      name: newProjectName,
      user_id: user.id === 'admin' ? '00000000-0000-0000-0000-000000000000' : user.id, // Fallback indexable UUID for admin or real id
      color: newProjectColor,
      due_date: newProjectDueDate || null,
      status: 'active'
    };

    const { data, error } = await supabase.schema('mar').from('projects').insert(newProject).select().single();
    
    if (data) {
      setProjects([data, ...projects]);
      setNewProjectName('');
      setNewProjectDueDate('');
      setNewProjectColor('#000000');
      setQuickActionType(null);
      setShowQuickAction(false);
    } else if (error) {
      console.error('Project creation failed:', error.message);
    }
  };

  const updateProjectStatus = (id: string, status: 'active' | 'completed' | 'cancelled') => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    if (viewingProject?.id === id) {
      setViewingProject(prev => prev ? { ...prev, status } : null);
    }
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.filter(t => t.project_id !== id));
    setViewingProject(null);
  };

  const addReminder = async () => {
    if (!reminderText.trim() || !user) return;
    
    const newTask = {
      title: `🔔 Recordatorio: ${reminderText}`,
      user_id: user.id,
      project_id: null,
      due_date: new Date().toISOString(),
      is_for_today: true,
      reminder_active: true,
      scheduled_time: scheduledTime,
      status: 'todo',
      tags: ['Recordatorio'],
      total_time_spent: 0
    };

    const { data, error } = await supabase.schema('mar').from('tasks').insert(newTask).select().single();
    
    if (data) {
      setTasks([data, ...tasks]);
      setReminderText('');
      setQuickActionType(null);
      setShowQuickAction(false);
      setScheduledTime('09:00');
    }
  };

  const generateWhatsAppReminder = () => {
    const pendingTasks = tasks.filter(t => !t.is_completed && t.is_for_today);
    const focus = focusTask ? `🎯 *MI ENFOQUE DE HOY:* ${focusTask.title}` : 'No hay tarea de enfoque hoy.';
    
    const list = pendingTasks.map(t => {
      const time = t.scheduled_time ? ` [${t.scheduled_time}]` : '';
      const reminder = t.reminder_active ? ' (🔔 Aviso -30m)' : '';
      return `- ${t.title}${time}${reminder}`;
    }).join('\n');

    const text = `🚀 *MAR - RESUMEN DIARIO*\n\n${focus}\n\n📝 *TAREAS PROGRAMADAS PARA HOY:*\n${list || 'Sin tareas para hoy.'}\n\n¡A darle con todo! 💪`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const sendTaskToWhatsApp = (task: Task) => {
    const time = task.scheduled_time ? ` a las *${task.scheduled_time}*` : '';
    const text = `🔔 *RECORDATORIO MAR*\n\nNo olvides: *${task.title}*${time}.\n\n¡Tú puedes lograrlo! 🚀`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const updateTaskStatus = (id: string, status: 'todo' | 'in_progress' | 'done') => {
    setTasks(prev => prev.map(t => t.id === id ? { 
      ...t, 
      status, 
      is_completed: status === 'done' 
    } : t));
  };

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    setTasks(prev => {
      const updatedTasks = prev.map(t => {
        if (t.id === taskId) {
          const updatedSubtasks = t.subtasks.map((s: any) => s.id === subtaskId ? { ...s, is_completed: !s.is_completed } : s);
          
          // Persist to Supabase
          supabase.schema('mar').from('tasks').update({ subtasks: updatedSubtasks }).eq('id', taskId).then(({ error }) => {
            if (error) console.error('Error updating subtask:', error.message);
          });

          return { ...t, subtasks: updatedSubtasks };
        }
        return t;
      });
      return updatedTasks;
    });
  };

  const addSubtask = async (taskId: string, title: string) => {
    if (!title.trim()) return;
    const newSubtask = { id: Math.random().toString(36).substr(2, 9), title, is_completed: false };
    
    setTasks(prev => {
      return prev.map(t => {
        if (t.id === taskId) {
          const updatedSubtasks = [...(t.subtasks || []), newSubtask];
          
          // Persist to Supabase
          supabase.schema('mar').from('tasks').update({ subtasks: updatedSubtasks }).eq('id', taskId).then(({ error }) => {
            if (error) console.error('Error adding subtask:', error.message);
          });

          return { ...t, subtasks: updatedSubtasks };
        }
        return t;
      });
    });
  };

  const startTimer = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, timer_start: new Date().toISOString() } : t));
  };

  const stopTimer = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.timer_start) {
        const diff = Math.floor((new Date().getTime() - new Date(t.timer_start).getTime()) / 1000);
        return { 
          ...t, 
          timer_start: null, 
          total_time_spent: (t.total_time_spent || 0) + diff 
        };
      }
      return t;
    }));
  };

  const exportProjectToCSV = (project: Project) => {
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    const headers = ['Tarea', 'Estado', 'Tiempo (min)', 'Comentarios', 'Fecha Entrega'];
    const rows = projectTasks.map(t => [
      t.title,
      t.status === 'done' ? 'Completada' : t.status === 'in_progress' ? 'En Proceso' : 'Pendiente',
      Math.floor((t.total_time_spent || 0) / 60),
      t.comments || '',
      t.due_date || ''
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `MAR_Reporte_${project.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportProjectToHTML = (project: Project) => {
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    const completed = projectTasks.filter(t => t.is_completed).length;
    const progress = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0;
    const totalTime = Math.floor(projectTasks.reduce((acc, t) => acc + (t.total_time_spent || 0), 0) / 60);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Dossier MAR - ${project.name}</title>
        <style>
          body { font-family: 'Ubuntu', sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 800px; mx-auto; padding: 40px; }
          .header { border-bottom: 2px solid #f4f4f5; padding-bottom: 20px; margin-bottom: 40px; }
          .title { font-size: 32px; font-weight: bold; margin: 0; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; background: #f4f4f5; }
          .stats { display: grid; grid-cols: 3; gap: 20px; margin-bottom: 40px; }
          .stat-card { background: #fafafa; padding: 20px; border-radius: 16px; border: 1px solid #f4f4f5; }
          .stat-val { font-size: 24px; font-weight: bold; display: block; }
          .stat-label { font-size: 10px; color: #71717a; text-transform: uppercase; font-weight: bold; }
          .task-list { list-style: none; padding: 0; }
          .task-item { padding: 15px; border-bottom: 1px solid #f4f4f5; display: flex; justify-content: space-between; align-items: center; }
          .task-title { font-weight: bold; }
          .task-meta { font-size: 12px; color: #71717a; }
          .footer { margin-top: 60px; font-size: 12px; color: #a1a1aa; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <p class="stat-label">Reporte de Proyecto MAR</p>
          <h1 class="title">${project.name}</h1>
          <p>${project.description || 'Sin descripción.'}</p>
        </div>
        <div class="stats" style="display: flex; gap: 20px;">
          <div class="stat-card" style="flex: 1;">
            <span class="stat-label">Progreso</span>
            <span class="stat-val">${progress}%</span>
          </div>
          <div class="stat-card" style="flex: 1;">
            <span class="stat-label">Tiempo Total</span>
            <span class="stat-val">${totalTime} min</span>
          </div>
          <div class="stat-card" style="flex: 1;">
            <span class="stat-label">Tareas</span>
            <span class="stat-val">${projectTasks.length}</span>
          </div>
        </div>
        <h2>Lista de Tareas</h2>
        <ul class="task-list">
          ${projectTasks.map(t => `
            <li class="task-item">
              <div>
                <div class="task-title">${t.is_completed ? '✅' : '⭕'} ${t.title}</div>
                <div class="task-meta">${t.comments || ''}</div>
              </div>
              <div class="task-meta">
                ${Math.floor((t.total_time_spent || 0) / 60)} min
              </div>
            </li>
          `).join('')}
        </ul>
        <div class="footer">
          Generado por MAR - Tu mar de ideas aquí. ${new Date().toLocaleDateString()}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Dossier_MAR_${project.name.replace(/\s+/g, '_')}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  // Si no es SaaS, siempre Portal
  if (!isSaaS) {
    return <Portal user={user} setUser={setUser} />;
  }

  // Si es SaaS pero no hay usuario, mostrar Portal (Login)
  if (!user) {
    return <Portal user={user} setUser={setUser} />;
  }

  if (user && user.subscription_status === 'pending' && !isAdmin) {
    return <PaymentPortal user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-white text-black selection:bg-zinc-200 font-sans">
      {/* Progress Waves Background */}
      <ProgressWaves progress={progress} />

      {/* Deep Focus Overlay */}
      <AnimatePresence>
        {isFocusMode && focusTask && (
          <DeepFocusOverlay 
            task={focusTask} 
            onClose={() => setIsFocusMode(false)}
            onComplete={() => toggleTask(focusTask.id)}
            onStartTimer={() => startTimer(focusTask.id)}
            onStopTimer={() => stopTimer(focusTask.id)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar / Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-border px-6 py-3 flex justify-around items-center md:top-0 md:bottom-auto md:left-0 md:w-20 md:h-screen md:flex-col md:border-r md:border-t-0 z-50 safe-bottom">
        <div className="hidden md:flex mb-8">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-[0_0_15px_rgba(234,179,8,0.3)]">
            <Lightbulb className="w-6 h-6 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
        <NavItem active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); playHaptic('click'); }} icon={<LayoutDashboard className="w-5 h-5" />} label="Inicio" />
        <NavItem active={activeTab === 'projects'} onClick={() => { setActiveTab('projects'); playHaptic('click'); }} icon={<FolderKanban className="w-5 h-5" />} label="Proyectos" />
        <NavItem active={activeTab === 'tasks'} onClick={() => { setActiveTab('tasks'); playHaptic('click'); }} icon={<CheckCircle2 className="w-5 h-5" />} label="Tareas" />
        <NavItem active={activeTab === 'reminders'} onClick={() => { setActiveTab('reminders'); playHaptic('click'); }} icon={<Clock className="w-5 h-5" />} label="Recordatorios" />
        <NavItem active={activeTab === 'stats'} onClick={() => { setActiveTab('stats'); playHaptic('click'); }} icon={<BarChart3 className="w-5 h-5" />} label="Stats" />
        {isAdmin && (
          <NavItem 
            active={activeTab === 'admin'} 
            onClick={() => setActiveTab('admin')} 
            icon={<Settings className="text-yellow-500 w-5 h-5" />} 
            label="ADMIN" 
            className="border-2 border-yellow-400/20 bg-yellow-50/50"
          />
        )}
        <NavItem active={false} onClick={handleLogout} icon={<LogOut className="w-5 h-5 text-red-500" />} label="Salir" className="md:hidden" />
        <div className="hidden md:flex mt-auto mb-6">
          <NavItem active={false} onClick={handleLogout} icon={<LogOut className="w-5 h-5 text-red-500" />} label="Salir" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="pb-32 pt-6 px-4 md:pl-28 md:pr-12 max-w-7xl mx-auto">
        {/* Flow Guide Modal */}
        <AnimatePresence>
          {showGuide && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowGuide(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                className="bg-white rounded-[32px] w-full max-w-2xl p-8 shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
                      <Lightbulb className="w-6 h-6 fill-white" />
                    </div>
                    <h2 className="text-2xl font-bold">Metodología MAR</h2>
                  </div>
                  <button onClick={() => setShowGuide(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                    <Plus className="w-6 h-6 rotate-45" />
                  </button>
                </div>

                <div className="space-y-10 pb-4">
                  <section className="bg-zinc-900 text-white p-6 rounded-[24px] space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-yellow-400">
                      <Zap className="w-5 h-5 fill-yellow-400" />
                      Novedades en MAR
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-yellow-400 text-black rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">NEW</div>
                        <p className="text-sm">Tablero Kanban: Organiza tus tareas visualmente por estados.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-yellow-400 text-black rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">NEW</div>
                        <p className="text-sm">Temporizador: Mide tu tiempo de enfoque real con un solo clic.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-yellow-400 text-black rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">NEW</div>
                        <p className="text-sm">Dossier MAR: Exporta reportes profesionales en HTML o Excel.</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-amber-600">
                      <FolderKanban className="w-5 h-5" />
                      Flujo de Proyectos
                    </h3>
                    <p className="text-sm text-text-sub">Son los contenedores de tus grandes metas. Su finalidad es darte una visión panorámica.</p>
                    <div className="grid grid-cols-1 gap-2">
                      <GuideStep num="1" text="Define una meta grande (ej. 'Lanzar mi App')." />
                      <GuideStep num="2" text="Desglosa en tareas accionables dentro del proyecto." />
                      <GuideStep num="3" text="Visualiza el progreso real hacia tu objetivo final." />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-blue-600">
                      <CheckCircle2 className="w-5 h-5" />
                      Flujo de Tareas y Kanban
                    </h3>
                    <p className="text-sm text-text-sub">Pasos atómicos para reducir la parálisis. Ahora con vista de tablero para mayor control.</p>
                    <div className="grid grid-cols-1 gap-2">
                      <GuideStep num="1" text="Usa el Tablero Kanban para mover tareas entre 'Por Hacer', 'En Proceso' y 'Hecho'." />
                      <GuideStep num="2" text="Desglosa tareas complejas en Subtareas para avanzar paso a paso." />
                      <GuideStep num="3" text="Activa el Temporizador (Play) para medir tu enfoque real en cada tarea." />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-purple-600">
                      <BarChart3 className="w-5 h-5" />
                      Estadísticas y Reportes
                    </h3>
                    <p className="text-sm text-text-sub">Mide tu éxito y documenta tus logros de forma profesional.</p>
                    <div className="grid grid-cols-1 gap-2">
                      <GuideStep num="1" text="Revisa la pestaña de Estadísticas para ver tu rendimiento semanal." />
                      <GuideStep num="2" text="Exporta el 'Dossier MAR' (HTML) para tener un reporte visual de tus proyectos." />
                      <GuideStep num="3" text="Descarga tus datos en Excel (CSV) para un control administrativo total." />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-600">
                      <MessageSquare className="w-5 h-5" />
                      Flujo de WhatsApp
                    </h3>
                    <p className="text-sm text-text-sub">Es tu compromiso externo. Su finalidad es sacarte de la app al mundo real.</p>
                    <div className="grid grid-cols-1 gap-2">
                      <GuideStep num="1" text="Genera tu resumen diario (Enfoque + Tareas de hoy)." />
                      <GuideStep num="2" text="Envíatelo a ti mismo para 'fijar' el plan en tu mente." />
                      <GuideStep num="3" text="Siente el alivio al ver tu plan trazado en tu chat." />
                    </div>
                  </section>
                </div>

                <button 
                  onClick={() => setShowGuide(false)}
                  className="w-full bg-black text-white py-4 rounded-2xl font-bold mt-4"
                >
                  Entendido, ¡a por ello!
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Quick Action Trigger (Floating Button) */}
        <button 
          onClick={() => setShowQuickAction(true)}
          className="fixed bottom-24 right-6 md:bottom-10 md:right-10 w-16 h-16 bg-black text-white rounded-full shadow-2xl flex items-center justify-center z-[60] hover:scale-110 active:scale-95 transition-all"
        >
          <Plus className="w-8 h-8" />
        </button>

        {/* Quick Action Modal */}
        <AnimatePresence>
          {showQuickAction && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowQuickAction(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl relative z-10 space-y-6"
              >
                {!quickActionType ? (
                  <>
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-bold">¿Qué deseas hacer hoy?</h2>
                      <p className="text-text-sub text-sm">Elige una opción para empezar a organizar tu día.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => setQuickActionType('task')}
                        className="flex items-center gap-4 p-4 rounded-2xl border border-border hover:bg-zinc-50 transition-colors text-left group"
                      >
                        <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold">Crear una Tarea</p>
                          <p className="text-xs text-text-sub">Pasos accionables para completar tus proyectos.</p>
                        </div>
                      </button>
                      <button 
                        onClick={() => setQuickActionType('project')}
                        className="flex items-center gap-4 p-4 rounded-2xl border border-border hover:bg-zinc-50 transition-colors text-left group"
                      >
                        <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                          <FolderKanban className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold">Nuevo Proyecto</p>
                          <p className="text-xs text-text-sub">Metas estructurales (ej. Meta de Ventas, Tesis).</p>
                        </div>
                      </button>
                      <button 
                        onClick={() => setQuickActionType('reminder')}
                        className="flex items-center gap-4 p-4 rounded-2xl border border-border hover:bg-zinc-50 transition-colors text-left group"
                      >
                        <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold">Configurar Recordatorio</p>
                          <p className="text-xs text-text-sub">Alarmas breves y sincronización con WhatsApp.</p>
                        </div>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQuickActionType(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                        <ChevronRight className="w-5 h-5 rotate-180" />
                      </button>
                      <h2 className="text-xl font-bold">
                        {quickActionType === 'task' && 'Nueva Tarea'}
                        {quickActionType === 'project' && 'Nuevo Proyecto'}
                        {quickActionType === 'reminder' && 'Nuevo Recordatorio'}
                      </h2>
                    </div>

                    {quickActionType === 'task' && (
                      <div className="space-y-6">
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="¿Qué necesitas hacer?" 
                          className="w-full text-lg font-medium outline-none p-4 bg-zinc-50 rounded-2xl border border-transparent focus:border-black transition-all"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addTask()}
                        />
                        
                        <div className="space-y-4 bg-zinc-50 p-4 rounded-2xl border border-border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FolderKanban className="w-4 h-4 text-text-sub" />
                              <span className="text-sm font-bold">Proyecto</span>
                            </div>
                            <select 
                              value={selectedProjectId || ''} 
                              onChange={(e) => setSelectedProjectId(e.target.value || null)}
                              className="bg-white border border-border rounded-lg px-2 py-1 text-sm font-bold outline-none focus:border-black"
                            >
                              <option value="">Ninguno</option>
                              {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-text-sub" />
                              <span className="text-sm font-bold">¿Es para hoy?</span>
                            </div>
                            <button 
                              onClick={() => setIsForToday(!isForToday)}
                              className={`w-10 h-6 rounded-full transition-colors relative ${isForToday ? 'bg-black' : 'bg-zinc-200'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isForToday ? 'left-5' : 'left-1'}`} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-text-sub" />
                              <span className="text-sm font-bold">Hora asignada</span>
                            </div>
                            <input 
                              type="time" 
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              className="bg-white border border-border rounded-lg px-2 py-1 text-sm font-bold outline-none focus:border-black"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-text-sub" />
                              <span className="text-sm font-bold">Recordar 30 min antes</span>
                            </div>
                            <button 
                              onClick={() => setReminderActive(!reminderActive)}
                              className={`w-10 h-6 rounded-full transition-colors relative ${reminderActive ? 'bg-black' : 'bg-zinc-200'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${reminderActive ? 'left-5' : 'left-1'}`} />
                            </button>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-text-sub" />
                              <span className="text-sm font-bold">Fecha de culminación</span>
                            </div>
                            <input 
                              type="date" 
                              value={newTaskDueDate}
                              onChange={(e) => setNewTaskDueDate(e.target.value)}
                              className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-black"
                            />
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-text-sub" />
                              <span className="text-sm font-bold">Comentario / Notas</span>
                            </div>
                            <textarea 
                              placeholder="Añade detalles adicionales..."
                              value={newTaskComments}
                              onChange={(e) => setNewTaskComments(e.target.value)}
                              className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-black min-h-[80px] resize-none"
                            />
                          </div>
                        </div>

                        <button onClick={addTask} className="w-full apple-button py-4">Guardar Tarea</button>
                      </div>
                    )}

                    {quickActionType === 'project' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-text-sub ml-1">Nombre del Proyecto</label>
                          <input 
                            autoFocus
                            type="text" 
                            placeholder="Ej. Lanzar mi App" 
                            className="w-full text-lg font-medium outline-none p-4 bg-zinc-50 rounded-2xl border border-transparent focus:border-black transition-all"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addProject()}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-text-sub ml-1">Fecha de Entrega (Opcional)</label>
                          <input 
                            type="date" 
                            className="w-full text-lg font-medium outline-none p-4 bg-zinc-50 rounded-2xl border border-transparent focus:border-black transition-all"
                            value={newProjectDueDate}
                            onChange={(e) => setNewProjectDueDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-text-sub ml-1">Color del Proyecto</label>
                          <div className="flex gap-2">
                            {['#000000', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(c => (
                              <button 
                                key={c}
                                onClick={() => setNewProjectColor(c)}
                                className={`w-8 h-8 rounded-full border-2 transition-all ${newProjectColor === c ? 'border-black scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                        <button onClick={addProject} className="w-full apple-button py-4">Crear Proyecto</button>
                      </div>
                    )}

                    {quickActionType === 'reminder' && (
                      <div className="space-y-6">
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="¿Sobre qué te recordamos?" 
                          className="w-full text-lg font-medium outline-none p-4 bg-zinc-50 rounded-2xl border border-transparent focus:border-black transition-all"
                          value={reminderText}
                          onChange={(e) => setReminderText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addReminder()}
                        />
                        
                        <div className="space-y-4 bg-zinc-50 p-4 rounded-2xl border border-border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-text-sub" />
                              <span className="text-sm font-bold">Hora del recordatorio</span>
                            </div>
                            <input 
                              type="time" 
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              className="bg-white border border-border rounded-lg px-2 py-1 text-sm font-bold outline-none focus:border-black"
                            />
                          </div>
                        </div>

                        <div className="p-4 bg-accent-soft rounded-2xl text-xs text-text-sub font-medium">
                          Este recordatorio se añadirá a tu lista y se incluirá en tu resumen de WhatsApp para la hora asignada.
                        </div>
                        <button onClick={addReminder} className="w-full apple-button py-4">Configurar</button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showOnboarding && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-white z-[100] flex flex-col md:items-center md:justify-center p-6 md:p-12 overflow-y-auto"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                className="max-w-md w-full mx-auto space-y-8 py-10"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <motion.div 
                    initial={{ rotate: -10, scale: 0.8 }}
                    animate={{ rotate: 0, scale: 1 }}
                    className="w-16 h-16 bg-yellow-400 rounded-[24px] flex items-center justify-center text-black shadow-xl shadow-yellow-100"
                  >
                    <Lightbulb className="w-8 h-8 fill-black" />
                  </motion.div>
                  <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-black tracking-tighter">¡Bienvenido a MAR!</h2>
                    <p className="text-zinc-500 font-medium text-base md:text-lg leading-tight px-4">
                      Estás a un paso de dominar tu tiempo y liberar tu mente de la saturación.
                    </p>
                  </div>
                </div>

                <div className="space-y-6 pt-4">
                  <OnboardingStep 
                    number="1" 
                    title="Captura Todo" 
                    desc="No dejes que las ideas se escapen. Escríbelas al instante."
                  />
                  <OnboardingStep 
                    number="2" 
                    title="Enfócate" 
                    desc="Usa el temporizador para periodos de trabajo profundo." 
                  />
                  <OnboardingStep 
                    number="3" 
                    title="Sincroniza" 
                    desc="Deja que MAR te recuerde lo vital por WhatsApp." 
                  />
                </div>

                  <div className="pt-6">
                  <button 
                    onClick={completeOnboarding}
                    className="w-full bg-black text-white py-4 rounded-[28px] text-lg font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10"
                  >
                    Comenzar ahora
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5 pb-24"
            >
              <header className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-sm">
                    <Lightbulb className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <h1 className="text-base font-black tracking-tight text-zinc-900 leading-none">MAR</h1>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowGuide(true)}
                    className="user-status bg-white px-2.5 py-1.5 rounded-full border border-zinc-100 text-[8px] font-black uppercase tracking-[0.1em] text-zinc-400 hover:text-black transition-colors shadow-sm"
                  >
                    Guía
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="p-1.5 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors shadow-sm"
                    title="Cerrar Sesión"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </header>

              <div className="bento-grid">
                {/* Hero Section: Daily Goal */}
                <motion.section 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-bento col-span-1 md:col-span-2 bg-zinc-950 text-white border-none min-h-[220px] shadow-xl shadow-zinc-200 relative overflow-hidden group"
                >
                  <div className="card-title-bento text-white/40 relative z-10 px-1">
                    <span className="flex items-center gap-2">
                       <Target className={`w-2.5 h-2.5 ${focusTask ? 'text-yellow-400 animate-pulse' : ''}`} />
                       ENFOQUE HOY
                    </span>
                    <span className="text-[8px]">{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  
                  <div className="mt-auto relative z-10">
                    {focusTask ? (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-3"
                      >
                        <h2 className="text-xl md:text-2xl font-bold leading-tight tracking-tight drop-shadow-sm">
                          {focusTask.title}
                        </h2>
                        <p className="text-white/40 text-[11px] font-medium">{focusTask.description || 'Prioridad máxima • Hoy'}</p>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <button 
                            onClick={() => {
                              playHaptic('focus');
                              setIsFocusMode(true);
                            }}
                            className="bg-white text-black px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 hover:bg-zinc-100 transition-all active:scale-95 shadow-lg"
                          >
                            <Zap className="w-3 h-3 fill-yellow-400" />
                            Enfoque
                          </button>
                          
                          <button 
                            onClick={() => toggleTask(focusTask.id)}
                            className="bg-zinc-800 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-zinc-700 transition-all active:scale-95"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            Completar
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="space-y-3">
                        <h2 className="text-xl md:text-2xl font-bold leading-tight tracking-tight">¿Cuál es tu enfoque?</h2>
                        <p className="text-white/40 text-[11px] font-medium">No has seleccionado una tarea hoy.</p>
                        <button 
                          onClick={() => setActiveTab('tasks')}
                          className="bg-white text-black px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 hover:bg-zinc-100 transition-all active:scale-95 mt-2 group"
                        >
                          <Plus className="w-3 h-3 group-hover:rotate-90 transition-transform duration-300" />
                          Elegir enfoque
                        </button>
                      </div>
                    )}
                  </div>
                </motion.section>

                <div className="card-bento col-span-1 md:col-span-2 bg-zinc-100/50 border-zinc-200 flex flex-col justify-center items-center py-6 px-4 gap-4 group">
                   <div className="flex flex-col items-center gap-1.5 text-center">
                     <div className="w-8 h-8 bg-white rounded-lg shadow-sm border border-zinc-100 flex items-center justify-center text-zinc-400 group-focus-within:text-black transition-colors">
                       <Sparkles className={`w-4 h-4 ${isAILoading ? 'animate-spin' : ''}`} />
                     </div>
                     <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Captura Inteligente</span>
                   </div>
                   <div className="w-full relative">
                      <input 
                        value={smartCaptureText}
                        onChange={(e) => setSmartCaptureText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSmartCapture()}
                        placeholder="Escribe: Tarea mañana 10am..."
                        className="w-full bg-white border border-zinc-200 rounded-[16px] px-4 py-3 outline-none focus:ring-1 ring-black font-medium text-sm shadow-sm pr-12"
                        disabled={isAILoading}
                      />
                      <button 
                        onClick={handleSmartCapture}
                        disabled={isAILoading}
                        className="absolute right-2 top-2 bottom-2 aspect-square bg-black text-white rounded-xl flex items-center justify-center hover:scale-[1.05] transition-transform disabled:opacity-50"
                      >
                         {isAILoading ? <Zap className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                      </button>
                   </div>
                </div>

                {/* Quick Tasks - TODAY (Blueish) */}
                <div className="card-bento col-span-1 bg-blue-50/40 border-blue-100/50">
                  <div className="card-title-bento text-blue-600/60 font-black">HOY</div>
                  <div className="space-y-1 overflow-y-auto max-h-[160px] custom-scrollbar">
                    {tasks.filter(t => !t.is_completed && t.is_for_today).slice(0, 4).map(task => (
                      <div key={task.id} className="flex items-center gap-2.5 py-2 border-b border-blue-100/30 last:border-0 group">
                        <button onClick={() => toggleTask(task.id)} className="w-4 h-4 border border-blue-200 rounded-lg hover:border-blue-500 transition-colors flex items-center justify-center bg-white shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-transparent group-hover:text-blue-200" />
                        </button>
                        <div className="flex-1 truncate">
                          <span className="text-[13px] font-bold text-blue-950">{task.title}</span>
                        </div>
                      </div>
                    ))}
                    {tasks.filter(t => !t.is_completed && t.is_for_today).length === 0 && (
                      <div className="py-6 text-center">
                        <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Nada pendiente</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* WhatsApp Card (Greenish) */}
                <div className="card-bento col-span-1 bg-emerald-50/50 border-emerald-100 justify-center items-center text-center">
                  <div className="text-[9px] font-bold tracking-[0.2em] text-emerald-600 mb-2 uppercase">Compromiso</div>
                  <div className="text-emerald-900 text-base font-bold leading-tight mb-3 tracking-tight px-1">
                    Resumen<br/>WhatsApp
                  </div>
                  <button 
                    onClick={generateWhatsAppReminder}
                    className="w-10 h-10 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-200 flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <MessageSquare className="w-5 h-5 fill-white" />
                  </button>
                </div>

                {/* Projects Card (Amber/Orange) */}
                <div className="card-bento col-span-1 bg-amber-50/50 border-amber-100">
                  <div className="card-title-bento text-amber-600">Proyectos</div>
                  <div className="space-y-5">
                    {projects.slice(0, 2).map(project => (
                      <div key={project.id} className="space-y-2">
                        <div className="flex justify-between text-xs font-bold tracking-tight text-amber-900">
                          <span>{project.name}</span>
                          <span className="text-amber-500">35%</span>
                        </div>
                        <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 transition-all duration-700" style={{ width: '35%' }} />
                        </div>
                      </div>
                    ))}
                    {projects.length === 0 && (
                      <button onClick={() => setActiveTab('projects')} className="w-full py-8 border border-dashed border-amber-200 rounded-xl text-amber-400 text-xs font-bold uppercase tracking-widest hover:border-amber-500 hover:text-amber-600 transition-colors bg-white/50">
                        Nuevo Proyecto
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats/Goals Card */}
                <div className="card-bento col-span-1 md:col-span-2 bg-accent-soft/50">
                  <div className="card-title-bento">Estadísticas</div>
                  <div className="grid grid-cols-2 gap-3 flex-grow">
                    <StatItem label="Racha" val="12 🔥" />
                    <StatItem label="Completadas" val={completedTasks.toString()} />
                    <StatItem label="Progreso" val={`${Math.round(progress)}%`} />
                    <StatItem label="Proyectos" val={projects.length.toString()} />
                  </div>
                </div>

                {/* Motivation Card */}
                <div className="card-bento col-span-1 md:col-span-2 overflow-hidden relative group">
                  <img 
                    src="https://images.unsplash.com/photo-1494173853739-c21f58b16055?auto=format&fit=crop&q=80&w=1000" 
                    alt="Inspiration" 
                    className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:scale-105 transition-transform duration-1000"
                    referrerPolicy="no-referrer"
                  />
                  <div className="relative z-10 h-full flex flex-col justify-center py-4">
                    <div className="card-title-bento mb-2">Inspiración</div>
                    <p className="text-2xl font-bold tracking-tight leading-tight mb-2 italic">
                      "El éxito es la suma de pequeños esfuerzos repetidos día tras día."
                    </p>
                    <p className="text-text-sub text-sm font-medium">— Robert Collier</p>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-black">
                      <Zap className="w-4 h-4 fill-black" />
                      <span>Sigue mejorando, vas por buen camino</span>
                    </div>
                  </div>
                </div>

                {/* Quick Entry Card */}
                <button 
                  onClick={() => setIsAddingTask(true)}
                  className="card-bento col-span-1 bg-black text-white hover:bg-zinc-800 transition-colors cursor-pointer group"
                >
                  <div className="card-title-bento text-white/40">Acceso Rápido</div>
                  <div className="flex-grow flex items-center justify-center text-6xl font-extralight group-hover:scale-110 transition-transform">+</div>
                  <div className="text-[10px] text-center text-white/50 font-bold uppercase tracking-widest">Nueva Tarea</div>
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div 
              key="tasks"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Mis Tareas</h1>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setIsKanban(false)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${!isKanban ? 'bg-white shadow-sm' : 'text-text-sub'}`}
                      >
                        Lista
                      </button>
                      <button 
                        onClick={() => setIsKanban(true)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${isKanban ? 'bg-white shadow-sm' : 'text-text-sub'}`}
                      >
                        Tablero
                      </button>
                    </div>
                    <button 
                      onClick={() => setIsAddingTask(true)}
                      className="apple-button p-2"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </header>

              {isAddingTask && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-6 rounded-[20px] border border-black shadow-sm"
                >
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="¿Qué necesitas hacer?" 
                    className="w-full text-lg font-medium outline-none"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setIsAddingTask(false)} className="px-4 py-2 text-text-sub font-bold text-sm">Cancelar</button>
                    <button onClick={addTask} className="apple-button">Guardar Tarea</button>
                  </div>
                </motion.div>
              )}

              {!isKanban ? (
                <div className="bg-white border border-border rounded-[20px] overflow-hidden divide-y divide-border">
                  {tasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onToggle={() => toggleTask(task.id)} 
                      onSend={() => sendTaskToWhatsApp(task)}
                      onAddSubtask={(title) => addSubtask(task.id, title)}
                      onToggleSubtask={(sid) => toggleSubtask(task.id, sid)}
                      onStartTimer={() => startTimer(task.id)}
                      onStopTimer={() => stopTimer(task.id)}
                      showProject 
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
                  {(['todo', 'in_progress', 'done'] as const).map(status => (
                    <div key={status} className="flex flex-col gap-4 bg-zinc-50 p-4 rounded-[32px] border border-zinc-100">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="font-bold uppercase tracking-widest text-[10px] text-text-sub">
                          {status === 'todo' ? 'Por Hacer' : status === 'in_progress' ? 'En Proceso' : 'Hecho'}
                        </h3>
                        <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold border border-zinc-200">
                          {tasks.filter(t => t.status === status).length}
                        </span>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                        {tasks.filter(t => t.status === status).map(task => (
                          <motion.div 
                            layoutId={task.id}
                            key={task.id} 
                            className="bg-white p-4 rounded-2xl border border-border shadow-sm hover:border-black transition-all cursor-pointer group"
                          >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-bold text-sm leading-tight">{task.title}</p>
                      <motion.button 
                        whileHover={{ scale: 1.2, x: 5 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextStatus = status === 'todo' ? 'in_progress' : status === 'in_progress' ? 'done' : 'todo';
                          updateTaskStatus(task.id, nextStatus);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${status === 'in_progress' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'hover:bg-zinc-100 text-zinc-400'}`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </motion.button>
                    </div>

                    {/* Confetti on Kanban card if done */}
                    {status === 'done' && (
                      <div className="absolute inset-0 pointer-events-none">
                        {[...Array(4)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ 
                              scale: [0, 1, 0],
                              x: (i % 2 === 0 ? 1 : -1) * 20,
                              y: (i < 2 ? 1 : -1) * 20,
                              opacity: 0
                            }}
                            transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                            className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full bg-yellow-400"
                          />
                        ))}
                      </div>
                    )}
                            {task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {task.tags.map(tag => (
                                  <span key={tag} className="text-[8px] font-bold uppercase tracking-widest bg-zinc-100 px-1.5 py-0.5 rounded-md">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center justify-between text-[9px] font-bold text-text-sub uppercase tracking-widest">
                              <div className="flex items-center gap-1">
                                <ListTodo className="w-3 h-3" />
                                <span>{task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length}</span>
                              </div>
                              {task.total_time_spent ? (
                                <div className="flex items-center gap-1">
                                  <Timer className="w-3 h-3" />
                                  <span>{Math.floor(task.total_time_spent / 60)}m</span>
                                </div>
                              ) : null}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'projects' && !viewingProject && (
            <motion.div 
              key="projects"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-5 pb-24 px-1"
            >
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-black tracking-tight">Proyectos</h1>
                <button 
                  onClick={() => {
                    setQuickActionType('project');
                    setShowQuickAction(true);
                  }}
                  className="apple-button flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {projects.map(project => {
                  const projectTasks = tasks.filter(t => t.project_id === project.id);
                  const completedProjectTasks = projectTasks.filter(t => t.is_completed).length;
                  const projectProgress = projectTasks.length > 0 ? (completedProjectTasks / projectTasks.length) * 100 : 0;
                  
                  return (
                    <div 
                      key={project.id} 
                      onClick={() => setViewingProject(project)}
                      className="card-bento hover:border-black group cursor-pointer relative overflow-hidden"
                    >
                      <div 
                        className="absolute top-0 left-0 w-1 h-full" 
                        style={{ backgroundColor: project.color }}
                      />
                      <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center bg-accent-soft text-black">
                        <FolderKanban className="w-6 h-6" style={{ color: project.color }} />
                      </div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold group-hover:underline transition-all">{project.name}</h3>
                        <div className="flex flex-col items-end gap-1">
                          {project.due_date && (
                            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full uppercase tracking-widest">
                              {new Date(project.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                            project.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            project.status === 'cancelled' ? 'bg-zinc-100 text-zinc-500' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {project.status === 'active' ? 'Activo' : project.status === 'completed' ? 'Completado' : 'Cancelado'}
                          </span>
                        </div>
                      </div>
                      <p className="text-text-sub text-sm mb-6 line-clamp-2">
                        {projectTasks.length} tareas • {completedProjectTasks} completadas
                      </p>
                      <div className="mt-auto">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-text-sub mb-2">
                          <span>Progreso</span>
                          <span>{Math.round(projectProgress)}%</span>
                        </div>
                        <div className="h-1 bg-accent-soft rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-500" 
                            style={{ width: `${projectProgress}%`, backgroundColor: project.color || '#000000' }} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'projects' && viewingProject && (
            <motion.div 
              key="project-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <button 
                onClick={() => setViewingProject(null)}
                className="flex items-center gap-2 text-text-sub hover:text-black transition-colors font-bold text-sm uppercase tracking-widest"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Volver a Proyectos
              </button>

              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: viewingProject.color }}>
                      <FolderKanban className="w-6 h-6" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight">{viewingProject.name}</h1>
                  </div>
                  <p className="text-text-sub">{viewingProject.description || 'Sin descripción adicional.'}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => updateProjectStatus(viewingProject.id, 'active')}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${viewingProject.status === 'active' ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                  >
                    Activo
                  </button>
                  <button 
                    onClick={() => updateProjectStatus(viewingProject.id, 'completed')}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${viewingProject.status === 'completed' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                  >
                    Completado
                  </button>
                  <button 
                    onClick={() => updateProjectStatus(viewingProject.id, 'cancelled')}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${viewingProject.status === 'cancelled' ? 'bg-zinc-600 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                  >
                    Cancelado
                  </button>
                  <button 
                    onClick={() => {
                      if(confirm('¿Estás seguro de eliminar este proyecto y todas sus tareas?')) {
                        deleteProject(viewingProject.id);
                      }
                    }}
                    className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Tareas del Proyecto</h2>
                    <button 
                      onClick={() => {
                        setSelectedProjectId(viewingProject.id);
                        setQuickActionType('task');
                        setShowQuickAction(true);
                      }}
                      className="text-sm font-bold text-blue-600 hover:underline"
                    >
                      + Añadir Tarea
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {tasks.filter(t => t.project_id === viewingProject.id).length > 0 ? (
                      tasks.filter(t => t.project_id === viewingProject.id).map(task => (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          onToggle={() => toggleTask(task.id)} 
                          onSend={() => sendTaskToWhatsApp(task)}
                          onAddSubtask={(title) => addSubtask(task.id, title)}
                          onToggleSubtask={(sid) => toggleSubtask(task.id, sid)}
                          onStartTimer={() => startTimer(task.id)}
                          onStopTimer={() => stopTimer(task.id)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12 bg-zinc-50 rounded-[32px] border border-dashed border-zinc-200">
                        <p className="text-text-sub font-medium">No hay tareas en este proyecto aún.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="card-bento bg-zinc-50 border-none">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-text-sub mb-4">Detalles</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-text-sub">Creado</span>
                        <span className="text-sm font-medium">{new Date(viewingProject.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-text-sub">Entrega</span>
                        <span className="text-sm font-medium text-red-500">
                          {viewingProject.due_date ? new Date(viewingProject.due_date).toLocaleDateString() : 'Sin fecha'}
                        </span>
                      </div>
                      <div className="pt-4 border-t border-zinc-200">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-text-sub mb-2">
                          <span>Progreso Total</span>
                          <span>{Math.round(tasks.filter(t => t.project_id === viewingProject.id && t.is_completed).length / (tasks.filter(t => t.project_id === viewingProject.id).length || 1) * 100)}%</span>
                        </div>
                        <div className="h-2 bg-white rounded-full overflow-hidden border border-zinc-200">
                          <div 
                            className="h-full transition-all duration-500" 
                            style={{ 
                              width: `${(tasks.filter(t => t.project_id === viewingProject.id && t.is_completed).length / (tasks.filter(t => t.project_id === viewingProject.id).length || 1) * 100)}%`,
                              backgroundColor: viewingProject.color 
                            }} 
                          />
                        </div>
                      </div>

                      <div className="pt-6 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-sub">Exportar Reporte</p>
                        <button 
                          onClick={() => exportProjectToHTML(viewingProject)}
                          className="w-full flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-xl hover:border-black transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <FileText className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold">Dossier MAR (HTML)</span>
                          </div>
                          <Download className="w-4 h-4 text-zinc-300 group-hover:text-black" />
                        </button>
                        <button 
                          onClick={() => exportProjectToCSV(viewingProject)}
                          className="w-full flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-xl hover:border-black transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                              <FileSpreadsheet className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold">Datos Excel (CSV)</span>
                          </div>
                          <Download className="w-4 h-4 text-zinc-300 group-hover:text-black" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-0.5">
                  <h1 className="text-2xl font-black tracking-tighter">Reporte Semanal de Insights</h1>
                  <p className="text-text-sub text-[10px] md:text-xs font-medium">Analizando tu impacto y carga mental</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-3">
                     <Calendar className="w-3 h-3" />
                     13 Abr - 19 Abr
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </header>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card-bento col-span-1 md:col-span-2 bg-black text-white border-none p-10 flex flex-col justify-between min-h-[300px] overflow-hidden relative group">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-800 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 opacity-50 group-hover:bg-yellow-500/20 transition-all" />
                   <div className="relative z-10">
                     <div className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                       <Rocket className="w-4 h-4 text-yellow-500" /> Gran Logro de la Semana
                     </div>
                     <h3 className="text-3xl font-black tracking-tight leading-tight">
                        Redujiste tu Carga Mental en un <span className="text-yellow-400">84%</span>
                     </h3>
                     <p className="text-white/60 mt-4 text-base font-medium max-w-[80%]">
                       Al delegar tareas y recordatorios a MAR, liberaste espacio mental significativo para el trabajo profundo.
                     </p>
                   </div>
                   <div className="relative z-10 flex items-end justify-between pt-10">
                      <div className="space-y-1">
                        <span className="text-4xl font-black text-white">24</span>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Pomodoros Completados</p>
                      </div>
                      <div className="w-24 h-12 flex items-end gap-1">
                         {[30, 50, 40, 80, 60, 90, 70].map((h, i) => (
                           <motion.div 
                              key={i} 
                              initial={{ height: 0 }}
                              animate={{ height: `${h}%` }}
                              transition={{ delay: 0.5 + i * 0.1 }}
                              className="flex-1 bg-yellow-400 rounded-t-sm" 
                           />
                         ))}
                      </div>
                   </div>
                </div>

                <div className="card-bento col-span-1 bg-blue-50 border-blue-100 p-8 flex flex-col justify-between">
                  <div>
                    <div className="text-blue-600/60 text-[10px] font-bold uppercase tracking-widest mb-4">Tiempo de Enfoque</div>
                    <div className="text-5xl font-black text-blue-950 tracking-tighter">
                      {Math.floor(tasks.reduce((acc, t) => acc + (t.total_time_spent || 0), 0) / 60)}h
                    </div>
                    <p className="text-blue-700/60 text-xs font-semibold mt-2 italic">Dedicadas a tus metas principales</p>
                  </div>
                  <div className="pt-6">
                     <div className="flex items-center gap-2 text-blue-600">
                       <BarChart3 className="w-5 h-5" />
                       <span className="text-sm font-bold">+12% vs semana pasada</span>
                     </div>
                  </div>
                </div>

                <div className="card-bento col-span-1 bg-emerald-50 border-emerald-100 p-8 flex flex-col justify-between">
                  <div>
                    <div className="text-emerald-600/60 text-[10px] font-bold uppercase tracking-widest mb-4">Tareas de Enfoque</div>
                    <div className="text-5xl font-black text-emerald-950 tracking-tighter">
                      {completedTasks}
                    </div>
                    <p className="text-emerald-700/60 text-xs font-semibold mt-2 italic">Ejecución sin distracciones</p>
                  </div>
                  <div className="pt-6">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <ShieldCheck className="w-5 h-5" />
                      <span className="text-sm font-bold">Consistencia del 100%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="card-bento p-8 bg-zinc-50 border-zinc-100">
                    <h3 className="text-lg font-black tracking-tight mb-6">Inversión de Tiempo por Proyecto</h3>
                    <div className="space-y-6">
                       {projects.length > 0 ? projects.slice(0, 4).map((p, i) => {
                         const projectTasks = tasks.filter(t => t.project_id === p.id);
                         const time = projectTasks.reduce((acc, t) => acc + (t.total_time_spent || 0), 0);
                         const percentage = Math.max(5, Math.min(100, (time / (tasks.reduce((acc, t) => acc + (t.total_time_spent || 0), 0) || 1)) * 100));
                         return (
                           <div key={p.id} className="space-y-2">
                             <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                               <span className="text-zinc-500">{p.name}</span>
                               <span className="text-black">{Math.floor(time / 60)} min</span>
                             </div>
                             <div className="h-4 bg-zinc-200 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  className="h-full"
                                  style={{ backgroundColor: p.color }}
                                />
                             </div>
                           </div>
                         );
                       }) : (
                         <div className="py-12 text-center text-zinc-400 font-medium">Crea proyectos para ver analíticas.</div>
                       )}
                    </div>
                 </div>

                 <div className="card-bento p-8 bg-zinc-50 border-zinc-100 flex flex-col justify-center items-center text-center gap-6">
                    <div className="w-20 h-20 bg-yellow-400/10 rounded-full flex items-center justify-center text-yellow-500 border border-yellow-400/20">
                       <Brain className="w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-tight">Tu flujo está en calma.</h3>
                      <p className="text-zinc-500 font-medium max-w-[250px] mt-2">
                        Has mantenido un ritmo saludable. El 90% de tus tareas críticas se completan antes de las 2 PM.
                      </p>
                    </div>
                    <button className="text-black font-bold text-xs uppercase tracking-widest hover:underline flex items-center gap-2">
                      Optimizar mi ritual mañana <ChevronRight className="w-4 h-4" />
                    </button>
                 </div>
              </div>

              <div className="flex justify-center pb-20 md:pb-0">
                 <button 
                  onClick={() => {
                    playHaptic('click');
                    alert("¡Reporte de Insights generado! Recibirás un resumen en tu WhatsApp.");
                  }}
                  className="apple-button flex items-center gap-3 px-10 py-5"
                 >
                    <Download className="w-5 h-5" />
                    Descargar Reporte Semanal
                 </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'admin' && isAdmin && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 pb-24"
            >
              <div className="flex items-center justify-between px-1">
                <h2 className="text-2xl font-black tracking-tighter">Panel Maestro</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsAdminCreatingUser(true)}
                    className="bg-black text-white px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-sm"
                  >
                    + Nuevo
                  </button>
                   <button 
                    onClick={handleLogout}
                    className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors shadow-sm"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                 <div className="bg-white border border-zinc-100 p-4 rounded-[20px] shadow-sm">
                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-1">Usuarios Totales</p>
                    <p className="text-xl md:text-2xl font-black">{allUsers.length}</p>
                 </div>
                 <div className="bg-white border border-zinc-100 p-4 rounded-[20px] shadow-sm">
                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-1">Pagos Pendientes</p>
                    <p className="text-xl md:text-2xl font-black text-amber-500">{allPayments.filter(p => p.status === 'pending').length}</p>
                 </div>
                 <div className="bg-white border border-zinc-100 p-4 rounded-[20px] shadow-sm hidden md:block">
                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-1">Activos</p>
                    <p className="text-xl md:text-2xl font-black text-emerald-500">{allUsers.filter(u => u.subscription_status === 'active').length}</p>
                 </div>
                 <div className="bg-white border border-zinc-100 p-4 rounded-[20px] shadow-sm hidden md:block">
                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-1">Conversión</p>
                    <p className="text-xl md:text-2xl font-black text-blue-500">{allUsers.length > 0 ? Math.round((allUsers.filter(u => u.subscription_status === 'active').length / allUsers.length) * 100) : 0}%</p>
                 </div>
              </div>

              {isAdminCreatingUser && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-5 md:p-8 rounded-[24px] md:rounded-[32px] border border-border shadow-2xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Nuevo Usuario Manual</h3>
                    <button onClick={() => setIsAdminCreatingUser(false)} className="text-zinc-300 hover:text-black">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={createManualUser} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input 
                      placeholder="Nombre Completo"
                      className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-xs md:text-sm outline-none focus:ring-2 ring-black font-bold"
                      value={newAdminUser.full_name}
                      onChange={e => setNewAdminUser({...newAdminUser, full_name: e.target.value})}
                      required
                    />
                    <input 
                      placeholder="Email"
                      type="email"
                      className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-xs md:text-sm outline-none focus:ring-2 ring-black font-bold"
                      value={newAdminUser.email}
                      onChange={e => setNewAdminUser({...newAdminUser, email: e.target.value})}
                      required
                    />
                    <input 
                      placeholder="Teléfono móvil"
                      className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-xs md:text-sm outline-none focus:ring-2 ring-black font-bold"
                      value={newAdminUser.phone_number}
                      onChange={e => setNewAdminUser({...newAdminUser, phone_number: e.target.value})}
                      required
                    />
                    <select 
                      className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-xs md:text-sm outline-none focus:ring-2 ring-black font-bold"
                      value={newAdminUser.subscription_status}
                      onChange={e => setNewAdminUser({...newAdminUser, subscription_status: e.target.value})}
                    >
                      <option value="pending">Pendiente de Pago</option>
                      <option value="active">Acceso Activo</option>
                    </select>
                    <button className="md:col-span-2 bg-black text-white py-4 rounded-xl font-black text-xs md:text-sm uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-[0.98]">
                      Registrar Usuario
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Sección de Pagos Pendientes */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Pagos por Validar ({allPayments.filter(p => p.status === 'pending').length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allPayments.filter(p => p.status === 'pending').map(payment => (
                    <div key={payment.id} className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{payment.method === 'yape' ? 'YAPE' : 'BCP'}</p>
                          <p className="font-bold text-lg">{payment.phone}</p>
                        </div>
                        <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">Pendiente</div>
                      </div>
                      <div className="bg-zinc-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Código de Operación</p>
                        <p className="font-mono font-bold text-lg">{payment.payment_code}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => validatePayment(payment.id, payment.user_id, 'active')}
                          className="flex-1 bg-green-600 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-green-700 transition-all"
                        >
                          Validar y Activar
                        </button>
                        <button 
                          onClick={() => validatePayment(payment.id, payment.user_id, 'rejected')}
                          className="px-4 bg-red-50 text-red-600 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-100 transition-all"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                  {allPayments.filter(p => p.status === 'pending').length === 0 && (
                    <div className="col-span-full py-12 text-center bg-zinc-50 rounded-[32px] border border-dashed border-zinc-200">
                      <p className="text-zinc-400 font-medium italic">No hay pagos pendientes de validación</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-[24px] md:rounded-[32px] border border-border overflow-hidden shadow-sm">
                {/* Desktop View Table */}
                <table className="w-full text-left border-collapse hidden md:table">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-border">
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-text-sub">Usuario</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-text-sub">Teléfono</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-text-sub">Suscripción</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-text-sub text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {allUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold">{u.full_name?.[0] || 'U'}</span>
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-bold">{u.full_name || 'Sin nombre'}</div>
                              <div className="text-[9px] text-text-sub uppercase tracking-wider">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-xs font-medium">{u.phone_number || 'N/A'}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                            u.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {u.subscription_status === 'active' ? 'Activo' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => updateUserSubscription(u.id, u.subscription_status === 'active' ? 'pending' : 'active')}
                              className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all active:scale-95 ${
                                u.subscription_status === 'active' ? 'bg-zinc-100 text-black hover:bg-zinc-200' : 'bg-black text-white hover:bg-zinc-800'
                              }`}
                            >
                              {u.subscription_status === 'active' ? 'Suspender' : 'Activar'}
                            </button>
                            <button 
                              onClick={() => deleteUser(u.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar Usuario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile View Cards */}
                <div className="md:hidden divide-y divide-border">
                  {allUsers.map((u) => (
                    <div key={u.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden border border-zinc-100">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold">{u.full_name?.[0] || 'U'}</span>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-black tracking-tight">{u.full_name || 'Sin nombre'}</div>
                            <div className="text-[10px] text-text-sub font-bold uppercase tracking-widest">{u.phone_number || 'Sin teléfono'}</div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.1em] ${
                          u.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {u.subscription_status === 'active' ? 'ACT' : 'PEN'}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400 font-medium truncate">{u.email}</div>
                      <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => updateUserSubscription(u.id, u.subscription_status === 'active' ? 'pending' : 'active')}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${
                            u.subscription_status === 'active' ? 'bg-white border-zinc-200 text-black' : 'bg-black border-black text-white'
                          }`}
                        >
                          {u.subscription_status === 'active' ? 'Suspender' : 'Activar'}
                        </button>
                        <button 
                          onClick={() => deleteUser(u.id)}
                          className="px-4 bg-red-50 text-red-500 rounded-xl border border-red-100 flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'reminders' && (
            <motion.div 
              key="reminders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-100 pb-6">
                <div className="text-left">
                  <h1 className="text-3xl font-black tracking-tight">Recordatorios y Compromiso</h1>
                  <p className="text-text-sub font-medium">Gestiona tus avisos y sincroniza tu plan diario con WhatsApp.</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      setQuickActionType('reminder');
                      setShowQuickAction(true);
                    }}
                    className="apple-button flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Recordatorio
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"
                    title="Cerrar Sesión"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* List of active reminders */}
                <div className="md:col-span-2 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-text-sub ml-1">Tus Recordatorios Activos</h3>
                  <div className="bg-white border border-border rounded-[32px] overflow-hidden divide-y divide-border">
                    {tasks.filter(t => t.reminder_active && !t.is_completed).length > 0 ? (
                      tasks.filter(t => t.reminder_active && !t.is_completed).map(r => (
                        <div key={r.id} className="flex items-center justify-between p-5 hover:bg-zinc-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center">
                              <Volume2 className="w-5 h-5" />
                            </div>
                            <div>
                               <p className="font-bold text-sm">{r.title}</p>
                               <div className="flex items-center gap-2 text-[10px] text-text-sub font-bold uppercase tracking-widest">
                                 <Clock className="w-3 h-3" />
                                 <span>{r.scheduled_time || 'Sin hora'}</span>
                               </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => toggleTask(r.id)}
                            className="p-2 text-zinc-300 hover:text-emerald-500 transition-colors"
                          >
                            <CheckCircle2 className="w-6 h-6" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto text-zinc-300">
                           <Clock className="w-8 h-8" />
                        </div>
                        <p className="text-zinc-400 font-medium">No tienes recordatorios pendientes.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* WhatsApp Section */}
                <div className="space-y-6">
                  <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[32px] text-center space-y-6">
                    <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
                      <MessageSquare className="w-8 h-8 fill-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-emerald-950">Envío a WhatsApp</h3>
                      <p className="text-emerald-700/70 text-sm mt-2">Externaliza tu compromiso para fijar tu enfoque hoy.</p>
                    </div>
                    
                    <div className="bg-white/50 p-4 rounded-2xl text-left">
                       <p className="text-[10px] font-bold text-emerald-600 uppercase mb-2">Resumen Actual</p>
                       <p className="text-xs font-mono text-emerald-900 line-clamp-4 italic border-l-2 border-emerald-200 pl-2">
                         🎯 ENFOQUE: {focusTask?.title || 'Pendiente'}\n
                         📝 TAREAS: {tasks.filter(t => !t.is_completed && t.is_for_today).length} listas
                       </p>
                    </div>

                    <button 
                      onClick={generateWhatsAppReminder}
                      className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-100"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Sincronizar Ya
                    </button>
                    <p className="text-[10px] text-emerald-600/50 font-bold uppercase tracking-widest">Sincroniza cada mañana</p>
                  </div>

                  <div className="bg-zinc-900 p-6 rounded-[32px] text-white space-y-2">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                       <Zap className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                       Diferencia Clave
                    </h4>
                    <p className="text-xs text-white/60 leading-relaxed">
                      La <strong>Tarea</strong> es para tu flujo de trabajo. <br/>
                      El <strong>Recordatorio</strong> es para tu mente reactiva. MAR sincroniza ambos para que nada escape a tu control.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {user && !loading && !isFocusMode && (
        <div className="mobile-nav md:hidden">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`mobile-nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
          >
            <ListTodo className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Tareas</span>
          </button>
          <button 
            onClick={() => setActiveTab('projects')}
            className={`mobile-nav-item ${activeTab === 'projects' ? 'active' : ''}`}
          >
            <FolderKanban className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Proyectos</span>
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`mobile-nav-item ${activeTab === 'stats' ? 'active' : ''}`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Insights</span>
          </button>
           {isAdmin && (
             <button 
              onClick={() => setActiveTab('admin')}
              className={`mobile-nav-item ${activeTab === 'admin' ? 'active' : ''}`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase tracking-tighter">Admin</span>
            </button>
           )}
        </div>
      )}
    </div>
  );
}

function Portal({ user, setUser }: { user: any, setUser: (user: any) => void }) {
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+51');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'landing' | 'register' | 'payment' | 'success' | 'login' | 'profile-setup'>('login');
  const [formData, setFormData] = useState({ name: '', phone: '', occupation: 'Estudiante', otherOccupation: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [method, setMethod] = useState<'yape' | 'bcp' | null>(null);
  const [paymentCode, setPaymentCode] = useState('');
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  const [otpSent, setOtpSent] = useState(false);

  const handleLogoClick = () => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    
    const newClicks = logoClicks + 1;
    setLogoClicks(newClicks);
    
    if (newClicks >= 3) {
      setShowAdminLogin(true);
      setLogoClicks(0);
    } else {
      clickTimer.current = setTimeout(() => {
        setLogoClicks(0);
      }, 2000);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'admin2024') {
      localStorage.setItem('mar_admin_auth', 'true');
      window.location.reload();
    } else {
      setError('Contraseña administrativa incorrecta');
      setAdminPassword('');
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setError('Ingresa tu número de WhatsApp');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const fullPhone = countryCode + phone;
      
      // 0. Verificar si el usuario existe
      const { data: profile, error: profileError } = await supabase
        .schema('mar')
        .from('profiles')
        .select('*')
        .eq('phone_number', fullPhone)
        .maybeSingle();
      
      if (!profile) {
        setError('Este número no está registrado. Por favor, regístrate primero en la página principal.');
        setLoading(false);
        return;
      }

      const code = Math.floor(1000 + Math.random() * 9000).toString();
      
      // 1. Guardar en Supabase para verificación posterior
      const { error: otpError } = await supabase
        .schema('mar')
        .from('otps')
        .insert([{
          phone_number: fullPhone,
          code: code,
          expires_at: new Date(Date.now() + 10 * 60000).toISOString()
        }]);

      if (otpError) throw otpError;

      // 2. Llamar a N8N para enviar el WhatsApp
      const n8nUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://webhook.red51.site/webhook/mar-otp';
      
      try {
        await fetch(n8nUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: fullPhone.replace('+', ''), // Formato Evolution API: sin el +
            otp: code,
            name: 'Usuario MAR' // Puedes pasar el nombre si lo tienes
          })
        });
      } catch (webhookErr) {
        console.error('Error enviando a N8N:', webhookErr);
        // No lanzamos error aquí para que el usuario pueda usar el código de simulación si el admin lo ve en la DB
      }

      // Guardamos el teléfono para la verificación
      localStorage.setItem('mar_pending_phone', fullPhone);
      setOtpSent(true);
      
      // Solo mostramos el alert en desarrollo o si falla el envío real
      if (import.meta.env.DEV) {
        alert(`CÓDIGO (Simulación): ${code}`);
      }
    } catch (err: any) {
      console.error('OTP request error:', err);
      setError('No se pudo enviar el código. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError('Ingresa el código enviado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fullPhone = countryCode + phone || localStorage.getItem('mar_pending_phone');
      
      const { data, error: verifyError } = await supabase
        .schema('mar')
        .from('otps')
        .select('*')
        .eq('phone_number', fullPhone)
        .eq('code', otp)
        .eq('is_verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (verifyError || !data) {
        throw new Error('Código inválido o expirado');
      }

      // Marcar OTP como usado
      await supabase.schema('mar').from('otps').update({ is_verified: true }).eq('id', data.id);

      // Buscar perfil
      const { data: profile } = await supabase
        .schema('mar')
        .from('profiles')
        .select('*')
        .eq('phone_number', fullPhone)
        .single();

      if (profile) {
        localStorage.setItem('mar_verified_phone', fullPhone);
        setUser(profile);
        
        // Si el usuario es nuevo (no tiene foto), configuramos perfil
        if (!profile.photo_url) {
          setStep('profile-setup');
        } else {
          localStorage.setItem('mar_auth', 'true');
          window.location.reload();
        }
      } else {
        // Redirigir a registro si no existe perfil
        setStep('register');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'Error al verificar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Intentar guardar en Supabase (tabla 'profiles')
      const { error: supabaseError } = await supabase
        .schema('mar')
        .from('profiles')
        .insert([{
          id: crypto.randomUUID(), // Generamos un ID manual ya que es simulación de login
          full_name: formData.name,
          phone_number: countryCode + formData.phone,
          occupation: formData.occupation,
          other_occupation: formData.otherOccupation,
          subscription_status: 'pending',
          created_at: new Date().toISOString()
        }]);

      if (supabaseError) {
        console.warn('Supabase profile creation failed:', supabaseError.message);
      }

      localStorage.setItem('mar_verified_phone', countryCode + formData.phone);
      localStorage.setItem('mar_temp_user', JSON.stringify(formData));
      setStep('payment');
    } catch (err: any) {
      console.error('Registration error:', err);
      // Fallback
      setStep('payment');
    } finally {
      setLoading(false);
    }
  };

  const handleFreeActivation = () => {
    setStep('success');
  };

  const handleProfileComplete = async () => {
    setLoading(true);
    try {
      // Por ahora simulamos la subida de foto actualizando con un avatar generado
      const { error: updateError } = await supabase
        .schema('mar')
        .from('profiles')
        .update({ 
          photo_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.full_name || 'user'}` 
        })
        .eq('phone_number', user?.phone_number);

      if (updateError) throw updateError;

      localStorage.setItem('mar_auth', 'true');
      window.location.reload();
    } catch (err: any) {
      console.error('Error completing profile:', err);
      setError('No se pudo guardar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'landing') {
    return (
      <div className="min-h-screen bg-white font-sans overflow-x-hidden text-zinc-900">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-[100] border-b border-zinc-100 flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-lg">
              <Lightbulb className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            </div>
            <span className="text-xl font-bold tracking-tighter">MAR</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setStep('login')}
              className="text-sm font-bold text-zinc-600 hover:text-black transition-colors"
            >
              Entrar
            </button>
            <button 
              onClick={() => setStep('register')}
              className="bg-black text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-lg"
            >
              Comenzar Ahora
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative pt-32 pb-24 px-6 flex flex-col items-center text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-zinc-50 to-transparent -z-10" />
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-zinc-100 px-4 py-2 rounded-full mb-8"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Nuevo: Sincronización con WhatsApp</span>
          </motion.div>

          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-3xl md:text-5xl font-black tracking-tighter mb-6 leading-[1] max-w-4xl"
          >
            Ordena tu caos. <br />
            Configura tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-700 via-black to-zinc-700">éxito.</span>
          </motion.h1>

          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-base md:text-lg font-medium text-zinc-500 max-w-2xl mx-auto leading-relaxed mb-10"
          >
            MAR es el sistema inteligente para capturar ideas, gestionar proyectos y dominar tus tareas. 
            Menos ruido mental, más ejecución real.
          </motion.p>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-3 w-full max-w-md"
          >
            <button 
              onClick={() => setStep('register')}
              className="flex-1 bg-black text-white px-6 py-4 rounded-xl font-bold text-base hover:bg-zinc-800 transition-all shadow-xl flex items-center justify-center gap-2 group"
            >
              Comenzar Gratis
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => document.getElementById('methodology')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-6 py-4 rounded-xl font-bold text-base border border-zinc-200 hover:bg-zinc-50 transition-all"
            >
              Ver Metodología
            </button>
          </motion.div>
        </section>

        {/* Methodology Section */}
        <section id="methodology" className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <header className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-5">Metodología MAR</h2>
              <p className="text-base text-zinc-500 max-w-2xl mx-auto">
                No es solo una lista de tareas, es un sistema diseñado para <strong>liberar tu mente</strong> y <strong>ordenar tu éxito</strong> mediante tres pilares.
              </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <PillarCard 
                icon={<Brain className="w-8 h-8" />} 
                title="Mente Libre" 
                desc="Captura cada idea al instante para eliminar el ruido mental y el estrés." 
                color="bg-zinc-900 text-white"
                index={0}
              />
              <PillarCard 
                icon={<Waves className="w-8 h-8" />} 
                title="Alivio y Orden" 
                desc="Organiza tus pensamientos en proyectos y tareas claras y accionables." 
                color="bg-zinc-50 border border-zinc-100"
                index={1}
              />
              <PillarCard 
                icon={<Rocket className="w-8 h-8" />} 
                title="Realidad y Acción" 
                desc="Comprométete con tu plan y ejecuta con enfoque total cada día." 
                color="bg-zinc-50 border border-zinc-100"
                index={2}
              />
            </div>
          </div>
        </section>

        {/* "Who is it for?" Section */}
        <section className="py-24 px-6 bg-zinc-50 relative overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={{
                  visible: { 
                    transition: { 
                      staggerChildren: 0.2 
                    } 
                  }
                }}
              >
                <motion.h2 
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  className="text-4xl font-black tracking-tighter mb-10 leading-tight"
                >
                  Hecho para quienes hacen <br/>que las cosas pasen.
                </motion.h2>
                <div className="space-y-4 group/list">
                  <PersonaItem 
                    icon={<GraduationCap className="w-6 h-6" />}
                    title="Estudiantes"
                    desc="Domina tus cursos, proyectos de tesis y metas académicas sin perder la calma."
                  />
                  <PersonaItem 
                    icon={<Briefcase className="w-6 h-6" />}
                    title="Emprendedores"
                    desc="Organiza tu roadmap, ventas y tareas administrativas en un solo lugar centralizado."
                  />
                  <PersonaItem 
                    icon={<Users className="w-6 h-6" />}
                    title="Creadores y Freelancers"
                    desc="Gestiona múltiples clientes y proyectos de forma profesional con reportes automáticos."
                  />
                </div>
              </motion.div>
              <div className="relative">
                <motion.div 
                   animate={{ 
                     scale: [1, 1.2, 1],
                     opacity: [0.1, 0.2, 0.1] 
                   }}
                   transition={{ duration: 8, repeat: Infinity }}
                   className="absolute inset-0 bg-yellow-400 blur-[100px] rounded-full" 
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  animate={{ y: [0, -15, 0] }}
                  transition={{ 
                    opacity: { duration: 1 },
                    scale: { duration: 1 },
                    y: { duration: 6, repeat: Infinity, ease: "easeInOut" }
                  }}
                  viewport={{ once: true }}
                >
                  <img 
                    src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=1000" 
                    alt="Productivity" 
                    className="rounded-[48px] shadow-2xl relative z-10 border border-zinc-100"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Floating Action Badge */}
                  <motion.div
                    animate={{ x: [0, 5, 0], y: [0, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute -top-6 -right-6 bg-white p-6 rounded-3xl shadow-xl z-20 border border-zinc-100 hidden md:block"
                  >
                    <div className="p-3 bg-yellow-400 rounded-2xl text-black">
                       <Zap className="w-6 h-6 fill-current" />
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Flows Section */}
        <section className="py-24 px-6 relative overflow-hidden">
          {/* Decorative floating elements */}
          <motion.div 
            animate={{ y: [0, -20, 0], rotate: [0, 45, 0] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-20 left-10 w-32 h-32 bg-yellow-400/5 rounded-full blur-3xl -z-10"
          />
          <motion.div 
            animate={{ y: [0, 30, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 12, repeat: Infinity }}
            className="absolute bottom-40 right-10 w-48 h-48 bg-blue-400/5 rounded-full blur-3xl -z-10"
          />
          <motion.div 
            animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute top-1/2 left-1/4 w-24 h-24 bg-emerald-400/5 rounded-full blur-2xl -z-10"
          />

          <div className="max-w-6xl mx-auto space-y-16">
            <motion.h2 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-black tracking-tighter text-center bg-clip-text text-transparent bg-gradient-to-r from-black via-zinc-500 to-black"
            >
              Un flujo de trabajo imparable
            </motion.h2>
            
            <div className="space-y-12">
              <FlowSection 
                icon={<FolderKanban className="w-8 h-8" />}
                title="Flujo de Proyectos: La Estructura"
                desc="Los proyectos son los contenedores de tus grandes metas. Su finalidad es darte una visión panorámica de tus objetivos."
                imageUrl="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80"
                steps={[
                  "Definición: Crea proyectos por metas específicas.",
                  "Desglose: Añade todas las tareas necesarias dentro.",
                  "Progreso: Visualiza el avance real hacia la meta final."
                ]}
                color="amber"
              />

              <FlowSection 
                icon={<CheckCircle2 className="w-8 h-8" />}
                title="Flujo de Tareas: La Acción Diaria"
                desc="Las tareas son pasos atómicos. Su finalidad es reducir la parálisis por análisis mediante la ejecución constante."
                imageUrl="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1200&q=80"
                reverse
                steps={[
                  "Captura Rápida: Usa el botón global '+' para soltar ideas.",
                  "Programación: Asigna horas y activa avisos críticos.",
                  "Enfoque: Elige UNA tarea como prioridad del día."
                ]}
                color="blue"
              />

              <FlowSection 
                icon={<Smartphone className="w-8 h-8" />}
                title="Flujo de WhatsApp: El Compromiso"
                desc="WhatsApp actúa como tu recordatorio externo. Su finalidad es sacarte de la app y ponerte en el mundo real."
                imageUrl="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80"
                steps={[
                  "Resumen: Genera una lista de tu Enfoque + Tareas hoy.",
                  "Envío: Recibe el reporte en tu WhatsApp personal.",
                  "Alivio: Tu mente descansa al saber que el plan está trazado."
                ]}
                color="emerald"
              />
            </div>
          </div>
        </section>

        {/* Call to Action Final */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto bg-zinc-900 text-white p-10 md:p-16 rounded-[40px] shadow-2xl relative overflow-hidden text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-[80px]" />
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-6 leading-tight">¿Listo para transformar <br /> tus ideas en resultados?</h2>
            <p className="text-zinc-400 text-base md:text-lg mb-8 max-w-2xl mx-auto">Únete a cientos de estudiantes y emprendedores que ya dominan su tiempo con MAR.</p>
            <button 
              onClick={() => setStep('register')}
              className="bg-white text-black px-10 py-4 rounded-xl font-black text-lg hover:scale-105 transition-all shadow-xl"
            >
              Comenzar Ahora
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 px-6 border-t border-zinc-100 text-center">
          <div className="flex justify-center gap-8 mb-8 text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px]">
            <a href={`https://wa.me/${CONFIG.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">WhatsApp</a>
            <a href={CONFIG.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Instagram</a>
            <a href={CONFIG.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">Facebook</a>
            <button 
              onClick={() => setShowAdminLogin(true)} 
              className="text-zinc-200 hover:text-black transition-colors"
              title="Admin"
            >
              <Star className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white">
              <Lightbulb className="w-4 h-4 fill-yellow-400" />
            </div>
            <span className="font-bold tracking-tighter">MAR App</span>
          </div>
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-widest">Minimalismo • Acción • Resultados</p>
          <p className="text-zinc-300 text-[10px] mt-6">© 2024. Todos los derechos reservados.</p>
        </footer>
      </div>
    );
  }

  if (step === 'login') {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center p-4 md:p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-[500px] w-full bg-white rounded-[40px] md:rounded-[60px] p-8 md:p-16 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.05)] border border-white relative"
        >
          <button 
            onClick={() => setStep('landing')}
            className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-zinc-400 hover:text-black transition-colors font-bold"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden md:inline">Regresar</span>
          </button>

          <div className="text-center space-y-8 md:space-y-10">
            <div className="space-y-3 md:space-y-4">
              <h1 className="text-3xl md:text-[44px] font-black tracking-tight text-black">Bienvenido</h1>
              <p className="text-zinc-500 font-medium text-base md:text-lg leading-tight px-2 md:px-4">
                Si ya estás registrado, solo ingresa tu número móvil y disfruta.
              </p>
            </div>

            <form onSubmit={handleRequestOtp} className="space-y-6 md:space-y-8">
              <div className="flex gap-2 md:gap-3">
                <div className="relative shrink-0">
                  <select 
                    className="appearance-none bg-[#FCFCFC] border border-[#F0F0F0] rounded-[20px] md:rounded-[24px] pl-4 pr-10 py-4 md:py-5 font-bold text-black outline-none focus:ring-4 ring-black/5 transition-all cursor-pointer h-full text-base md:text-lg"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                  >
                    {LATAM_COUNTRIES.map(c => (
                      <option key={c.code + c.name} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                </div>
                <input 
                  required
                  placeholder="Teléfono móvil"
                  className="flex-1 bg-[#FCFCFC] border border-[#F0F0F0] rounded-[20px] md:rounded-[24px] px-6 md:px-8 py-4 md:py-5 text-base md:text-lg font-bold outline-none focus:ring-4 ring-black/5 transition-all text-black placeholder:text-zinc-400"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {error && <p className="text-red-500 text-sm font-bold">{error}</p>}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-black text-white py-5 md:py-6 rounded-[24px] md:rounded-[28px] text-lg md:text-xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10 flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Entrar'
                )}
              </button>
            </form>

            <div className="space-y-6 pt-2 md:pt-4">
              <button 
                 onClick={() => {
                   const pass = window.prompt('Introduce la clave de administrador:');
                   if (pass === 'admin2024') {
                     localStorage.setItem('mar_admin_auth', 'true');
                     window.location.reload();
                   } else if (pass !== null) {
                     alert('Clave incorrecta');
                   }
                 }}
                 className="text-[10px] text-zinc-300 hover:text-black font-black uppercase tracking-[0.2em] transition-colors"
              >
                ACCESO RÁPIDO (DESARROLLADOR)
              </button>
              <div className="h-px bg-zinc-100 w-full" />
              <div className="space-y-1">
                <p className="text-sm font-medium italic text-zinc-400 text-center">¿Aún no tienes cuenta?</p>
                <button 
                  onClick={() => setStep('landing')}
                  className="text-base md:text-lg font-black text-black hover:opacity-70 transition-opacity"
                >
                  Comenzar ahora / Regístrate ya
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === 'register') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans relative">
        <button 
          onClick={() => setStep('landing')}
          className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-black transition-colors font-bold"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Regresar</span>
        </button>
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleRegister}
          className="max-w-md w-full space-y-5 bg-zinc-50 p-10 rounded-[48px]"
        >
          <h2 className="text-3xl font-black tracking-tighter text-center mb-4">Crea tu cuenta</h2>
          
          <div className="space-y-4">
            <input 
              required
              placeholder="Nombre Completo"
              className="w-full bg-white border-none rounded-[22px] px-6 py-5 outline-none focus:ring-2 ring-black font-bold"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
            <div className="flex gap-2">
              <select 
                className="bg-white border-none rounded-[22px] px-4 py-5 outline-none focus:ring-2 ring-black font-bold"
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
              >
                {LATAM_COUNTRIES.map(c => (
                  <option key={c.code + c.name} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <input 
                required
                type="tel"
                placeholder="Teléfono"
                className="flex-1 bg-white border-none rounded-[22px] px-6 py-5 outline-none focus:ring-2 ring-black font-bold"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            
            <select 
              className="w-full bg-white border-none rounded-[22px] px-6 py-5 outline-none focus:ring-2 ring-black font-bold"
              value={formData.occupation}
              onChange={e => setFormData({...formData, occupation: e.target.value})}
            >
              <option value="Estudiante">Estudiante</option>
              <option value="Emprendedor">Emprendedor</option>
              <option value="Creador">Creador</option>
              <option value="Freelancer">Freelancer</option>
              <option value="Otro">Otro</option>
            </select>
            
            {formData.occupation === 'Otro' && (
              <input 
                required
                placeholder="Especifique su ocupación"
                className="w-full bg-white border-none rounded-[22px] px-6 py-5 outline-none focus:ring-2 ring-black font-bold"
                value={formData.otherOccupation}
                onChange={e => setFormData({...formData, otherOccupation: e.target.value})}
              />
            )}
          </div>
          
          <button className="apple-button w-full py-5 mt-4">Siguiente</button>
          
          <p className="text-center text-zinc-400 text-xs mt-4">
            Al registrarte aceptas nuestros términos y condiciones.
          </p>
        </motion.form>
      </div>
    );
  }

  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-white p-6 font-sans flex flex-col items-center justify-center relative">
        <button 
          onClick={() => setStep('landing')}
          className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-black transition-colors font-bold"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Regresar</span>
        </button>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full space-y-8 bg-zinc-50 p-10 rounded-[56px] shadow-sm border border-zinc-100"
        >
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black tracking-tighter">Portal de Pago</h2>
            <p className="text-zinc-500 font-medium italic">Escanea el código para activar tu acceso</p>
          </div>
          
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-zinc-50 text-center space-y-4">
             <div className="w-48 h-48 bg-purple-50 mx-auto rounded-3xl flex items-center justify-center border-4 border-purple-600 shadow-xl overflow-hidden group">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=YapeMAR" 
                  alt="QR Yape" 
                  className="w-40 h-40 group-hover:scale-110 transition-transform duration-500" 
                />
             </div>
             <div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-1">Nombre</p>
                <p className="text-2xl font-black text-purple-600">MAR App Oficial</p>
             </div>
          </div>

          <div className="space-y-4">
            <div className="p-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-[24px]">
              <input 
                placeholder="Ingresa tu Código de Operación"
                className="w-full bg-white border-none rounded-[22px] px-6 py-5 outline-none font-black text-center text-lg placeholder:text-zinc-300 placeholder:font-bold"
                value={paymentCode}
                onChange={e => setPaymentCode(e.target.value)}
              />
            </div>
            
            <button 
              onClick={() => setStep('success')}
              className="apple-button w-full py-5 flex items-center justify-center gap-2 group"
            >
              <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              Enviar Pago
            </button>

            <button 
              onClick={handleFreeActivation}
              className="w-full py-4 text-sm font-bold text-zinc-400 hover:text-black transition-colors"
            >
              Probar modo FREE (Beta)
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-32 h-32 bg-emerald-500 rounded-[40px] flex items-center justify-center mb-8 shadow-2xl shadow-emerald-200"
        >
          <CheckCircle2 className="w-16 h-16 text-white" />
        </motion.div>
        
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
        >
          <h2 className="text-4xl font-black tracking-tighter mb-4 italic">¡Registro Exitoso!</h2>
          <p className="text-xl font-bold text-zinc-500 mb-12 max-w-sm mx-auto leading-relaxed">
            Tu cuenta ha sido creada. Ahora puedes ingresar al App con tu número de teléfono para recibir tu código de acceso.
          </p>
        </motion.div>

        <button 
          onClick={() => setStep('login')}
          className="apple-button px-10 py-4 group mx-auto mb-10"
        >
          Ir al App de MAR
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    );
  }

  if (step === 'profile-setup') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-6 bg-zinc-50 p-8 rounded-[40px] border border-zinc-100"
        >
          <div className="space-y-4">
             <div className="w-20 h-20 bg-black rounded-3xl mx-auto flex items-center justify-center text-white shadow-xl">
                <Users className="w-8 h-8" />
             </div>
             <h2 className="text-2xl font-black tracking-tighter">¡Hola, {user?.full_name?.split(' ')[0]}! 👋</h2>
             <p className="text-zinc-500 font-medium text-sm">Ya casi estamos. Completa tu perfil subiendo una foto.</p>
          </div>

          <div className="space-y-6">
            <div className="w-40 h-40 bg-white rounded-full mx-auto border-4 border-dashed border-zinc-200 flex items-center justify-center cursor-pointer hover:border-black transition-all group overflow-hidden">
               <input type="file" className="hidden" id="photo-upload" />
               <label htmlFor="photo-upload" className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer">
                  <Plus className="w-8 h-8 text-zinc-300 group-hover:text-black" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-black">Subir Foto</span>
               </label>
            </div>

            <button 
              onClick={handleProfileComplete} 
              disabled={loading}
              className="apple-button w-full py-5 flex items-center justify-center gap-2"
            >
              {loading ? 'Guardando...' : 'Completar Perfil'}
              <ChevronRight className="w-5 h-5" />
            </button>

            <button 
              onClick={() => {
                localStorage.setItem('mar_auth', 'true');
                window.location.reload();
              }}
              className="text-sm font-bold text-zinc-400 hover:text-black"
            >
              Saltar por ahora
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 overflow-hidden relative font-sans">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zinc-100 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-50 rounded-full blur-[120px] -z-10" />

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="max-w-md w-full space-y-10 text-center relative"
      >
        <div className="flex flex-col items-center justify-center">
          {/* Animated Bulb rising and glowing */}
          <motion.div 
            onClick={handleLogoClick}
            className="w-20 h-20 rounded-[28px] flex items-center justify-center text-white z-10 cursor-pointer shadow-2xl"
            initial={{ y: 100, opacity: 0, scale: 0.5 }}
            animate={{ 
              y: 0, 
              opacity: 1, 
              scale: 1,
              backgroundColor: ["#000000", "#000000", "#eab308"],
              boxShadow: [
                "0 20px 40px rgba(0,0,0,0.1)",
                "0 20px 40px rgba(0,0,0,0.1)",
                "0 0 60px rgba(234,179,8,0.4)"
              ]
            }}
            transition={{ 
              duration: 2, 
              ease: [0.22, 1, 0.36, 1],
              delay: 0.2,
              times: [0, 0.6, 1]
            }}
          >
            <motion.div
              animate={{ 
                color: ["#ffffff", "#ffffff", "#000000"],
                scale: [1, 1, 1.1, 1]
              }}
              transition={{ duration: 2, delay: 0.2, times: [0, 0.6, 0.8, 1] }}
            >
              <Lightbulb className="w-10 h-10 fill-current" />
            </motion.div>
          </motion.div>

          {/* Animated Text MAR joining */}
          <div className="mt-6 overflow-hidden flex justify-center">
            <motion.h1 
              initial={{ letterSpacing: "1em", opacity: 0, filter: "blur(10px)" }}
              animate={{ letterSpacing: "-0.05em", opacity: 1, filter: "blur(0px)" }}
              transition={{ 
                duration: 1.5, 
                ease: [0.22, 1, 0.36, 1],
                delay: 0.8
              }}
              className="text-7xl md:text-8xl font-black tracking-tighter"
            >
              MAR
            </motion.h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, duration: 0.8 }}
            className="mt-3 space-y-2"
          >
            <p className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 line-clamp-1">
              Tu mar de ideas aquí
            </p>
            <div className="flex justify-center gap-2 mt-2">
              <span className="bg-yellow-400 text-black text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest animate-pulse">
                Acceso Premium
              </span>
            </div>
            <p className="text-zinc-500 text-base md:text-lg font-medium leading-tight max-w-[240px] mx-auto">
              Libera tu mente. Siente el alivio del orden.
            </p>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 0.8 }}
          className="bg-white/70 backdrop-blur-xl p-6 md:p-8 rounded-[32px] md:rounded-[48px] border border-zinc-100 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)]"
        >
          {showAdminLogin ? (
            <form onSubmit={handleAdminLogin} className="space-y-6">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Acceso Administrativo</label>
                <input 
                  type="password" 
                  required
                  autoFocus
                  placeholder="Contraseña Admin"
                  className="w-full bg-zinc-50 border-none rounded-[22px] px-6 py-5 outline-none focus:ring-2 ring-black transition-all font-bold text-lg"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-4 rounded-2xl">{error}</p>}
              <button 
                className="apple-button w-full"
              >
                Entrar como Admin
              </button>
              <button 
                type="button"
                onClick={() => setShowAdminLogin(false)}
                className="w-full text-xs font-bold text-zinc-400 hover:text-black transition-colors uppercase tracking-widest"
              >
                Volver al acceso móvil
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              {!otpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Acceso con WhatsApp</label>
                    <div className="flex gap-2">
                       <select 
                         value={countryCode}
                         onChange={(e) => setCountryCode(e.target.value)}
                         className="bg-zinc-50 border-none rounded-[22px] px-4 outline-none focus:ring-2 ring-black font-bold"
                       >
                         {LATAM_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                       </select>
                       <input 
                         type="tel" 
                         required
                         placeholder="999 888 777"
                         className="flex-1 bg-zinc-50 border-none rounded-[22px] px-6 py-5 outline-none focus:ring-2 ring-black transition-all font-bold text-lg"
                         value={phone}
                         onChange={(e) => setPhone(e.target.value)}
                       />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="apple-button w-full py-5 flex items-center justify-center gap-2">
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Recibir Código'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Ingresa el Código</label>
                    <input 
                      type="text" 
                      required
                      placeholder="0000"
                      maxLength={4}
                      autoFocus
                      className="w-full bg-zinc-50 border-none rounded-[22px] px-6 py-5 outline-none focus:ring-2 ring-black transition-all font-bold text-lg tracking-[1em] text-center"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </div>
                  <button type="submit" disabled={loading} className="apple-button w-full py-5 flex items-center justify-center gap-2">
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verificar e Ingresar'}
                  </button>
                  <button type="button" onClick={() => setOtpSent(false)} className="text-xs font-bold text-zinc-400">Volver a intentar con otro número</button>
                </form>
              )}

              {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-4 rounded-2xl">{error}</p>}
              
              <div className="pt-4 border-t border-zinc-50">
                 <p className="text-xs text-zinc-400 mb-4 font-bold uppercase tracking-widest">¿Aún no tienes cuenta?</p>
                 <button 
                   onClick={() => setStep('register')}
                   className="text-sm font-bold text-black border-b-2 border-yellow-400 pb-0.5"
                 >
                   Regístrate aquí
                 </button>
              </div>
            </div>
          )}
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.6 }}
          className="text-xs text-zinc-400 font-medium italic"
        >
          "Libera tu mente. Siente el alivio del orden."
        </motion.p>
      </motion.div>
    </div>
  );
}

function PillarCard({ icon, title, desc, color, index }: { icon: ReactNode, title: string, desc: string, color: string, index: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className={`${color} p-8 rounded-[32px] shadow-sm flex flex-col gap-4 group hover:scale-[1.02] transition-transform`}
    >
      <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-black shadow-sm group-hover:bg-yellow-400 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function ProgressWaves({ progress }: { progress: number }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden opacity-10">
      <motion.div
        animate={{
          y: [`${100 - (progress * 0.8 + 10)}%`, `${100 - (progress * 0.8 + 12)}%`, `${100 - (progress * 0.8 + 10)}%`],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-x-[-100%] bottom-0 h-[200%] bg-gradient-to-t from-blue-400/30 to-transparent"
        style={{ borderRadius: '43% 57% 51% 49% / 30% 41% 59% 70%' }}
      />
      <motion.div
        animate={{
          y: [`${100 - (progress * 0.8 + 12)}%`, `${100 - (progress * 0.8 + 10)}%`, `${100 - (progress * 0.8 + 12)}%`],
          rotate: [0, 360],
        }}
        transition={{ 
          y: { duration: 15, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 40, repeat: Infinity, ease: "linear" }
        }}
        className="absolute inset-x-[-150%] bottom-0 h-[300%] bg-gradient-to-t from-emerald-400/20 to-transparent"
        style={{ borderRadius: '48% 52% 44% 56% / 48% 38% 62% 52%' }}
      />
    </div>
  );
}

function DeepFocusOverlay({ task, onClose, onComplete, onStopTimer, onStartTimer }: { 
  task: Task, 
  onClose: () => void, 
  onComplete: () => void,
  onStopTimer: () => void,
  onStartTimer: () => void
}) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      playHaptic('success');
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 text-white text-center"
    >
      <div className="absolute inset-0 opacity-20 overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-blue-900 rounded-full blur-[150px]"
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-emerald-900 rounded-full blur-[150px]"
        />
      </div>

      <button onClick={onClose} className="absolute top-6 right-6 p-4 hover:bg-white/10 rounded-full transition-colors z-[110]">
        <X className="w-6 h-6" />
      </button>

      <div className="relative z-[101] space-y-8 max-w-2xl w-full px-4">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-3">
          <span className="text-yellow-400 font-black uppercase tracking-[0.3em] text-[10px] md:text-xs flex items-center justify-center gap-2">
            <Target className="w-3.5 h-3.5 animate-pulse" /> Enfoque Profundo
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight">{task.title}</h2>
          <p className="text-zinc-400 text-base md:text-lg font-medium">{task.description || 'Respira. Enfócate. Logra.'}</p>
        </motion.div>

        <div className="space-y-8">
          <div className="text-[100px] md:text-[160px] font-thin tracking-tighter tabular-nums leading-none">
            {formatTime(timeLeft)}
          </div>
          <div className="flex flex-col md:flex-row gap-3 justify-center items-center">
            <button 
              onClick={() => {
                setIsActive(!isActive);
                if (!isActive) onStartTimer();
                else onStopTimer();
                playHaptic('focus');
              }}
              className="px-10 py-5 bg-white text-black rounded-full font-black text-sm md:text-base hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 w-full md:w-auto shadow-xl"
            >
              {isActive ? <Square className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black" />}
              {isActive ? 'Pausar' : 'Empezar'}
            </button>
            <button 
              onClick={() => {
                onComplete();
                onClose();
              }}
              className="px-10 py-5 bg-zinc-800 text-white rounded-full font-black text-sm md:text-base hover:bg-zinc-700 transition-all border border-zinc-700 w-full md:w-auto"
            >
              Finalizar Tarea
            </button>
          </div>
          <div className="pt-4">
            <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[9px]">Técnica Pomodoro • 25m</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PersonaItem({ icon, title, desc }: { icon: ReactNode, title: string, desc: string }) {
  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, x: -30 },
        visible: { opacity: 1, x: 0 }
      }}
      whileHover={{ 
        scale: 1.01,
        x: 8,
        backgroundColor: "rgba(255, 255, 255, 1)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
      }}
      className="flex gap-4 p-4 rounded-[24px] transition-all border border-transparent hover:border-zinc-100 group/item cursor-pointer group-hover/list:opacity-50 hover:!opacity-100 hover:z-10"
    >
      <motion.div 
        whileHover={{ rotate: [-5, 5, -5, 0], scale: 1.05 }}
        className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-zinc-400 shrink-0 group-hover/item:text-yellow-500 group-hover/item:shadow-lg group-hover/item:shadow-yellow-100 transition-all border border-zinc-50"
      >
        {icon}
      </motion.div>
      <div className="flex flex-col justify-center">
        <h4 className="font-black text-sm tracking-tight mb-0.5 group-hover/item:text-black transition-colors">{title}</h4>
        <p className="text-[10px] text-zinc-500 font-medium leading-tight group-hover/item:text-zinc-600 transition-colors">{desc}</p>
      </div>
    </motion.div>
  );
}

function FlowSection({ icon, title, desc, steps, color, imageUrl, reverse }: { 
  icon: ReactNode, 
  title: string, 
  desc: string, 
  steps: string[], 
  color: string,
  imageUrl: string,
  reverse?: boolean
}) {
  const colors: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100'
  };
  
  const stepColors: Record<string, string> = {
    amber: 'bg-amber-500 shadow-amber-200',
    blue: 'bg-blue-500 shadow-blue-200',
    emerald: 'bg-emerald-500 shadow-emerald-200'
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <motion.section 
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      viewport={{ once: true, margin: "-100px" }}
      className="bg-white p-8 md:p-12 rounded-[56px] shadow-sm hover:shadow-2xl hover:shadow-zinc-200/50 border border-zinc-100 transition-all duration-500 group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-zinc-50 to-transparent rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-700" />
      
      <div className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12`}>
        <div className="space-y-8 flex-1">
          <motion.div 
            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
            className={`w-16 h-16 rounded-[22px] flex items-center justify-center flex-shrink-0 shadow-lg ${colors[color] || 'bg-zinc-100'}`}
          >
            {icon}
          </motion.div>
          
          <div className="space-y-4">
            <h2 className="text-4xl font-black tracking-tight group-hover:text-black transition-colors">{title}</h2>
            <p className="text-zinc-500 leading-relaxed text-lg font-medium">{desc}</p>
          </div>

          <ul className="grid grid-cols-1 gap-5">
            {steps.map((step, i) => (
              <motion.li 
                key={i} 
                variants={itemVariants}
                className="flex items-center gap-4 text-base group/item"
              >
                <motion.span 
                  whileHover={{ scale: 1.2, rotate: 360 }}
                  className={`w-8 h-8 text-white rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-lg ${stepColors[color] || 'bg-zinc-900'}`}
                >
                  {i + 1}
                </motion.span>
                <span className="text-zinc-700 font-bold group-hover/item:text-black transition-colors">{step}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        <motion.div 
          className="flex-1 w-full relative group/img"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
           <div className="relative rounded-[40px] overflow-hidden shadow-2xl aspect-[4/3] border border-zinc-100">
             <img 
               src={imageUrl} 
               alt={title} 
               className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-1000"
               referrerPolicy="no-referrer"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
           </div>
           
           {/* Floating Badge */}
           <motion.div 
             animate={{ y: [0, -10, 0] }}
             transition={{ duration: 4, repeat: Infinity }}
             className="absolute -bottom-6 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-zinc-100 hidden md:block"
           >
              <div className={`p-2 rounded-xl bg-zinc-50 ${colors[color]}`}>
                 {icon}
              </div>
           </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}

function PaymentPortal({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [method, setMethod] = useState<'yape' | 'bcp' | null>(null);
  const [paymentCode, setPaymentCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const LATAM_COUNTRIES = [
    { code: '+51', name: 'Perú', flag: '🇵🇪' },
    { code: '+57', name: 'Colombia', flag: '🇨🇴' },
    { code: '+52', name: 'México', flag: '🇲🇽' },
    { code: '+54', name: 'Argentina', flag: '🇦🇷' },
    { code: '+56', name: 'Chile', flag: '🇨🇱' },
    { code: '+593', name: 'Ecuador', flag: '🇪🇨' },
    { code: '+503', name: 'El Salvador', flag: '🇸🇻' },
    { code: '+502', name: 'Guatemala', flag: '🇬🇹' },
    { code: '+504', name: 'Honduras', flag: '🇭🇳' },
    { code: '+505', name: 'Nicaragua', flag: '🇳🇮' },
    { code: '+507', name: 'Panamá', flag: '🇵🇦' },
    { code: '+595', name: 'Paraguay', flag: '🇵🇾' },
    { code: '+1', name: 'Puerto Rico', flag: '🇵🇷' },
    { code: '+1', name: 'Rep. Dominicana', flag: '🇩🇴' },
    { code: '+598', name: 'Uruguay', flag: '🇺🇾' },
    { code: '+58', name: 'Venezuela', flag: '🇻🇪' },
  ];

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Guardar el intento de pago en Supabase
      const { error } = await supabase
        .schema('mar')
        .from('payments')
        .insert([{
          user_id: user.id,
          phone: user.phone,
          method,
          payment_code: paymentCode,
          status: 'pending'
        }]);

      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      alert('Error al enviar el pago. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center font-sans">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md space-y-6">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter">¡Pago Enviado!</h2>
          <p className="text-zinc-500 font-medium">Estamos validando tu pago. En breve recibirás un WhatsApp confirmando tu acceso total a MAR.</p>
          <button onClick={onLogout} className="apple-button w-full py-4">Entendido</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-xl w-full space-y-8">
        <div className="text-center space-y-1">
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-zinc-900 leading-tight">Activa tu cuenta MAR</h2>
          <p className="text-zinc-500 font-medium text-[11px] md:text-xs">Elige tu método de pago preferido para comenzar.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setMethod('yape')}
            className={`p-4 rounded-[20px] md:rounded-[24px] border-2 transition-all flex flex-col items-center gap-2 ${method === 'yape' ? 'border-purple-600 bg-purple-50' : 'border-white bg-white'}`}
          >
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white font-black text-lg">Y</div>
            <span className="font-bold text-xs uppercase tracking-widest">Yape</span>
          </button>
          <button 
            onClick={() => setMethod('bcp')}
            className={`p-4 rounded-[20px] md:rounded-[24px] border-2 transition-all flex flex-col items-center gap-2 ${method === 'bcp' ? 'border-blue-600 bg-blue-50' : 'border-white bg-white'}`}
          >
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg">B</div>
            <span className="font-bold text-xs uppercase tracking-widest">BCP</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {method && (
            <motion.div 
              key={method}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white p-6 md:p-8 rounded-[28px] md:rounded-[32px] shadow-sm border border-zinc-100 space-y-5"
            >
              {method === 'yape' ? (
                <div className="text-center space-y-3">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Escanea el QR para pagar</p>
                  <div className="w-40 h-40 bg-zinc-100 rounded-2xl mx-auto flex items-center justify-center border-2 border-purple-100">
                    {/* Aquí iría tu QR real */}
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=YapeMAR" alt="QR Yape" className="w-24 h-24" />
                  </div>
                  <p className="text-base font-black tracking-widest text-purple-900 leading-tight">999 888 777</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center">Datos de Transferencia</p>
                  <div className="bg-zinc-50 p-4 rounded-xl space-y-2">
                    <p className="text-[9px] text-zinc-400 font-bold uppercase">Banco</p>
                    <p className="font-bold text-xs">BCP - Banco de Crédito</p>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase mt-2">Cuenta Corriente</p>
                    <p className="font-bold text-xs">191-99988877-0-12</p>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase mt-2">CCI</p>
                    <p className="font-bold text-xs">002-191-99988877012-55</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitPayment} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-3">Código de Operación</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ej. 12345678" 
                    className="w-full bg-zinc-50 border border-transparent focus:border-black rounded-xl px-4 py-3 outline-none text-xs font-bold transition-all"
                    value={paymentCode}
                    onChange={(e) => setPaymentCode(e.target.value)}
                  />
                </div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Confirmar Pago'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={onLogout} className="w-full text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em] hover:text-black transition-colors">
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

function StatItem({ label, val }: { label: string, val: string }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-border">
      <div className="text-[10px] text-text-sub font-bold uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-bold my-1 tracking-tight">{val}</div>
    </div>
  );
}

function GuideStep({ num, text }: { num: string, text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
      <span className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">{num}</span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

function OnboardingStep({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-[20px] bg-zinc-50 border border-zinc-100/50">
      <div className="w-10 h-10 rounded-[14px] bg-white shadow-sm flex items-center justify-center text-base font-black shrink-0 text-black border border-zinc-100">
        {number}
      </div>
      <div>
        <h4 className="font-bold text-base text-black leading-tight">{title}</h4>
        <p className="text-[11px] text-zinc-500 font-medium leading-snug">{desc}</p>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, className = "" }: { active: boolean, onClick: () => void, icon: ReactNode, label: string, className?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative ${active ? 'text-black' : 'text-text-sub hover:text-black'} ${className}`}
    >
      {active && (
        <motion.div 
          layoutId="nav-glow"
          className="absolute inset-0 bg-accent-soft rounded-xl -z-10"
        />
      )}
      <div className="w-5 h-5">{icon}</div>
      <span className="text-[9px] font-bold uppercase tracking-tighter md:hidden leading-none">{label}</span>
    </button>
  );
}

function StatCard({ icon, label, value, color }: { icon: ReactNode, label: string, value: string, color: string }) {
  return (
    <div className={`${color} p-6 rounded-3xl border border-transparent hover:border-zinc-200 transition-all`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 flex items-center justify-center">{icon}</div>
        <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{label}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onSend?: () => void;
  showProject?: boolean;
  onAddSubtask?: (title: string) => void;
  onToggleSubtask?: (sid: string) => void;
  onStartTimer?: () => void;
  onStopTimer?: () => void;
  onStatusChange?: (status: 'todo' | 'in_progress' | 'done') => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  onToggle, 
  onSend, 
  showProject, 
  onAddSubtask, 
  onToggleSubtask,
  onStartTimer,
  onStopTimer
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');

  return (
    <div className="flex flex-col hover:bg-accent-soft transition-colors group">
      <div className="flex items-center gap-4 p-5">
        <div className="relative">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }} 
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border-2 relative z-10 ${
              task.is_completed 
                ? 'bg-black border-black text-white shadow-xl shadow-zinc-200' 
                : 'border-zinc-200 text-transparent hover:border-black bg-white shadow-sm'
            }`}
          >
            <motion.div
              initial={false}
              animate={{ 
                scale: task.is_completed ? 1 : 0,
                rotate: task.is_completed ? 0 : -45,
                opacity: task.is_completed ? 1 : 0
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <CheckCircle2 className="w-7 h-7" />
            </motion.div>
            {!task.is_completed && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-10 transition-opacity">
                <CheckCircle2 className="w-7 h-7 text-black" />
              </div>
            )}
          </motion.button>
          
          {/* Confetti Effect on completion */}
          <AnimatePresence>
            {task.is_completed && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                    animate={{ 
                      scale: [0, 1, 0],
                      x: Math.cos(i * 45 * (Math.PI / 180)) * 40,
                      y: Math.sin(i * 45 * (Math.PI / 180)) * 40,
                      opacity: 0
                    }}
                    transition={{ duration: 0.8, ease: "circOut" }}
                    className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-yellow-400"
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex-1 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <p className={`font-semibold transition-all ${task.is_completed ? 'text-text-sub line-through opacity-50' : 'text-text-main'}`}>
            {task.title}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            {showProject && task.project_id && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-sub">Proyecto Activo</span>
            )}
            {task.tags.map(tag => (
              <span key={tag} className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-100 px-2 py-0.5 rounded-full">
                <Tag className="w-3 h-3 inline mr-1" />
                {tag}
              </span>
            ))}
            {task.total_time_spent ? (
              <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">
                <Timer className="w-3 h-3" />
                <span>{Math.floor(task.total_time_spent / 60)}m</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!task.is_completed && (
            <button 
              onClick={task.timer_start ? onStopTimer : onStartTimer}
              className={`p-2 rounded-full transition-all ${task.timer_start ? 'bg-red-50 text-red-500 animate-pulse' : 'hover:bg-zinc-200 text-zinc-400'}`}
            >
              {task.timer_start ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          )}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            {onSend && !task.is_completed && (
              <button 
                onClick={onSend}
                className="p-2 text-zinc-400 hover:text-black transition-colors"
                title="Enviar a WhatsApp"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}
            <button className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-zinc-50/50 border-t border-zinc-100"
          >
            <div className="p-5 pl-16 space-y-4">
              {task.comments && (
                <div className="bg-white p-3 rounded-xl border border-zinc-200">
                  <p className="text-xs text-text-sub italic">"{task.comments}"</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-sub">Subtareas</p>
                <div className="space-y-2">
                  {task.subtasks.map(sub => (
                    <div key={sub.id} className="flex items-center gap-3">
                      <button 
                        onClick={() => onToggleSubtask?.(sub.id)}
                        className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${sub.is_completed ? 'bg-black border-black text-white' : 'border-zinc-300'}`}
                      >
                        {sub.is_completed && <CheckCircle2 className="w-3 h-3" />}
                      </button>
                      <span className={`text-sm ${sub.is_completed ? 'text-text-sub line-through' : 'text-text-main'}`}>
                        {sub.title}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="text" 
                      placeholder="Nueva subtarea..." 
                      className="flex-1 bg-transparent border-b border-zinc-200 text-sm py-1 outline-none focus:border-black"
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onAddSubtask?.(newSubtask);
                          setNewSubtask('');
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        onAddSubtask?.(newSubtask);
                        setNewSubtask('');
                      }}
                      className="p-1 hover:bg-zinc-200 rounded"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
