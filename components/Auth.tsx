import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowRight, Target } from 'lucide-react';
import { UserGoal } from '../types';
import PrivacyPolicy from './PrivacyPolicy';
import { useSettings } from '../contexts/SettingsContext';

export const Auth: React.FC = () => {
  const { t } = useSettings();
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [goal, setGoal] = useState<UserGoal>(UserGoal.JOURNAL);
  const [acceptedRGPD, setAcceptedRGPD] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        // Sign Up with Metadata
        if (!firstName || !lastName) {
          throw new Error(t('name_required'));
        }
        if (!acceptedRGPD) {
          throw new Error(t('privacy_required'));
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              firstName,
              lastName,
              goal,
              tier: 'FREE',
            },
          },
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-mint-50 flex flex-col items-center justify-center p-6 text-emerald-900 overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/journaly-logo.png"
            alt="Journaly Logo"
            className="w-48 h-auto mx-auto mb-6 drop-shadow-sm"
            onError={(e) => {
              // Fallback to remote if local not found
              (e.target as HTMLImageElement).src = 'https://www.ppc-digital.fr/wp-content/uploads/2025/12/Design-sans-titre-1-1.png';
            }}
          />
          <p className="text-emerald-800/60">{t('audio_companion')}</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            {isLogin ? t('welcome_back') : t('create_profile')}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">

            {/* Sign Up Specific Fields */}
            {!isLogin && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-3">{t('firstname')}</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-mint-50 border-none rounded-2xl px-4 py-3 text-emerald-900 placeholder-emerald-900/30 focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="Jane"
                      required={!isLogin}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-3">{t('lastname')}</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-mint-50 border-none rounded-2xl px-4 py-3 text-emerald-900 placeholder-emerald-900/30 focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="Doe"
                      required={!isLogin}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-3">{t('objective')}</label>
                  <div className="relative">
                    <Target size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700" />
                    <select
                      value={goal}
                      onChange={(e) => setGoal(e.target.value as UserGoal)}
                      className="w-full bg-mint-50 border-none rounded-2xl pl-12 pr-5 py-3 text-emerald-900 focus:ring-2 focus:ring-emerald-500/20 appearance-none"
                    >
                      {Object.values(UserGoal).map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Common Fields */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-3">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-mint-50 border-none rounded-2xl px-5 py-3 text-emerald-900 placeholder-emerald-900/30 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="hello@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 ml-3">{t('password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-mint-50 border-none rounded-2xl px-5 py-3 text-emerald-900 placeholder-emerald-900/30 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="••••••••"
                required
              />
            </div>

            {/* RGPD Checkbox - Only for Sign Up */}
            {!isLogin && (
              <div className="flex items-start gap-3 p-4 bg-mint-50 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                <input
                  type="checkbox"
                  id="rgpd"
                  checked={acceptedRGPD}
                  onChange={(e) => setAcceptedRGPD(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded-lg border-2 border-emerald-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="rgpd" className="text-xs text-emerald-800/80 leading-relaxed cursor-pointer">
                  {t('accept_privacy')}{' '}
                  <button
                    type="button"
                    onClick={() => setShowPrivacy(true)}
                    className="text-emerald-700 font-semibold underline hover:text-emerald-900"
                  >
                    {t('privacy_policy')}
                  </button>{' '}
                  {t('privacy_suffix')}{' '}
                  <span className="font-semibold text-emerald-700">{t('privacy_e2e')}</span>.
                </label>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-500 text-xs font-medium rounded-xl text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-800 text-white py-4 rounded-2xl font-semibold hover:bg-emerald-900 transition flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>
                  {isLogin ? t('signin') : t('start_journey')} <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-emerald-700 font-medium hover:underline"
            >
              {isLogin ? t('new_here') : t('have_account')}
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
    </div>
  );
};
