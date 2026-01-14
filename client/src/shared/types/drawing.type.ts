export type Point = { x: number; y: number };
export type Stroke = { points: Point[]; color: string; userId: string, strokeWidth: number; isEraser?: boolean;};

// Types pour le système de calques
export type Layer = {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  strokes: Stroke[];
  order: number;
};

// Types pour l'export
export type ExportFormat = 'png' | 'svg' | 'pdf';
export type ExportOptions = {
  format: ExportFormat;
  quality?: number; // Pour PNG/JPEG
  includeBackground?: boolean;
};