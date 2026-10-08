// What the app is running against, for banners and the developer status panel.
import { aiConfig } from "@/lib/ai/gemma";
import { dataMode } from "@/lib/db/store";
import { searchConfigured } from "@/lib/search";

export function runtimeInfo() {
  const ai = aiConfig();
  return { ai, data: dataMode(), search: searchConfigured() };
}
