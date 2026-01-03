import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bug, RefreshCw, X, Database, Shield, Globe } from 'lucide-react';

const DebugConsole: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');

  const addLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    const time = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    setLogs(prev => [`[${time}] ${prefix} ${msg}`, ...prev]);
  };

  const runDiagnostics = async () => {
    setStatus('checking');
    setLogs([]);
    addLog('Starting diagnostics...', 'info');

    // 1. Check Configuration
    try {
      // @ts-ignore - access private prop for debug
      const url = supabase.supabaseUrl;
      // @ts-ignore
      const key = supabase.supabaseKey;
      
      addLog(`URL configured: ${url ? 'YES' : 'NO'} (${url})`, url ? 'info' : 'error');
      addLog(`Key configured: ${key ? 'YES' : 'NO'}`, key ? 'info' : 'error');

      if (!url || !key) throw new Error("Supabase credentials missing.");
    } catch (e: any) {
      addLog(e.message, 'error');
      setStatus('error');
      return;
    }

    // 2. Check Network / Auth
    try {
      addLog('Testing Auth Service...', 'info');
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      addLog(`Auth Service Reachable. Session: ${data.session ? 'Active' : 'None'}`, 'success');
    } catch (e: any) {
      addLog(`Auth Error: ${e.message}`, 'error');
      if (e.message === 'Failed to fetch') {
        addLog('HINT: This often means the Supabase URL is wrong, or the project is paused.', 'info');
      }
      setStatus('error');
      // Don't stop here, try DB
    }

    // 3. Check Database
    try {
      addLog('Testing Database Connection...', 'info');
      // Try to select count from entries (minimal payload)
      const { count, error } = await supabase
        .from('entries')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      addLog(`Database Connected. Table 'entries' exists.`, 'success');
    } catch (e: any) {
      addLog(`DB Error: ${e.message}`, 'error');
      addLog(`Details: ${JSON.stringify(e)}`, 'error');
      
      if (e.code === '42P01') {
         addLog("HINT: Table 'entries' does not exist. Did you run the SQL script?", 'info');
      }
    }

    setStatus('idle');
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[100] bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition opacity-50 hover:opacity-100"
        title="Open Debug Console"
      >
        <Bug size={20} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700">
          <div className="flex items-center gap-2 text-white font-mono">
            <Bug size={18} className="text-emerald-400" />
            <span className="font-bold">System Diagnostics</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={runDiagnostics}
              disabled={status === 'checking'}
              className="p-2 hover:bg-gray-700 rounded-lg text-gray-300 transition"
              title="Rerun Tests"
            >
              <RefreshCw size={18} className={status === 'checking' ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-gray-300 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="grid grid-cols-3 gap-1 bg-gray-800/50 p-2 text-xs font-mono text-gray-400 border-b border-gray-700">
           <div className="flex items-center gap-2 justify-center">
             <Globe size={14} /> Network
           </div>
           <div className="flex items-center gap-2 justify-center">
             <Shield size={14} /> Auth
           </div>
           <div className="flex items-center gap-2 justify-center">
             <Database size={14} /> Database
           </div>
        </div>

        {/* Console Output */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2 bg-black/80 text-gray-300">
          {logs.length === 0 && <span className="opacity-50">Click refresh to run diagnostics...</span>}
          {logs.map((log, i) => (
            <div key={i} className={`break-words ${log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-emerald-400' : ''}`}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DebugConsole;