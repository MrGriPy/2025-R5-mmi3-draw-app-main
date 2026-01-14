import { useState } from 'react';
import DrawPage from './pages/DrawPage';

function App() {
  const [showExport, setShowExport] = useState(false);

  return (
    <div className="relative">
      {/* Bouton d'export (fonctionnalité bonus) */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => setShowExport(!showExport)}
          className="px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg hover:bg-green-600 transition-colors"
        >
          📤 Export
        </button>
        {showExport && (
          <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
            <p className="text-sm text-gray-600 mb-2">Fonctionnalité d'export disponible !</p>
            <p className="text-xs text-gray-500">Utilisez les boutons d'export dans la zone de dessin</p>
          </div>
        )}
      </div>

      {/* Page de dessin */}
      <DrawPage />
    </div>
  );
}

export default App;


