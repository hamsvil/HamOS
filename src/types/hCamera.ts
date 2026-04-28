export interface CameraMode {
  id: 'normal' | 'quantum' | 'eraser';
  name: string;
}

export interface CameraState {
  active: boolean;
  loading: boolean;
  mode: 'normal' | 'quantum' | 'eraser';
  error: string | null;
}
