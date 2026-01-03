import React, { useState } from 'react';
import { User, UserTier } from '../types';
import { User as UserIcon, Moon, Bell, Shield, LogOut, Loader2, Target, Mail, ChevronRight, ExternalLink, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSettings, AVAILABLE_VOICES } from '../contexts/SettingsContext';

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
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const { settings, setDarkMode, setReminderEnabled, setReminderTime, setVoiceName } = useSettings();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleCheckout = (plan: 'monthly' | 'yearly') => {
    setLoading(plan);
    const baseUrl = STRIPE_LINKS[plan];
    const checkoutUrl = `${baseUrl}?client_reference_id=${user.id}&prefilled_email=${encodeURIComponent(user.email)}`;
    window.location.href = checkoutUrl;
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
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
             <div className="flex items-center gap-3 text-emerald-900">
                <div className="text-emerald-600"><Moon size={20} /></div>
                <span className="font-medium text-sm">Mode sombre</span>
             </div>
             <button
               onClick={() => setDarkMode(!settings.darkMode)}
               className={`w-12 h-7 rounded-full transition-colors ${settings.darkMode ? 'bg-emerald-600' : 'bg-gray-300'}`}
             >
               <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${settings.darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
             </button>
          </div>

          {/* Reminder Toggle */}
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
             <div className="flex items-center gap-3 text-emerald-900">
                <div className="text-emerald-600"><Bell size={20} /></div>
                <div>
                  <span className="font-medium text-sm block">Rappel quotidien</span>
                  {settings.reminderEnabled && (
                    <span className="text-xs text-gray-400">À {settings.reminderTime}</span>
                  )}
                </div>
             </div>
             <div className="flex items-center gap-2">
               {settings.reminderEnabled && (
                 <button
                   onClick={() => setShowReminderModal(true)}
                   className="text-xs text-emerald-600 font-medium"
                 >
                   Modifier
                 </button>
               )}
               <button
                 onClick={() => setReminderEnabled(!settings.reminderEnabled)}
                 className={`w-12 h-7 rounded-full transition-colors ${settings.reminderEnabled ? 'bg-emerald-600' : 'bg-gray-300'}`}
               >
                 <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${settings.reminderEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
               </button>
             </div>
          </div>

          {/* Voice Selection */}
          <SettingItem
            icon={<UserIcon size={20} />}
            label="Voix de June"
            value={AVAILABLE_VOICES.find(v => v.id === settings.voiceName)?.name || 'Puck'}
            onClick={() => setShowVoiceModal(true)}
          />

          {/* Privacy */}
          <SettingItem
            icon={<Shield size={20} />}
            label="Confidentialité"
            value="Voir"
            onClick={() => window.open('https://journaly.app/privacy', '_blank')}
          />
       </div>

       {/* Voice Selection Modal */}
       {showVoiceModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setShowVoiceModal(false)}>
           <div className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
             <h3 className="text-lg font-bold text-emerald-900">Choisir la voix de June</h3>
             <div className="space-y-2">
               {AVAILABLE_VOICES.map(voice => (
                 <button
                   key={voice.id}
                   onClick={() => {
                     setVoiceName(voice.id);
                     setShowVoiceModal(false);
                   }}
                   className={`w-full flex items-center justify-between p-4 rounded-xl transition ${
                     settings.voiceName === voice.id ? 'bg-emerald-100 border-2 border-emerald-500' : 'bg-gray-50 hover:bg-gray-100'
                   }`}
                 >
                   <div>
                     <span className="font-medium text-emerald-900">{voice.name}</span>
                     <p className="text-xs text-gray-500">{voice.description}</p>
                   </div>
                   {settings.voiceName === voice.id && <Check size={20} className="text-emerald-600" />}
                 </button>
               ))}
             </div>
             <button
               onClick={() => setShowVoiceModal(false)}
               className="w-full py-3 text-gray-500 font-medium"
             >
               Annuler
             </button>
           </div>
         </div>
       )}

       {/* Reminder Time Modal */}
       {showReminderModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setShowReminderModal(false)}>
           <div className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
             <h3 className="text-lg font-bold text-emerald-900">Heure du rappel</h3>
             <input
               type="time"
               value={settings.reminderTime}
               onChange={(e) => setReminderTime(e.target.value)}
               className="w-full p-4 text-2xl text-center border border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
             />
             <button
               onClick={() => setShowReminderModal(false)}
               className="w-full py-3 bg-emerald-600 text-white font-medium rounded-xl"
             >
               Enregistrer
             </button>
           </div>
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
