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
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { CONFIG } from './config';
import type { Project, Task, Subtask } from './types';

// Utility for formatting time
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
  const [viewingProject, setViewingProject] = useState<Project | null>(null);

  // New Item States
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#000000');

  // Verify Auth
  useEffect(() => {
    const verifiedPhone = localStorage.getItem('mar_verified_phone');
    const adminAuth = localStorage.getItem('mar_admin_auth');
    
    if (verifiedPhone || adminAuth) {
      setUser({ phone: verifiedPhone, isAdmin: !!adminAuth });
      fetchData(verifiedPhone);
    } else {
      setIsAuthReady(true);
      setLoading(false);
    }
  }, []);

  const fetchData = async (phone: string | null) => {
    if (!phone && !localStorage.getItem('mar_admin_auth')) return;
    
    setLoading(true);
    try {
      // Fetch projects and tasks from Supabase
      const { data: projectsData } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      const { data: tasksData } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      
      setProjects(projectsData || []);
      setTasks(tasksData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsAuthReady(true);
      setLoading(false);
    }
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    const newTask = {
      title: newTaskTitle,
      project_id: selectedProjectId,
      status: 'todo',
      is_completed: false,
      is_for_today: true,
      user_id: user?.phone
    };

    const { data, error } = await supabase.from('tasks').insert([newTask]).select();
    if (!error && data) {
      setTasks([data[0], ...tasks]);
      setNewTaskTitle('');
      setIsAddingTask(false);
      setShowQuickAction(false);
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const { error } = await supabase.from('tasks').update({ is_completed: !task.is_completed, status: !task.is_completed ? 'done' : 'todo' }).eq('id', id);
    if (!error) {
      setTasks(tasks.map(t => t.id === id ? { ...t, is_completed: !t.is_completed, status: !t.is_completed ? 'done' : 'todo' } : t));
    }
  };

  if (!isAuthReady || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center"
        >
          <Lightbulb className="w-6 h-6 text-yellow-400 fill-yellow-400" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Portal onLogin={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-yellow-200">
      {/* Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-zinc-200 px-6 py-4 rounded-full shadow-2xl z-50 flex items-center gap-8">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Lightbulb />} label="MAR" />
        <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckCircle2 />} label="Tareas" />
        <NavButton active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} icon={<FolderKanban />} label="Proyectos" />
        <button 
          onClick={() => setShowQuickAction(true)}
          className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl"
        >
          <Plus className="w-6 h-6" />
        </button>
        <NavButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<Zap />} label="Racha" />
        <NavButton active={activeTab === 'reminders'} onClick={() => setActiveTab('reminders')} icon={<MessageSquare />} label="Compromiso" />
        {user?.isAdmin && <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<Settings />} label="Admin" />}
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-12 pb-32">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dash" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <header className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
                    <Lightbulb className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">MAR</h1>
                </div>
                <div className="flex items-center gap-3">
                   <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                     <LogOut className="w-5 h-5" />
                   </button>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-2 bg-zinc-900 rounded-[32px] p-8 text-white min-h-[240px] flex flex-col justify-between shadow-2xl">
                  <div className="flex justify-between text-white/50 text-xs font-bold uppercase tracking-widest">
                    <span>Enfoque del Día</span>
                    <span>{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <div>
                    <h2 className="text-4xl font-bold leading-tight mb-4">Haz que suceda hoy.</h2>
                    <p className="text-white/60 mb-6">Selecciona tu tarea de mayor impacto y concéntrate solo en ella.</p>
                    <button onClick={() => setActiveTab('tasks')} className="bg-white text-black px-6 py-3 rounded-full font-bold text-sm">Elegir Tarea</button>
                  </div>
                </div>

                <div className="bg-blue-50/50 rounded-[32px] p-6 border border-blue-100 flex flex-col">
                  <span className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-4">Tareas de Hoy</span>
                  <div className="space-y-3 flex-grow overflow-y-auto max-h-[160px]">
                    {tasks.filter(t => !t.is_completed).slice(0, 3).map(t => (
                      <div key={t.id} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="text-sm font-medium text-blue-900 truncate">{t.title}</span>
                      </div>
                    ))}
                    {tasks.filter(t => !t.is_completed).length === 0 && <p className="text-blue-400 text-xs mt-4">Todo listo por hoy</p>}
                  </div>
                  <button onClick={() => setActiveTab('tasks')} className="mt-4 text-[10px] font-bold text-blue-600 uppercase tracking-widest text-left">Ver todas →</button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'tasks' && <TasksView tasks={tasks} onToggle={toggleTask} onAddTask={() => setIsAddingTask(true)} />}
          {activeTab === 'projects' && <ProjectsView projects={projects} tasks={tasks} />}
          {activeTab === 'admin' && <AdminView />}
        </AnimatePresence>
      </main>

      {/* Quick Action Modal */}
      <AnimatePresence>
        {showQuickAction && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
               initial={{ y: 100, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 100, opacity: 0 }}
               className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl relative"
            >
              <button onClick={() => setShowQuickAction(false)} className="absolute top-6 right-6 p-2 hover:bg-zinc-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-2xl font-bold mb-6">Acción Rápida</h3>
              <div className="space-y-4">
                <input 
                  autoFocus
                  placeholder="¿En qué estás pensando?" 
                  className="w-full text-lg outline-none bg-zinc-50 p-4 rounded-2xl border border-transparent focus:border-black transition-all"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTask()}
                />
                <button onClick={addTask} className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all">
                  Guardar como Tarea
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-black scale-110' : 'text-zinc-400 hover:text-zinc-600'}`}
    >
      <div className={`${active ? 'bg-zinc-100 p-1.5 rounded-lg' : ''}`}>
        {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function TasksView({ tasks, onToggle, onAddTask }: { tasks: Task[], onToggle: (id: string) => void, onAddTask: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tareas</h1>
        <button onClick={onAddTask} className="p-2 bg-zinc-100 rounded-xl"><Plus /></button>
      </div>
      <div className="bg-white border border-zinc-100 rounded-[32px] overflow-hidden divide-y divide-zinc-100">
        {tasks.map(t => (
          <div key={t.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors cursor-pointer group" onClick={() => onToggle(t.id)}>
            <div className="flex items-center gap-4">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${t.is_completed ? 'bg-black border-black' : 'border-zinc-200'}`}>
                {t.is_completed && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
              <span className={`font-medium ${t.is_completed ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>{t.title}</span>
            </div>
            {t.is_for_today && <span className="text-[8px] font-bold uppercase tracking-widest text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">Hoy</span>}
          </div>
        ))}
        {tasks.length === 0 && <div className="p-12 text-center text-zinc-400 font-medium">No hay tareas aún. Añade tu primera idea.</div>}
      </div>
    </motion.div>
  );
}

function ProjectsView({ projects, tasks }: { projects: Project[], tasks: Task[] }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h1 className="text-3xl font-bold">Proyectos</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {projects.map(p => {
          const projectTasks = tasks.filter(t => t.project_id === p.id);
          const progress = projectTasks.length ? (projectTasks.filter(t => t.is_completed).length / projectTasks.length) * 100 : 0;
          return (
            <div key={p.id} className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center" style={{ color: p.color }}><FolderKanban /></div>
              <h3 className="text-xl font-bold">{p.name}</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  <span>Progreso</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: p.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function Portal({ onLogin }: { onLogin: () => void }) {
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'login' | 'payment'>('login');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if(phone.length >= 9) {
      localStorage.setItem('mar_verified_phone', phone);
      onLogin();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl">
            <Lightbulb className="w-8 h-8 fill-yellow-400 text-yellow-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Bienvenido a MAR</h1>
          <p className="text-zinc-500 font-medium">Ingresa tu número para comenzar.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="flex gap-2">
            <div className="bg-zinc-100 px-4 py-4 rounded-2xl font-bold text-sm flex items-center">+51</div>
            <input 
              required
              type="tel"
              placeholder="Número de teléfono"
              className="flex-1 bg-zinc-100 rounded-2xl px-6 py-4 outline-none focus:ring-2 ring-black font-bold"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
          <button className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg hover:bg-zinc-800 transition-all">Acceder</button>
        </form>
        
        <p className="text-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Minimalism • Action • Results</p>
      </motion.div>
    </div>
  );
}

function AdminView() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Administración</h1>
      <div className="bg-zinc-50 p-12 rounded-[32px] border border-dashed border-zinc-200 text-center">
        <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
        <p className="text-zinc-500 font-medium">Panel de control exclusivo para administración.</p>
      </div>
    </div>
  );
}

