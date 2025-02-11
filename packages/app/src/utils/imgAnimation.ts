// imgAnimation.ts
import { Particle } from "./type";

class ParticleEffectImg {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  particles: Particle[] = [];
  // 読み込んだ SVG イメージ
  image: HTMLImageElement = new Image();
  particleSize: number;
  inDuration: number; // 集合（Gather）フェーズのフレーム数
  holdDuration: number; // 画像（Hold）フェーズのフレーズ数
  scatterDuration: number; // 霧散（Scatter）フェーズのフレーズ数
  margin: number; // 表示領域外として利用する余白（px）
  // パースペクティブ用定数
  focalLength: number = 300;

  // 新たに追加するパラメータ
  appearType: number;
  disappearType: number;

  /**
   * @param canvasId       Canvas 要素の ID
   * @param particleSize   粒子のサイズ（例: 1）
   * @param inDuration     集合（Gather）フェーズのフレーム数（例: 100）
   * @param holdDuration   画像（Hold）フェーズのフレーズ数（例: 60）
   * @param scatterDuration 霧散（Scatter）フェーズのフレーム数（例: 100）
   * @param margin         表示領域外の余白のピクセル数（例: 100）
   * @param appearType     出現時のアニメーションタイプ（デフォルト: 0）
   * @param disappearType  消滅時のアニメーションタイプ（デフォルト: 0）
   */
  constructor(
    canvasId: string,
    particleSize: number = 1,
    inDuration: number = 100,
    holdDuration: number = 60,
    scatterDuration: number = 100,
    margin: number = 100,
    appearType: number = 0,
    disappearType: number = 0
  ) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;
    this.particleSize = particleSize;
    this.inDuration = inDuration;
    this.holdDuration = holdDuration;
    this.scatterDuration = scatterDuration;
    this.margin = margin;
    this.appearType = appearType;
    this.disappearType = disappearType;
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  // キャンバスのサイズを表示領域＋余白分に設定
  resizeCanvas() {
    this.canvas.width = window.innerWidth + this.margin * 2;
    this.canvas.height = window.innerHeight + this.margin * 2;
  }

  // SVG イメージを Offscreen Canvas に描画し、ピクセルデータから粒子を生成する
  createParticlesFromImage(img: HTMLImageElement) {
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = this.canvas.width;
    offscreenCanvas.height = this.canvas.height;
    const offscreenCtx = offscreenCanvas.getContext("2d")!;

    offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    // SVG をキャンバスの中央に描画（スケール調整）
    const imgWidth = img.width;
    const imgHeight = img.height;
    const scale = Math.min(
      window.innerWidth / imgWidth,
      window.innerHeight / imgHeight
    );
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const drawX = (offscreenCanvas.width - drawWidth) / 2;
    const drawY = (offscreenCanvas.height - drawHeight) / 2;
    offscreenCtx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    // 粒子生成用にピクセルデータを取得
    const imageData = offscreenCtx.getImageData(
      0,
      0,
      offscreenCanvas.width,
      offscreenCanvas.height
    );
    const data = imageData.data;

    this.particles = [];
    // サンプリング間隔を 2 に設定（パフォーマンスのため）
    const gap = 2;
    const gatherDepthRange = 0; // targetZ の幅（例: ±30）
    // アルファ閾値を 20 に設定（アンチエイリアス部分も粒子化）
    for (let y = 0; y < offscreenCanvas.height; y += gap) {
      for (let x = 0; x < offscreenCanvas.width; x += gap) {
        const index = (x + y * offscreenCanvas.width) * 4;
        const alpha = data[index + 3];
        if (alpha > 20) {
          // targetZ を -gatherDepthRange/2～gatherDepthRange/2 の間でランダムに決定
          const targetZ =
            -gatherDepthRange / 2 + Math.random() * gatherDepthRange;
          // 元のピクセルの色情報を取得
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const pixelColor = `${r}, ${g}, ${b}`;
          // 集合フェーズの逆再生用に、散乱用のベクトル S を生成
          const theta = Math.random() * 2 * Math.PI;
          const zDir = Math.random() * 2 - 1;
          const xyLen = Math.sqrt(1 - zDir * zDir);
          const speed = Math.random() * 4 + 2;
          const Sx = Math.cos(theta) * xyLen * speed;
          const Sy = Math.sin(theta) * xyLen * speed;
          const Sz = zDir * speed;
          // 初期位置は target + S×inDuration
          const startX = x + Sx * this.inDuration;
          const startY = y + Sy * this.inDuration;
          const startZ = targetZ + Sz * this.inDuration;
          const particle: Particle = {
            x: startX,
            y: startY,
            z: startZ,
            startX: startX,
            startY: startY,
            startZ: startZ,
            targetX: x,
            targetY: y,
            targetZ: targetZ,
            vx: Sx,
            vy: Sy,
            vz: Sz,
            life: 0,
            maxLife: this.inDuration + this.holdDuration + this.scatterDuration,
            scattered: false,
            color: pixelColor,
          };
          this.particles.push(particle);
        }
      }
    }
  }

