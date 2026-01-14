import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCoordinatesRelativeToElement } from "../../utils/getCanvasCoordinates";
import { useMyUserStore } from "../../../user/store/useMyUserStore";
import styles from './DrawArea.module.css';
import { SocketManager } from "../../../../shared/services/SocketManager";
import jsPDF from 'jspdf';
import { useColorStore } from '../../../../shared/store/useColorStore';
import { ColorPalette } from '../ColorPalette';

/**
 * TYPES LOCAUX
 * Point: Représente une coordonnée (x,y) sur le canvas
 * Stroke: Représente un trait de dessin avec ses points, couleur, épaisseur et type (dessin/gomme)
 */
type Point = { x: number; y: number };
type Stroke = { points: Point[]; color: string; width: number; isEraser?: boolean };

/**
 * COMPOSANT DRAW AREA
 *
 * Espace de dessin principal de l'application collaborative.
 *
 * FONCTIONNALITÉS PRINCIPALES:
 * - Dessin en temps réel avec la souris
 * - Gestion des traits locaux et distants
 * - Synchronisation collaborative via WebSocket
 * - Export multi-format (PNG, SVG, PDF)
 * - Gestion des couleurs via store Zustand
 * - Fonctionnalités d'effacement (gomme et clear canvas)
 *
 * GESTION DES TRAITS:
 * - strokesRef: Tableau des traits locaux terminés
 * - currentStrokeRef: Trait en cours de création
 * - remoteStrokesRef: Traits en cours des autres utilisateurs
 *
 * SYNCHRONISATION:
 * - Émission d'événements Socket.IO pour chaque action de dessin
 * - Réception et rendu des traits des autres utilisateurs
 * - Gestion des conflits et de l'ordre des traits
 */
