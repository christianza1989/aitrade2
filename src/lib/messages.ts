// src/lib/messages.ts
// Centralized user-friendly messages for the application

export const USER_MESSAGES = {
  // API Errors
  API_GENERIC_ERROR: "Nepavyko gauti duomenų iš serverio. Bandykite perkrauti puslapį.",
  API_CONNECTION_ERROR: "Ryšio problema su serveriu. Patikrinkite interneto jungtį.",

  // Settings
  SETTINGS_SAVE_SUCCESS: "Nustatymai sėkmingai išsaugoti!",
  SETTINGS_SAVE_ERROR: "Klaida išsaugant nustatymus. Patikrinkite savo interneto ryšį.",

  // Portfolio
  PORTFOLIO_LOAD_ERROR: "Nepavyko užkrauti portfelio duomenų.",
  POSITION_CLOSE_SUCCESS: "Pozicija sėkmingai uždaryta!",
  POSITION_CLOSE_ERROR: "Klaida uždarant poziciją.",

  // Bot Operations
  BOT_START_SUCCESS: "Prekybos robotas sėkmingai paleistas!",
  BOT_STOP_SUCCESS: "Prekybos robotas sustabdytas.",
  BOT_OPERATION_ERROR: "Klaida vykdant roboto operaciją.",

  // Data Loading
  INITIAL_DATA_LOAD_FAILED: "Kritinė klaida: nepavyko užkrauti pradinių prietaisų skydelio duomenų.",
  MARKET_DATA_LOAD_ERROR: "Nepavyko užkrauti rinkos duomenų.",
  NEWS_LOAD_ERROR: "Nepavyko užkrauti naujienų.",

  // Authentication
  AUTH_ERROR: "Autentifikacijos klaida. Prašome prisijungti iš naujo.",
  PERMISSION_DENIED: "Neturite teisės atlikti šį veiksmą.",

  // Generic Messages
  OPERATION_SUCCESS: "Operacija sėkmingai įvykdyta!",
  OPERATION_FAILED: "Operacija nepavyko. Bandykite vėliau.",
  DATA_SAVE_SUCCESS: "Duomenys sėkmingai išsaugoti!",
  DATA_SAVE_ERROR: "Klaida išsaugant duomenis.",

  // Network
  NETWORK_ERROR: "Tinklo klaida. Patikrinkite interneto jungtį.",
  SERVER_ERROR: "Serverio klaida. Bandykite vėliau.",

  // Validation
  INVALID_INPUT: "Neteisingi įvesties duomenys.",
  REQUIRED_FIELD: "Šis laukas yra privalomas.",

  // File Operations
  FILE_UPLOAD_SUCCESS: "Failas sėkmingai įkeltas!",
  FILE_UPLOAD_ERROR: "Klaida įkeliant failą.",
  FILE_TOO_LARGE: "Failas per didelis.",

  // Chat/AI
  AI_RESPONSE_ERROR: "Klaida gaunant AI atsakymą.",
  CHAT_CONNECTION_ERROR: "Ryšio problema su pokalbių sistema.",
} as const;

// Helper function to get user-friendly error message
export function getUserMessage(key: keyof typeof USER_MESSAGES, fallback?: string): string {
  return USER_MESSAGES[key] || fallback || USER_MESSAGES.API_GENERIC_ERROR;
}

// Helper function for API error handling
export function handleApiError(error: any, context?: string): string {
  console.error(`API Error${context ? ` (${context})` : ''}:`, error);

  // Return user-friendly message based on error type
  if (!navigator.onLine) {
    return USER_MESSAGES.NETWORK_ERROR;
  }

  if (error?.status === 401) {
    return USER_MESSAGES.AUTH_ERROR;
  }

  if (error?.status === 403) {
    return USER_MESSAGES.PERMISSION_DENIED;
  }

  if (error?.status >= 500) {
    return USER_MESSAGES.SERVER_ERROR;
  }

  return USER_MESSAGES.API_GENERIC_ERROR;
}
