import React, { useState, useEffect, useRef } from 'react';
import { 
  Lightbulb, 
  ChevronRight, 
  Star,  Brain, 
  Waves, 
  Rocket, 
  GraduationCap, 
  Briefcase, 
  Users, 
  Smartphone, 
  CheckCircle2, 
  FolderKanban,
  ArrowLeft,
  Send,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CONFIG } from './config';
import { supabase } from './lib/supabase';

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

export default function App() {
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+51');
  const [step, setStep] = useState<'landing' | 'register' | 'payment' | 'success' | 'login'>('landing');
  const [formData, setFormData] = useState({ name: '', phone: '', occupation: 'Estudiante', otherOccupation: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [paymentCode, setPaymentCode] = useState('');
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

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
    if (adminPassword === 'Admin2024') {
      setIsAdminOpen(true);
      setShowAdminLogin(false);
      setAdminPassword('');
      setError(null);
    } else {
      setError('Contraseña administrativa incorrecta');
      setAdminPassword('');
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
          id: crypto.randomUUID(),
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
      localStorage.setItem('mar_temp_user', JSON.stringify(formData));
      setStep('payment');
    } finally {
      setLoading(false);
    }
  };

  const handleFreeActivation = () => {
    setStep('success');
  };

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminConfig, setAdminConfig] = useState({
    whatsapp: CONFIG.whatsapp,
    instagram: CONFIG.instagram,
    yape_qr_url: '',
  });

  // Cargar configuración desde Supabase al iniciar
  useEffect(() => {
    const fetchConfig = async () => {
      const { data, error } = await supabase
        .schema('mar')
        .from('landing_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (data && !error) {
        setAdminConfig({
          whatsapp: data.whatsapp,
          instagram: data.instagram,
          yape_qr_url: data.yape_qr_url,
        });
      }
    };
    fetchConfig();
  }, []);

  const saveAdminSettings = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .schema('mar')
        .from('landing_settings')
        .upsert({
          id: 1,
          whatsapp: adminConfig.whatsapp,
          instagram: adminConfig.instagram,
          yape_qr_url: adminConfig.yape_qr_url,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      alert('¡Configuración guardada en Supabase (Schema: mar)!');
      setIsAdminOpen(false);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Error al guardar: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (isAdminOpen) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-8 font-sans">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-black">Configuración MAR</h1>
            <button onClick={() => setIsAdminOpen(false)} className="text-zinc-500 hover:text-white">Cerrar</button>
          </div>
          
          <div className="grid gap-6 bg-zinc-900 p-8 rounded-3xl border border-zinc-800">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest">WhatsApp de Ayuda</label>
              <input 
                type="text" 
                value={adminConfig.whatsapp}
                onChange={(e) => setAdminConfig({...adminConfig, whatsapp: e.target.value})}
                className="w-full bg-zinc-800 border-none rounded-xl p-4 font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Instagram URL</label>
              <input 
                type="text" 
                value={adminConfig.instagram}
                onChange={(e) => setAdminConfig({...adminConfig, instagram: e.target.value})}
                className="w-full bg-zinc-800 border-none rounded-xl p-4 font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest">URL Imagen QR Yape/Plin</label>
              <input 
                type="text" 
                placeholder="https://tu-imagen.com/qr.jpg"
                value={adminConfig.yape_qr_url}
                onChange={(e) => setAdminConfig({...adminConfig, yape_qr_url: e.target.value})}
                className="w-full bg-zinc-800 border-none rounded-xl p-4 font-mono"
              />
            </div>
            <button 
              onClick={saveAdminSettings}
              className="w-full bg-white text-black py-4 rounded-xl font-bold hover:bg-zinc-200 transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'landing') {
    return (
      <div className="min-h-screen bg-white font-sans overflow-x-hidden text-zinc-900">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-[100] border-b border-zinc-100 flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleLogoClick}>
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
            className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] max-w-4xl"
          >
            Ordena tu caos. <br />
            Configura tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-700 via-black to-zinc-700">éxito.</span>
          </motion.h1>

          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl font-medium text-zinc-500 max-w-2xl mx-auto leading-relaxed mb-12"
          >
            MAR es el sistema inteligente para capturar ideas, gestionar proyectos y dominar tus tareas. 
            Menos ruido mental, más ejecución real.
          </motion.p>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 w-full max-w-md"
          >
            <button 
              onClick={() => setStep('register')}
              className="flex-1 bg-black text-white px-8 py-5 rounded-2xl font-bold text-lg hover:bg-zinc-800 transition-all shadow-xl flex items-center justify-center gap-2 group"
            >
              Comenzar Gratis
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => document.getElementById('methodology')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-5 rounded-2xl font-bold text-lg border border-zinc-200 hover:bg-zinc-50 transition-all"
            >
              Ver Metodología
            </button>
          </motion.div>
        </section>

        {/* Admin Login Modal */}
        <AnimatePresence>
          {showAdminLogin && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl"
              >
                <h3 className="text-2xl font-black mb-4">Acceso Admin</h3>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <input 
                    type="password"
                    placeholder="Contraseña"
                    className="w-full bg-zinc-100 border-none rounded-2xl p-4 font-bold"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    autoFocus
                  />
                  {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setShowAdminLogin(false)}
                      className="flex-1 py-4 font-bold text-zinc-400"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-black text-white py-4 rounded-2xl font-bold"
                    >
                      Entrar
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Methodology Section */}
        <section id="methodology" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <header className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">Metodología MAR</h2>
              <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
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
          <div className="max-w-6xl mx-auto space-y-16">
            <motion.h2 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="text-3xl md:text-6xl font-black tracking-tighter text-center bg-clip-text text-transparent bg-gradient-to-r from-black via-zinc-500 to-black"
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
        <section className="py-32 px-6">
          <div className="max-w-5xl mx-auto bg-zinc-900 text-white p-12 md:p-20 rounded-[48px] shadow-2xl relative overflow-hidden text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-[80px]" />
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 leading-tight">¿Listo para transformar <br /> tus ideas en resultados?</h2>
            <p className="text-zinc-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto">Únete a cientos de estudiantes y emprendedores que ya dominan su tiempo con MAR.</p>
            <button 
              onClick={() => setStep('register')}
              className="bg-white text-black px-12 py-6 rounded-2xl font-black text-xl hover:scale-105 transition-all shadow-xl"
            >
              Comenzar Ahora
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 px-6 border-t border-zinc-100 text-center">
          <div className="flex justify-center items-center gap-8 mb-8 text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px]">
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
      <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans relative">
        <button 
          onClick={() => setStep('landing')}
          className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-black transition-colors font-bold"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Regresar</span>
        </button>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-8 bg-zinc-50 p-10 rounded-[48px] text-center"
        >
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter">Bienvenido</h2>
            <p className="text-zinc-500 font-medium">Si ya estás registrado, solo ingresa tu número móvil y disfruta.</p>
          </div>
          
          <div className="space-y-4">
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
                placeholder="Teléfono móvil"
                className="flex-1 bg-white border-none rounded-[22px] px-6 py-5 outline-none focus:ring-2 ring-black font-bold"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            <button 
              onClick={() => {
                // Redirect to main app with phone
                window.location.href = `https://app.mariasuite.cloud`;
              }}
              className="apple-button w-full py-5"
            >
              Entrar
            </button>
            <div className="pt-4 border-t border-zinc-200">
               <p className="text-sm text-zinc-400 mb-4 font-medium italic">¿Aún no tienes cuenta?</p>
               <button 
                 onClick={() => setStep('register')}
                 className="text-black font-black text-lg hover:underline underline-offset-4"
               >
                 Comenzar ahora / Regístrate ya
               </button>
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
          <div 
            onClick={() => setIsAdminOpen(true)}
            className="w-16 h-16 bg-black rounded-2xl mx-auto flex items-center justify-center text-white shadow-xl cursor-pointer hover:scale-105 transition-transform mb-2"
          >
            <Users className="w-8 h-8" />
          </div>
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
          
          <button className="apple-button w-full py-5 mt-4 text-white bg-black rounded-2xl font-bold">Siguiente</button>
          
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
                  src={adminConfig.yape_qr_url || "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=YapeMAR"} 
                  alt="QR Yape" 
                  className="w-40 h-40 group-hover:scale-110 transition-transform duration-500 object-contain" 
                />
             </div>
             <div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-1">Nombre</p>
                <p className="text-2xl font-black text-purple-600">MAR App Oficial</p>
             </div>
          </div>

          <div className="space-y-4">
            {/* OPCIÓN FREE DESTACADA */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              onClick={handleFreeActivation}
              className="bg-black text-white p-6 rounded-3xl cursor-pointer border-2 border-transparent hover:border-zinc-400 transition-all shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute top-4 right-4 bg-zinc-800 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                Modo Recomendado
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black italic">PROBAR GRATIS (BETA)</h3>
                  <p className="text-zinc-400 text-sm font-medium">Activa tu cuenta al instante</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end text-sm font-bold gap-2">
                Empezar ya <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center text-zinc-200"><div className="w-full border-t border-zinc-100"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-zinc-300 bg-white px-4">ó activa con aporte</div>
            </div>

            {/* OPCIÓN PAGO (MINIMIZADA) */}
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
                 className="apple-button w-full py-5 flex items-center justify-center gap-2 group text-white bg-black rounded-2xl font-bold"
               >
                 <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                 Validar Pago Yape
               </button>
            </div>
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
          onClick={() => {
            // URL de tu aplicación real (App repo)
            window.location.href = 'https://app.mariasuite.cloud';
          }}
          className="bg-black text-white px-12 py-5 rounded-2xl font-bold text-lg hover:bg-zinc-800 transition-all shadow-xl flex items-center gap-2 group mx-auto"
        >
          Ir al App de MAR
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    );
  }

  return null;
}

