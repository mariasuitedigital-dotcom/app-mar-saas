import { 
  Plus, 
  CheckCircle2, 
  Clock, 
  FolderKanban, 
  MessageSquare, 
  Settings, 
  ChevronRight, 
  Timer, 
  ListTodo, 
  ChevronDown, 
  ArrowRight, 
  Trash2,
  Calendar,
  Zap,
  Download,
  FileSpreadsheet,
  FileText,
  Lightbulb,
  X,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  CreditCard,
  LogOut,
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Users,
  Target,
  Sparkles,
  Rocket,
  BarChart3,
  Brain,
  Volume2,
  Tag,
  Square,
  Play,
  FileDown,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from './lib/supabase';
import { CONFIG } from './config';
import type { Project, Task, Subtask } from './types';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

const playHaptic = (type: 'click' | 'success' | 'error' | 'focus') => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (type === 'click') {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } else if (type === 'success') {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.2);
  } else if (type === 'focus') {
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'projects' | 'stats' | 'admin' | 'reminders'>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isKanban, setIsKanban] = useState(false);
  const [showQuickAction, setShowQuickAction] = useState(false);
  const [quickActionType, setQuickActionType] = useState<'task' | 'project' | 'reminder' | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [smartCaptureText, setSmartCaptureText] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  
  // New Task States
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskComments, setNewTaskComments] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isForToday, setIsForToday] = useState(true);
  const [scheduledTime, setScheduledTime] = useState('');
  const [reminderActive, setReminderActive] = useState(false);

  // New Project States
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDueDate, setNewProjectDueDate] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#000000');

  // Reminder State
  const [reminderText, setReminderText] = useState('');

  // Admin States
  const [isAdmin, setIsAdmin] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [isAdminCreatingUser, setIsAdminCreatingUser] = useState(false);
  const [newAdminUser, setNewAdminUser] = useState({ full_name: '', email: '', phone_number: '', subscription_status: 'pending' });

  useEffect(() => {
    const verifiedPhone = localStorage.getItem('mar_verified_phone');
    const adminAuth = localStorage.getItem('mar_admin_auth');
    
    if (adminAuth === 'true') {
      setIsAdmin(true);
      fetchData(null, true);
    } else if (verifiedPhone) {
      fetchData(verifiedPhone, false);
    } else {
      setIsAuthReady(true);
      setLoading(false);
    }

    const onboardingDone = localStorage.getItem('mar_onboarding_done');
    if (!onboardingDone && verifiedPhone) {
      setShowOnboarding(true);
    }
  }, []);

  const fetchData = async (phone: string | null, adminMode: boolean) => {
    setLoading(true);
    try {
      if (adminMode) {
        const { data: users } = await supabase.schema('mar').from('profiles').select('*').order('created_at', { ascending: false });
        const { data: payments } = await supabase.schema('mar').from('payments').select('*').order('created_at', { ascending: false });
        setAllUsers(users || []);
        setAllPayments(payments || []);
        setIsAuthReady(true);
      } else {
        const { data: profile } = await supabase.schema('mar').from('profiles').select('*').eq('phone_number', phone).single();
        if (profile) {
          setUser(profile);
          const { data: projectsData } = await supabase.schema('mar').from('projects').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });
          const { data: tasksData } = await supabase.schema('mar').from('tasks').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });
          setProjects(projectsData || []);
          setTasks(tasksData || []);
        }
        setIsAuthReady(true);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mar_auth');
    localStorage.removeItem('mar_verified_phone');
    localStorage.removeItem('mar_admin_auth');
    window.location.reload();
  };

  const addTask = async () => {
    if (!newTaskTitle.trim() || !user) return;
    
    const newTask = {
      title: newTaskTitle,
      description: newTaskComments,
      project_id: selectedProjectId,
      is_completed: false,
      is_focus: false,
      is_for_today: isForToday,
      due_date: newTaskDueDate || null,
      scheduled_time: scheduledTime || null,
      reminder_active: reminderActive,
      comments: newTaskComments,
      user_id: user.id,
      status: 'todo',
      tags: [],
      subtasks: []
    };

    const { data, error } = await supabase.schema('mar').from('tasks').insert([newTask]).select();
    if (!error && data) {
      setTasks([data[0], ...tasks]);
      resetTaskForm();
      playHaptic('success');
    }
  };

  const resetTaskForm = () => {
    setNewTaskTitle('');
    setNewTaskDueDate('');
    setNewTaskComments('');
    setSelectedProjectId(null);
    setIsForToday(true);
    setScheduledTime('');
    setReminderActive(false);
    setIsAddingTask(false);
    setShowQuickAction(false);
    setQuickActionType(null);
  };

  const addProject = async () => {
    if (!newProjectName.trim() || !user) return;

    const newProject = {
      name: newProjectName,
      color: newProjectColor,
      due_date: newProjectDueDate || null,
      user_id: user.id,
      status: 'active'
    };

    const { data, error } = await supabase.schema('mar').from('projects').insert([newProject]).select();
    if (!error && data) {
      setProjects([data[0], ...projects]);
      setNewProjectName('');
      setNewProjectDueDate('');
      setShowQuickAction(false);
      setQuickActionType(null);
      playHaptic('success');
    }
  };

  const addReminder = async () => {
    if (!reminderText.trim() || !user) return;
    
    const newReminder = {
      title: reminderText,
      is_completed: false,
      is_for_today: true,
      reminder_active: true,
      scheduled_time: scheduledTime,
      user_id: user.id,
      status: 'todo',
      tags: ['RECORDATORIO'],
      subtasks: []
    };

    const { data, error } = await supabase.schema('mar').from('tasks').insert([newReminder]).select();
    if (!error && data) {
      setTasks([data[0], ...tasks]);
      setReminderText('');
      setScheduledTime('');
      setShowQuickAction(false);
      setQuickActionType(null);
      playHaptic('success');
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newStatus = !task.is_completed;
    const { error } = await supabase.schema('mar').from('tasks').update({ 
      is_completed: newStatus,
      status: newStatus ? 'done' : 'todo'
    }).eq('id', id);

    if (!error) {
      setTasks(tasks.map(t => t.id === id ? { ...t, is_completed: newStatus, status: newStatus ? 'done' : 'todo' } : t));
      if (newStatus) playHaptic('success');
    }
  };

  const updateTaskStatus = async (id: string, status: 'todo' | 'in_progress' | 'done') => {
    const { error } = await supabase.schema('mar').from('tasks').update({ 
      status, 
      is_completed: status === 'done' 
    }).eq('id', id);

    if (!error) {
      setTasks(tasks.map(t => t.id === id ? { ...t, status, is_completed: status === 'done' } : t));
      if (status === 'done') playHaptic('success');
    }
  };

  const addSubtask = async (taskId: string, title: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newSub: Subtask = {
      id: crypto.randomUUID(),
      title,
      is_completed: false
    };

    const updatedSubtasks = [...task.subtasks, newSub];
    const { error } = await supabase.schema('mar').from('tasks').update({ subtasks: updatedSubtasks }).eq('id', taskId);
    
    if (!error) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, subtasks: updatedSubtasks } : t));
    }
  };

  const toggleSubtask = async (taskId: string, subId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = task.subtasks.map(s => s.id === subId ? { ...s, is_completed: !s.is_completed } : s);
    const { error } = await supabase.schema('mar').from('tasks').update({ subtasks: updatedSubtasks }).eq('id', taskId);
    
    if (!error) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, subtasks: updatedSubtasks } : t));
    }
  };

  const startTimer = async (taskId: string) => {
    const startTime = new Date().toISOString();
    const { error } = await supabase.schema('mar').from('tasks').update({ timer_start: startTime }).eq('id', taskId);
    if (!error) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, timer_start: startTime } : t));
    }
  };

  const stopTimer = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.timer_start) return;

    const elapsed = Math.floor((new Date().getTime() - new Date(task.timer_start).getTime()) / 1000);
    const total = (task.total_time_spent || 0) + elapsed;

    const { error } = await supabase.schema('mar').from('tasks').update({ 
      timer_start: null, 
      total_time_spent: total 
    }).eq('id', taskId);

    if (!error) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, timer_start: null, total_time_spent: total } : t));
    }
  };

  const updateProjectStatus = async (id: string, status: 'active' | 'completed' | 'cancelled') => {
    const { error } = await supabase.schema('mar').from('projects').update({ status }).eq('id', id);
    if (!error) {
      setProjects(projects.map(p => p.id === id ? { ...p, status } : p));
      if (viewingProject?.id === id) setViewingProject({ ...viewingProject, status });
    }
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.schema('mar').from('projects').delete().eq('id', id);
    if (!error) {
      setProjects(projects.filter(p => p.id !== id));
      setViewingProject(null);
    }
  };

  const handleSmartCapture = async () => {
    if (!smartCaptureText.trim() || !user) return;
    setIsAILoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Analiza este texto y extrae una tarea estructurada en JSON. 
      Texto: "${smartCaptureText}"
      JSON Schema: { title: string, description: string, due_date: string (YYYY-MM-DD), tags: string[] }
      Responde SOLO el JSON.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      const newTask = {
        ...parsed,
        is_completed: false,
        user_id: user.id,
        status: 'todo',
        subtasks: [],
        is_for_today: true
      };

      const { data, error } = await supabase.schema('mar').from('tasks').insert([newTask]).select();
      if (!error && data) {
        setTasks([data[0], ...tasks]);
        setSmartCaptureText('');
        playHaptic('success');
      }
    } catch (err) {
      console.error('AI Error:', err);
    } finally {
      setIsAILoading(false);
    }
  };

  const generateWhatsAppReminder = () => {
    const todayTasks = tasks.filter(t => !t.is_completed && t.is_for_today);
    const focus = tasks.find(t => t.is_focus && !t.is_completed);
    
    let message = `*MAR - Resumen Diario*%0A%0A`;
    message += `🎯 *ENFOQUE:* ${focus ? focus.title : 'No definido'}%0A%0A`;
    message += `📝 *TAREAS PARA HOY:*%0A`;
    todayTasks.forEach(t => {
      message += `- ${t.title} ${t.scheduled_time ? `(${t.scheduled_time})` : ''}%0A`;
    });
    
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${message}`, '_blank');
  };

  const sendTaskToWhatsApp = (task: Task) => {
    const message = `*MAR - Tarea Pendiente*%0A%0A📌 *Tarea:* ${task.title}%0A⏰ *Hora:* ${task.scheduled_time || 'No definida'}%0A💬 *Notas:* ${task.description || '-'}%0A%0A_Enviado desde MAR App_`;
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${message}`, '_blank');
  };

  const exportProjectToHTML = (project: Project) => {
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    const completed = projectTasks.filter(t => t.is_completed).length;
    
    const html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1a1a1a; }
            .header { border-bottom: 2px solid ${project.color}; padding-bottom: 20px; }
            .stats { display: flex; gap: 20px; margin: 20px 0; }
            .stat-box { background: #f4f4f5; padding: 15px; rounded: 10px; flex: 1; }
            .task-list { margin-top: 30px; }
            .task-item { padding: 10px; border-bottom: 1px solid #eee; }
            .completed { color: #888; text-decoration: line-through; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Dossier del Proyecto: ${project.name}</h1>
            <p>${project.description || ''}</p>
          </div>
          <div class="stats">
            <div class="stat-box">Total Tareas: ${projectTasks.length}</div>
            <div class="stat-box">Completadas: ${completed}</div>
            <div class="stat-box">Progreso: ${Math.round((completed / (projectTasks.length || 1)) * 100)}%</div>
          </div>
          <div class="task-list">
            <h2>Listado de Tareas</h2>
            ${projectTasks.map(t => `
              <div class="task-item ${t.is_completed ? 'completed' : ''}">
                <strong>${t.title}</strong> - ${t.status}
                ${t.comments ? `<br/><small>${t.comments}</small>` : ''}
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte-${project.name}.html`;
    a.click();
  };

  const exportProjectToCSV = (project: Project) => {
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    let csv = 'ID,Titulo,Estado,Completada,Tiempo Gastado (s),Comentarios\n';
    projectTasks.forEach(t => {
      csv += `${t.id},"${t.title}",${t.status},${t.is_completed},${t.total_time_spent || 0},"${t.comments || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data-${project.name}.csv`;
    a.click();
  };

  const validatePayment = async (id: string, userId: string, status: 'active' | 'rejected') => {
    const { error: paymentError } = await supabase.schema('mar').from('payments').update({ status }).eq('id', id);
    if (!paymentError) {
      if (status === 'active') {
        await supabase.schema('mar').from('profiles').update({ subscription_status: 'active' }).eq('id', userId);
      }
      setAllPayments(allPayments.map(p => p.id === id ? { ...p, status } : p));
      setAllUsers(allUsers.map(u => u.id === userId ? { ...u, subscription_status: status === 'active' ? 'active' : 'pending' } : u));
    }
  };

  const updateUserSubscription = async (id: string, status: string) => {
    const { error } = await supabase.schema('mar').from('profiles').update({ subscription_status: status }).eq('id', id);
    if (!error) {
      setAllUsers(allUsers.map(u => u.id === id ? { ...u, subscription_status: status } : u));
    }
  };

  const createManualUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.schema('mar').from('profiles').insert([{
      id: crypto.randomUUID(),
      full_name: newAdminUser.full_name,
      email: newAdminUser.email,
      phone_number: newAdminUser.phone_number,
      subscription_status: newAdminUser.subscription_status
    }]);

    if (!error) {
      fetchData(null, true);
      setIsAdminCreatingUser(false);
      setNewAdminUser({ full_name: '', email: '', phone_number: '', subscription_status: 'pending' });
    }
  };

  const deleteUser = async (id: string) => {
    if(confirm('¿Estás seguro de eliminar este usuario?')) {
      const { error } = await supabase.schema('mar').from('profiles').delete().eq('id', id);
      if (!error) {
        setAllUsers(allUsers.filter(u => u.id !== id));
      }
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem('mar_onboarding_done', 'true');
    setShowOnboarding(false);
  };

  if (!isAuthReady || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 overflow-hidden relative">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 bg-black rounded-[28px] flex items-center justify-center relative z-10"
        >
          <Lightbulb className="w-10 h-10 text-yellow-400 fill-yellow-400" />
        </motion.div>
        <div className="absolute inset-0 bg-zinc-50/50 backdrop-blur-3xl -z-10" />
      </div>
    );
  }

  if (!user && !isAdmin) {
    return <Portal user={user} setUser={setUser} />;
  }

  const focusTask = tasks.find(t => t.is_focus && !t.is_completed) || tasks.find(t => !t.is_completed);
  const completedTasks = tasks.filter(t => t.is_completed).length;
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900 selection:bg-yellow-200">
      <ProgressWaves progress={progress} />

      {/* Navigation Sidebar / Bottom Nav */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 md:top-1/2 md:-translate-y-1/2 md:h-auto bg-white/80 backdrop-blur-xl border border-border px-4 py-3 md:py-8 rounded-[32px] md:rounded-[40px] shadow-2xl flex md:flex-col items-center gap-6 md:gap-8 z-50">
        <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Lightbulb />} label="DASH" />
        <NavItem active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckCircle2 />} label="TAREAS" />
        <NavItem active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} icon={<FolderKanban />} label="PROY" />
        <NavItem active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<BarChart3 />} label="INSIGHTS" />
        <NavItem active={activeTab === 'reminders'} onClick={() => setActiveTab('reminders')} icon={<MessageSquare />} label="RECOR" />
        {isAdmin && <NavItem active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<ShieldCheck />} label="ADMIN" className="text-amber-600" />}
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-12 pb-32 md:pl-32">
        <AnimatePresence mode="wait">
          {isFocusMode && focusTask && (
            <DeepFocusOverlay 
              task={focusTask} 
              onClose={() => setIsFocusMode(false)} 
              onComplete={() => toggleTask(focusTask.id)}
              onStopTimer={() => stopTimer(focusTask.id)}
              onStartTimer={() => startTimer(focusTask.id)}
            />
          )}

          {showGuide && (
            <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl w-full space-y-10"
              >
                <div className="flex justify-between items-center bg-zinc-900 text-white p-6 rounded-[32px]">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center">
                      <Lightbulb className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tighter">Guía Maestra MAR</h2>
                      <p className="text-zinc-400 text-sm">Entiende el flujo de tu éxito.</p>
                    </div>
                  </div>
                  <button onClick={() => setShowGuide(false)} className="p-3 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
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
                      Ciclo de Tareas
                    </h3>
                    <p className="text-sm text-text-sub">La acción diaria. Aquí es donde sucede la magia y liberas tu mente.</p>
                    <div className="grid grid-cols-1 gap-2">
                      <GuideStep num="1" text="Captura ideas rápido en 'Dashboard' o 'Tareas'." />
                      <GuideStep num="2" text="Usa 'Enfoque Profundo' para trabajar sin distracciones." />
                      <GuideStep num="3" text="Marca como completado y siente el alivio del orden." />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-600">
                      <MessageSquare className="w-5 h-5" />
                      WhatsApp Sync
                    </h3>
                    <p className="text-sm text-text-sub">Tu recordatorio externo. MAR te mantiene en el camino correcto.</p>
                    <div className="grid grid-cols-1 gap-2">
                      <GuideStep num="1" text="Configura recordatorios para tareas críticas." />
                      <GuideStep num="2" text="Recibe resúmenes matutinos para planificar tu día." />
                      <GuideStep num="3" text="Responde a los compromisos que hiciste contigo mismo." />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-zinc-900">
                      <BarChart3 className="w-5 h-5" />
                      Insights & Stats
                    </h3>
                    <p className="text-sm text-text-sub">Lo que no se mide no se mejora. Analiza tu rendimiento.</p>
                    <div className="grid grid-cols-1 gap-2">
                      <GuideStep num="1" text="Revisa tu tiempo total de enfoque semanal." />
                      <GuideStep num="2" text="Analiza qué proyectos consumen más energía." />
                      <GuideStep num="3" text="Celebra tus rachas y mantén el momentum." />
                    </div>
                  </section>
                </div>

                <div className="pt-10 border-t border-zinc-100 flex justify-center">
                  <button 
                    onClick={() => setShowGuide(false)}
                    className="apple-button px-12"
                  >
                    ¡Entendido, vamos a ello!
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showOnboarding && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-[40px] p-10 max-w-lg w-full text-center space-y-8 relative shadow-2xl"
              >
                <div className="w-20 h-20 bg-yellow-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-yellow-100 rotate-6">
                  <Rocket className="w-10 h-10 text-black animate-bounce" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-black tracking-tighter">¡Bienvenido a MAR!</h2>
                  <p className="text-zinc-500 font-medium leading-relaxed">Estás a un paso de dominar tu tiempo y liberar tu mente de la saturación.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 text-left pt-4">
                  <OnboardingStep number="1" title="Captura Todo" desc="No dejes que las ideas se escapen. Escríbelas al instante." />
                  <OnboardingStep number="2" title="Enfócate" desc="Usa el temporizador para periodos de trabajo profundo." />
                  <OnboardingStep number="3" title="Sincroniza" desc="Deja que MAR te recuerde lo vital por WhatsApp." />
                </div>
                <button 
                  onClick={completeOnboarding}
                  className="apple-button w-full py-5 text-lg"
                >
                  Empezar Ahora
                </button>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-12"
            >
              <div className="flex justify-between items-end gap-4 overflow-hidden">
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-1">
                  <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none">Mi Centro</h1>
                  <p className="text-zinc-400 text-lg font-medium">Libera tu mente, domina tu día.</p>
                </motion.div>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setQuickActionType('task');
                    setShowQuickAction(true);
                    playHaptic('click');
                  }}
                  className="w-16 h-16 md:w-20 md:h-20 bg-black text-white rounded-[28px] md:rounded-[32px] flex items-center justify-center shadow-xl shadow-zinc-200 hover:bg-zinc-800 transition-all group"
                >
                  <Plus className="w-8 h-8 md:w-10 md:h-10 transition-transform group-hover:rotate-90" />
                </motion.button>
              </div>

              <div className="bento-grid">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-bento col-span-2 md:col-span-2 md:row-span-2 bg-zinc-900 text-white border-zinc-800 relative group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 h-full flex flex-col">
                    <div className="card-title-bento text-zinc-400">
                      <span>Próximo Gran Objetivo</span>
                      <Target className="w-3 h-3" />
                    </div>
                    {focusTask ? (
                      <div className="flex-1 flex flex-col justify-center gap-6">
                        <div className="space-y-4">
                          <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight line-clamp-2">{focusTask.title}</h2>
                          {focusTask.description && (
                            <p className="text-zinc-400 font-medium line-clamp-2">{focusTask.description}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4">
                          <button 
                            onClick={() => {
                              setIsFocusMode(true);
                              playHaptic('focus');
                            }}
                            className="bg-white text-black px-8 py-4 rounded-2xl font-black text-base flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10"
                          >
                            <Zap className="w-5 h-5 fill-black" />
                            ENFOCARSE
                          </button>
                          <button 
                            onClick={() => toggleTask(focusTask.id)}
                            className="bg-zinc-800 text-white px-8 py-4 rounded-2xl font-black text-base flex items-center gap-2 hover:bg-zinc-700 active:scale-95 transition-all"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            COMPLETAR
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center opacity-50">
                          <Rocket className="w-10 h-10 text-zinc-400" />
                        </div>
                        <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Mente libre de tareas</p>
                        <button 
                          onClick={() => {
                            setQuickActionType('task');
                            setShowQuickAction(true);
                          }}
                          className="text-white border-b-2 border-yellow-400 pb-1 font-black text-base hover:text-yellow-400 transition-colors"
                        >
                          Crea un nuevo desafío
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="card-bento col-span-2 md:col-span-2 bg-zinc-50 border-zinc-100 overflow-hidden group"
                >
                  <div className="card-title-bento">
                    <span>Captura Inteligente</span>
                    <Sparkles className="w-3 h-3 text-yellow-500" />
                  </div>
                  <div className="space-y-4">
                    <p className="text-zinc-500 font-medium text-sm">¿Una idea rápida? MAR la procesa por ti.</p>
                    <div className="relative">
                      <textarea 
                        placeholder="Ej: Necesito terminar el informe de ventas para el lunes..."
                        className="w-full bg-white rounded-2xl p-5 pr-14 text-sm font-bold outline-none border border-zinc-200 focus:border-black transition-all resize-none h-24"
                        value={smartCaptureText}
                        onChange={(e) => setSmartCaptureText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSmartCapture();
                          }
                        }}
                      />
                      <button 
                        onClick={handleSmartCapture}
                        disabled={isAILoading || !smartCaptureText.trim()}
                        className="absolute right-3 bottom-3 w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all"
                      >
                        {isAILoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="card-bento col-span-2 md:col-span-1 border-zinc-100 group"
                >
                  <div className="card-title-bento">
                    <span>Progreso Total</span>
                    <ListTodo className="w-3 h-3" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center items-center gap-4">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-zinc-100" />
                        <motion.circle 
                          cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" 
                          strokeDasharray={364.4}
                          initial={{ strokeDashoffset: 364.4 }}
                          animate={{ strokeDashoffset: 364.4 - (364.4 * progress) / 100 }}
                          className="text-black"
                          transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-black tracking-tighter">{Math.round(progress)}%</span>
                      </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{completedTasks}/{tasks.length} Tareas</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="card-bento col-span-2 md:col-span-1 group cursor-pointer hover:bg-zinc-50"
                  onClick={() => setActiveTab('reminders')}
                >
                  <div className="card-title-bento">
                    <span>Reminders Activos</span>
                    <MessageSquare className="w-3 h-3 text-blue-500" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="space-y-4">
                      {tasks.filter(t => t.reminder_active && !t.is_completed).slice(0, 2).map((t, i) => (
                        <div key={t.id} className="flex items-center gap-3">
                          <div className="w-1.5 h-8 bg-blue-500 rounded-full" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{t.title}</p>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t.scheduled_time || 'Sin hora'}</p>
                          </div>
                        </div>
                      ))}
                      {tasks.filter(t => t.reminder_active && !t.is_completed).length === 0 && (
                        <p className="text-zinc-400 text-xs font-bold text-center">Sin recordatorios</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-zinc-50 flex items-center justify-between group-hover:text-black">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Ver todos</span>
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              </div>

              {/* Today's Focus List */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black tracking-tighter uppercase px-2 py-1 bg-yellow-400 inline-block">Prioridades de Hoy</h2>
                  <button onClick={() => setActiveTab('tasks')} className="text-sm font-bold text-zinc-400 hover:text-black transition-colors uppercase tracking-widest">Ver Todo</button>
                </div>
                <div className="bg-zinc-50 rounded-[40px] p-2 space-y-1">
                  {tasks.filter(t => t.is_for_today && !t.is_completed).slice(0, 5).map(task => (
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
                  ))}
                  {tasks.filter(t => t.is_for_today && !t.is_completed).length === 0 && (
                    <div className="p-12 text-center space-y-4">
                      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                        <CheckCircle2 className="w-8 h-8 text-zinc-200" />
                      </div>
                      <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Día despejado. ¡Buen trabajo!</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-4">
                <div className="space-y-1">
                  <h1 className="text-5xl font-black tracking-tighter leading-none">Mis Tareas</h1>
                  <p className="text-zinc-400 text-lg font-medium">Del caos al orden, una acción a la vez.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-zinc-50 p-1.5 rounded-2xl flex border border-zinc-100">
                    <button 
                      onClick={() => setIsKanban(false)}
                      className={`p-3 rounded-xl transition-all ${!isKanban ? 'bg-white shadow-sm text-black' : 'text-zinc-400 hover:text-black'}`}
                    >
                      <ListTodo className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setIsKanban(true)}
                      className={`p-3 rounded-xl transition-all ${isKanban ? 'bg-white shadow-sm text-black' : 'text-zinc-400 hover:text-black'}`}
                    >
                      <FolderKanban className="w-5 h-5" />
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      setQuickActionType('task');
                      setShowQuickAction(true);
                      playHaptic('click');
                    }}
                    className="apple-button h-16 px-8 rounded-3xl"
                  >
                    <Plus className="w-6 h-6" />
                    Nueva Tarea
                  </button>
                </div>
              </div>

              {isKanban ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* To Do */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-4">
                      <div className="flex items-center gap-3 uppercase tracking-[0.2em] text-[10px] font-black">
                        <div className="w-2 h-2 bg-zinc-200 rounded-full" />
                        Por hacer
                      </div>
                      <span className="bg-zinc-100 px-2 py-0.5 rounded-lg text-[9px] font-bold text-zinc-400">{tasks.filter(t => t.status === 'todo').length}</span>
                    </div>
                    <div className="space-y-4 min-h-[300px] border-2 border-dashed border-zinc-50 rounded-[40px] p-4">
                      {tasks.filter(t => t.status === 'todo').map(task => (
                        <motion.div 
                          key={task.id} 
                          layoutId={task.id}
                          className="bg-zinc-50 p-6 rounded-[32px] border border-zinc-100 shadow-sm hover:shadow-md transition-all cursor-move space-y-4"
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                        >
                          <p className="font-bold text-base leading-tight">{task.title}</p>
                          <div className="flex items-center gap-2">
                             {task.scheduled_time && <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 bg-white px-3 py-1 rounded-full">{task.scheduled_time}</span>}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* In Progress */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-4">
                      <div className="flex items-center gap-3 uppercase tracking-[0.2em] text-[10px] font-black">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        En progreso
                      </div>
                      <span className="bg-blue-50 px-2 py-0.5 rounded-lg text-[9px] font-bold text-blue-500">{tasks.filter(t => t.status === 'in_progress').length}</span>
                    </div>
                    <div className="space-y-4 min-h-[300px] border-2 border-dashed border-zinc-50 rounded-[40px] p-4">
                      {tasks.filter(t => t.status === 'in_progress').map(task => (
                        <motion.div 
                          key={task.id} 
                          layoutId={task.id}
                          className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100 shadow-sm hover:shadow-md transition-all cursor-move space-y-4"
                          onClick={() => updateTaskStatus(task.id, 'done')}
                        >
                          <p className="font-bold text-base leading-tight">{task.title}</p>
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                             <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Trabajando...</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Done */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-4">
                      <div className="flex items-center gap-3 uppercase tracking-[0.2em] text-[10px] font-black">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        Hecho
                      </div>
                      <span className="bg-emerald-50 px-2 py-0.5 rounded-lg text-[9px] font-bold text-emerald-500">{tasks.filter(t => t.status === 'done').length}</span>
                    </div>
                    <div className="space-y-4 min-h-[300px] border-2 border-dashed border-zinc-50 rounded-[40px] p-4">
                      {tasks.filter(t => t.status === 'done').map(task => (
                        <motion.div 
                          key={task.id} 
                          layoutId={task.id}
                          className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm opacity-60 grayscale space-y-4"
                          onClick={() => updateTaskStatus(task.id, 'todo')}
                        >
                          <p className="font-bold text-base leading-tight line-through">{task.title}</p>
                          <div className="flex items-center gap-2">
                             <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                             <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Completado</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-12">
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-400 px-4">Pendientes</h2>
                    <div className="bg-zinc-50 p-2 rounded-[40px] space-y-1">
                      {tasks.filter(t => !t.is_completed).map(task => (
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
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-400 px-4 opacity-50">Completadas</h2>
                    <div className="bg-zinc-50/50 p-2 rounded-[40px] space-y-1 opacity-60">
                      {tasks.filter(t => t.is_completed).map(task => (
                        <TaskItem key={task.id} task={task} onToggle={() => toggleTask(task.id)} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'projects' && (
            <motion.div
              key="projects"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              {!viewingProject ? (
                <>
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-4">
                    <div className="space-y-1">
                      <h1 className="text-5xl font-black tracking-tighter leading-none">Mis Proyectos</h1>
                      <p className="text-zinc-400 text-lg font-medium">Contenedores de tus grandes ambiciones.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setQuickActionType('project');
                        setShowQuickAction(true);
                      }}
                      className="apple-button h-16 px-8 rounded-3xl"
                    >
                      <Rocket className="w-5 h-5" />
                      Nuevo Proyecto
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {projects.map(project => {
                      const projectTasks = tasks.filter(t => t.project_id === project.id);
                      const done = projectTasks.filter(t => t.is_completed).length;
                      const prog = projectTasks.length > 0 ? Math.round((done / projectTasks.length) * 100) : 0;
                      
                      return (
                        <motion.div
                          key={project.id}
                          whileHover={{ y: -10, transition: { duration: 0.3 } }}
                          onClick={() => setViewingProject(project)}
                          className="bg-white p-8 rounded-[48px] border border-zinc-100 shadow-sm hover:shadow-2xl hover:shadow-zinc-200/50 transition-all cursor-pointer group flex flex-col gap-8 relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                          <div className="flex justify-between items-start">
                            <div className="w-16 h-16 rounded-[28px] flex items-center justify-center shadow-lg" style={{ backgroundColor: project.color + '20', color: project.color }}>
                              <FolderKanban className="w-8 h-8" />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full ${project.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}>
                              {project.status === 'active' ? 'En Curso' : 'Completado'}
                            </span>
                          </div>
                          <div className="space-y-2">
                             <h3 className="text-3xl font-black tracking-tighter leading-tight group-hover:text-black transition-colors">{project.name}</h3>
                             {project.due_date && <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">{project.due_date}</p>}
                          </div>
                          <div className="space-y-4">
                            <div className="flex justify-between items-end">
                               <span className="text-sm font-bold text-zinc-500">{done}/{projectTasks.length} Tareas</span>
                               <span className="text-xl font-black tracking-tighter">{prog}%</span>
                            </div>
                            <div className="h-6 bg-zinc-100 rounded-full overflow-hidden p-1 border border-zinc-50">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${prog}%` }}
                                 className="h-full rounded-full" 
                                 style={{ backgroundColor: project.color }} 
                               />
                            </div>
                          </div>
                          <div className="pt-4 border-t border-zinc-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                             <span className="text-xs font-bold text-zinc-400">Ver Dossier Completo</span>
                             <ChevronRight className="w-4 h-4 text-zinc-400" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="space-y-12">
                  <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 py-8 border-b border-zinc-100">
                    <div className="flex items-center gap-8">
                      <button 
                        onClick={() => setViewingProject(null)}
                        className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center hover:bg-black hover:text-white transition-all group"
                      >
                        <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                      </button>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                           <div className="w-4 h-4 rounded-full" style={{ backgroundColor: viewingProject.color }} />
                           <h1 className="text-4xl font-black tracking-tighter">{viewingProject.name}</h1>
                        </div>
                        <p className="text-zinc-400 font-medium">{viewingProject.description || 'Visión estratégica del proyecto.'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <button 
                         onClick={() => exportProjectToHTML(viewingProject)}
                         className="p-4 bg-zinc-50 rounded-2xl hover:bg-white border border-transparent hover:border-zinc-200 transition-all flex items-center gap-2 font-bold text-sm"
                       >
                         <FileDown className="w-5 h-5" />
                         HTML
                       </button>
                       <button 
                         onClick={() => exportProjectToCSV(viewingProject)}
                         className="p-4 bg-zinc-50 rounded-2xl hover:bg-white border border-transparent hover:border-zinc-200 transition-all flex items-center gap-2 font-bold text-sm"
                       >
                         <FileSpreadsheet className="w-5 h-5" />
                         CSV
                       </button>
                       <button 
                         onClick={() => updateProjectStatus(viewingProject.id, 'completed')}
                         className="p-4 bg-black text-white rounded-2xl hover:bg-zinc-800 transition-all font-bold text-sm"
                       >
                         Marcar Completado
                       </button>
                       <button 
                         onClick={() => deleteProject(viewingProject.id)}
                         className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                       >
                         <Trash2 className="w-5 h-5" />
                       </button>
                    </div>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                     <div className="md:col-span-2 space-y-12">
                        <section className="space-y-6">
                           <div className="flex items-center justify-between">
                              <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-400">Listado Maestro de Tareas</h2>
                              <button 
                                onClick={() => {
                                  setQuickActionType('task');
                                  setSelectedProjectId(viewingProject.id);
                                  setShowQuickAction(true);
                                }}
                                className="text-sm font-bold text-black border-b-2 border-yellow-400 pb-0.5"
                              >
                                + Agregar Tarea
                              </button>
                           </div>
                           <div className="bg-zinc-50 rounded-[40px] p-2 space-y-1">
                              {tasks.filter(t => t.project_id === viewingProject.id).map(task => (
                                <TaskItem 
                                  key={task.id} 
                                  task={task} 
                                  onToggle={() => toggleTask(task.id)}
                                  onSend={() => sendTaskToWhatsApp(task)}
                                />
                              ))}
                              {tasks.filter(t => t.project_id === viewingProject.id).length === 0 && (
                                <div className="p-12 text-center text-zinc-400 italic">No hay tareas asignadas a este proyecto.</div>
                              )}
                           </div>
                        </section>
                     </div>

                     <div className="space-y-12">
                        <section className="bg-zinc-900 text-white p-10 rounded-[48px] shadow-2xl space-y-8 relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -z-0" />
                           <h2 className="text-2xl font-black tracking-tighter relative z-10">Métricas del Proyecto</h2>
                           <div className="space-y-6 relative z-10">
                              <div>
                                 <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500 mb-2">Progreso Operativo</p>
                                 <div className="flex items-end gap-3">
                                    <span className="text-7xl font-black tracking-tighter">
                                       {tasks.filter(t => t.project_id === viewingProject.id).length > 0 
                                         ? Math.round((tasks.filter(t => t.project_id === viewingProject.id && t.is_completed).length / tasks.filter(t => t.project_id === viewingProject.id).length) * 100) 
                                         : 0}%
                                    </span>
                                 </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                                    <p className="text-[9px] font-black uppercase text-zinc-500 mb-1">Total Tareas</p>
                                    <p className="text-2xl font-bold">{tasks.filter(t => t.project_id === viewingProject.id).length}</p>
                                 </div>
                                 <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                                    <p className="text-[9px] font-black uppercase text-zinc-500 mb-1">Completadas</p>
                                    <p className="text-2xl font-bold text-emerald-400">{tasks.filter(t => t.project_id === viewingProject.id && t.is_completed).length}</p>
                                 </div>
                              </div>
                           </div>
                        </section>

                        <section className="space-y-6">
                           <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-400">Detalles Técnicos</h2>
                           <div className="space-y-4">
                              <div className="flex justify-between items-center py-4 border-b border-zinc-100">
                                 <span className="text-sm font-bold text-zinc-500">Fecha Límite</span>
                                 <span className="font-bold">{viewingProject.due_date || 'Sin definir'}</span>
                              </div>
                              <div className="flex justify-between items-center py-4 border-b border-zinc-100">
                                 <span className="text-sm font-bold text-zinc-500">Creado el</span>
                                 <span className="font-bold">{new Date(viewingProject.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between items-center py-4 border-b border-zinc-100">
                                 <span className="text-sm font-bold text-zinc-500">Propietario</span>
                                 <span className="font-bold">{user.full_name}</span>
                              </div>
                           </div>
                        </section>
                     </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-12"
            >
              <div className="space-y-1 py-4">
                <h1 className="text-5xl font-black tracking-tighter leading-none">Rendimiento</h1>
                <p className="text-zinc-400 text-lg font-medium">Análisis profundo de tu productividad.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  icon={<Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />} 
                  label="Enfoque Total" 
                  value={`${Math.floor(tasks.reduce((acc, t) => acc + (t.total_time_spent || 0), 0) / 60)}m`} 
                  color="bg-yellow-50/50" 
                />
                <StatCard 
                  icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} 
                  label="Tareas Listas" 
                  value={completedTasks.toString()} 
                  color="bg-emerald-50/50" 
                />
                <StatCard 
                  icon={<FolderKanban className="w-5 h-5 text-blue-500" />} 
                  label="Proyectos" 
                  value={projects.length.toString()} 
                  color="bg-blue-50/50" 
                />
                <StatCard 
                  icon={<Target className="w-5 h-5 text-purple-500" />} 
                  label="Efectividad" 
                  value={`${tasks.length > 0 ? Math.round((completedTasks/tasks.length)*100) : 0}%`} 
                  color="bg-purple-50/50" 
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 card-bento bg-zinc-50 border-zinc-100 p-10">
                    <div className="card-title-bento mb-12">
                       <span>Distribución de Energía</span>
                       <BarChart3 className="w-3 h-3" />
                    </div>
                    <div className="h-64 flex items-end gap-4 md:gap-8">
                       {projects.slice(0, 7).map((p, i) => {
                         const pTasks = tasks.filter(t => t.project_id === p.id).length;
                         const h = pTasks > 0 ? (pTasks / tasks.length) * 100 : 5;
                         return (
                           <div key={p.id} className="flex-1 flex flex-col items-center gap-3 group">
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                className="w-full rounded-t-2xl relative shadow-lg"
                                style={{ backgroundColor: p.color }}
                              >
                                 <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] font-bold px-2 py-1 rounded">
                                    {pTasks}
                                 </div>
                              </motion.div>
                              <span className="text-[10px] font-black uppercase text-zinc-400 rotate-45 origin-left truncate w-full">{p.name}</span>
                           </div>
                         );
                       })}
                    </div>
                 </div>

                 <div className="card-bento bg-zinc-900 text-white border-zinc-800 p-10">
                    <div className="card-title-bento text-zinc-500">
                       <span>Racha de Logros</span>
                       <Rocket className="w-3 h-3" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center items-center gap-8">
                       <div className="w-40 h-40 rounded-full border-8 border-yellow-400/20 flex items-center justify-center relative">
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 border-8 border-transparent border-t-yellow-400 rounded-full"
                          />
                          <div className="text-center">
                             <p className="text-5xl font-black tracking-tighter">7</p>
                             <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 text-yellow-400">Días</p>
                          </div>
                       </div>
                       <p className="text-center text-sm font-medium text-zinc-400 leading-relaxed">
                          Has mantenido tu racha de enfoque por 7 días consecutivos. ¡Vas camino a la maestría!
                       </p>
                    </div>
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
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-4">
                <div className="space-y-1">
                  <h1 className="text-5xl font-black tracking-tighter leading-none">Compromiso</h1>
                  <p className="text-zinc-400 text-lg font-medium">MAR te recuerda lo que juraste cumplir.</p>
                </div>
                <button 
                  onClick={generateWhatsAppReminder}
                  className="apple-button h-16 px-8 bg-[#25D366] hover:bg-[#128C7E] rounded-3xl"
                >
                  <MessageSquare className="w-5 h-5 fill-current" />
                  Enviar Reporte WhatsApp
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="card-bento bg-zinc-50 border-zinc-100 p-8 space-y-6">
                   <div className="card-title-bento">
                      <span>Próximas Alertas</span>
                      <Clock className="w-3 h-3" />
                   </div>
                   <div className="space-y-3">
                      {tasks.filter(t => t.reminder_active && !t.is_completed).map(t => (
                        <div key={t.id} className="bg-white p-5 rounded-3xl border border-zinc-100 flex justify-between items-center group hover:border-black transition-all">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-black transition-colors">
                                 <MessageSquare className="w-5 h-5" />
                              </div>
                              <div>
                                 <p className="font-bold text-sm">{t.title}</p>
                                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t.scheduled_time || 'Sin hora'}</p>
                              </div>
                           </div>
                           <button onClick={() => sendTaskToWhatsApp(t)} className="p-2 bg-zinc-50 rounded-lg hover:bg-[#25D366] hover:text-white transition-all">
                              <ExternalLink className="w-4 h-4" />
                           </button>
                        </div>
                      ))}
                      {tasks.filter(t => t.reminder_active && !t.is_completed).length === 0 && (
                        <p className="text-center py-10 text-zinc-400 italic">No tienes alertas programadas.</p>
                      )}
                   </div>
                </div>

                <div className="card-bento bg-[#075e54] text-white p-8 space-y-6">
                   <div className="card-title-bento text-emerald-300">
                      <span>WhatsApp Automatizado</span>
                      <Zap className="w-3 h-3" />
                   </div>
                   <div className="space-y-6">
                      <p className="text-sm font-medium leading-relaxed text-emerald-100">
                         Cada mañana, MAR te enviará un mensaje con tus prioridades. Responde a ese mensaje para confirmar que sigues al mando.
                      </p>
                      <div className="bg-white/10 p-6 rounded-3xl space-y-4 border border-white/10">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                               <Smartphone className="w-6 h-6" />
                            </div>
                            <div>
                               <p className="font-bold">Notificaciones Push</p>
                               <p className="text-[10px] uppercase font-black text-emerald-300">Activado</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                               <Volume2 className="w-6 h-6" />
                            </div>
                            <div>
                               <p className="font-bold">Resumen Matutino</p>
                               <p className="text-[10px] uppercase font-black text-emerald-300">08:00 AM</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'admin' && isAdmin && (
            <div className="space-y-12">
               <div className="flex items-end justify-between py-4">
                  <div className="space-y-1">
                    <h1 className="text-5xl font-black tracking-tighter leading-none">Consola Admin</h1>
                    <p className="text-zinc-400 text-lg font-medium">Control total de la plataforma MAR.</p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setIsAdminCreatingUser(true)}
                      className="apple-button px-8"
                    >
                      <Plus className="w-5 h-5" />
                      Crear Usuario Manual
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="p-4 bg-zinc-50 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-bold text-sm"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                     <section className="bg-white rounded-[40px] border border-zinc-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/50">
                           <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Validación de Pagos Pendientes</h3>
                           <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[10px] font-bold">{allPayments.filter(p => p.status === 'pending').length} Pendientes</span>
                        </div>
                        <div className="overflow-x-auto">
                           <table className="w-full text-left">
                              <thead>
                                 <tr className="bg-zinc-50/50 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                    <th className="p-6">Usuario / Teléfono</th>
                                    <th className="p-6">Método / Referencia</th>
                                    <th className="p-6">Fecha</th>
                                    <th className="p-6 text-right">Acciones</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-50">
                                 {allPayments.filter(p => p.status === 'pending').map(payment => (
                                   <tr key={payment.id} className="hover:bg-zinc-50 transition-colors">
                                      <td className="p-6">
                                         <p className="font-bold text-sm">{payment.phone}</p>
                                         <p className="text-xs text-zinc-400">ID: {payment.user_id?.substring(0, 8)}...</p>
                                      </td>
                                      <td className="p-6">
                                         <span className="bg-zinc-100 px-3 py-1 rounded-full text-[10px] font-black uppercase mr-2">{payment.method}</span>
                                         <span className="font-mono text-sm font-bold">{payment.payment_code}</span>
                                      </td>
                                      <td className="p-6 text-xs text-zinc-400 font-medium">
                                         {new Date(payment.created_at).toLocaleString()}
                                      </td>
                                      <td className="p-6 text-right">
                                         <div className="flex justify-end gap-2">
                                            <button 
                                              onClick={() => validatePayment(payment.id, payment.user_id, 'active')}
                                              className="p-3 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                            >
                                               <CheckCircle2 className="w-5 h-5" />
                                            </button>
                                            <button 
                                              onClick={() => validatePayment(payment.id, payment.user_id, 'rejected')}
                                              className="p-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                            >
                                               <X className="w-5 h-5" />
                                            </button>
                                         </div>
                                      </td>
                                   </tr>
                                 ))}
                              </tbody>
                           </table>
                           {allPayments.filter(p => p.status === 'pending').length === 0 && (
                             <div className="p-12 text-center text-zinc-400 italic">No hay pagos pendientes de validación.</div>
                           )}
                        </div>
                     </section>

                     <section className="bg-white rounded-[40px] border border-zinc-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/50">
                           <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Usuarios en la Plataforma</h3>
                           <div className="flex gap-2">
                              <span className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-bold">{allUsers.length} Total</span>
                              <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold">{allUsers.filter(u => u.subscription_status === 'active').length} Activos</span>
                           </div>
                        </div>
                        <div className="max-h-[600px] overflow-y-auto">
                           <table className="w-full text-left">
                              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                 <tr className="bg-zinc-50/50 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                    <th className="p-6">Nombre / Perfil</th>
                                    <th className="p-6">Contacto</th>
                                    <th className="p-6">Estado</th>
                                    <th className="p-6 text-right">Manejo</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-50">
                                 {allUsers.map(u => (
                                   <tr key={u.id} className="hover:bg-zinc-50 transition-colors group">
                                      <td className="p-6">
                                         <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                                               {u.photo_url ? <img src={u.photo_url} className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-zinc-300" />}
                                            </div>
                                            <div>
                                               <p className="font-bold text-sm">{u.full_name}</p>
                                               <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{u.occupation || 'Sin profesión'}</p>
                                            </div>
                                         </div>
                                      </td>
                                      <td className="p-6">
                                         <p className="text-sm font-medium">{u.email}</p>
                                         <p className="text-xs text-zinc-400 font-bold">{u.phone_number}</p>
                                      </td>
                                      <td className="p-6">
                                         <select 
                                           value={u.subscription_status}
                                           onChange={(e) => updateUserSubscription(u.id, e.target.value)}
                                           className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full outline-none transition-colors ${
                                             u.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-600' : 
                                             u.subscription_status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                                           }`}
                                         >
                                            <option value="active">Activo</option>
                                            <option value="pending">Pendiente</option>
                                            <option value="cancelled">Cancelado</option>
                                            <option value="expired">Expirado</option>
                                         </select>
                                      </td>
                                      <td className="p-6 text-right">
                                         <button 
                                           onClick={() => deleteUser(u.id)}
                                           className="p-3 text-zinc-300 hover:text-red-500 hover:bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                         >
                                            <Trash2 className="w-5 h-5" />
                                         </button>
                                      </td>
                                   </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </section>
                  </div>

                  <div className="space-y-8">
                     <section className="card-bento bg-zinc-900 text-white border-zinc-800 p-8 space-y-6">
                        <div className="card-title-bento text-zinc-500">
                           <span>Resumen de Plataforma</span>
                           <BarChart3 className="w-3 h-3" />
                        </div>
                        <div className="space-y-6">
                           <div className="flex justify-between items-end">
                              <div>
                                 <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Ingresos Estimados</p>
                                 <p className="text-4xl font-black">S/ {allUsers.filter(u => u.subscription_status === 'active').length * 49}</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-sm font-bold text-emerald-400">↑ 12%</p>
                                 <p className="text-[10px] text-zinc-500 font-bold uppercase">Mes actual</p>
                              </div>
                           </div>
                           <div className="space-y-3 pt-6 border-t border-white/5">
                              <div className="flex justify-between text-sm">
                                 <span className="text-zinc-400">Total Usuarios</span>
                                 <span className="font-bold">{allUsers.length}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                 <span className="text-zinc-400">Conversión</span>
                                 <span className="font-bold">
                                    {allUsers.length > 0 ? Math.round((allUsers.filter(u => u.subscription_status === 'active').length / allUsers.length) * 100) : 0}%
                                 </span>
                              </div>
                           </div>
                        </div>
                     </section>

                     <section className="card-bento bg-white border-zinc-100 p-8 space-y-4">
                        <h4 className="font-black text-lg">System Logs</h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                           {[...Array(5)].map((_, i) => (
                             <div key={i} className="text-[10px] font-mono text-zinc-400 p-2 border-b border-zinc-50">
                                [LOGIN_SUCCESS] User {allUsers[i]?.id?.substring(0,8)} - {new Date().toLocaleTimeString()}
                             </div>
                           ))}
                        </div>
                     </section>
                  </div>
               </div>

               {isAdminCreatingUser && (
                 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[40px] p-10 max-w-lg w-full space-y-8 shadow-2xl border border-zinc-100 relative">
                       <button onClick={() => setIsAdminCreatingUser(false)} className="absolute top-6 right-6 p-2 bg-zinc-50 rounded-full hover:bg-zinc-100 transition-all">
                          <X className="w-5 h-5 text-zinc-400" />
                       </button>
                       <div className="text-center space-y-2">
                          <h2 className="text-3xl font-black tracking-tighter">Crear Usuario VIP</h2>
                          <p className="text-zinc-500 font-medium">Acceso manual para casos especiales.</p>
                       </div>
                       <form onSubmit={createManualUser} className="space-y-4">
                          <input 
                            placeholder="Nombre Completo" 
                            className="w-full bg-zinc-50 border-none rounded-[22px] px-6 py-4 outline-none focus:ring-2 ring-black font-bold"
                            value={newAdminUser.full_name}
                            onChange={(e) => setNewAdminUser({ ...newAdminUser, full_name: e.target.value })}
                            required
                          />
                          <input 
                            placeholder="Email" 
                            type="email"
                            className="w-full bg-zinc-50 border-none rounded-[22px] px-6 py-4 outline-none focus:ring-2 ring-black font-bold"
                            value={newAdminUser.email}
                            onChange={(e) => setNewAdminUser({ ...newAdminUser, email: e.target.value })}
                            required
                          />
                          <input 
                            placeholder="Teléfono (Ej: 51999...)" 
                            className="w-full bg-zinc-50 border-none rounded-[22px] px-6 py-4 outline-none focus:ring-2 ring-black font-bold"
                            value={newAdminUser.phone_number}
                            onChange={(e) => setNewAdminUser({ ...newAdminUser, phone_number: e.target.value })}
                            required
                          />
                          <select 
                            className="w-full bg-zinc-50 border-none rounded-[22px] px-6 py-4 outline-none focus:ring-2 ring-black font-bold appearance-none cursor-pointer"
                            value={newAdminUser.subscription_status}
                            onChange={(e) => setNewAdminUser({ ...newAdminUser, subscription_status: e.target.value })}
                          >
                             <option value="active">Activo (VIP)</option>
                             <option value="pending">Pendiente</option>
                             <option value="expired">Expirado</option>
                          </select>
                          <button type="submit" className="apple-button w-full py-5 text-lg mt-4">Crear Usuario</button>
                       </form>
                    </motion.div>
                 </div>
               )}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Quick Action Modal */}
      <AnimatePresence>
        {showQuickAction && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center p-6 md:items-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQuickAction(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="relative bg-white w-full max-w-xl rounded-[48px] p-8 md:p-12 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-yellow-400/10 to-transparent rounded-bl-full pointer-events-none" />
              
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black text-white rounded-[20px] flex items-center justify-center">
                    {quickActionType === 'task' ? <Plus className="w-6 h-6" /> : quickActionType === 'project' ? <Rocket className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                  </div>
                  <h2 className="text-3xl font-black tracking-tighter">
                    {quickActionType === 'task' ? 'Nueva Acción' : quickActionType === 'project' ? 'Visión Estratégica' : 'Recordatorio Vital'}
                  </h2>
                </div>
                <button 
                  onClick={() => setShowQuickAction(false)}
                  className="p-3 bg-zinc-50 rounded-full hover:bg-zinc-100 transition-colors"
                >
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>

              {quickActionType === 'task' && (
                <div className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-4">¿Qué tienes en mente?</label>
                       <input 
                         type="text"
                         autoFocus
                         placeholder="Ej: Revisar presentación comercial"
                         className="w-full bg-zinc-50 border-none rounded-[28px] px-8 py-6 text-xl font-bold outline-none focus:ring-4 ring-yellow-400/20 transition-all placeholder:text-zinc-300"
                         value={newTaskTitle}
                         onChange={(e) => setNewTaskTitle(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && addTask()}
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-4">Fecha</label>
                          <div className="relative">
                             <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                             <input 
                               type="date"
                               className="w-full bg-zinc-50 border-none rounded-[22px] pl-14 pr-6 py-5 font-bold outline-none ring-black/5 focus:ring-4 transition-all"
                               value={newTaskDueDate}
                               onChange={(e) => setNewTaskDueDate(e.target.value)}
                             />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-4">Proyecto</label>
                          <div className="relative">
                             <FolderKanban className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                             <select 
                               className="w-full bg-zinc-50 border-none rounded-[22px] pl-14 pr-10 py-5 font-bold outline-none ring-black/5 focus:ring-4 transition-all appearance-none cursor-pointer"
                               value={selectedProjectId || ''}
                               onChange={(e) => setSelectedProjectId(e.target.value || null)}
                             >
                                <option value="">General</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                             </select>
                             <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex flex-wrap gap-4">
                          <button 
                            onClick={() => setIsForToday(!isForToday)}
                            className={`px-6 py-3 rounded-2xl flex items-center gap-2 font-bold transition-all border-2 ${isForToday ? 'bg-black text-white border-black' : 'bg-transparent text-zinc-400 border-zinc-100 hover:border-zinc-300'}`}
                          >
                             <Star className={`w-4 h-4 ${isForToday ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                             Prioridad Hoy
                          </button>
                          <button 
                            onClick={() => setReminderActive(!reminderActive)}
                            className={`px-6 py-3 rounded-2xl flex items-center gap-2 font-bold transition-all border-2 ${reminderActive ? 'bg-blue-500 text-white border-blue-500' : 'bg-transparent text-zinc-400 border-zinc-100 hover:border-zinc-300'}`}
                          >
                             <MessageSquare className="w-4 h-4" />
                             Sync WhatsApp
                          </button>
                       </div>
                       
                       {reminderActive && (
                         <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
                            <input 
                              type="time" 
                              className="w-full bg-zinc-50 border-none rounded-[18px] px-6 py-4 font-bold outline-none focus:ring-2 ring-blue-400"
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                            />
                            <p className="text-[10px] font-bold text-zinc-400 mt-2 ml-4">Recibirás una alerta a esta hora.</p>
                         </motion.div>
                       )}
                    </div>
                  </div>

                  <button 
                    onClick={addTask}
                    disabled={!newTaskTitle.trim()}
                    className="apple-button w-full py-6 text-lg shadow-xl shadow-zinc-200"
                  >
                    Crear Acción Maestra
                  </button>
                </div>
              )}

              {quickActionType === 'project' && (
                <div className="space-y-8">
                   <div className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-4">Nombre del Proyecto</label>
                         <input 
                           type="text"
                           autoFocus
                           placeholder="Ej: Lanzamiento Marca 2024"
                           className="w-full bg-zinc-50 border-none rounded-[28px] px-8 py-6 text-xl font-bold outline-none focus:ring-4 ring-yellow-400/20 transition-all placeholder:text-zinc-300"
                           value={newProjectName}
                           onChange={(e) => setNewProjectName(e.target.value)}
                         />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-4">Límite</label>
                            <input 
                              type="date"
                              className="w-full bg-zinc-50 border-none rounded-[22px] px-6 py-5 font-bold outline-none transition-all"
                              value={newProjectDueDate}
                              onChange={(e) => setNewProjectDueDate(e.target.value)}
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-4">Color Distintivo</label>
                            <div className="flex gap-3 pt-1">
                               {['#000000', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'].map(c => (
                                 <button 
                                   key={c}
                                   onClick={() => setNewProjectColor(c)}
                                   className={`w-10 h-10 rounded-xl transition-all border-4 ${newProjectColor === c ? 'border-zinc-200 scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                   style={{ backgroundColor: c }}
                                 />
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                   <button 
                     onClick={addProject}
                     disabled={!newProjectName.trim()}
                     className="apple-button w-full py-6 text-lg shadow-xl shadow-zinc-200"
                   >
                     Materializar Visión
                   </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Bottom Navigation */}
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="bg-black/80 backdrop-blur-3xl border border-white/10 p-4 rounded-[32px] flex items-center gap-2 shadow-2xl"
        >
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutGrid className="w-5 h-5" />} label="Inicio" />
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckCircle2 className="w-5 h-5" />} label="Acciones" />
          <div className="w-px h-8 bg-white/10 mx-2" />
          <button 
             onClick={() => { setShowQuickAction(true); setQuickActionType('task'); }}
             className="w-14 h-14 bg-yellow-400 rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-yellow-400/20"
          >
             <Plus className="w-7 h-7 text-black stroke-[3]" />
          </button>
          <div className="w-px h-8 bg-white/10 mx-2" />
          <NavButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<BarChart3 className="w-5 h-5" />} label="Stats" />
          <NavButton active={activeTab === 'reminders'} onClick={() => setActiveTab('reminders')} icon={<Bell className="w-5 h-5" />} label="Sync" />
          {isAdmin && (
            <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<Users className="w-5 h-5" />} label="Admin" />
          )}
        </motion.div>
      </nav>

      <footer className="max-w-7xl mx-auto px-6 py-24 border-t border-zinc-100 mb-32">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="col-span-2 space-y-8">
            <Logo size="lg" />
            <p className="text-xl text-zinc-400 max-w-sm font-medium leading-relaxed">
              Forjando la élite del mañana a través de la disciplina radical y el enfoque inquebrantable.
            </p>
            <div className="flex gap-6">
               <a href={SOCIAL_LINKS.instagram} className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all"><Instagram className="w-5 h-5" /></a>
               <a href={SOCIAL_LINKS.facebook} className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all"><Facebook className="w-5 h-5" /></a>
               <a href={`https://wa.me/${WHATSAPP_NUMBER}`} className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all"><MessageSquare className="w-5 h-5" /></a>
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="font-black uppercase tracking-widest text-xs">Ecosistema</h4>
            <ul className="space-y-4 text-zinc-400 font-bold">
              <li><a href="#" className="hover:text-black transition-colors">La Metodología</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Casos de Éxito</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Comunidad VIP</a></li>
            </ul>
          </div>
          <div className="space-y-6">
            <h4 className="font-black uppercase tracking-widest text-xs">Legal</h4>
            <ul className="space-y-4 text-zinc-400 font-bold">
              <li><a href="#" className="hover:text-black transition-colors">Términos de Servicio</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Privacidad de Datos</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-24 pt-8 border-t border-zinc-50 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-300">
          <p>© 2024 MAR GLOBAL. DERECHOS RESERVADOS.</p>
          <p>FORGED BY MAR TEAM</p>
        </div>
      </footer>
    </div>
  );
}

// --- Sub-components ---

function ProgressWaves({ progress }: { progress: number }) {
  return (
    <div className="fixed top-0 left-0 right-0 h-1.5 z-[100] bg-zinc-100 overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        className="h-full bg-yellow-400 relative"
      >
        <motion.div 
          animate={{ x: [0, -20, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 right-0 h-full w-20 bg-gradient-to-r from-transparent to-white/30 skew-x-[45deg]"
        />
      </motion.div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, className = "" }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; className?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-all group ${active ? 'text-black' : 'text-zinc-300 hover:text-zinc-500'} ${className}`}
    >
      <div className={`p-3 md:p-4 rounded-2xl md:rounded-3xl transition-all ${active ? 'bg-zinc-100 scale-110 shadow-inner' : 'bg-transparent group-hover:bg-zinc-50'}`}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6 md:w-7 md:h-7" })}
      </div>
      <span className="text-[8px] font-black tracking-widest hidden md:block">{label}</span>
    </button>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${active ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      {icon}
      <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function TaskItem({ task, onToggle, onSend, onAddSubtask, onToggleSubtask, onStartTimer, onStopTimer }: { 
  task: Task; 
  onToggle: () => void; 
  onSend?: () => void;
  onAddSubtask?: (title: string) => void;
  onToggleSubtask?: (id: string) => void;
  onStartTimer?: () => void;
  onStopTimer?: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [newSub, setNewSub] = useState('');

  return (
    <motion.div 
      layout
      className={`bg-white rounded-[32px] p-6 border-2 transition-all ${task.is_completed ? 'border-zinc-50 opacity-60' : 'border-transparent hover:border-zinc-200'}`}
    >
      <div className="flex items-center gap-6">
        <button 
          onClick={onToggle}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${task.is_completed ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-zinc-50 text-zinc-300 hover:text-black'}`}
        >
          {task.is_completed ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-5 h-5 border-2 border-current rounded-lg" />}
        </button>
        
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowDetails(!showDetails)}>
          <h3 className={`font-bold text-lg leading-tight truncate ${task.is_completed ? 'line-through text-zinc-400' : 'text-black'}`}>
            {task.title}
          </h3>
          <div className="flex items-center gap-3 mt-1">
            {task.is_for_today && !task.is_completed && <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">HOY</span>}
            {task.scheduled_time && <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{task.scheduled_time}</span>}
            {task.tags?.map(tag => (
              <span key={tag} className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
           {task.timer_start ? (
             <button onClick={onStopTimer} className="p-3 bg-red-100 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all animate-pulse">
               <Timer className="w-5 h-5" />
             </button>
           ) : !task.is_completed && onStartTimer && (
             <button onClick={onStartTimer} className="p-3 bg-zinc-50 text-zinc-400 rounded-xl hover:bg-black hover:text-white transition-all">
               <Timer className="w-5 h-5" />
             </button>
           )}
           <button onClick={onSend} className="p-3 bg-zinc-50 text-zinc-400 rounded-xl hover:bg-[#25D366] hover:text-white transition-all">
             <MessageSquare className="w-5 h-5" />
           </button>
           <button onClick={() => setShowDetails(!showDetails)} className={`p-3 bg-zinc-50 text-zinc-400 rounded-xl transition-all ${showDetails ? 'rotate-180 bg-zinc-200 text-black' : ''}`}>
             <ChevronDown className="w-5 h-5" />
           </button>
        </div>
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-8 space-y-6">
              {task.description && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Contexto</p>
                  <p className="text-zinc-600 font-medium leading-relaxed">{task.description}</p>
                </div>
              )}

              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Micro-acciones</p>
                <div className="space-y-3">
                  {task.subtasks?.map(sub => (
                    <div 
                      key={sub.id} 
                      onClick={() => onToggleSubtask?.(sub.id)}
                      className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl cursor-pointer hover:bg-zinc-100 transition-colors group"
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all ${sub.is_completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-200 bg-white group-hover:border-black'}`}>
                        {sub.is_completed && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      <span className={`text-sm font-bold ${sub.is_completed ? 'line-through text-zinc-400' : 'text-zinc-700'}`}>{sub.title}</span>
                    </div>
                  ))}
                  {!task.is_completed && (
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Nueva micro-acción..."
                        className="flex-1 bg-zinc-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 ring-black"
                        value={newSub}
                        onChange={(e) => setNewSub(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newSub.trim()) {
                            onAddSubtask?.(newSub);
                            setNewSub('');
                          }
                        }}
                      />
                      <button 
                        onClick={() => {
                          if (newSub.trim()) {
                            onAddSubtask?.(newSub);
                            setNewSub('');
                          }
                        }}
                        className="p-3 bg-black text-white rounded-xl"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className={`p-8 rounded-[40px] flex flex-col gap-6 border border-zinc-100 shadow-sm ${color}`}>
      <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center shadow-md">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">{label}</p>
        <p className="text-4xl font-black tracking-tighter">{value}</p>
      </div>
    </div>
  );
}

function DeepFocusOverlay({ task, onClose, onComplete, onStartTimer, onStopTimer }: { 
  task: Task; 
  onClose: () => void; 
  onComplete: () => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(interval);
      playHaptic('success');
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    if (!isActive) onStartTimer();
    else onStopTimer();
    setIsActive(!isActive);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-zinc-900 text-white flex flex-col items-center justify-center p-10 overflow-hidden"
    >
      <div className="absolute top-10 left-10 flex items-center gap-4">
        <Logo size="sm" light />
        <div className="h-6 w-px bg-white/20" />
        <span className="text-[10px] font-black tracking-widest uppercase text-zinc-500">Modo Enfoque Profundo</span>
      </div>

      <button onClick={onClose} className="absolute top-10 right-10 p-4 bg-white/5 hover:bg-white/10 rounded-full transition-all">
        <X className="w-8 h-8" />
      </button>

      <div className="max-w-3xl w-full text-center space-y-16">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="space-y-4"
        >
          <span className="text-[12px] font-black uppercase tracking-[0.4em] text-yellow-400">TRABAJANDO EN</span>
          <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">{task.title}</h2>
        </motion.div>

        <div className="relative">
          <motion.div 
            animate={{ scale: isActive ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-[160px] md:text-[240px] font-black tracking-tighter leading-none text-white/5 tabular-nums absolute inset-0 flex items-center justify-center -z-10"
          >
            {minutes}:{seconds.toString().padStart(2, '0')}
          </motion.div>
          <div className="text-[120px] md:text-[180px] font-black tracking-tighter leading-none tabular-nums relative">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          <button 
            onClick={toggleTimer}
            className={`w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-2xl ${isActive ? 'bg-zinc-800 text-white' : 'bg-white text-black hover:scale-110'}`}
          >
            {isActive ? <X className="w-10 h-10" /> : <Play className="w-10 h-10 fill-current ml-2" />}
          </button>
          <button 
            onClick={() => {
              onComplete();
              onClose();
            }}
            className="h-28 px-12 bg-emerald-500 text-white rounded-[40px] font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-emerald-900/40"
          >
            FINALIZAR LOGRO
          </button>
        </div>

        <p className="text-zinc-500 font-medium">El mundo puede esperar. Tu visión no.</p>
      </div>

      <div className="absolute bottom-10 flex gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-yellow-400' : 'bg-white/10'}`} />
        ))}
      </div>
    </motion.div>
  );
}

function Portal({ user, setUser }: { user: any; setUser: (u: any) => void }) {
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+51');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const fullPhone = countryCode + phone;
      const { data, error: err } = await supabase.schema('mar').from('profiles').select('*').eq('phone_number', fullPhone).single();
      
      if (err || !data) {
        setError('Acceso denegado. Verifica tu número móvil.');
      } else {
        localStorage.setItem('mar_verified_phone', fullPhone);
        setUser(data);
      }
    } catch (err) {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center p-4 md:p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-[500px] w-full bg-white rounded-[40px] md:rounded-[60px] p-8 md:p-16 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.05)] border border-white"
      >
        <div className="text-center space-y-8 md:space-y-10">
          <div className="space-y-3 md:space-y-4">
            <h1 className="text-3xl md:text-[44px] font-black tracking-tight text-black">Bienvenido</h1>
            <p className="text-zinc-500 font-medium text-base md:text-lg leading-tight px-2 md:px-4">
              Si ya estás registrado, solo ingresa tu número móvil y disfruta.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 md:space-y-8">
            <div className="flex gap-2 md:gap-3">
              <div className="relative shrink-0">
                <select 
                  className="appearance-none bg-[#FCFCFC] border border-[#F0F0F0] rounded-[20px] md:rounded-[24px] pl-4 pr-10 py-4 md:py-5 font-bold text-black outline-none focus:ring-4 ring-black/5 transition-all cursor-pointer h-full text-base md:text-lg"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                >
                  {LATAM_COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
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
                localStorage.setItem('mar_admin_auth', 'true');
                window.location.reload();
              }}
              className="text-[10px] font-black text-zinc-300 hover:text-black uppercase tracking-[0.2em] transition-colors"
            >
              ACCESO RÁPIDO (DESARROLLADOR)
            </button>
            <div className="h-px bg-zinc-100 w-full" />
            <div className="space-y-1">
              <p className="text-sm font-medium italic text-zinc-400 text-center">¿Aún no tienes cuenta?</p>
              <button 
                type="button"
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

function Logo({ size = 'md', light = false }: { size?: 'sm' | 'md' | 'lg' | 'xl'; light?: boolean }) {
  const sizes = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-12 h-12 rounded-2xl',
    lg: 'w-16 h-16 rounded-[24px]',
    xl: 'w-24 h-24 rounded-[32px]'
  };
  
  return (
    <div className={`${sizes[size]} ${light ? 'bg-white text-black' : 'bg-black text-white'} flex items-center justify-center mx-auto shadow-xl`}>
      <Lightbulb className={`${size === 'xl' ? 'w-12 h-12' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'} text-yellow-400 fill-yellow-400`} />
    </div>
  );
}

function GuideStep({ num, text }: { num: string; text: string }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
      <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center font-black text-xs">{num}</div>
      <p className="text-sm font-bold text-zinc-700">{text}</p>
    </div>
  );
}

function OnboardingStep({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="flex gap-5 p-6 rounded-3xl hover:bg-zinc-50 transition-colors">
      <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-400 shrink-0 font-black text-xl">{number}</div>
      <div className="space-y-1">
        <h4 className="font-bold text-black">{title}</h4>
        <p className="text-xs text-zinc-400 leading-relaxed font-medium">{desc}</p>
      </div>
    </div>
  );
}

function LayoutGrid(props: any) {
  return (
    <svg 
      {...props} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

function Instagram(props: any) {
  return (
    <svg 
      {...props} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function Facebook(props: any) {
  return (
    <svg 
      {...props} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function Bell(props: any) {
  return (
    <svg 
      {...props} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

// Constants
const SOCIAL_LINKS = {
  instagram: 'https://instagram.com/mar_global',
  facebook: 'https://facebook.com/marglobal'
};
const WHATSAPP_NUMBER = '51999999999';

const LATAM_COUNTRIES = [
  { code: '+51', flag: '🇵🇪', name: 'Perú' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: '+56', flag: '🇨🇱', name: 'Chile' },
  { code: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: '+52', flag: '🇲🇽', name: 'México' },
  { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
];
