import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useApp, Logger } from '../../App';
import { StorageService } from '../../store';

const AdminLogin: React.FC = () => {
  const { isLoggedIn, setIsLoggedIn, t } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Logger.info("Admin Login UI: Initializing centered login card.");
  }, []);

  if (isLoggedIn) return <Navigate to="/admin" />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await StorageService.login(username.trim(), password);
      setIsLoggedIn(true);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Incorrect username or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-500">
      <div className="w-full max-w-lg windowy-glass rounded-[4rem] p-12 lg:p-16 shadow-2xl space-y-12 transition-all border-white/10">
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter dark:text-white uppercase">Imation Admin</h1>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs opacity-60">{t.signIn} to manage your shop</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                required
                type="text"
                autoComplete="username"
                placeholder={t.administrator}
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                className={`w-full pl-16 pr-6 py-6 bg-white/10 rounded-[2rem] outline-none border dark:text-white font-black transition-all ${error ? 'border-red-500' : 'border-white/5 focus:border-brand'}`}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                required
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder={`${t.password}`}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className={`w-full pl-16 pr-16 py-6 bg-white/10 rounded-[2rem] outline-none border dark:text-white font-black transition-all ${error ? 'border-red-500' : 'border-white/5 focus:border-brand'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm font-black text-center animate-pulse">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-6 bg-brand hover:bg-brand-dark text-white rounded-[2.5rem] font-black text-lg transition-all shadow-2xl shadow-brand/30 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : t.signIn}
          </button>
        </form>
      </div>
      <div className="mt-12 text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] opacity-30">
        System Access Level 1
      </div>
    </div>
  );
};

export default AdminLogin;
