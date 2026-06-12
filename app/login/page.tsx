"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/app/actions/auth";
import { Lock, Mail, ArrowRight, Eye, EyeOff, Sparkles, ShieldCheck, ShieldAlert, Cpu, Globe, Rocket, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Auto-dismiss toast notifications after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setToast({ type: "error", message: "Please fill in all fields." });
      return;
    }

    setLoading(true);
    setToast(null);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    try {
      const result = await login(null, formData);

      if (result.success && result.user) {
        setToast({ 
          type: "success", 
          message: `Welcome back, ${result.user.name}! Redirecting...` 
        });

        // Delay to let the success state show
        setTimeout(() => {
          if (result.user?.role === "admin") {
            router.push("/admin");
          } else if (result.user?.role === "employee") {
            router.push("/employee");
          } else if (result.user?.role === "client") {
            router.push("/client");
          }
        }, 1200);
      } else {
        setToast({ 
          type: "error", 
          message: result.error || "Login failed. Please check credentials." 
        });
        setLoading(false);
      }
    } catch (err: any) {
      setToast({ 
        type: "error", 
        message: err.message || "An unexpected system error occurred." 
      });
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.6, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#03050a] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Toast Notification Layer */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3.5 px-5 py-4 rounded-2xl border backdrop-blur-2xl shadow-2xl ${
              toast.type === "success" 
                ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-200 shadow-emerald-950/40" 
                : "bg-rose-950/60 border-rose-500/30 text-rose-200 shadow-rose-950/40"
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${toast.type === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
              {toast.type === "success" ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Alert</span>
              <span className="text-sm font-semibold pr-2 mt-0.5">{toast.message}</span>
            </div>
            <button 
              type="button"
              onClick={() => setToast(null)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors ml-auto"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Panel: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center relative p-6 sm:p-12 z-10">
        
        {/* Subtle background radial for the form side */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.05),transparent)] pointer-events-none" />

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-[420px]"
        >
          {/* Logo & Header */}
          <motion.div variants={itemVariants} className="mb-10 text-center lg:text-left">
            <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-2xl shadow-xl shadow-indigo-500/20 mb-6 lg:mx-0 mx-auto group">
              <Sparkles className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
              Welcome back
            </h1>
            <p className="text-sm text-slate-400 font-medium">
              Enter your credentials to access the agency portal.
            </p>
          </motion.div>

          {/* Form */}
          <motion.form variants={itemVariants} onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email */}
            <div className="space-y-2.5">
              <label htmlFor="email" className="text-xs font-bold text-slate-300 ml-1 flex items-center justify-between">
                <span>Email Address</span>
              </label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-indigo-400 transition-colors">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@thepiecraft.com"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-50 transition-all font-medium text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between ml-1">
                <label htmlFor="password" className="text-xs font-bold text-slate-300">
                  Password
                </label>
                <a href="mailto:info@thepiecraftmarketing.com?subject=CRM%20Password%20Reset%20Request" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-indigo-400 transition-colors">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-50 transition-all font-medium text-sm"
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="relative w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-600/20 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 disabled:opacity-70 transition-all flex items-center justify-center gap-2 group overflow-hidden mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4.5 h-4.5 transition-transform group-hover:translate-x-1 duration-300" />
                </>
              )}
            </motion.button>
          </motion.form>

          {/* Footer */}
          <motion.div variants={itemVariants} className="mt-10 flex flex-col items-center lg:items-start space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-900/50 border border-slate-800 rounded-full px-3 py-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>AES-256 Encrypted Connection</span>
            </div>
            <p className="text-xs text-slate-600 text-center lg:text-left">
              By signing in, you agree to ThePieCraft CRM's <br className="hidden lg:block"/>
              <a href="https://thepiecraftmarketing.com/terms" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-300 underline underline-offset-2 transition-colors">Terms of Service</a> and <a href="https://thepiecraftmarketing.com/privacy" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-300 underline underline-offset-2 transition-colors">Privacy Policy</a>.
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Right Panel: Stunning Branding Showcase (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 relative bg-[#0a0f1c] items-center justify-center overflow-hidden border-l border-slate-800/50">
        
        {/* Abstract Gradient Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-600/20 blur-[120px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-violet-600/20 blur-[120px] mix-blend-screen animate-[pulse_10s_ease-in-out_infinite]" />
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_40%,transparent_100%)]" />

        {/* Content Wrapper */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 w-full max-w-lg p-12"
        >
          {/* Glassmorphic Feature Card */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
            {/* Top Shine */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
                <Globe className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-slate-300">Global Operating System</span>
            </div>

            <h2 className="text-3xl leading-snug font-extrabold text-white mb-6">
              Empower your agency <br/>
              with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">intelligent automation</span>.
            </h2>
            
            <p className="text-slate-400 leading-relaxed mb-8">
              ThePieCraft CRM unifies your team's workflow, client communications, and performance analytics into one seamless, secure platform.
            </p>

            <div className="space-y-4">
              {[
                { text: "Real-time AI performance insights", icon: <Cpu className="w-4 h-4 text-violet-400" /> },
                { text: "Automated billing and invoicing", icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> },
                { text: "Centralized client communication hub", icon: <Rocket className="w-4 h-4 text-amber-400" /> }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800/50 border border-slate-700/50">
                    {feature.icon}
                  </div>
                  <span className="text-sm font-medium text-slate-300">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
      
    </div>
  );
}
