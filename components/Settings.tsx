import React, { useState } from 'react';
import { User, UserTier } from '../types';
import { User as UserIcon, Moon, Bell, Shield, LogOut, Loader2, Target, Mail, ChevronRight, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SettingsProps {
  user: User;
  onToggleTier: () => void;
}

// Stripe Payment Links
const STRIPE_LINKS = {
  monthly: 'https://buy.stripe.com/3cI4gzb741RB0Whg8b7ok00',
  yearly: 'https://buy.stripe.com/fZu28rejg67R9sNf477ok01',
};

// Stripe Customer Portal (pour gérer l'abonnement)
const STRIPE_PORTAL = 'https://billing.stripe.com/p/login/test_xxx'; // À configurer

const Settings: React.FC<SettingsProps> = ({ user, onToggleTier }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [showComingSoon, setShowComingSoon] = useState<string | null>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleCheckout = (plan: 'monthly' | 'yearly') => {
    setLoading(plan);
    const baseUrl = STRIPE_LINKS[plan];
    const checkoutUrl = `${baseUrl}?client_reference_id=${user.id}&prefilled_email=${encodeURIComponent(user.email)}`;
    window.location.href = checkoutUrl;
  };

  const handleComingSoon = (feature: string) => {
    setShowComingSoon(feature);
    setTimeout(() => setShowComingSoon(null), 2000);
  };

  return (
    <div className="pt-4 space-y-6">
       <h2 className="text-lg font-semibold text-emerald-900 px-2">Paramètres</h2>

       {/* Profile Card */}
       <div className="bg-white p-6 rounded-[2.5rem] shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-800 text-2xl font-bold uppercase">
            {user.firstName.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <h3 className="text-lg font-bold text-emerald-900 truncate">{user.fullName}</h3>
            <p className="text-sm text-gray-500">{user.tier === UserTier.PRO ? 'Membre Premium' : 'Plan Gratuit'}</p>
          </div>
       </div>

       {/* Usage Stats */}
       <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-3xl shadow-sm">
             <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">Utilisé aujourd'hui</p>
             <p className="text-xl font-bold text-emerald-800">
               {Math.floor(user.todayUsageSeconds / 60)}m {user.todayUsageSeconds % 60}s
             </p>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-sm">
             <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">Mots au total</p>
             <p className="text-xl font-bold text-emerald-800">
               {(user.totalWords / 1000).toFixed(1)}k
             </p>
          </div>
       </div>

       {/* Account Details */}
       <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden">
          <SettingItem icon={<Mail size={20} />} label="Email" value={user.email} />
          <SettingItem icon={<Target size={20} />} label="Objectif" value={user.goal} />
       </div>

       {/* Subscription Plans - Only for FREE users */}
       {user.tier === UserTier.FREE && (
         <div className="bg-emerald-900 text-white p-6 rounded-[2.5rem] shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">Passer à Pro</h3>
              <p className="text-emerald-200/80 text-sm mb-6">Débloquez 20 min/jour, les analytics détaillées et plus encore.</p>

              <div className="space-y-3">
                 <button
                    onClick={() => handleCheckout('yearly')}
                    disabled={loading !== null}
                    className="w-full bg-white text-emerald-900 py-3 px-4 rounded-xl font-bold text-sm flex justify-between items-center hover:bg-emerald-50 transition"
                 >
                    <span>Annuel (-15%)</span>
                    <div className="flex items-center gap-2">
                      <span>70€/an</span>
                      {loading === 'yearly' && <Loader2 size={16} className="animate-spin" />}
                    </div>
                 </button>
                 <button
                    onClick={() => handleCheckout('monthly')}
                    disabled={loading !== null}
                    className="w-full bg-emerald-800 text-white border border-emerald-700 py-3 px-4 rounded-xl font-semibold text-sm flex justify-between items-center hover:bg-emerald-700 transition"
                 >
                    <span>Mensuel</span>
                    <div className="flex items-center gap-2">
                       <span>6,90€/mois</span>
                       {loading === 'monthly' && <Loader2 size={16} className="animate-spin" />}
                    </div>
                 </button>
              </div>
            </div>
         </div>
       )}

       {/* Manage Subscription - Only for PRO users */}
       {user.tier === UserTier.PRO && (
         <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden">
            <button
              onClick={() => handleComingSoon('portal')}
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3 text-emerald-900">
                <ExternalLink size={20} className="text-emerald-600" />
                <span className="font-medium text-sm">Gérer mon abonnement</span>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
         </div>
       )}

       {/* Preferences */}
       <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden">
          <SettingItem
            icon={<Moon size={20} />}
            label="Mode sombre"
            value="Bientôt"
            onClick={() => handleComingSoon('dark')}
          />
          <SettingItem
            icon={<Bell size={20} />}
            label="Rappel quotidien"
            value="Bientôt"
            onClick={() => handleComingSoon('reminder')}
          />
          <SettingItem
            icon={<UserIcon size={20} />}
            label="Voix de June"
            value="Kore"
            onClick={() => handleComingSoon('voice')}
          />
          <SettingItem
            icon={<Shield size={20} />}
            label="Confidentialité"
            onClick={() => handleComingSoon('privacy')}
          />
       </div>

       {/* Coming Soon Toast */}
       {showComingSoon && (
         <div className="fixed bottom-24 left-4 right-4 bg-emerald-800 text-white p-4 rounded-2xl text-center text-sm font-medium shadow-lg animate-pulse">
           Bientôt disponible !
         </div>
       )}

       <button onClick={handleSignOut} className="w-full py-4 text-red-500 font-medium text-sm flex items-center justify-center gap-2">
         <LogOut size={16} /> Se déconnecter
       </button>
    </div>
  );
};

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
}

const SettingItem: React.FC<SettingItemProps> = ({ icon, label, value, onClick }) => (
  <div
    onClick={onClick}
    className="flex items-center justify-between p-5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition cursor-pointer"
  >
     <div className="flex items-center gap-3 text-emerald-900">
        <div className="text-emerald-600">{icon}</div>
        <span className="font-medium text-sm">{label}</span>
     </div>
     <div className="flex items-center gap-2">
       {value && <span className="text-sm text-gray-400 max-w-[150px] truncate">{value}</span>}
       <ChevronRight size={16} className="text-gray-300" />
     </div>
  </div>
);

export default Settings;