export function DrawArea() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const { myUser } = useMyUserStore();
  const canUserDraw = useMemo(() => myUser !== null, [myUser]);

  // Utilisation du store de couleurs
  const { currentColor, setCurrentColor } = useColorStore();

  const [lineWidth, setLineWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);

  const strokesRef = useRef<Stroke[]>([]); // traits locaux
  const currentStrokeRef = useRef<Stroke | null>(null);

  // traits distants en cours, clé = userId
  const remoteStrokesRef = useRef<Record<string, Stroke>>({});

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    return getCoordinatesRelativeToElement(e.clientX, e.clientY, canvasRef.current);
  };

  /**
   * FONCTION REDRAW
   *
   * Redessine complètement le canvas avec tous les traits.
   * Cette fonction est appelée à chaque modification du canvas.
   *
   * PROCESSUS:
   * 1. Efface le canvas complètement
   * 2. Redessine tous les traits locaux terminés
   * 3. Redessine les traits en cours des autres utilisateurs
   *
   * OPTIMISATION:
   * - Utilise un seul contexte 2D pour toutes les opérations
   * - Configure une fois les propriétés de style (lineJoin, lineCap)
   * - Dessine les traits point par point pour un rendu fluide
   */
  const redraw = useCallback(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // traits locaux
    strokesRef.current.forEach(stroke => {
      ctx.strokeStyle = stroke.isEraser ? "white" : stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    });

    // traits distants en cours
    Object.values(remoteStrokesRef.current).forEach(stroke => {
      ctx.strokeStyle = stroke.isEraser ? "white" : stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    });
  }, []);

  const drawLine = useCallback((point: Point) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx || !currentStrokeRef.current) return;

    const stroke = currentStrokeRef.current;
    stroke.points.push(point);

    ctx.strokeStyle = stroke.isEraser ? "white" : stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const points = stroke.points;
    if (points.length > 1) {
      const from = points[points.length - 2];
      const to = points[points.length - 1];
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    } else {
      const first = points[0];
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      ctx.lineTo(first.x, first.y);
      ctx.stroke();
    }
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    const coords = getCanvasCoordinates(e);
    drawLine(coords);

    SocketManager.emit('draw:move', { x: coords.x, y: coords.y });
  }, [drawLine]);

  const onMouseUp = useCallback(() => {
    if (currentStrokeRef.current) {
      strokesRef.current.push(currentStrokeRef.current);
      currentStrokeRef.current = null;
    }

    canvasRef.current?.removeEventListener('mousemove', onMouseMove);
    canvasRef.current?.removeEventListener('mouseup', onMouseUp);

    SocketManager.emit('draw:end');
  }, [onMouseMove]);

  /**
   * GESTION DES ÉVÉNEMENTS DE DESSIN
   *
   * SYSTÈME DE DESSIN COLLABORATIF:
   * - onMouseDown: Initialise un nouveau trait et commence la synchronisation
   * - onMouseMove: Étend le trait en cours et émet les coordonnées
   * - onMouseUp: Finalise le trait et termine la synchronisation
   *
   * SYNCHRONISATION TEMPS RÉEL:
   * Chaque action émet un événement Socket.IO vers le serveur qui le
   * redistribue à tous les autres utilisateurs connectés.
   */

  const onMouseDown: React.MouseEventHandler<HTMLCanvasElement> = useCallback((e) => {
    if (!canUserDraw) return;

    const coords = getCanvasCoordinates(e);

    // CRÉATION D'UN NOUVEAU TRAIT
    // Le trait utilise la couleur actuelle du store Zustand
    currentStrokeRef.current = {
      points: [coords],
      color: currentColor,
      width: lineWidth,
      isEraser
    };

    drawLine(coords);

    // SYNCHRONISATION: ÉMISSION DU DÉBUT DE TRAIT
    // Informe tous les autres utilisateurs qu'un nouveau trait commence
    canvasRef.current?.addEventListener('mousemove', onMouseMove);
    canvasRef.current?.addEventListener('mouseup', onMouseUp);

    SocketManager.emit('draw:start', {
      x: coords.x,
      y: coords.y,
      color: currentColor,
      width: lineWidth,
      isEraser
    });
  }, [canUserDraw, currentColor, lineWidth, isEraser, onMouseMove, onMouseUp, drawLine]);

  const setCanvasDimensions = useCallback(() => {
    if (!canvasRef.current || !parentRef.current) return;
    const dpr = window.devicePixelRatio || 1;
    const parentWidth = parentRef.current.clientWidth;
    const canvasWidth = parentWidth;
    const canvasHeight = Math.round(parentWidth * 9 / 16);
    canvasRef.current.width = dpr * canvasWidth;
    canvasRef.current.height = dpr * canvasHeight;
    parentRef.current.style.setProperty('--canvas-width', `${canvasWidth}px`);
    parentRef.current.style.setProperty('--canvas-height', `${canvasHeight}px`);
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
    redraw();
  }, [redraw]);

  useEffect(() => {
    // Load existing strokes
    SocketManager.get('strokes').then((data) => {
      if (data) {
        data.strokes.forEach((stroke: any) => {
          strokesRef.current.push({
            points: stroke.points,
            color: stroke.color,
            width: stroke.strokeWidth,
            isEraser: stroke.isEraser
          });
        });
        redraw();
      }
    });
  }, [redraw]);

  useEffect(() => {
    setCanvasDimensions();
    window.addEventListener('resize', setCanvasDimensions);
    return () => window.removeEventListener('resize', setCanvasDimensions);
  }, [setCanvasDimensions]);

  /* -------------------- SYNCHRO SOCKET -------------------- */
  /**
   * GESTION DE LA SYNCHRONISATION COLLABORATIVE
   *
   * SYSTÈME D'ÉVÉNEMENTS SOCKET.IO:
   * - 'draw:start': Un utilisateur commence un nouveau trait
   * - 'draw:move': Continuation d'un trait en cours
   * - 'draw:end': Fin d'un trait
   * - 'draw:clear': Effacement complet du canvas
   *
   * GESTION DES UTILISATEURS DISTANTS:
   * - remoteStrokesRef: Map des traits en cours par userId
   * - Chaque utilisateur a son propre trait actif
   * - Les traits sont fusionnés dans strokesRef une fois terminés
   */
  useEffect(() => {
    // Début d'un trait d'un autre utilisateur
    SocketManager.listen('draw:start', (data) => {
      console.log('CLIENT: Received draw:start', data);
      const { userId, points, color, strokeWidth, isEraser } = data;
      remoteStrokesRef.current[userId] = {
        points: [...points],
        color,
        width: strokeWidth,
        isEraser
      };
      redraw();
    });

    // Mouvement d'un trait d'un autre utilisateur
    SocketManager.listen('draw:move', (data) => {
      console.log('CLIENT: Received draw:move', data);
      const { userId, points } = data;
      if (!remoteStrokesRef.current[userId]) return;
      remoteStrokesRef.current[userId].points.push(...points);
      redraw();
    });

    // Fin du trait d'un autre utilisateur
    SocketManager.listen('draw:end', (data) => {
      console.log('CLIENT: Received draw:end', data);
      const { userId } = data;
      if (!remoteStrokesRef.current[userId]) return;
      strokesRef.current.push(remoteStrokesRef.current[userId]);
      delete remoteStrokesRef.current[userId];
      redraw();
    });

    // Clear canvas depuis un autre utilisateur
    SocketManager.listen('draw:clear', () => {
      console.log('CLIENT: Received draw:clear');
      strokesRef.current = [];
      remoteStrokesRef.current = {};
      redraw();
    });
  }, [redraw]);

  /* -------------------- GESTION CLAVIER / UNDO -------------------- */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        strokesRef.current.pop();
        redraw();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [redraw]);

  /**
   * SYSTÈME D'EXPORTATION MULTI-FORMAT
   *
   * FONCTIONNALITÉS D'EXPORT:
   * - PNG: Image raster haute qualité avec transparence
   * - SVG: Format vectoriel pour une scalabilité parfaite
   * - PDF: Document portable avec orientation automatique
   *
   * PROCESSUS TECHNIQUE:
   * 1. Création d'un canvas temporaire avec fond blanc
   * 2. Redessin de tous les traits sur le canvas temporaire
   * 3. Export selon le format demandé avec téléchargement automatique
   *
   * OPTIMISATIONS:
   * - Canvas temporaire pour éviter de modifier le canvas principal
   * - Fond blanc propre pour les exports
   * - Nommage automatique avec timestamp
   */
  const exportCanvas = (format: 'png' | 'svg' | 'pdf') => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Créer un canvas temporaire avec fond blanc
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Fond blanc
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Redessiner tous les traits sur le canvas temporaire
    strokesRef.current.forEach(stroke => {
      tempCtx.strokeStyle = stroke.isEraser ? "white" : stroke.color;
      tempCtx.lineWidth = stroke.width;
      tempCtx.lineJoin = "round";
      tempCtx.lineCap = "round";
      tempCtx.beginPath();
      stroke.points.forEach((p, i) => {
        if (i === 0) tempCtx.moveTo(p.x, p.y);
        else tempCtx.lineTo(p.x, p.y);
      });
      tempCtx.stroke();
    });

    if (format === 'png') {
      // Export PNG
      const link = document.createElement('a');
      link.download = `drawing-${Date.now()}.png`;
      link.href = tempCanvas.toDataURL('image/png');
      link.click();
    } else if (format === 'svg') {
      // Export SVG (simplifié)
      let svgContent = `<svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">`;
      svgContent += `<rect width="100%" height="100%" fill="white"/>`;

      strokesRef.current.forEach(stroke => {
        if (stroke.points.length > 1) {
          const pathData = stroke.points.map((p, i) =>
            i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
          ).join(' ');
          svgContent += `<path d="${pathData}" stroke="${stroke.isEraser ? 'white' : stroke.color}" stroke-width="${stroke.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
        }
      });

      svgContent += '</svg>';

      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const link = document.createElement('a');
      link.download = `drawing-${Date.now()}.svg`;
      link.href = URL.createObjectURL(blob);
      link.click();
    } else if (format === 'pdf') {
      // Export PDF avec jsPDF
      try {
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });

        const imgData = tempCanvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

        pdf.save(`drawing-${Date.now()}.pdf`);
      } catch (error) {
        console.error('Erreur lors de l\'export PDF:', error);
        alert('Erreur lors de l\'export PDF. Utilisez PNG ou SVG.');
      }
    }
  };

  const clearCanvas = () => {
    strokesRef.current = [];
    remoteStrokesRef.current = {};
    redraw();
    SocketManager.emit('draw:clear');
  };

  return (
    <div className={[styles.drawArea, 'w-full', 'h-full', 'overflow-hidden', 'flex', 'flex-col', 'items-center'].join(' ')} ref={parentRef}>
      <div className="flex gap-4 mb-4 p-3 bg-gray-100 rounded-lg shadow-sm">
        <ColorPalette
          onColorSelect={setCurrentColor}
          currentColor={currentColor}
        />
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Taille:</label>
          <input type="range" min={1} max={20} value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} className="w-20" />
          <span className="text-sm text-gray-600 w-6">{lineWidth}px</span>
        </div>
        
        <button 
          onClick={() => setIsEraser(!isEraser)} 
          className={`px-3 py-1 rounded text-sm font-medium ${isEraser ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}
        >
          {isEraser ? "✏️ Dessin" : "🧽 Gomme"}
        </button>
        
        <button 
          onClick={clearCanvas} 
          className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
        >
          🗑️ Tout effacer
        </button>

        {/* Boutons d'export */}
        <div className="flex items-center gap-1 ml-4 pl-4 border-l border-gray-300">
          <span className="text-sm font-medium text-gray-700 mr-2">Exporter:</span>
          <button 
            onClick={() => exportCanvas('png')} 
            className="px-3 py-1 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600"
            title="Exporter en PNG"
          >
            PNG
          </button>
          <button 
            onClick={() => exportCanvas('svg')} 
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600"
            title="Exporter en SVG"
          >
            SVG
          </button>
          <button 
            onClick={() => exportCanvas('pdf')} 
            className="px-3 py-1 bg-purple-500 text-white rounded text-sm font-medium hover:bg-purple-600"
            title="Exporter en PDF"
          >
            PDF
          </button>
        </div>
      </div>

      <canvas className={[styles.drawArea__canvas, 'border border-gray-300 rounded shadow-sm'].join(' ')} onMouseDown={onMouseDown} ref={canvasRef}></canvas>
    </div>
  );
}
