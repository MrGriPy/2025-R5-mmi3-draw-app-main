export type Point = { x: number; y: number };
export type Stroke = { points: Point[]; color: string; userId: string, strokeWidth: number; isEraser?: boolean;};