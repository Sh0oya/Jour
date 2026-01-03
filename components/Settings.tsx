import React, { useState } from 'react';
import { User, UserTier } from '../types';
import { User as UserIcon, Moon, Bell, Shield, LogOut, Loader2, Target, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SettingsProps {
  user: User;
  onToggleTier: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onToggleTier }) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleCheckout = (productId: string, type: string) => {
    setLoading(productId);
    // Mock Checkout Flow
    setTimeout(() => {
      alert(`Redirecting to Stripe Checkout for ${type}...\nProduct ID: ${productId}`);
      setLoading(null);
      if (user.tier === UserTier.FREE) {
        onToggleTier();
      }
    }, 1500);
  };

  return (
    <div className="pt-4 space-y-6">
       <h2 className="text-lg font-semibold text-emerald-900 px-2">Settings</h2>

       {/* Profile Card */}
       <div className="bg-white p-6 rounded-[2.5rem] shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-800 text-2xl font-bold uppercase">
            {user.firstName.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <h3 className="text-lg font-bold text-emerald-900 truncate">{user.fullName}</h3>
            <p className="text-sm text-gray-500">{user.tier === UserTier.PRO ? 'Premium Member 💎' : 'Free Plan'}</p>
          </div>
       </div>

       {/* Usage Stats (New) */}
       <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-3xl shadow-sm">
             <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">Daily Usage</p>
             <p className="text-xl font-bold text-emerald-800">
               {Math.floor(user.todayUsageSeconds / 60)}m {user.todayUsageSeconds % 60}s
             </p>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-sm">
             <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">Total Words</p>
             <p className="text-xl font-bold text-emerald-800">
               {(user.totalWords / 1000).toFixed(1)}k
             </p>
          </div>
       </div>

       {/* Account Details */}
       <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden">
          <SettingItem icon={<Mail size={20} />} label="Email" value={user.email} />
          <SettingItem icon={<Target size={20} />} label="Objective" value={user.goal} />
       </div>

       {/* Subscription Plans */}
       {user.tier === UserTier.FREE && (
         <div className="bg-emerald-900 text-white p-6 rounded-[2.5rem] shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">Upgrade to Pro</h3>
              <p className="text-emerald-200/80 text-sm mb-6">Unlock unlimited recording, detailed analytics, and custom AI personas.</p>
              
              <div className="space-y-3">
                 <button 
                    onClick={() => handleCheckout('prod_TX39kkalgnmXK8', 'Annual')}
                    disabled={loading !== null}
                    className="w-full bg-white text-emerald-900 py-3 px-4 rounded-xl font-bold text-sm flex justify-between items-center hover:bg-emerald-50 transition"
                 >
                    <span>Yearly (Save 20%)</span>
                    <div className="flex items-center gap-2">
                      <span>70€/yr</span>
                      {loading === 'prod_TX39kkalgnmXK8' && <Loader2 size={16} className="animate-spin" />}
                    </div>
                 </button>
                 <button 
                    onClick={() => handleCheckout('prod_TX37pvXS5g2QO0', 'Monthly')}
                    disabled={loading !== null}
                    className="w-full bg-emerald-800 text-white border border-emerald-700 py-3 px-4 rounded-xl font-semibold text-sm flex justify-between items-center hover:bg-emerald-700 transition"
                 >
                    <span>Monthly</span>
                    <div className="flex items-center gap-2">
                       <span>7€/mo</span>
                       {loading === 'prod_TX37pvXS5g2QO0' && <Loader2 size={16} className="animate-spin" />}
                    </div>
                 </button>
              </div>
            </div>
         </div>
       )}

       {/* Preferences */}
       <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden">
          <SettingItem icon={<Moon size={20} />} label="Dark Mode" value="Off" />
          <SettingItem icon={<Bell size={20} />} label="Daily Reminder" value="8:00 PM" />
          <SettingItem icon={<UserIcon size={20} />} label="June's Voice" value="Puck (Calm)" />
          <SettingItem icon={<Shield size={20} />} label="Privacy & Data" />
       </div>

       {/* Manual Toggle for Demo */}
       <div className="text-center">
         <button onClick={onToggleTier} className="text-xs text-gray-400 hover:text-emerald-600 underline">
            [Dev: Toggle Tier Status]
         </button>
       </div>

       <button onClick={handleSignOut} className="w-full py-4 text-red-500 font-medium text-sm flex items-center justify-center gap-2">
         <LogOut size={16} /> Log Out
       </button>
    </div>
  );
};

const SettingItem: React.FC<{ icon: React.ReactNode, label: string, value?: string }> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between p-5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition cursor-pointer">
     <div className="flex items-center gap-3 text-emerald-900">
        <div className="text-emerald-600">{icon}</div>
        <span className="font-medium text-sm">{label}</span>
     </div>
     {value && <span className="text-sm text-gray-400 max-w-[150px] truncate">{value}</span>}
  </div>
);

export default Settings;