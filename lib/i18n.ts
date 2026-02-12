import { Language } from '../types';

export const translations = {
  fr: {
    // Auth
    welcome_back: "Bon retour",
    create_profile: "Créer un profil",
    signin: "Se connecter",
    start_journey: "Commencer l'aventure",
    firstname: "Prénom",
    lastname: "Nom",
    email: "Email",
    password: "Mot de passe",
    objective: "Objectif",
    
    // Dashboard
    greeting: "Bonjour",
    tell_me_day: "Raconte-moi ta journée",
    june_ready: "June est prête à t'écouter.",
    start_call: "Lancer l'appel",
    idea: "Idée",
    challenge: "Défi",
    victory: "Victoire",
    calm: "Calme",
    mood_today: "Humeur",
    themes: "Thèmes",
    last_memory: "Dernier souvenir",
    action_items: "Suivi d'actions",
    mood_distribution: "Répartition Humeur",
    top_tags: "Top Thèmes",
    
    // Settings
    settings: "Réglages",
    member_status: "Statut Membre",
    upgrade: "Devenir Membre",
    free: "GRATUIT",
    pro: "PRO",
    voice_of_june: "Voix de June",
    voice_response: "Réponse vocale de l'IA",
    personality: "Personnalité",
    intention: "Intention",
    preferences: "Préférences",
    call_time: "Heure d'appel",
    notifications: "Notifications",
    dark_mode: "Mode Sombre",
    language: "Langue",
    data_backup: "Données & Sauvegarde",
    export_json: "Export JSON",
    export_csv: "Export CSV",
    import_backup: "Importer une sauvegarde",
    logout: "Déconnexion",
    
    // Personalities
    p_empathetic: "EMPATHIQUE",
    p_empathetic_desc: "Douce & à l'écoute",
    p_coach: "COACH",
    p_coach_desc: "Motivante & Dynamique",
    p_direct: "DIRECT",
    p_direct_desc: "Carrée & Efficace",
    p_custom: "PERSONNALISÉ",
    p_custom_desc: "Vos propres règles",

    // Goals (Short)
    g_journal: "Journal",
    g_memory: "Souvenirs",
    g_discipline: "Discipline",
    g_work: "Travail",
    g_other: "Autre",

    // Settings - Subscription
    upgrade_subtitle: "Passez à la vitesse supérieure.",
    manage_subscription: "Gérer abonnement",
    monthly: "Mensuel",
    yearly: "Annuel",
    identity: "Identité",
    security_encryption: "Sécurité & Chiffrement",
    e2e_encryption: "Chiffrement de bout en bout",
    e2e_description: "Vos transcriptions et résumés sont chiffrés localement. Personne (même nous) ne peut les lire.",
    backup_key: "Sauvegarder ma clé",
    restore_key: "Restaurer",
    restore_key_action: "Restaurer la clé",
    key_copied: "Clé copiée dans le presse-papier !",
    key_restored: "Clé restaurée ! Rechargez la page.",
    key_invalid: "Clé invalide",
    key_export_error: "Erreur lors de l'export",
    paste_key_placeholder: "Collez votre clé ici...",
    key_backup_hint: "Sauvegardez votre clé pour accéder à vos données sur un autre appareil.",
    your_key: "Votre clé (copiée) :",

    // History
    your_journal: "Ton Journal",
    pro_feature: "Fonctionnalité Pro",
    unlock_history: "Débloquer l'historique",
    history_limit: "Tu as atteint la limite de l'historique gratuit.",
    no_entries: "Aucune entrée pour le moment.",
    start_session_hint: "Commencez une session vocale !",

    // Entry Modal
    edit_entry: "Modifier l'entrée",
    summary: "Résumé",
    how_feeling: "Comment te sentais-tu ?",
    tags: "Tags",
    transcription: "Transcription",
    no_transcript: "Aucune transcription disponible",
    cancel: "Annuler",
    save: "Enregistrer",
    saving: "Sauvegarde...",
    mood_great: "Super",
    mood_good: "Bien",
    mood_neutral: "Neutre",
    mood_bad: "Pas top",
    mood_terrible: "Difficile",

    // Analytics
    analytics_pro: "Analytics Pro",
    analytics_pro_desc: "Débloquez les analyses détaillées de vos émotions et thèmes pour mieux vous comprendre.",
    upgrade_pro: "Passer PRO",
    weekly_trend: "Tendance Hebdo",
    avg_score: "Score Moy.",
    not_enough_data: "Pas assez de données...",
    no_tags_yet: "Pas encore de tags",

    // Dashboard
    daily_allowance: "Temps Journalier",
    remaining: "restants",
    limit_free: "Limite : 30s.",
    upgrade_for_20m: "Passer PRO pour 20m.",
    pro_plan: "Plan PRO : 20m/jour.",
    limit_reached: "Limite Atteinte",

    // Voice Session
    live: "En direct",
    connecting: "Connexion...",
    listening: "À l'écoute...",
    limit_reached_title: "Limite atteinte",
    back: "Retour",
    ad_free_version: "Publicité (Version Gratuite)",

    // Common
    loading: "Chargement...",
    guest: "Invité",
  },
  en: {
    // Auth
    welcome_back: "Welcome back",
    create_profile: "Create profile",
    signin: "Sign In",
    start_journey: "Start Journey",
    firstname: "First Name",
    lastname: "Last Name",
    email: "Email",
    password: "Password",
    objective: "Objective",

    // Dashboard
    greeting: "Hello",
    tell_me_day: "Tell me about your day",
    june_ready: "June is ready to listen.",
    start_call: "Start Call",
    idea: "Idea",
    challenge: "Challenge",
    victory: "Victory",
    calm: "Calm",
    mood_today: "Mood",
    themes: "Themes",
    last_memory: "Last Memory",
    action_items: "Action Items",
    mood_distribution: "Mood Distribution",
    top_tags: "Top Themes",

    // Settings
    settings: "Settings",
    member_status: "Member Status",
    upgrade: "Upgrade",
    free: "FREE",
    pro: "PRO",
    voice_of_june: "June's Voice",
    voice_response: "AI Voice Response",
    personality: "Personality",
    intention: "Intention",
    preferences: "Preferences",
    call_time: "Call Time",
    notifications: "Notifications",
    dark_mode: "Dark Mode",
    language: "Language",
    data_backup: "Data & Backup",
    export_json: "Export JSON",
    export_csv: "Export CSV",
    import_backup: "Import Backup",
    logout: "Logout",

    // Personalities
    p_empathetic: "EMPATHETIC",
    p_empathetic_desc: "Gentle & Listening",
    p_coach: "COACH",
    p_coach_desc: "Motivating & Dynamic",
    p_direct: "DIRECT",
    p_direct_desc: "Straightforward & Efficient",
    p_custom: "CUSTOM",
    p_custom_desc: "Your own rules",

    // Goals (Short)
    g_journal: "Journal",
    g_memory: "Memories",
    g_discipline: "Discipline",
    g_work: "Work",
    g_other: "Other",

    // Settings - Subscription
    upgrade_subtitle: "Take it to the next level.",
    manage_subscription: "Manage subscription",
    monthly: "Monthly",
    yearly: "Yearly",
    identity: "Identity",
    security_encryption: "Security & Encryption",
    e2e_encryption: "End-to-end encryption",
    e2e_description: "Your transcripts and summaries are encrypted locally. Nobody (not even us) can read them.",
    backup_key: "Backup my key",
    restore_key: "Restore",
    restore_key_action: "Restore key",
    key_copied: "Key copied to clipboard!",
    key_restored: "Key restored! Reload the page.",
    key_invalid: "Invalid key",
    key_export_error: "Export error",
    paste_key_placeholder: "Paste your key here...",
    key_backup_hint: "Backup your key to access your data on another device.",
    your_key: "Your key (copied):",

    // History
    your_journal: "Your Journal",
    pro_feature: "Pro Feature",
    unlock_history: "Unlock full history",
    history_limit: "You've reached the free history limit.",
    no_entries: "No entries yet.",
    start_session_hint: "Start a voice session!",

    // Entry Modal
    edit_entry: "Edit entry",
    summary: "Summary",
    how_feeling: "How were you feeling?",
    tags: "Tags",
    transcription: "Transcription",
    no_transcript: "No transcription available",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",
    mood_great: "Great",
    mood_good: "Good",
    mood_neutral: "Neutral",
    mood_bad: "Not great",
    mood_terrible: "Difficult",

    // Analytics
    analytics_pro: "Analytics Pro",
    analytics_pro_desc: "Unlock detailed analysis of your emotions and themes to better understand yourself.",
    upgrade_pro: "Upgrade to PRO",
    weekly_trend: "Weekly Trend",
    avg_score: "Avg Score",
    not_enough_data: "Not enough data...",
    no_tags_yet: "No tags yet",

    // Dashboard
    daily_allowance: "Daily Allowance",
    remaining: "remaining",
    limit_free: "Limit: 30s.",
    upgrade_for_20m: "Upgrade to PRO for 20m.",
    pro_plan: "PRO Plan: 20m/day.",
    limit_reached: "Limit Reached",

    // Voice Session
    live: "Live",
    connecting: "Connecting...",
    listening: "Listening...",
    limit_reached_title: "Limit reached",
    back: "Back",
    ad_free_version: "Ad (Free Version)",

    // Common
    loading: "Loading...",
    guest: "Guest",
  }
};

export type TranslationKey = keyof typeof translations.fr;

export const getTranslation = (lang: Language, key: TranslationKey): string => {
  return translations[lang][key] || translations['fr'][key] || key;
};
