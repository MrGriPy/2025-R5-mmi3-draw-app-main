import { useState } from 'react';
import { useColorStore } from '../../../../shared/store/useColorStore';

interface ColorPaletteProps {
  onColorSelect: (color: string) => void;
  currentColor: string;
}

export function ColorPalette({ onColorSelect, currentColor }: ColorPaletteProps) {
  const {
    recentColors,
    customPalette,
    predefinedPalettes,
    addToCustomPalette,
    removeFromCustomPalette,
    clearRecentColors,
    clearCustomPalette,
    loadPalette
  } = useColorStore();

  const [activeTab, setActiveTab] = useState<'recent' | 'custom' | 'palettes'>('recent');
  const [showPalette, setShowPalette] = useState(false);

  const handleColorClick = (color: string) => {
    onColorSelect(color);
  };

  const handleAddCurrentColor = () => {
    addToCustomPalette(currentColor);
  };

  const ColorButton = ({ color, onClick, className = "" }: { color: string; onClick: () => void; className?: string }) => (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded border-2 hover:scale-110 transition-transform ${className} ${
        currentColor === color ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'
      }`}
      style={{ backgroundColor: color }}
      title={color}
    />
  );

  return (
    <div className="relative">
      {/* Bouton principal pour ouvrir la palette */}
      <button
        onClick={() => setShowPalette(!showPalette)}
        className="px-3 py-1 bg-indigo-500 text-white rounded text-sm font-medium hover:bg-indigo-600"
      >
        🎨 Palette
      </button>

      {/* Palette déroulante */}
      {showPalette && (
        <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10 min-w-80">
          {/* Onglets */}
          <div className="flex gap-1 mb-4">
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                activeTab === 'recent' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Récentes
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                activeTab === 'custom' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Personnalisée
            </button>
            <button
              onClick={() => setActiveTab('palettes')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                activeTab === 'palettes' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Prédéfinies
            </button>
          </div>

          {/* Contenu des onglets */}
          {activeTab === 'recent' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Couleurs récentes</h3>
                {recentColors.length > 0 && (
                  <button
                    onClick={clearRecentColors}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    🗑️ Vider
                  </button>
                )}
              </div>
              <div className="grid grid-cols-8 gap-2">
                {recentColors.length > 0 ? (
                  recentColors.map((color: string, index: number) => (
                    <ColorButton
                      key={`recent-${index}`}
                      color={color}
                      onClick={() => handleColorClick(color)}
                    />
                  ))
                ) : (
                  <p className="col-span-8 text-sm text-gray-500 text-center py-4">
                    Aucune couleur récente
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Palette personnalisée</h3>
                <div className="flex gap-1">
                  <button
                    onClick={handleAddCurrentColor}
                    className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                    title="Ajouter la couleur actuelle"
                  >
                    ➕
                  </button>
                  {customPalette.length > 0 && (
                    <button
                      onClick={clearCustomPalette}
                      className="text-xs text-red-500 hover:text-red-700"
                      title="Vider la palette"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-8 gap-2">
                {customPalette.length > 0 ? (
                  customPalette.map((color: string, index: number) => (
                    <div key={`custom-${index}`} className="relative group">
                      <ColorButton
                        color={color}
                        onClick={() => handleColorClick(color)}
                      />
                      <button
                        onClick={() => removeFromCustomPalette(color)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Supprimer"
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="col-span-8 text-sm text-gray-500 text-center py-4">
                    Palette vide. Cliquez sur ➕ pour ajouter des couleurs.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'palettes' && (
            <div>
              <h3 className="text-sm font-medium mb-2">Palettes prédéfinies</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {predefinedPalettes.map((palette) => (
                  <div key={palette.id} className="border border-gray-200 rounded p-2">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">{palette.name}</h4>
                      <button
                        onClick={() => loadPalette(palette)}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                      >
                        Charger
                      </button>
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                      {palette.colors.map((color: string, index: number) => (
                        <ColorButton
                          key={`${palette.id}-${index}`}
                          color={color}
                          onClick={() => handleColorClick(color)}
                          className="w-6 h-6"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sélecteur de couleur personnalisé */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium mb-2">Couleur personnalisée</label>
            <input
              type="color"
              value={currentColor}
              onChange={(e) => handleColorClick(e.target.value)}
              className="w-full h-8 rounded border border-gray-300"
            />
          </div>
        </div>
      )}
    </div>
  );
}