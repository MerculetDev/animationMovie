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
  holdDuration: number; // 画像（Hold）フェーズのフレーム数
  scatterDuration: number; // 霧散（Scatter）フェーズのフレーム数
  margin: number; // 表示領域外として利用する余白（px）

  // パースペクティブ用定数
  focalLength: number = 300;

  /**
   * @param canvasId       Canvas 要素の ID
   * @param particleSize   粒子のサイズ（例: 1）
   * @param inDuration     集合（Gather）フェーズのフレーム数（例: 100）
   * @param holdDuration   画像（Hold）フェーズのフレーム数（例: 60）
   * @param scatterDuration 霧散（Scatter）フェーズのフレーム数（例: 100）
   * @param textColor      粒子のデフォルト色（例: '#000000'）
   * @param margin         表示領域外の余白のピクセル数（例: 100）
   */
  constructor(
    canvasId: string,
    particleSize: number = 1,
    inDuration: number = 100,
    holdDuration: number = 60,
    scatterDuration: number = 100,
    margin: number = 100
  ) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;
    this.particleSize = particleSize;
    this.inDuration = inDuration;
    this.holdDuration = holdDuration;
    this.scatterDuration = scatterDuration;
    // 総寿命は inDuration + holdDuration + scatterDuration
    // （各粒子が散乱してフェードアウトしきるまで）
    this.margin = margin;
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
    console.log(
      globalLife,
      this.inDuration + this.holdDuration + this.scatterDuration
    );
    // 終了条件：全粒子の life が総寿命に達したら終了
    if (
      this.particles.length > 0 &&
      globalLife >=
        this.inDuration + this.holdDuration + this.scatterDuration - 1
    ) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      // 終了時に onComplete コールバックを呼び出す
      console.log("ここで終了", onComplete);
      if (onComplete) onComplete();
      return;
    }

    // 各粒子の更新処理（Gather／Hold／Scatter の各フェーズ）
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
        // Scatter（霧散）フェーズ：最初に逆ベクトルを適用し、その後位置更新＆フェードアウト
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
      p.life++;

      // Scatter フェーズでのフェードアウト処理
      let opacity = 1;
      if (p.life >= this.inDuration + this.holdDuration) {
        const scatterLife = p.life - (this.inDuration + this.holdDuration);
        opacity = 1 - scatterLife / this.scatterDuration;
        opacity = Math.max(opacity, 0);
      }

      // パースペクティブ投影
      const effectiveZ = Math.max(p.z, -this.focalLength);
      const scale = this.focalLength / (this.focalLength + effectiveZ);
      const screenX = centerX + (p.x - centerX) * scale;
      const screenY = centerY + (p.y - centerY) * scale;
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

  // 補助関数（lerp, easeOutQuad, hexToRgb など）はそのまま…
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

// window.addEventListener("DOMContentLoaded", () => {
//   const startButton = document.getElementById(
//     "startButton"
//   ) as HTMLButtonElement;
//   const fileInput = document.getElementById("fileInput") as HTMLInputElement;

//   startButton.addEventListener("click", () => {
//     const file = fileInput.files && fileInput.files[0];
//     if (!file) {
//       alert("SVG ファイルを選択してください");
//       return;
//     }
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       const svgData = e.target?.result as string;
//       const img = new Image();
//       img.onload = () => {
//         const effect = new ParticleEffectImg(
//           "canvas",
//           2, // particleSize
//           100, // inDuration
//           60, // holdDuration
//           100, // scatterDuration
//           100 // margin
//         );
//         effect.image = img;
//         effect.createParticlesFromImage(img);
//         effect.animate();
//       };
//       img.src =
//         "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
//     };
//     reader.readAsText(file);
//   });
// });

export const imgAnime = (
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  onComplete?: () => void
) => {
  const effect = new ParticleEffectImg(
    canvas.id,
    1, // particleSize
    100, // inDuration
    60, // holdDuration
    100, // scatterDuration
    100 // margin
  );
  effect.image = img;
  effect.createParticlesFromImage(img);
  // 画像アニメーションが終了したら onComplete コールバックで文字アニメーションを開始
  effect.animate(() => {
    if (onComplete) onComplete();
  });
};
