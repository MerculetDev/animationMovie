"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imgAnime = void 0;
var ParticleEffectImg = /** @class */ (function () {
    /**
     * @param canvasId       Canvas 要素の ID
     * @param particleSize   粒子のサイズ（例: 1）
     * @param inDuration     集合（Gather）フェーズのフレーム数（例: 100）
     * @param holdDuration   画像（Hold）フェーズのフレーム数（例: 60）
     * @param scatterDuration 霧散（Scatter）フェーズのフレーム数（例: 100）
     * @param textColor      粒子のデフォルト色（例: '#000000'）
     * @param margin         表示領域外の余白のピクセル数（例: 100）
     */
    function ParticleEffectImg(canvasId, particleSize, inDuration, holdDuration, scatterDuration, margin) {
        if (particleSize === void 0) { particleSize = 1; }
        if (inDuration === void 0) { inDuration = 100; }
        if (holdDuration === void 0) { holdDuration = 60; }
        if (scatterDuration === void 0) { scatterDuration = 100; }
        if (margin === void 0) { margin = 100; }
        var _this = this;
        this.particles = [];
        // 読み込んだ SVG イメージ
        this.image = new Image();
        // パースペクティブ用定数
        this.focalLength = 300;
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.particleSize = particleSize;
        this.inDuration = inDuration;
        this.holdDuration = holdDuration;
        this.scatterDuration = scatterDuration;
        // 総寿命は inDuration + holdDuration + scatterDuration
        // （各粒子が散乱してフェードアウトしきるまで）
        this.margin = margin;
        this.resizeCanvas();
        window.addEventListener("resize", function () { return _this.resizeCanvas(); });
    }
    // キャンバスのサイズを表示領域＋余白分に設定
    ParticleEffectImg.prototype.resizeCanvas = function () {
        this.canvas.width = window.innerWidth + this.margin * 2;
        this.canvas.height = window.innerHeight + this.margin * 2;
    };
    // SVG イメージを Offscreen Canvas に描画し、ピクセルデータから粒子を生成する
    ParticleEffectImg.prototype.createParticlesFromImage = function (img) {
        var offscreenCanvas = document.createElement("canvas");
        offscreenCanvas.width = this.canvas.width;
        offscreenCanvas.height = this.canvas.height;
        var offscreenCtx = offscreenCanvas.getContext("2d");
        offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        // SVG をキャンバスの中央に描画（スケール調整）
        var imgWidth = img.width;
        var imgHeight = img.height;
        var scale = Math.min(window.innerWidth / imgWidth, window.innerHeight / imgHeight);
        var drawWidth = imgWidth * scale;
        var drawHeight = imgHeight * scale;
        var drawX = (offscreenCanvas.width - drawWidth) / 2;
        var drawY = (offscreenCanvas.height - drawHeight) / 2;
        offscreenCtx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        // 粒子生成用にピクセルデータを取得
        var imageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        var data = imageData.data;
        this.particles = [];
        // サンプリング間隔を 2 に設定（パフォーマンスのため）
        var gap = 2;
        var gatherDepthRange = 0; // targetZ の幅（例: ±30）
        // アルファ閾値を 20 に設定（アンチエイリアス部分も粒子化）
        for (var y = 0; y < offscreenCanvas.height; y += gap) {
            for (var x = 0; x < offscreenCanvas.width; x += gap) {
                var index = (x + y * offscreenCanvas.width) * 4;
                var alpha = data[index + 3];
                if (alpha > 20) {
                    // targetZ を -gatherDepthRange/2～gatherDepthRange/2 の間でランダムに決定
                    var targetZ = -gatherDepthRange / 2 + Math.random() * gatherDepthRange;
                    // 元のピクセルの色情報を取得
                    var r = data[index];
                    var g = data[index + 1];
                    var b = data[index + 2];
                    var pixelColor = "".concat(r, ", ").concat(g, ", ").concat(b);
                    // 集合フェーズの逆再生用に、散乱用のベクトル S を生成
                    var theta = Math.random() * 2 * Math.PI;
                    console.log(Math.random());
                    var zDir = Math.random() * 2 - 1;
                    var xyLen = Math.sqrt(1 - zDir * zDir);
                    var speed = Math.random() * 4 + 2;
                    var Sx = Math.cos(theta) * xyLen * speed;
                    var Sy = Math.sin(theta) * xyLen * speed;
                    var Sz = zDir * speed;
                    // 初期位置は target + S×inDuration
                    var startX = x + Sx * this.inDuration;
                    var startY = y + Sy * this.inDuration;
                    var startZ = targetZ + Sz * this.inDuration;
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
                        color: pixelColor,
                    };
                    this.particles.push(particle);
                }
            }
        }
    };
    // アニメーションループ（onComplete コールバック付き）
    ParticleEffectImg.prototype.animate = function (onComplete) {
        var _this = this;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        var centerX = this.margin + window.innerWidth / 2;
        var centerY = this.margin + window.innerHeight / 2;
        // 全粒子の life は同時更新されるので、先頭の粒子の life をグローバルな値とする
        var globalLife = this.particles.length > 0 ? this.particles[0].life : 0;
        // 終了条件：全粒子の life が総寿命に達したら終了
        if (this.particles.length > 0 &&
            globalLife >= this.inDuration + this.holdDuration + this.scatterDuration) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            // 終了時に onComplete コールバックを呼び出す
            if (onComplete)
                onComplete();
            return;
        }
        // 各粒子の更新処理（Gather／Hold／Scatter の各フェーズ）
        for (var _i = 0, _a = this.particles; _i < _a.length; _i++) {
            var p = _a[_i];
            if (p.life < this.inDuration) {
                // Gather（In）フェーズ：初期位置からターゲット位置へ補間
                var t = p.life / this.inDuration;
                var tEase = this.easeOutQuad(t);
                p.x = this.lerp(p.startX, p.targetX, tEase);
                p.y = this.lerp(p.startY, p.targetY, tEase);
                p.z = this.lerp(p.startZ, p.targetZ, tEase);
            }
            else if (p.life < this.inDuration + this.holdDuration) {
                // Hold（画像）フェーズ：ターゲット位置に固定
                p.x = p.targetX;
                p.y = p.targetY;
                p.z = p.targetZ;
            }
            else {
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
            var opacity = 1;
            if (p.life >= this.inDuration + this.holdDuration) {
                var scatterLife = p.life - (this.inDuration + this.holdDuration);
                opacity = 1 - scatterLife / this.scatterDuration;
                opacity = Math.max(opacity, 0);
            }
            // パースペクティブ投影
            var effectiveZ = Math.max(p.z, -this.focalLength);
            var scale = this.focalLength / (this.focalLength + effectiveZ);
            var screenX_1 = centerX + (p.x - centerX) * scale;
            var screenY_1 = centerY + (p.y - centerY) * scale;
            var radius = this.particleSize * scale;
            this.ctx.fillStyle = "rgba(".concat(p.color, ", ").concat(opacity, ")");
            this.ctx.beginPath();
            this.ctx.arc(screenX_1, screenY_1, radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        // 寿命が尽きた粒子は除外
        this.particles = this.particles.filter(function (p) { return p.life < p.maxLife; });
        requestAnimationFrame(function () { return _this.animate(onComplete); });
    };
    // 補助関数（lerp, easeOutQuad, hexToRgb など）はそのまま…
    ParticleEffectImg.prototype.lerp = function (a, b, t) {
        return a + (b - a) * t;
    };
    ParticleEffectImg.prototype.easeOutQuad = function (t) {
        return 1 - Math.pow(1 - t, 2);
    };
    ParticleEffectImg.prototype.hexToRgb = function (hex) {
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
    return ParticleEffectImg;
}());
window.addEventListener("DOMContentLoaded", function () {
    var startButton = document.getElementById("startButton");
    var fileInput = document.getElementById("fileInput");
    startButton.addEventListener("click", function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) {
            alert("SVG ファイルを選択してください");
            return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
            var _a;
            var svgData = (_a = e.target) === null || _a === void 0 ? void 0 : _a.result;
            var img = new Image();
            img.onload = function () {
                var effect = new ParticleEffectImg("canvas", 2, // particleSize
                100, // inDuration
                60, // holdDuration
                100, // scatterDuration
                100 // margin
                );
                effect.image = img;
                effect.createParticlesFromImage(img);
                effect.animate();
            };
            img.src =
                "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
        };
        reader.readAsText(file);
    });
});
var imgAnime = function (img, canvas, onComplete) {
    img.onload = function () {
        var effect = new ParticleEffectImg(canvas.id, 100, // inDuration
        60, // holdDuration
        100, // scatterDuration
        100 // margin
        );
        effect.image = img;
        effect.createParticlesFromImage(img);
        // 画像アニメーションが終了したら onComplete コールバックで文字アニメーションを開始
        if (onComplete)
            effect.animate(function () { return onComplete(); });
    };
};
exports.imgAnime = imgAnime;
