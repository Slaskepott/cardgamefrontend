const fallbackApiBaseUrl = "https://cardgame-34x4.onrender.com";

export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || fallbackApiBaseUrl;

export const wsBaseUrl = apiBaseUrl
  .replace(/^https:\/\//, "wss://")
  .replace(/^http:\/\//, "ws://");

