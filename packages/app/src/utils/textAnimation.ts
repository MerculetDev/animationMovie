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
  holdDuration: number; // テキスト形状を保持するフェーズ数
  scatterDuration: number; // 霧散（Scatter）フェーズのフレーム数
  textColor: string; // テキスト／粒子の色
  margin: number; // 表示領域外として利用する余白（px）
  rough: number;
  appearType: number; // 0: デフォルト, 1: 空中浮遊＋近接効果

  // パースペクティブ用定数
  focalLength: number = 300;

  // 追加: フレームカウンタやフラッシュ用のフレーム数
  frameCounter: number = 0;
  flashDuration: number = 20; // フラッシュ効果のフレーム数

  constructor(
    canvasId: string,
    text: string,
    font: string = "bold 50px Arial",
    particleSize: number = 1,
    inDuration: number = 100,
    holdDuration: number = 60,
    scatterDuration: number = 100,
    textColor: string = "#000000",
    margin: number = 100,
    rough: number = 0,
    appearType: number = 0 // 追加: 表示タイプ
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
    this.rough = rough;
    this.appearType = appearType;
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  // キャンバスのサイズを表示領域＋余白分に設定
  resizeCanvas() {
    this.canvas.width = window.innerWidth + this.margin * 2;
    this.canvas.height = window.innerHeight + this.margin * 2;
  }

  // Offscreen Canvas にテキストを描画し、ターゲット位置（2D）を取得する
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
    const gatherDepthRange = 0; // この例では 0 として固定
    // アルファ閾値を 10 に下げることで、アンチエイリアス部も粒子化
    for (let y = 0; y < offscreenCanvas.height; y += gap) {
      for (let x = 0; x < offscreenCanvas.width; x += gap) {
        const index = (x + y * offscreenCanvas.width) * 4;
        const alpha = data[index + 3];
        if (alpha > 10) {
          const targetZ =
            -gatherDepthRange / 2 + Math.random() * gatherDepthRange;
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
            vx: Sx,
            vy: Sy,
            vz: Sz,
            life: 0,
            maxLife: this.inDuration + this.holdDuration + this.scatterDuration,
            scattered: false,
            color: this.textColor,
            xRough: this.rough * (1 - Math.random()) * 2,
            yRough: this.rough * (1 - Math.random()) * 2,
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
   * onComplete: エフェクト完了時に呼び出されるコールバック
   *
   * 変更点:
   * ・rough === 0 の時、グローバルなホールドフェーズ（inDuration～inDuration+holdDuration）の間は、
   *   各粒子の描画をスキップし、キャンバス中央に文字を描画します。
   */
  animate(onComplete?: () => void) {
    const centerX = this.margin + window.innerWidth / 2;
    const centerY = this.margin + window.innerHeight / 2;

    const loop = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.frameCounter++;

      // rough === 0 の場合、ホールドフェーズで文字を表示する
      if (
        this.rough === 0 &&
        this.frameCounter >= this.inDuration &&
        this.frameCounter < this.inDuration + this.holdDuration
      ) {
        // 各粒子の life を更新する
        for (const p of this.particles) {
          p.life++;
        }
        this.ctx.save();
        this.ctx.font = this.font;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillStyle = this.textColor;
        this.ctx.fillText(this.text, centerX, centerY);
        this.ctx.restore();
      } else {
        // ホールドフェーズ以外は各粒子をアニメーションさせて描画
        for (const p of this.particles) {
          if (p.life < this.inDuration) {
            // 【Gather（In）フェーズ】
            if (this.appearType === 1) {
              const halfDuration = this.inDuration / 2;
              if (p.life < halfDuration) {
                const t = p.life / halfDuration;
                p.x = p.startX + (p.xRough || 0);
                p.y = p.startY;
                // 例として、startZ から startZ-20 へイージング
                const intermediateZ = this.lerp(p.startZ, p.startZ - 20, 0.5);
                p.z = this.lerp(p.startZ, intermediateZ, this.easeOutQuad(t));
              } else {
                const t = (p.life - halfDuration) / halfDuration;
                const tEase = this.easeOutQuad(t);
                p.x = this.lerp(p.startX, p.targetX, tEase) + (p.xRough || 0);
                p.y = this.lerp(p.startY, p.targetY, tEase);
                p.z = this.lerp(p.startZ, p.targetZ, tEase);
              }
            } else {
              const t = p.life / this.inDuration;
              const tEase = this.easeOutQuad(t);
              p.x = this.lerp(p.startX, p.targetX, tEase) + (p.xRough || 0);
              p.y = this.lerp(p.startY, p.targetY, tEase);
              p.z = this.lerp(p.startZ, p.targetZ, tEase);
            }
          } else if (p.life >= this.inDuration + this.holdDuration) {
            // 【Scatter（霧散）フェーズ】
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
          // 非ホールドフェーズでは各粒子の life を更新し、描画します
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
      }

      // 寿命が尽きた粒子は除外
      this.particles = this.particles.filter((p) => p.life < p.maxLife);

      // 残る粒子が一定数以上の場合はループ継続、なければ完了コールバックを実行
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
 * 複数のテキストを順次表示する関数（await で順次完了を待てる）
 * @param texts 表示するテキストの配列
 * @param chosenColor 使用する色
 * @param config 各種設定（rough, appearType, particleSize, inDuration, holdDuration, scatterDuration）
 */
async function startSequentialEffectText(
  texts: string[],
  chosenColor: string,
  config: {
    rough: number;
    appearType: number;
    particleSize: number;
    inDuration: number;
    holdDuration: number;
    scatterDuration: number;
  } = {
    rough: 0,
    appearType: 0,
    particleSize: 1,
    inDuration: 100,
    holdDuration: 60,
    scatterDuration: 100,
  }
) {
  for (const text of texts) {
    const effect = new ParticleEffectText(
      "canvas",
      text,
      "100px bebas-kai",
      config.particleSize ?? 1,
      config.inDuration ?? 100, // 集合フェーズのフレーム数
      config.holdDuration ?? 60, // テキスト形状の保持フレーズ数
      config.scatterDuration ?? 100, // 霧散フェーズのフレーム数
      chosenColor,
      100, // margin
      config.rough,
      config.appearType // appearType の指定
    );
    effect.createParticlesFromText();
    // animate の完了を Promise で待つ
    await new Promise<void>((resolve) => {
      effect.animate(resolve);
    });
  }
}

/**
 * textAnime 関数
 * inputText をカンマ区切りで分割し、各テキストのエフェクトが順次完了するまで await で待機します。
 * @param inputText 表示するテキスト（例："Hello, World, Foo"）
 * @param color 使用する色（例: "#09d062"）
 * @param config 各種設定（rough, appearType, particleSize, inDuration, holdDuration, scatterDuration）
 */
export const textAnime = async (
  inputText: string,
  color: string = "#09d062",
  config: {
    rough: number;
    appearType: number;
    particleSize: number;
    inDuration: number;
    holdDuration: number;
    scatterDuration: number;
  } = {
    rough: 0,
    appearType: 0,
    particleSize: 1,
    inDuration: 100,
    holdDuration: 60,
    scatterDuration: 100,
  }
) => {
  const texts = inputText
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t !== "");
  await startSequentialEffectText(texts, color, config);
};