function PillarCard({ icon, title, desc, color, index }: { icon: React.ReactNode, title: string, desc: string, color: string, index: number }) {
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

function PersonaItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, x: -30 },
        visible: { opacity: 1, x: 0 }
      }}
      whileHover={{ 
        scale: 1.02,
        x: 10,
        backgroundColor: "rgba(255, 255, 255, 1)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.05)"
      }}
      className="flex gap-6 p-6 rounded-[32px] transition-all border border-transparent hover:border-zinc-100 group/item cursor-pointer group-hover/list:opacity-50 hover:!opacity-100 hover:z-10"
    >
      <motion.div 
        whileHover={{ rotate: [-10, 10, -10, 0], scale: 1.1 }}
        className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm text-zinc-400 shrink-0 group-hover/item:text-yellow-500 group-hover/item:shadow-lg group-hover/item:shadow-yellow-100 transition-all border border-zinc-50"
      >
        {icon}
      </motion.div>
      <div className="text-left">
        <h4 className="font-black text-xl mb-1 group-hover/item:text-black transition-colors">{title}</h4>
        <p className="text-base text-zinc-500 font-medium leading-relaxed group-hover/item:text-zinc-600 transition-colors">{desc}</p>
      </div>
    </motion.div>
  );
}

function FlowSection({ icon, title, desc, steps, color, imageUrl, reverse }: { 
  icon: React.ReactNode, 
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
      className="bg-white p-8 md:p-12 rounded-[56px] shadow-sm hover:shadow-2xl hover:shadow-zinc-200/50 border border-zinc-100 transition-all duration-500 group relative overflow-hidden text-left"
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
