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

    // Common
    loading: "Loading...",
    guest: "Guest",
  }
};

export type TranslationKey = keyof typeof translations.fr;

export const getTranslation = (lang: Language, key: TranslationKey): string => {
  return translations[lang][key] || translations['fr'][key] || key;
};
