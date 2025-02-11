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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var ParticleEffectText = /** @class */ (function () {
    function ParticleEffectText(canvasId, text, font, particleSize, inDuration, holdDuration, scatterDuration, textColor, margin, rough, appearType // 追加: 表示タイプ
    ) {
        if (font === void 0) { font = "bold 50px Arial"; }
        if (particleSize === void 0) { particleSize = 1; }
        if (inDuration === void 0) { inDuration = 100; }
        if (holdDuration === void 0) { holdDuration = 60; }
        if (scatterDuration === void 0) { scatterDuration = 100; }
        if (textColor === void 0) { textColor = "#000000"; }
        if (margin === void 0) { margin = 100; }
        if (rough === void 0) { rough = 0; }
        if (appearType === void 0) { appearType = 0; }
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
        this.rough = rough;
        this.appearType = appearType;
        this.resizeCanvas();
        window.addEventListener("resize", function () { return _this.resizeCanvas(); });
    }
    // キャンバスのサイズを表示領域＋余白分に設定
    ParticleEffectText.prototype.resizeCanvas = function () {
        this.canvas.width = window.innerWidth + this.margin * 2;
        this.canvas.height = window.innerHeight + this.margin * 2;
    };
    // Offscreen Canvas にテキストを描画し、ターゲット位置（2D）を取得する
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
        var gatherDepthRange = 0; // この例では 0 として固定
        // アルファ閾値を 10 に下げることで、アンチエイリアス部も粒子化
        for (var y = 0; y < offscreenCanvas.height; y += gap) {
            for (var x = 0; x < offscreenCanvas.width; x += gap) {
                var index = (x + y * offscreenCanvas.width) * 4;
                var alpha = data[index + 3];
                if (alpha > 10) {
                    var targetZ = -gatherDepthRange / 2 + Math.random() * gatherDepthRange;
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
     * onComplete: エフェクト完了時に呼び出されるコールバック
     *
     * 変更点:
     * ・rough === 0 の時、グローバルなホールドフェーズ（inDuration～inDuration+holdDuration）の間は、
     *   各粒子の描画をスキップし、キャンバス中央に文字を描画します。
     */
    ParticleEffectText.prototype.animate = function (onComplete) {
        var _this = this;
        var centerX = this.margin + window.innerWidth / 2;
        var centerY = this.margin + window.innerHeight / 2;
        var loop = function () {
            _this.ctx.clearRect(0, 0, _this.canvas.width, _this.canvas.height);
            _this.frameCounter++;
            // rough === 0 の場合、ホールドフェーズで文字を表示する
            if (_this.rough === 0 &&
                _this.frameCounter >= _this.inDuration &&
                _this.frameCounter < _this.inDuration + _this.holdDuration) {
                // 各粒子の life を更新する
                for (var _i = 0, _a = _this.particles; _i < _a.length; _i++) {
                    var p = _a[_i];
                    p.life++;
                }
                _this.ctx.save();
                _this.ctx.font = _this.font;
                _this.ctx.textAlign = "center";
                _this.ctx.textBaseline = "middle";
                _this.ctx.fillStyle = _this.textColor;
                _this.ctx.fillText(_this.text, centerX, centerY);
                _this.ctx.restore();
            }
            else {
                // ホールドフェーズ以外は各粒子をアニメーションさせて描画
                for (var _b = 0, _c = _this.particles; _b < _c.length; _b++) {
                    var p = _c[_b];
                    if (p.life < _this.inDuration) {
                        // 【Gather（In）フェーズ】
                        if (_this.appearType === 1) {
                            var halfDuration = _this.inDuration / 2;
                            if (p.life < halfDuration) {
                                var t = p.life / halfDuration;
                                p.x = p.startX + (p.xRough || 0);
                                p.y = p.startY;
                                // 例として、startZ から startZ-20 へイージング
                                var intermediateZ = _this.lerp(p.startZ, p.startZ - 20, 0.5);
                                p.z = _this.lerp(p.startZ, intermediateZ, _this.easeOutQuad(t));
                            }
                            else {
                                var t = (p.life - halfDuration) / halfDuration;
                                var tEase = _this.easeOutQuad(t);
                                p.x = _this.lerp(p.startX, p.targetX, tEase) + (p.xRough || 0);
                                p.y = _this.lerp(p.startY, p.targetY, tEase);
                                p.z = _this.lerp(p.startZ, p.targetZ, tEase);
                            }
                        }
                        else {
                            var t = p.life / _this.inDuration;
                            var tEase = _this.easeOutQuad(t);
                            p.x = _this.lerp(p.startX, p.targetX, tEase) + (p.xRough || 0);
                            p.y = _this.lerp(p.startY, p.targetY, tEase);
                            p.z = _this.lerp(p.startZ, p.targetZ, tEase);
                        }
                    }
                    else if (p.life >= _this.inDuration + _this.holdDuration) {
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
            }
            // 寿命が尽きた粒子は除外
            _this.particles = _this.particles.filter(function (p) { return p.life < p.maxLife; });
            // 残る粒子が一定数以上の場合はループ継続、なければ完了コールバックを実行
            if (_this.particles.length > 40) {
                requestAnimationFrame(loop);
            }
            else {
                if (onComplete)
                    onComplete();
            }
        };
        loop();
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
 * 複数のテキストを順次表示する関数（await で順次完了を待てる）
 * @param texts 表示するテキストの配列
 * @param chosenColor 使用する色
 * @param config 各種設定（rough, appearType, particleSize, inDuration, holdDuration, scatterDuration）
 */
function startSequentialEffectText(texts_1, chosenColor_1) {
    return __awaiter(this, arguments, void 0, function (texts, chosenColor, config) {
        var _loop_1, _i, texts_2, text;
        var _a, _b, _c, _d;
        if (config === void 0) { config = {
            rough: 0,
            appearType: 0,
            particleSize: 1,
            inDuration: 100,
            holdDuration: 60,
            scatterDuration: 100,
        }; }
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _loop_1 = function (text) {
                        var effect;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0:
                                    effect = new ParticleEffectText("canvas", text, "100px bebas-kai", (_a = config.particleSize) !== null && _a !== void 0 ? _a : 1, (_b = config.inDuration) !== null && _b !== void 0 ? _b : 100, // 集合フェーズのフレーム数
                                    (_c = config.holdDuration) !== null && _c !== void 0 ? _c : 60, // テキスト形状の保持フレーズ数
                                    (_d = config.scatterDuration) !== null && _d !== void 0 ? _d : 100, // 霧散フェーズのフレーム数
                                    chosenColor, 100, // margin
                                    config.rough, config.appearType // appearType の指定
                                    );
                                    effect.createParticlesFromText();
                                    // animate の完了を Promise で待つ
                                    return [4 /*yield*/, new Promise(function (resolve) {
                                            effect.animate(resolve);
                                        })];
                                case 1:
                                    // animate の完了を Promise で待つ
                                    _f.sent();
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, texts_2 = texts;
                    _e.label = 1;
                case 1:
                    if (!(_i < texts_2.length)) return [3 /*break*/, 4];
                    text = texts_2[_i];
                    return [5 /*yield**/, _loop_1(text)];
                case 2:
                    _e.sent();
                    _e.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * textAnime 関数
 * inputText をカンマ区切りで分割し、各テキストのエフェクトが順次完了するまで await で待機します。
 * @param inputText 表示するテキスト（例："Hello, World, Foo"）
 * @param color 使用する色（例: "#09d062"）
 * @param config 各種設定（rough, appearType, particleSize, inDuration, holdDuration, scatterDuration）
 */
export var textAnime = function (inputText_1) {
    var args_1 = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args_1[_i - 1] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([inputText_1], args_1, true), void 0, function (inputText, color, config) {
        var texts;
        if (color === void 0) { color = "#09d062"; }
        if (config === void 0) { config = {
            rough: 0,
            appearType: 0,
            particleSize: 1,
            inDuration: 100,
            holdDuration: 60,
            scatterDuration: 100,
        }; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    texts = inputText
                        .split(",")
                        .map(function (t) { return t.trim(); })
                        .filter(function (t) { return t !== ""; });
                    return [4 /*yield*/, startSequentialEffectText(texts, color, config)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
