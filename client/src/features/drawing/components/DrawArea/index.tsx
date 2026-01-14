import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCoordinatesRelativeToElement } from "../../utils/getCanvasCoordinates";
import { useMyUserStore } from "../../../user/store/useMyUserStore";
import styles from './DrawArea.module.css';
import { SocketManager } from "../../../../shared/services/SocketManager";

type Point = { x: number; y: number };
type Stroke = { points: Point[]; color: string; width: number; isEraser?: boolean };

export function DrawArea() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const { myUser } = useMyUserStore();
  const canUserDraw = useMemo(() => myUser !== null, [myUser]);

  const [color, setColor] = useState("black");
  const [lineWidth, setLineWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);

  const strokesRef = useRef<Stroke[]>([]); // traits locaux
  const currentStrokeRef = useRef<Stroke | null>(null);

  // traits distants en cours, clé = userId
  const remoteStrokesRef = useRef<Record<string, Stroke>>({});

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    return getCoordinatesRelativeToElement(e.clientX, e.clientY, canvasRef.current);
  };

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

  const onMouseDown: React.MouseEventHandler<HTMLCanvasElement> = useCallback((e) => {
    if (!canUserDraw) return;

    const coords = getCanvasCoordinates(e);
    currentStrokeRef.current = {
      points: [coords],
      color,
      width: lineWidth,
      isEraser
    };

    drawLine(coords);

    canvasRef.current?.addEventListener('mousemove', onMouseMove);
    canvasRef.current?.addEventListener('mouseup', onMouseUp);

    SocketManager.emit('draw:start', {
      x: coords.x,
      y: coords.y,
      color,
      width: lineWidth,
      isEraser
    });
  }, [canUserDraw, color, lineWidth, isEraser, onMouseMove, onMouseUp, drawLine]);

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

  /* -------------------- SYNCHRO SOCKET -------------------- */
  useEffect(() => {
    // Début d'un trait d'un autre utilisateur
    SocketManager.listen('draw:start', (data) => {
      const { userId, points, color, strokeWidth, isEraser } = data;
      remoteStrokesRef.current[userId] = {
        points: [...points],
        color,
        width: strokeWidth,
        isEraser
      };
      points.forEach((point) => {drawLine(point)});
    });

    // Mouvement d'un trait d'un autre utilisateur
    SocketManager.listen('draw:move', (data) => {
      const { userId, points } = data;
      if (!remoteStrokesRef.current[userId]) return;
      remoteStrokesRef.current[userId].points.push(...points);
      points.forEach((point) => drawLine(point));
    });

    // Fin du trait d'un autre utilisateur
    SocketManager.listen('draw:end', (data) => {
      const { userId } = data;
      if (!remoteStrokesRef.current[userId]) return;
      strokesRef.current.push(remoteStrokesRef.current[userId]);
      delete remoteStrokesRef.current[userId];
      redraw();
    });

    // Clear canvas depuis un autre utilisateur
    SocketManager.listen('draw:clear', () => {
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

  const clearCanvas = () => {
    strokesRef.current = [];
    remoteStrokesRef.current = {};
    redraw();
    SocketManager.emit('draw:clear');
  };

  return (
    <div className={[styles.drawArea, 'w-full', 'h-full', 'overflow-hidden', 'flex', 'flex-col', 'items-center'].join(' ')} ref={parentRef}>
      <div className="flex gap-2 mb-2">
        <input type="color" value={color} onChange={e => setColor(e.target.value)} />
        <input type="range" min={1} max={20} value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} />
        <button onClick={() => setIsEraser(!isEraser)}>{isEraser ? "Dessin" : "Gomme"}</button>
        <button onClick={clearCanvas}>Tout effacer</button>
      </div>

      <canvas className={[styles.drawArea__canvas, 'border-1'].join(' ')} onMouseDown={onMouseDown} ref={canvasRef}></canvas>
    </div>
  );
}
