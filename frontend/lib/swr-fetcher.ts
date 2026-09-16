import { apiClientBrowser } from "@/lib/api-client-browser";

export const swrFetcher = <T,>(url: string) => apiClientBrowser.get<T>(url);
