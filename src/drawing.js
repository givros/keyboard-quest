(function registerDrawing(CQ) {
  const STAGE_WIDTH = 960;
  const STAGE_HEIGHT = 540;

  function drawRoundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function drawKeycap(context, x, y, width, height, label, fill = "#fff3d4", stroke = "#18212b") {
    context.save();
    drawRoundRect(context, x, y, width, height, 9);
    context.fillStyle = fill;
    context.strokeStyle = stroke;
    context.lineWidth = 3;
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(x + 8, y + height - 7);
    context.lineTo(x + width - 8, y + height - 7);
    context.strokeStyle = "rgba(24,33,43,0.22)";
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = stroke;
    context.font = `900 ${height > 45 ? 28 : 18}px Inter, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, x + width / 2, y + height / 2 - 2);
    context.restore();
  }

  function drawStageBackground(context, mood = "teal") {
    const palettes = {
      teal: ["#152d32", "#1f4d50", "#f0c15c"],
      coral: ["#321b1b", "#69362e", "#e69e5a"],
      plum: ["#221f35", "#493862", "#94c8b5"],
      green: ["#17281f", "#355b42", "#e2b75f"],
    };
    const colors = palettes[mood] || palettes.teal;
    const gradient = context.createLinearGradient(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.68, colors[1]);
    gradient.addColorStop(1, "#111820");
    context.fillStyle = gradient;
    context.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);

    context.save();
    context.globalAlpha = 0.1;
    context.strokeStyle = "#fffdf8";
    context.lineWidth = 1;
    for (let x = -40; x < STAGE_WIDTH + 40; x += 48) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x + 130, STAGE_HEIGHT);
      context.stroke();
    }
    for (let y = 36; y < STAGE_HEIGHT; y += 60) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(STAGE_WIDTH, y);
      context.stroke();
    }
    context.globalAlpha = 0.18;
    context.fillStyle = colors[2];
    for (let i = 0; i < 36; i += 1) {
      const x = (i * 97) % STAGE_WIDTH;
      const y = (i * 53) % STAGE_HEIGHT;
      context.fillRect(x, y, 3, 3);
    }
    context.restore();
  }

  function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let yy = y;
    for (let i = 0; i < words.length; i += 1) {
      const testLine = line ? `${line} ${words[i]}` : words[i];
      const width = context.measureText(testLine).width;
      if (width > maxWidth && line) {
        context.fillText(line, x, yy);
        line = words[i];
        yy += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, x, yy);
  }

  CQ.stage = {
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
  };
  CQ.drawing = {
    drawRoundRect,
    drawKeycap,
    drawStageBackground,
    wrapText,
  };
})(window.CQ = window.CQ || {});