  // アニメーションループ（onComplete コールバック付き）
  animate(onComplete?: () => void) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const centerX = this.margin + window.innerWidth / 2;
    let centerY = this.margin + window.innerHeight / 2;

    // 全粒子の life は同時更新されるので、先頭の粒子の life をグローバルな値とする
    const globalLife = this.particles.length > 0 ? this.particles[0].life : 0;

    // ★ここで X 軸回りの回転角度と Z 軸回りの回転角度を算出 ★
    // Gather フェーズ中はそれぞれ初期の角度から 0 に線形補間
    let rotationAngle = 0; // X 軸回り（y, z 座標に影響）
    let zRotationAngle = 0; // Z 軸回り（x, y 座標に影響）

    if (globalLife < this.inDuration) {
      // 例として X 軸回転は最大180°、Z 軸回転は最大90° から 0° へ補間
      rotationAngle = Math.PI * (1 - globalLife / this.inDuration);
      zRotationAngle = (Math.PI / 4) * (-1 + globalLife / this.inDuration);
      centerY = this.margin + window.innerHeight / 2;
    } else {
      rotationAngle = 0;
      zRotationAngle = 0;
      centerY = this.margin + window.innerHeight / 2;
    }

    // 終了条件：全粒子の life が総寿命に達したら終了
    if (
      this.particles.length > 0 &&
      globalLife >=
        this.inDuration + this.holdDuration + this.scatterDuration - 1
    ) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (onComplete) onComplete();
      return;
    }

    // 各粒子の更新処理（Gather／Hold／Scatter／Disappear の各フェーズ）
    for (const p of this.particles) {
      if (p.life < this.inDuration) {
        // Gather（In）フェーズ：初期位置からターゲット位置へ補間
        const t = p.life / this.inDuration;
        const tEase = this.easeOutQuad(t);
        p.x = this.lerp(p.startX, p.targetX, tEase);
        p.y = this.lerp(p.startY, p.targetY, tEase);
        p.z = this.lerp(p.startZ, p.targetZ, tEase);
      } else if (p.life < this.inDuration + this.holdDuration) {
        // Hold（画像）フェーズ：ターゲット位置に固定
        p.x = p.targetX;
        p.y = p.targetY;
        p.z = p.targetZ;
      } else {
        // Scatter／Disappear フェーズ
        if (this.disappearType === 1) {
          // 消滅時のアニメーション：画像がカメラ方向（z 軸負方向）に進むが、
          // ここでは画像の表示サイズが画面の 2 倍（scale >= 2、つまり p.z < -150）になったタイミングで消える
          if (!p.scattered) {
            // 初回のみ、z 軸方向の速度を負（こちらに向かう）に固定
            p.vz = -500 / this.scatterDuration;
            p.scattered = true;
          }
          // この場合、x, y はそのままで z だけ更新
          p.z += p.vz;
        } else {
          // 従来の散乱（霧散）処理：初回に速度を反転し、その後更新
          if (!p.scattered) {
            p.vx = -p.vx;
            p.vy = -p.vy;
            p.vz = -p.vz;
            p.scattered = true;
          }
          p.x += p.vx;
          p.y += p.vy;
          p.z += p.vz;
        }
      }
      p.life++;

      // 各粒子の不透明度設定
      let opacity = 1;
      if (this.disappearType === 1) {
        // vanishThreshold: p.z が -150 (scale ≒2) を下回ったら透明にする
        if (p.z < -500) {
          opacity = 0;
        }
      } else {
        // 従来の霧散フェーズでは徐々にフェードアウト
        if (p.life >= this.inDuration + this.holdDuration) {
          const scatterLife = p.life - (this.inDuration + this.holdDuration);
          opacity = 1 - scatterLife / this.scatterDuration;
          opacity = Math.max(opacity, 0);
        }
      }

      // ★各粒子に対して、まず X 軸回りの回転を適用（y, z 座標を変換） ★
      const dy = p.y - centerY;
      const rotatedY =
        dy * Math.cos(rotationAngle) - p.z * Math.sin(rotationAngle);
      const rotatedZ =
        dy * Math.sin(rotationAngle) + p.z * Math.cos(rotationAngle);

      // パースペクティブ投影
      const effectiveZ = Math.max(p.z, -this.focalLength);
      const scale = (this.focalLength / (this.focalLength + effectiveZ)) * 0.5;

      // ★次に Z 軸回りの回転を適用（x, (X軸回転後の)y 座標を変換） ★
      const dx = p.x - centerX;
      const finalDx =
        dx * Math.cos(zRotationAngle) - rotatedY * Math.sin(zRotationAngle);
      const finalDy =
        dx * Math.sin(zRotationAngle) + rotatedY * Math.cos(zRotationAngle);

      const screenX = centerX + finalDx * scale;
      const screenY = centerY + finalDy * scale;
      const radius = this.particleSize * scale;

      this.ctx.fillStyle = `rgba(${p.color}, ${opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 寿命が尽きた粒子は除外
    this.particles = this.particles.filter((p) => p.life < p.maxLife);

    requestAnimationFrame(() => this.animate(onComplete));
  }

  // 補助関数
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
  private easeOutQuad(t: number): number {
    return 1 - Math.pow(1 - t, 2);
  }
  private hexToRgb(hex: string): string {
    hex = hex.replace("#", "");
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
  }
}

/**
 * imgAnime 関数
 * 渡された img と canvas を用いて画像アニメーションを実行し、
 * アニメーション完了まで await できるよう Promise を返します。
 * @param img 描画する画像（HTMLImageElement）
 * @param canvas 描画先の canvas 要素
 * @param appearType 出現時のアニメーションタイプ（例: 0）
 * @param disappearType 消滅時のアニメーションタイプ（例: 0 または 1）
 */
export const imgAnime = (
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  config: {
    appearType: number;
    disappearType: number;
    particleSize: number;
    inDuration: number;
    holdDuration: number;
    scatterDuration: number;
    margin: number;
  } = {
    appearType: 0,
    disappearType: 0,
    particleSize: 2,
    inDuration: 60,
    holdDuration: 60,
    scatterDuration: 20,
    margin: 100,
  }
): Promise<void> => {
  return new Promise<void>((resolve) => {
    console.log(config);
    const effect = new ParticleEffectImg(
      canvas.id,
      config.particleSize ?? 2,
      config.inDuration ?? 60,
      config.holdDuration ?? 60,
      config.scatterDuration ?? 20,
      config.margin ?? 100,
      config.appearType ?? 0, // appearType
      config.disappearType ?? 0 // disappearType
    );
    effect.image = img;
    effect.createParticlesFromImage(img);
    // アニメーションが完了したら resolve() を呼び出す
    effect.animate(() => resolve());
  });
};
