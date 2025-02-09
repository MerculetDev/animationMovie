// textAnimation.ts
import { Particle } from "./type";

class ParticleEffectText {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  particles: Particle[] = [];
  text: string;
  font: string;
  particleSize: number;
  inDuration: number; // 集合（In）フェーズのフレーム数
  holdDuration: number; // テキスト形状を保持するフレーズ数
  scatterDuration: number; // 霧散（Scatter）フェーズのフレーム数
  textColor: string; // テキスト／粒子の色
  margin: number; // 表示領域外として利用する余白（px）

  // パースペクティブ用定数
  focalLength: number = 300;

  // 追加: フレームカウンタやフラッシュ用のフレーム数
  frameCounter: number = 0;
  flashDuration: number = 20; // フラッシュ効果のフレーム数

  /**
   * @param canvasId      Canvas 要素の ID
   * @param text          表示するテキスト
   * @param font          使用するフォント (例: 'bold 50px Arial')
   * @param particleSize  粒子のサイズ（例: 1）
   * @param inDuration    集合（In）フェーズのフレーム数（例: 100）
   * @param holdDuration  Hold フェーズのフレーム数（例: 60）
   * @param scatterDuration 霧散（Scatter）フェーズのフレーム数（例: 100）
   * @param textColor     テキスト／粒子の色（例: '#000000'）
   * @param margin        画面外として利用する余白のピクセル数（例: 100）
   */
  constructor(
    canvasId: string,
    text: string,
    font: string = "bold 50px Arial",
    particleSize: number = 1,
    inDuration: number = 100,
    holdDuration: number = 60,
    scatterDuration: number = 100,
    textColor: string = "#000000",
    margin: number = 100
  ) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;
    this.text = text;
    this.font = font;
    this.particleSize = particleSize;
    this.inDuration = inDuration;
    this.holdDuration = holdDuration;
    this.scatterDuration = scatterDuration;
    this.textColor = textColor;
    this.margin = margin;
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  // キャンバスのサイズを表示領域＋余白分に設定
  resizeCanvas() {
    this.canvas.width = window.innerWidth + this.margin * 2;
    this.canvas.height = window.innerHeight + this.margin * 2;
  }

