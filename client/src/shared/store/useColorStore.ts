import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * STORE DE GESTION DES COULEURS - ZUSTAND
 *
 * SYSTÈME DE GESTION DES COULEURS COLLABORATIF:
 *
 * ÉTATS GÉRÉS:
 * - currentColor: Couleur actuellement sélectionnée
 * - recentColors: Historique des 10 dernières couleurs utilisées
 * - customPalette: Palette personnalisée sauvegardée (max 20 couleurs)
 * - predefinedPalettes: Palettes prédéfinies (Basique, Pastel, Chaud, Froid)
 *
 * PERSISTENCE:
 * - Sauvegarde automatique dans localStorage via Zustand persist
 * - Restauration des préférences utilisateur entre sessions
 *
 * SYNCHRONISATION:
 * - Partage des couleurs entre composants via store global
 * - Mise à jour temps réel de l'interface utilisateur
 * - Historique automatique des couleurs utilisées
 */

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
}

interface ColorState {
  // Couleur actuelle
  currentColor: string;

  // Couleurs récentes (max 10)
  recentColors: string[];

  // Palette personnalisée
  customPalette: string[];

  // Palettes prédéfinies
  predefinedPalettes: ColorPalette[];

  // Actions
  setCurrentColor: (color: string) => void;
  addRecentColor: (color: string) => void;
  addToCustomPalette: (color: string) => void;
  removeFromCustomPalette: (color: string) => void;
  clearRecentColors: () => void;
  clearCustomPalette: () => void;
  loadPalette: (palette: ColorPalette) => void;
}

const defaultPalettes: ColorPalette[] = [
  {
    id: 'basic',
    name: 'Basique',
    colors: ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF']
  },
  {
    id: 'pastel',
    name: 'Pastel',
    colors: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFBA', '#BAE1FF', '#E8BAFF', '#FFB3E8', '#FFD1B3']
  },
  {
    id: 'warm',
    name: 'Chaud',
    colors: ['#8B4513', '#A0522D', '#CD853F', '#D2691E', '#FF6347', '#FF7F50', '#FFA500', '#FFD700']
  },
  {
    id: 'cool',
    name: 'Froid',
    colors: ['#000080', '#0000CD', '#4169E1', '#4682B4', '#5F9EA0', '#00CED1', '#20B2AA', '#40E0D0']
  }
];

export const useColorStore = create<ColorState>()(
  persist(
    (set, get) => ({
      currentColor: '#000000',
      recentColors: [],
      customPalette: [],
      predefinedPalettes: defaultPalettes,

      setCurrentColor: (color: string) => {
        set({ currentColor: color });
        get().addRecentColor(color);
      },

      addRecentColor: (color: string) => {
        const { recentColors } = get();
        const filtered = recentColors.filter(c => c !== color);
        const newRecent = [color, ...filtered].slice(0, 10);
        set({ recentColors: newRecent });
      },

      addToCustomPalette: (color: string) => {
        const { customPalette } = get();
        if (!customPalette.includes(color) && customPalette.length < 20) {
          set({ customPalette: [...customPalette, color] });
        }
      },

      removeFromCustomPalette: (color: string) => {
        const { customPalette } = get();
        set({ customPalette: customPalette.filter(c => c !== color) });
      },

      clearRecentColors: () => {
        set({ recentColors: [] });
      },

      clearCustomPalette: () => {
        set({ customPalette: [] });
      },

      loadPalette: (palette: ColorPalette) => {
        set({ customPalette: [...palette.colors] });
      }
    }),
    {
      name: 'color-store',
      partialize: (state) => ({
        currentColor: state.currentColor,
        recentColors: state.recentColors,
        customPalette: state.customPalette
      })
    }
  )
);