/**
 * Persona Storage Utility
 * Manages custom user-created AI Personas and system agents in LocalLLMMind.
 * Engineered by Kapil Kumar Yadav.
 */

import { AI_PERSONAS } from '../constants/appConstants';

const PERSONA_STORAGE_KEY = 'localllmmind_custom_personas';

export function loadCustomPersonas() {
  try {
    const raw = localStorage.getItem(PERSONA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[PersonaStorage] Failed to load custom personas:', err);
    return [];
  }
}

export function saveCustomPersona(personaData) {
  try {
    const existing = loadCustomPersonas();
    const id = personaData.id || `custom_${Date.now()}`;
    const newPersona = {
      ...personaData,
      id,
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };

    const index = existing.findIndex((p) => p.id === id);
    let updated;
    if (index >= 0) {
      updated = [...existing];
      updated[index] = newPersona;
    } else {
      updated = [newPersona, ...existing];
    }

    localStorage.setItem(PERSONA_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('localllmmind-personas-updated'));
    return newPersona;
  } catch (err) {
    console.error('[PersonaStorage] Failed to save custom persona:', err);
    return null;
  }
}

export function deleteCustomPersona(id) {
  try {
    const existing = loadCustomPersonas();
    const updated = existing.filter((p) => p.id !== id);
    localStorage.setItem(PERSONA_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('localllmmind-personas-updated'));
    return true;
  } catch (err) {
    console.error('[PersonaStorage] Failed to delete custom persona:', err);
    return false;
  }
}

export function getAllPersonas() {
  const custom = loadCustomPersonas();
  return [...AI_PERSONAS, ...custom];
}
