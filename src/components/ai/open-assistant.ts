// Istalgan joydan AI yordamchini ochish (masalan, Dashboard'dagi tahlil kartochkasidan)

export const OPEN_ASSISTANT_EVENT = "hisob:ai-open";

export type OpenAssistantDetail = { prompt?: string };

/** Panelni ochadi; prompt berilsa — yangi suhbatda shu savolni yuboradi */
export function openAssistant(prompt?: string) {
  window.dispatchEvent(new CustomEvent<OpenAssistantDetail>(OPEN_ASSISTANT_EVENT, { detail: { prompt } }));
}
