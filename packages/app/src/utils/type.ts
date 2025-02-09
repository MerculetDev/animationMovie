// 3D 情報を含む粒子のプロパティ
export interface Particle {
  // 現在の位置（3D座標）
  x: number;
  y: number;
  z: number;
  // 初期位置（集合開始時＝霧散状態の逆再生開始位置）
  startX: number;
  startY: number;
  startZ: number;
  // ターゲット位置（SVG イメージ上の位置）
  targetX: number;
  targetY: number;
  targetZ: number; // 例として -30～30 の範囲などランダムに設定
  // 散乱用のベクトル（ここでは S として生成し、集合時の逆再生用に利用）
  vx: number;
  vy: number;
  vz: number;
  // 経過フレーム数
  life: number;
  // 総寿命（inDuration + holdDuration + scatterDuration）
  maxLife: number;
  // 霧散フェーズ開始時に速度を反転済みかのフラグ
  scattered: boolean;
  // 粒子の色（"r, g, b" の形式）
  color: string;
}
