var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var ParticleEffectText = /** @class */ (function () {
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
    function ParticleEffectText(canvasId, text, font, particleSize, inDuration, holdDuration, scatterDuration, textColor, margin) {
        if (font === void 0) { font = "bold 50px Arial"; }
        if (particleSize === void 0) { particleSize = 1; }
        if (inDuration === void 0) { inDuration = 100; }
        if (holdDuration === void 0) { holdDuration = 60; }
        if (scatterDuration === void 0) { scatterDuration = 100; }
        if (textColor === void 0) { textColor = "#000000"; }
        if (margin === void 0) { margin = 100; }
        var _this = this;
        this.particles = [];
        // パースペクティブ用定数
        this.focalLength = 300;
        // 追加: フレームカウンタやフラッシュ用のフレーム数
        this.frameCounter = 0;
        this.flashDuration = 20; // フラッシュ効果のフレーム数
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.text = text;
        this.font = font;
        this.particleSize = particleSize;
        this.inDuration = inDuration;
        this.holdDuration = holdDuration;
        this.scatterDuration = scatterDuration;
        this.textColor = textColor;
        this.margin = margin;
        this.resizeCanvas();
        window.addEventListener("resize", function () { return _this.resizeCanvas(); });
    }
    // キャンバスのサイズを表示領域＋余白分に設定
    ParticleEffectText.prototype.resizeCanvas = function () {
        this.canvas.width = window.innerWidth + this.margin * 2;
        this.canvas.height = window.innerHeight + this.margin * 2;
    };
    // Offscreen Canvas にテキストを描画し、ターゲット位置（2D）を取得する
    // ※ targetZ はランダムに（例: -30～30）設定
    ParticleEffectText.prototype.createParticlesFromText = function () {
        var offscreenCanvas = document.createElement("canvas");
        offscreenCanvas.width = this.canvas.width;
        offscreenCanvas.height = this.canvas.height;
        var offscreenCtx = offscreenCanvas.getContext("2d");
        offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        offscreenCtx.fillStyle = this.textColor;
        offscreenCtx.font = this.font;
        // テキストを中央に配置するための設定
        offscreenCtx.textBaseline = "middle";
        offscreenCtx.textAlign = "center";
        var textX = this.margin + window.innerWidth / 2;
        var textY = this.margin + window.innerHeight / 2;
        offscreenCtx.fillText(this.text, textX, textY);
        var imageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        var data = imageData.data;
        this.particles = [];
        var gap = this.particleSize; // サンプリング間隔
        // 集合時の奥行き範囲（targetZ の幅：例として ±30）
        var gatherDepthRange = 0; // この例では 0 として固定（必要に応じて変更可）
        // アルファ閾値を 10 に下げることで、アンチエイリアス部も粒子化
        for (var y = 0; y < offscreenCanvas.height; y += gap) {
            for (var x = 0; x < offscreenCanvas.width; x += gap) {
                var index = (x + y * offscreenCanvas.width) * 4;
                var alpha = data[index + 3];
                if (alpha > 10) {
                    // targetZ を -gatherDepthRange/2～gatherDepthRange/2 の間でランダムに決定
                    var targetZ = -gatherDepthRange / 2 + Math.random() * gatherDepthRange;
                    // 散乱用のベクトル S を生成（scatter と同じ方式）
                    var theta = Math.random() * 2 * Math.PI;
                    var zDir = Math.random() * 2 - 1; // -1 ～ 1
                    var xyLen = Math.sqrt(1 - zDir * zDir);
                    var speed = Math.random() * 4 + 2; // 例: 2～6
                    var Sx = Math.cos(theta) * xyLen * speed;
                    var Sy = Math.sin(theta) * xyLen * speed;
                    var Sz = zDir * speed;
                    // 初期位置（gathering 開始時）は target + S×scatterDuration（＝散乱状態の逆再生状態）
                    var startX = x + Sx * this.scatterDuration;
                    var startY = y + Sy * this.scatterDuration;
                    var startZ = targetZ + Sz * this.scatterDuration;
                    var particle = {
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
    };
    // 線形補間関数
    ParticleEffectText.prototype.lerp = function (a, b, t) {
        return a + (b - a) * t;
    };
    /**
     * easeOutQuad: イージング関数
     * f(t) = 1 - (1 - t)^2
     */
    ParticleEffectText.prototype.easeOutQuad = function (t) {
        return 1 - Math.pow(1 - t, 2);
    };
    /**
     * アニメーションループ
     * @param onComplete エフェクト完了時に呼び出されるコールバック（次の文字表示用）
     */
    ParticleEffectText.prototype.animate = function (onComplete) {
        return __awaiter(this, void 0, void 0, function () {
            var centerX, centerY, loop;
            var _this = this;
            return __generator(this, function (_a) {
                centerX = this.margin + window.innerWidth / 2;
                centerY = this.margin + window.innerHeight / 2;
                loop = function () {
                    _this.ctx.clearRect(0, 0, _this.canvas.width, _this.canvas.height);
                    _this.frameCounter++;
                    for (var _i = 0, _a = _this.particles; _i < _a.length; _i++) {
                        var p = _a[_i];
                        if (p.life < _this.inDuration) {
                            // 【Gather（In）フェーズ】
                            var t = p.life / _this.inDuration;
                            var tEase = _this.easeOutQuad(t);
                            p.x = _this.lerp(p.startX, p.targetX, tEase);
                            p.y = _this.lerp(p.startY, p.targetY, tEase);
                            p.z = _this.lerp(p.startZ, p.targetZ, tEase);
                        }
                        else if (p.life < _this.inDuration + _this.holdDuration) {
                            // 【Hold フェーズ】: ターゲット位置に固定
                            p.x = p.targetX;
                            p.y = p.targetY;
                            p.z = p.targetZ;
                        }
                        else {
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
                        var opacity = 1;
                        if (p.life >= _this.inDuration + _this.holdDuration) {
                            var scatterLife = p.life - (_this.inDuration + _this.holdDuration);
                            opacity = 1 - scatterLife / _this.scatterDuration;
                            opacity = Math.max(opacity, 0);
                        }
                        // パースペクティブ投影
                        var effectiveZ = Math.max(p.z, -_this.focalLength);
                        var scale = _this.focalLength / (_this.focalLength + effectiveZ);
                        var screenX_1 = centerX + (p.x - centerX) * scale;
                        var screenY_1 = centerY + (p.y - centerY) * scale;
                        var radius = _this.particleSize * scale;
                        // ★ フラッシュ効果 ★
                        // Hold フェーズ開始直後、flashDuration フレーム間、影（輝き）を追加
                        if (p.life === _this.inDuration &&
                            _this.frameCounter <= _this.inDuration + _this.flashDuration) {
                            var flashProgress = (_this.frameCounter - _this.inDuration) / _this.flashDuration;
                            _this.ctx.shadowColor = p.color;
                            _this.ctx.shadowBlur = 20 * (1 - flashProgress);
                        }
                        else {
                            _this.ctx.shadowBlur = 0;
                        }
                        // 粒子描画
                        _this.ctx.fillStyle = "rgba(".concat(_this.hexToRgb(p.color), ", ").concat(opacity, ")");
                        _this.ctx.beginPath();
                        _this.ctx.arc(screenX_1, screenY_1, radius, 0, Math.PI * 2);
                        _this.ctx.fill();
                    }
                    // 寿命が尽きた粒子は除外
                    _this.particles = _this.particles.filter(function (p) { return p.life < p.maxLife; });
                    // 一定数以上の粒子が残っている間はアニメーション継続
                    if (_this.particles.length > 40) {
                        requestAnimationFrame(loop);
                    }
                    else {
                        if (onComplete)
                            onComplete();
                    }
                };
                loop();
                return [2 /*return*/];
            });
        });
    };
    /**
     * 16進カラー（例: "#ff0000"）をRGB形式（例: "255, 0, 0"）に変換
     */
    ParticleEffectText.prototype.hexToRgb = function (hex) {
        hex = hex.replace("#", "");
        if (hex.length === 3) {
            hex = hex
                .split("")
                .map(function (c) { return c + c; })
                .join("");
        }
        var bigint = parseInt(hex, 16);
        var r = (bigint >> 16) & 255;
        var g = (bigint >> 8) & 255;
        var b = bigint & 255;
        return "".concat(r, ", ").concat(g, ", ").concat(b);
    };
    return ParticleEffectText;
}());
/**
 * 複数の文字列（例: ["文字1","文字2",...]）を順次表示するための関数
 * @param texts 表示する文字列の配列
 * @param chosenColor 使用する色
 */
function startSequentialEffectText(texts, chosenColor) {
    var currentIndex = 0;
    var runEffect = function () {
        if (currentIndex < texts.length) {
            // ParticleEffect のインスタンス生成（各フェーズのフレーム数や margin などは適宜調整）
            var effect = new ParticleEffectText("canvas", texts[currentIndex], "bold 50px Arial", 1, // particleSize（細かい粒子）
            100, // inDuration: 集合（gather）フェーズのフレーム数
            60, // holdDuration: テキスト形状の保持フレーズ数
            100, // scatterDuration: 霧散フェーズのフレーム数
            chosenColor, 100 // margin: 表示領域外の余白
            );
            effect.createParticlesFromText();
            // アニメーション終了時に次の文字列のエフェクトを開始
            effect.animate(function () {
                currentIndex++;
                runEffect();
            });
        }
    };
    runEffect();
}
export var textAnime = function (inputText, color) {
    if (color === void 0) { color = "#000000"; }
    var texts = inputText
        .split(",")
        .map(function (t) { return t.trim(); })
        .filter(function (t) { return t !== ""; });
    startSequentialEffectText(texts, color);
};