  // Offscreen Canvas にテキストを描画し、ターゲット位置（2D）を取得する
  // ※ targetZ はランダムに（例: -30～30）設定
  createParticlesFromText() {
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = this.canvas.width;
    offscreenCanvas.height = this.canvas.height;
    const offscreenCtx = offscreenCanvas.getContext("2d")!;

    offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    offscreenCtx.fillStyle = this.textColor;
    offscreenCtx.font = this.font;
    // テキストを中央に配置するための設定
    offscreenCtx.textBaseline = "middle";
    offscreenCtx.textAlign = "center";
    const textX = this.margin + window.innerWidth / 2;
    const textY = this.margin + window.innerHeight / 2;
    offscreenCtx.fillText(this.text, textX, textY);

    const imageData = offscreenCtx.getImageData(
      0,
      0,
      offscreenCanvas.width,
      offscreenCanvas.height
    );
    const data = imageData.data;

    this.particles = [];
    const gap = this.particleSize; // サンプリング間隔
    // 集合時の奥行き範囲（targetZ の幅：例として ±30）
    const gatherDepthRange = 0; // この例では 0 として固定（必要に応じて変更可）
    // アルファ閾値を 10 に下げることで、アンチエイリアス部も粒子化
    for (let y = 0; y < offscreenCanvas.height; y += gap) {
      for (let x = 0; x < offscreenCanvas.width; x += gap) {
        const index = (x + y * offscreenCanvas.width) * 4;
        const alpha = data[index + 3];
        if (alpha > 10) {
          // targetZ を -gatherDepthRange/2～gatherDepthRange/2 の間でランダムに決定
          const targetZ =
            -gatherDepthRange / 2 + Math.random() * gatherDepthRange;
          // 散乱用のベクトル S を生成（scatter と同じ方式）
          const theta = Math.random() * 2 * Math.PI;
          const zDir = Math.random() * 2 - 1; // -1 ～ 1
          const xyLen = Math.sqrt(1 - zDir * zDir);
          const speed = Math.random() * 4 + 2; // 例: 2～6
          const Sx = Math.cos(theta) * xyLen * speed;
          const Sy = Math.sin(theta) * xyLen * speed;
          const Sz = zDir * speed;
          // 初期位置（gathering 開始時）は target + S×scatterDuration（＝散乱状態の逆再生状態）
          const startX = x + Sx * this.scatterDuration;
          const startY = y + Sy * this.scatterDuration;
          const startZ = targetZ + Sz * this.scatterDuration;
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
            vx: Sx, // この S を後の scatter 時に使用
            vy: Sy,
            vz: Sz,
            life: 0,
            maxLife: this.inDuration + this.holdDuration + this.scatterDuration,
            scattered: false,
            color: this.textColor,
          };
          this.particles.push(particle);
        }
      }
    }
  }

  // 線形補間関数
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * easeOutQuad: イージング関数
   * f(t) = 1 - (1 - t)^2
   */
  private easeOutQuad(t: number): number {
    return 1 - Math.pow(1 - t, 2);
  }

  /**
   * アニメーションループ
   * @param onComplete エフェクト完了時に呼び出されるコールバック（次の文字表示用）
   */
  async animate(onComplete?: () => void) {
    const centerX = this.margin + window.innerWidth / 2;
    const centerY = this.margin + window.innerHeight / 2;

    const loop = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.frameCounter++;

      for (const p of this.particles) {
        if (p.life < this.inDuration) {
          // 【Gather（In）フェーズ】
          const t = p.life / this.inDuration;
          const tEase = this.easeOutQuad(t);
          p.x = this.lerp(p.startX, p.targetX, tEase);
          p.y = this.lerp(p.startY, p.targetY, tEase);
          p.z = this.lerp(p.startZ, p.targetZ, tEase);
        } else if (p.life < this.inDuration + this.holdDuration) {
          // 【Hold フェーズ】: ターゲット位置に固定
          p.x = p.targetX;
          p.y = p.targetY;
          p.z = p.targetZ;
        } else {
          // 【Scatter フェーズ】
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

        // Scatter フェーズではフェードアウト
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

        // ★ フラッシュ効果 ★
        // Hold フェーズ開始直後、flashDuration フレーム間、影（輝き）を追加
        if (
          p.life === this.inDuration &&
          this.frameCounter <= this.inDuration + this.flashDuration
        ) {
          const flashProgress =
            (this.frameCounter - this.inDuration) / this.flashDuration;
          this.ctx.shadowColor = p.color;
          this.ctx.shadowBlur = 20 * (1 - flashProgress);
        } else {
          this.ctx.shadowBlur = 0;
        }

        // 粒子描画
        this.ctx.fillStyle = `rgba(${this.hexToRgb(p.color)}, ${opacity})`;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // 寿命が尽きた粒子は除外
      this.particles = this.particles.filter((p) => p.life < p.maxLife);

      // 一定数以上の粒子が残っている間はアニメーション継続
      if (this.particles.length > 40) {
        requestAnimationFrame(loop);
      } else {
        if (onComplete) onComplete();
      }
    };

    loop();
  }

  /**
   * 16進カラー（例: "#ff0000"）をRGB形式（例: "255, 0, 0"）に変換
   */
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
 * 複数の文字列（例: ["文字1","文字2",...]）を順次表示するための関数
 * @param texts 表示する文字列の配列
 * @param chosenColor 使用する色
 */
function startSequentialEffectText(texts: string[], chosenColor: string) {
  let currentIndex = 0;

  const runEffect = () => {
    if (currentIndex < texts.length) {
      // ParticleEffect のインスタンス生成（各フェーズのフレーム数や margin などは適宜調整）
      const effect = new ParticleEffectText(
        "canvas",
        texts[currentIndex],
        "bold 50px Arial",
        1, // particleSize（細かい粒子）
        100, // inDuration: 集合（gather）フェーズのフレーム数
        60, // holdDuration: テキスト形状の保持フレーズ数
        100, // scatterDuration: 霧散フェーズのフレーム数
        chosenColor,
        100 // margin: 表示領域外の余白
      );
      effect.createParticlesFromText();
      // アニメーション終了時に次の文字列のエフェクトを開始
      effect.animate(() => {
        currentIndex++;
        runEffect();
      });
    }
  };

  runEffect();
}

export const textAnime = (inputText: string, color: string = "#000000") => {
  const texts = inputText
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t !== "");

  startSequentialEffectText(texts, color);
};
