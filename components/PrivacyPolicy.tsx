import React from 'react';
import { X, Shield, Lock, Trash2, Mail, Server } from 'lucide-react';

interface PrivacyPolicyProps {
  onClose: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Shield size={20} className="text-emerald-700" />
            </div>
            <h2 className="text-xl font-bold text-emerald-900">Politique de Confidentialité</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-gray-700 leading-relaxed">
          <p className="text-xs text-gray-400">Dernière mise à jour : Janvier 2026</p>

          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-emerald-600" />
              <h3 className="font-bold text-emerald-900">1. Chiffrement de bout en bout</h3>
            </div>
            <p>
              Journaly utilise un <strong>chiffrement AES-256-GCM</strong> pour protéger vos données.
              Vos transcriptions et résumés sont chiffrés <strong>sur votre appareil</strong> avant
              d'être envoyés à nos serveurs.
            </p>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <p className="text-emerald-800 font-medium">
                Cela signifie que ni Journaly, ni aucun tiers ne peut lire vos données personnelles.
                Seul vous, avec votre clé de chiffrement, pouvez y accéder.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-emerald-600" />
              <h3 className="font-bold text-emerald-900">2. Données collectées</h3>
            </div>
            <p>Nous collectons les données suivantes :</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Email et nom</strong> : pour créer votre compte</li>
              <li><strong>Enregistrements vocaux</strong> : traités par l'IA Google Gemini, puis supprimés</li>
              <li><strong>Transcriptions et résumés</strong> : stockés chiffrés (illisibles sans votre clé)</li>
              <li><strong>Métadonnées</strong> : humeur, tags, durée (pour les statistiques)</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-emerald-600" />
              <h3 className="font-bold text-emerald-900">3. Utilisation des données</h3>
            </div>
            <p>Vos données sont utilisées pour :</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Fournir le service de journal vocal</li>
              <li>Générer des résumés et analyses via l'IA</li>
              <li>Afficher vos statistiques personnelles</li>
              <li>Améliorer l'expérience utilisateur</li>
            </ul>
            <p className="font-medium text-emerald-800">
              Nous ne vendons jamais vos données à des tiers.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Trash2 size={16} className="text-emerald-600" />
              <h3 className="font-bold text-emerald-900">4. Vos droits (RGPD)</h3>
            </div>
            <p>Conformément au RGPD, vous avez le droit de :</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Accéder</strong> à vos données personnelles</li>
              <li><strong>Rectifier</strong> vos informations</li>
              <li><strong>Supprimer</strong> votre compte et toutes vos données</li>
              <li><strong>Exporter</strong> vos données dans un format lisible</li>
              <li><strong>Retirer</strong> votre consentement à tout moment</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-emerald-600" />
              <h3 className="font-bold text-emerald-900">5. Hébergement et sous-traitants</h3>
            </div>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Supabase</strong> (UE) : Base de données et authentification</li>
              <li><strong>Google Gemini</strong> : Traitement IA (données audio non conservées)</li>
              <li><strong>Stripe</strong> : Paiements sécurisés</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-emerald-600" />
              <h3 className="font-bold text-emerald-900">6. Contact</h3>
            </div>
            <p>
              Pour toute question concernant vos données personnelles ou pour exercer vos droits,
              contactez-nous à :
            </p>
            <a
              href="mailto:privacy@journaly.app"
              className="inline-block bg-emerald-100 text-emerald-800 px-4 py-2 rounded-xl font-medium hover:bg-emerald-200 transition"
            >
              privacy@journaly.app
            </a>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full bg-emerald-800 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition"
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
