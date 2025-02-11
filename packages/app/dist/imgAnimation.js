var ParticleEffectImg = /** @class */ (function () {
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
    function ParticleEffectImg(canvasId, particleSize, inDuration, holdDuration, scatterDuration, margin, appearType, disappearType) {
        if (particleSize === void 0) { particleSize = 1; }
        if (inDuration === void 0) { inDuration = 100; }
        if (holdDuration === void 0) { holdDuration = 60; }
        if (scatterDuration === void 0) { scatterDuration = 100; }
        if (margin === void 0) { margin = 100; }
        if (appearType === void 0) { appearType = 0; }
        if (disappearType === void 0) { disappearType = 0; }
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
        this.margin = margin;
        this.appearType = appearType;
        this.disappearType = disappearType;
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
        // ★ここで X 軸回りの回転角度と Z 軸回りの回転角度を算出 ★
        // Gather フェーズ中はそれぞれ初期の角度から 0 に線形補間
        var rotationAngle = 0; // X 軸回り（y, z 座標に影響）
        var zRotationAngle = 0; // Z 軸回り（x, y 座標に影響）
        if (globalLife < this.inDuration) {
            // 例として X 軸回転は最大180°、Z 軸回転は最大90° から 0° へ補間
            rotationAngle = Math.PI * (1 - globalLife / this.inDuration);
            zRotationAngle = (Math.PI / 4) * (-1 + globalLife / this.inDuration);
            centerY = this.margin + window.innerHeight / 2;
        }
        else {
            rotationAngle = 0;
            zRotationAngle = 0;
            centerY = this.margin + window.innerHeight / 2;
        }
        // 終了条件：全粒子の life が総寿命に達したら終了
        if (this.particles.length > 0 &&
            globalLife >=
                this.inDuration + this.holdDuration + this.scatterDuration - 1) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            if (onComplete)
                onComplete();
            return;
        }
        // 各粒子の更新処理（Gather／Hold／Scatter／Disappear の各フェーズ）
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
                }
                else {
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
            var opacity = 1;
            if (this.disappearType === 1) {
                // vanishThreshold: p.z が -150 (scale ≒2) を下回ったら透明にする
                if (p.z < -500) {
                    opacity = 0;
                }
            }
            else {
                // 従来の霧散フェーズでは徐々にフェードアウト
                if (p.life >= this.inDuration + this.holdDuration) {
                    var scatterLife = p.life - (this.inDuration + this.holdDuration);
                    opacity = 1 - scatterLife / this.scatterDuration;
                    opacity = Math.max(opacity, 0);
                }
            }
            // ★各粒子に対して、まず X 軸回りの回転を適用（y, z 座標を変換） ★
            var dy = p.y - centerY;
            var rotatedY = dy * Math.cos(rotationAngle) - p.z * Math.sin(rotationAngle);
            var rotatedZ = dy * Math.sin(rotationAngle) + p.z * Math.cos(rotationAngle);
            // パースペクティブ投影
            var effectiveZ = Math.max(p.z, -this.focalLength);
            var scale = (this.focalLength / (this.focalLength + effectiveZ)) * 0.5;
            // ★次に Z 軸回りの回転を適用（x, (X軸回転後の)y 座標を変換） ★
            var dx = p.x - centerX;
            var finalDx = dx * Math.cos(zRotationAngle) - rotatedY * Math.sin(zRotationAngle);
            var finalDy = dx * Math.sin(zRotationAngle) + rotatedY * Math.cos(zRotationAngle);
            var screenX_1 = centerX + finalDx * scale;
            var screenY_1 = centerY + finalDy * scale;
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
    // 補助関数
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
/**
 * imgAnime 関数
 * 渡された img と canvas を用いて画像アニメーションを実行し、
 * アニメーション完了まで await できるよう Promise を返します。
 * @param img 描画する画像（HTMLImageElement）
 * @param canvas 描画先の canvas 要素
 * @param appearType 出現時のアニメーションタイプ（例: 0）
 * @param disappearType 消滅時のアニメーションタイプ（例: 0 または 1）
 */
export var imgAnime = function (img, canvas, config) {
    if (config === void 0) { config = {
        appearType: 0,
        disappearType: 0,
        particleSize: 2,
        inDuration: 60,
        holdDuration: 60,
        scatterDuration: 20,
        margin: 100,
    }; }
    return new Promise(function (resolve) {
        var _a, _b, _c, _d, _e, _f, _g;
        console.log(config);
        var effect = new ParticleEffectImg(canvas.id, (_a = config.particleSize) !== null && _a !== void 0 ? _a : 2, (_b = config.inDuration) !== null && _b !== void 0 ? _b : 60, (_c = config.holdDuration) !== null && _c !== void 0 ? _c : 60, (_d = config.scatterDuration) !== null && _d !== void 0 ? _d : 20, (_e = config.margin) !== null && _e !== void 0 ? _e : 100, (_f = config.appearType) !== null && _f !== void 0 ? _f : 0, // appearType
        (_g = config.disappearType) !== null && _g !== void 0 ? _g : 0 // disappearType
        );
        effect.image = img;
        effect.createParticlesFromImage(img);
        // アニメーションが完了したら resolve() を呼び出す
        effect.animate(function () { return resolve(); });
    });
};
