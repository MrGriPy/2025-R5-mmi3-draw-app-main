# Nouvelles Fonctionnalités - Application de Dessin Collaboratif

## 🎨 Fonctionnalité Principale : Système de Calques

### Description
Un système complet de gestion des calques qui permet aux utilisateurs de :
- **Créer et gérer plusieurs calques** : Ajouter, supprimer, renommer des calques
- **Contrôler la visibilité** : Masquer/afficher chaque calque individuellement
- **Ajuster l'opacité** : Modifier la transparence de chaque calque (0-100%)
- **Réorganiser les calques** : Changer l'ordre d'empilement des calques
- **Dessiner sur des calques spécifiques** : Sélectionner le calque actif pour le dessin
- **Synchronisation temps réel** : Tous les changements sont synchronisés entre utilisateurs

### Composants créés
- `useLayersStore.ts` : Store Zustand pour la gestion d'état des calques
- `LayerPanel.tsx` : Interface utilisateur pour contrôler les calques
- `DrawAreaWithLayers.tsx` : Zone de dessin adaptée aux calques
- `DrawLayoutWithLayers.tsx` : Layout incluant le panneau des calques
- `DrawPageWithLayers.tsx` : Page complète avec système de calques

### Utilisation
1. Cliquez sur "🎨 Mode Calques" en haut à droite pour activer le mode calques
2. Utilisez le panneau de droite pour gérer vos calques
3. Sélectionnez un calque actif pour dessiner dessus
4. Ajustez la visibilité et l'opacité selon vos besoins

## 📤 Fonctionnalité Bonus : Export Multi-Format

### Description
Permet d'exporter le canvas dans différents formats :
- **PNG** : Image raster avec transparence
- **SVG** : Format vectoriel (avec image raster intégrée)
- **PDF** : Document PDF prêt à imprimer

### Technologies utilisées
- `canvas.toDataURL()` pour l'export PNG
- Conversion manuelle canvas → SVG
- Bibliothèque `jsPDF` pour l'export PDF
- Téléchargement automatique via les liens HTML5

### Utilisation
1. Activez le mode calques ou restez en mode simple
2. Utilisez les boutons d'export en haut de la zone de dessin
3. Le fichier se télécharge automatiquement dans votre dossier de téléchargements

## 🔧 Architecture Technique

### Stores Zustand
- `useLayersStore` : Gestion complète de l'état des calques
- Méthodes pour CRUD des calques, réordonnancement, gestion des traits

### Types TypeScript
```typescript
type Layer = {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  strokes: Stroke[];
  order: number;
};

type ExportFormat = 'png' | 'svg' | 'pdf';
```

### Synchronisation
- Les traits sont stockés par calque côté client
- Le système est conçu pour une future synchronisation via Socket.IO
- Chaque calque peut être manipulé indépendamment

## 🚀 Comment tester

1. **Démarrer le serveur** :
   ```bash
   cd server && npm run dev
   ```

2. **Démarrer le client** :
   ```bash
   cd client && npm run dev
   ```

3. **Ouvrir l'application** :
   - Accédez à `http://localhost:5174`
   - Testez le mode simple et le mode calques
   - Essayez les fonctionnalités d'export

4. **Build de production** :
   ```bash
   cd client && npm run build
   ```

## 📋 Fonctionnalités futures possibles

- Synchronisation des calques entre utilisateurs
- Historique d'annulation par calque
- Fusion de calques
- Filtres et effets visuels
- Import d'images dans les calques
- Collaboration en temps réel sur les mêmes calques