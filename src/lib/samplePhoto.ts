/**
 * Draws a stand-in "photo" so the verification flow can be demonstrated on a
 * laptop with no camera and no plant to hand. Purely cosmetic, the verifier
 * treats it exactly like a real capture.
 */
export function makeSamplePhoto(seed = Date.now()): string {
  const W = 480;
  const H = 640;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  let s = seed >>> 0 || 1;
  const rand = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };

  // Warm wall / sky behind the plant
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#e9e2d2");
  bg.addColorStop(0.55, "#ded4c0");
  bg.addColorStop(1, "#c9bda4");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Sun wash from one corner
  const glow = ctx.createRadialGradient(W * 0.8, H * 0.1, 20, W * 0.8, H * 0.1, W);
  glow.addColorStop(0, "rgba(255,236,190,0.55)");
  glow.addColorStop(1, "rgba(255,236,190,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Soil
  ctx.fillStyle = "#6b543c";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.72);
  ctx.quadraticCurveTo(W * 0.5, H * 0.66, W, H * 0.74);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 900; i++) {
    const x = rand() * W;
    const y = H * 0.72 + rand() * H * 0.28;
    ctx.fillStyle = `rgba(${40 + rand() * 60},${28 + rand() * 40},${18 + rand() * 30},0.5)`;
    ctx.fillRect(x, y, 2, 2);
  }

  const baseX = W * 0.5;
  const baseY = H * 0.76;

  // Stem
  ctx.strokeStyle = "#3f7a45";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX - 14, H * 0.55, baseX + 6, H * 0.3);
  ctx.stroke();

  // Leaves along the stem
  const leafCount = 7 + Math.floor(rand() * 4);
  for (let i = 0; i < leafCount; i++) {
    const t = 0.12 + (i / leafCount) * 0.78;
    const y = baseY - t * (baseY - H * 0.3);
    const dir = i % 2 === 0 ? 1 : -1;
    const len = 60 + rand() * 70;
    const lift = 26 + rand() * 26;
    const green = 88 + Math.floor(rand() * 60);

    ctx.fillStyle = `rgb(${34 + Math.floor(rand() * 24)},${green},${52 + Math.floor(rand() * 24)})`;
    ctx.beginPath();
    ctx.moveTo(baseX, y);
    ctx.quadraticCurveTo(baseX + dir * len * 0.55, y - lift, baseX + dir * len, y - lift * 0.35);
    ctx.quadraticCurveTo(baseX + dir * len * 0.5, y + lift * 0.5, baseX, y);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(baseX, y);
    ctx.quadraticCurveTo(baseX + dir * len * 0.5, y - lift * 0.3, baseX + dir * len * 0.92, y - lift * 0.3);
    ctx.stroke();
  }

  // A few fruit so "harvest" logs look plausible
  const fruit = Math.floor(rand() * 5);
  for (let i = 0; i < fruit; i++) {
    const fx = baseX + (rand() - 0.5) * 150;
    const fy = H * 0.4 + rand() * H * 0.28;
    const r = 9 + rand() * 6;
    const grd = ctx.createRadialGradient(fx - r * 0.3, fy - r * 0.3, 1, fx, fy, r);
    grd.addColorStop(0, "#ff8f6b");
    grd.addColorStop(1, "#c9341f");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sensor grain so it does not read as flat vector art
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rand() * 0.05})`;
    ctx.fillRect(rand() * W, rand() * H, 1, 1);
  }

  return canvas.toDataURL("image/jpeg", 0.68);
}
