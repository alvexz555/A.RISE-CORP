(() => {
  "use strict";

  const canvas = document.getElementById("lab-canvas");
  const ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const shapeASelect = $("shape-a");
  const shapeBSelect = $("shape-b");
  const sizeA = $("size-a");
  const sizeB = $("size-b");
  const resetButton = $("reset-button");
  const readout = $("collision-readout");
  const collisionTitle = $("collision-title");
  const collisionDetail = $("collision-detail");
  const codeDisplay = $("code-display");
  const codeFileLabel = $("code-file-label");
  const explanationTitle = $("explanation-title");
  const explanationText = $("explanation-text");
  const explanationNote = $("explanation-note");
  const challengeFeedback = $("challenge-feedback");

  const WORLD = { width: canvas.width, height: canvas.height };
  const SPEED = 250;
  const COLORS = { a: "#ff3b45", b: "#4aa8ff" };
  const initial = {
    a: { x: 245, y: 250, width: 92, height: 92, radius: 46, shape: "rect" },
    b: { x: 610, y: 250, width: 100, height: 100, radius: 50, shape: "circle" }
  };
  const objects = { a: { ...initial.a }, b: { ...initial.b } };
  const keys = new Set();
  let selectedObject = "a";
  let activePointer = null;
  let dragging = false;
  let dragOffset = { x: 0, y: 0 };
  let previousTime = 0;
  let challengeActive = false;

  const keyMap = {
    KeyW: ["a", 0, -1], KeyS: ["a", 0, 1],
    KeyA: ["a", -1, 0], KeyD: ["a", 1, 0],
    ArrowUp: ["b", 0, -1], ArrowDown: ["b", 0, 1],
    ArrowLeft: ["b", -1, 0], ArrowRight: ["b", 1, 0]
  };

  const algorithms = {
    rectRect: {
      file: "rect-rect.js",
      title: "Retângulo × Retângulo",
      description: "Comparamos a distância entre os centros dos objetos com a soma de suas metades. Se houver sobreposição nos dois eixos, existe colisão.",
      note: "Os centros são definidos por x e y. width e height determinam os limites da hitbox.",
      code: `function rectRect(a, b) {
  return (
    Math.abs(a.x - b.x) * 2 <= a.width + b.width &&
    Math.abs(a.y - b.y) * 2 <= a.height + b.height
  );
}`
    },
    circleCircle: {
      file: "circle-circle.js",
      title: "Círculo × Círculo",
      description: "Calculamos a distância entre os centros usando os eixos X e Y. Em seguida, comparamos essa distância ao raio combinado dos dois círculos.",
      note: "Usamos a distância ao quadrado para evitar calcular uma raiz quadrada a cada verificação.",
      code: `function circleCircle(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const radius = a.radius + b.radius;

  return dx * dx + dy * dy <= radius * radius;
}`
    },
    circleRect: {
      file: "circle-rect.js",
      title: "Círculo × Retângulo",
      description: "Encontramos o ponto do retângulo mais próximo do centro do círculo. Se a distância desse ponto ao centro for menor ou igual ao raio, as formas se tocam.",
      note: "Math.max e Math.min limitam o ponto mais próximo às bordas do retângulo.",
      code: `function circleRect(circle, rect) {
  const nearestX = Math.max(
    rect.x - rect.width / 2,
    Math.min(circle.x, rect.x + rect.width / 2)
  );
  const nearestY = Math.max(
    rect.y - rect.height / 2,
    Math.min(circle.y, rect.y + rect.height / 2)
  );

  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;

  return dx * dx + dy * dy <= circle.radius * circle.radius;
}`
    }
  };

  function clampObject(object) {
    const halfW = object.shape === "circle" ? object.radius : object.width / 2;
    const halfH = object.shape === "circle" ? object.radius : object.height / 2;
    object.x = Math.max(halfW, Math.min(WORLD.width - halfW, object.x));
    object.y = Math.max(halfH, Math.min(WORLD.height - halfH, object.y));
  }

  // These three functions are the collision algorithms shown in the lesson panel.
  function rectRect(a, b) {
    return Math.abs(a.x - b.x) * 2 <= a.width + b.width &&
      Math.abs(a.y - b.y) * 2 <= a.height + b.height;
  }

  function circleCircle(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const radius = a.radius + b.radius;
    return dx * dx + dy * dy <= radius * radius;
  }

  function circleRect(circle, rect) {
    const nearestX = Math.max(rect.x - rect.width / 2, Math.min(circle.x, rect.x + rect.width / 2));
    const nearestY = Math.max(rect.y - rect.height / 2, Math.min(circle.y, rect.y + rect.height / 2));
    const dx = circle.x - nearestX;
    const dy = circle.y - nearestY;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
  }

  function isColliding(a, b) {
    if (a.shape === "rect" && b.shape === "rect") return rectRect(a, b);
    if (a.shape === "circle" && b.shape === "circle") return circleCircle(a, b);
    return a.shape === "circle" ? circleRect(a, b) : circleRect(b, a);
  }

  function drawGrid() {
    ctx.fillStyle = "#0c0c10";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.strokeStyle = "rgba(255,255,255,0.055)";
    ctx.lineWidth = 1;
    for (let x = 20; x < WORLD.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD.height); ctx.stroke();
    }
    for (let y = 20; y < WORLD.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD.width, y); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.13)";
    ctx.strokeRect(.5, .5, WORLD.width - 1, WORLD.height - 1);
  }

  function drawObject(object, color, label, colliding, selected) {
    ctx.save();
    ctx.translate(object.x, object.y);
    ctx.fillStyle = color + "22";
    ctx.strokeStyle = colliding ? "#ffffff" : color;
    ctx.lineWidth = selected ? 4 : (colliding ? 3 : 2);
    ctx.setLineDash(selected || colliding ? [] : [7, 5]);
    if (object.shape === "circle") {
      ctx.beginPath(); ctx.arc(0, 0, object.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillRect(-object.width / 2, -object.height / 2, object.width, object.height);
      ctx.strokeRect(-object.width / 2, -object.height / 2, object.width, object.height);
    }
    ctx.setLineDash([]);
    if (selected) {
      ctx.strokeStyle = "rgba(255,255,255,.55)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, Math.max(object.width, object.height, object.radius * 2) / 2 + 12, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.font = "700 12px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    const extent = object.shape === "circle" ? object.radius : Math.max(object.width, object.height) / 2;
    ctx.fillText(label, 0, -extent - 13);
    ctx.restore();
  }

  function activeAlgorithm() {
    if (objects.a.shape === "rect" && objects.b.shape === "rect") return "rectRect";
    if (objects.a.shape === "circle" && objects.b.shape === "circle") return "circleCircle";
    return "circleRect";
  }

  function updateReadout(colliding) {
    readout.dataset.state = colliding ? "hit" : "clear";
    collisionTitle.textContent = colliding ? "COLISÃO DETECTADA" : "SEM COLISÃO";
    collisionDetail.textContent = colliding
      ? "As hitboxes dos objetos A e B estão se sobrepondo."
      : `Objeto ${selectedObject.toUpperCase()} selecionado. Mova-o para testar a colisão.`;
  }

  function render() {
    const colliding = isColliding(objects.a, objects.b);
    drawGrid();
    drawObject(objects.a, COLORS.a, "OBJETO A", colliding, selectedObject === "a");
    drawObject(objects.b, COLORS.b, "OBJETO B", colliding, selectedObject === "b");
    updateReadout(colliding);
    updateLiveCode();
    if (challengeActive && colliding) {
      challengeFeedback.textContent = "Desafio concluído! Você criou uma sobreposição entre as duas hitboxes.";
      challengeFeedback.classList.add("success");
    }
  }

  let currentAlgorithmKey = "rectRect";
  let lastCodeSnapshot = "";

  function objectConfigCode(object, variableName) {
    if (object.shape === "circle") {
      return `const ${variableName} = {
  x: ${Math.round(object.x)},
  y: ${Math.round(object.y)},
  radius: ${Number(object.radius.toFixed(1))}
};`;
    }
    return `const ${variableName} = {
  x: ${Math.round(object.x)},
  y: ${Math.round(object.y)},
  width: ${Number(object.width.toFixed(1))},
  height: ${Number(object.height.toFixed(1))}
};`;
  }

  function updateLiveCode() {
    const item = algorithms[currentAlgorithmKey];
    const snapshot = JSON.stringify({
      key: currentAlgorithmKey,
      a: objects.a,
      b: objects.b,
      colliding: isColliding(objects.a, objects.b)
    });
    if (snapshot === lastCodeSnapshot) return;
    lastCodeSnapshot = snapshot;

    const call = currentAlgorithmKey === "circleRect"
      ? (objects.a.shape === "circle" ? "circleRect(objectA, objectB)" : "circleRect(objectB, objectA)")
      : `${currentAlgorithmKey}(objectA, objectB)`;
    const liveScript = [
      "// CONFIGURAÇÃO ATUAL DAS HITBOXES",
      objectConfigCode(objects.a, "objectA"),
      "",
      objectConfigCode(objects.b, "objectB"),
      "",
      "// ALGORITMO DE DETECÇÃO",
      item.code,
      "",
      `const collisionDetected = ${call};`
    ].join("\\n");

    codeDisplay.textContent = liveScript;
    codeFileLabel.textContent = item.file + " · AO VIVO";
    explanationTitle.textContent = item.title;
    explanationText.textContent = item.description;
    explanationNote.textContent = item.note;
  }

  function setAlgorithm(key) {
    currentAlgorithmKey = key;
    document.querySelectorAll(".code-tab").forEach(button => {
      const active = button.dataset.code === key;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    lastCodeSnapshot = "";
    updateLiveCode();
  }

  function syncSizeControls() {
    sizeA.value = String(objects.a.shape === "circle" ? objects.a.radius * 2 : objects.a.width);
    sizeB.value = String(objects.b.shape === "circle" ? objects.b.radius * 2 : objects.b.width);
    $("size-a-value").textContent = sizeA.value + " px";
    $("size-b-value").textContent = sizeB.value + " px";
  }

  function setSize(object, value) {
    const size = Number(value);
    if (object.shape === "circle") object.radius = size / 2;
    else { object.width = size; object.height = size; }
    clampObject(object);
    render();
  }

  shapeASelect.addEventListener("change", () => {
    objects.a.shape = shapeASelect.value;
    clampObject(objects.a);
    syncSizeControls();
    setAlgorithm(activeAlgorithm());
    render();
  });
  shapeBSelect.addEventListener("change", () => {
    objects.b.shape = shapeBSelect.value;
    clampObject(objects.b);
    syncSizeControls();
    setAlgorithm(activeAlgorithm());
    render();
  });
  sizeA.addEventListener("input", () => {
    setSize(objects.a, sizeA.value);
    $("size-a-value").textContent = sizeA.value + " px";
  });
  sizeB.addEventListener("input", () => {
    setSize(objects.b, sizeB.value);
    $("size-b-value").textContent = sizeB.value + " px";
  });

  function resetPositions() {
    Object.assign(objects.a, initial.a);
    Object.assign(objects.b, initial.b);
    shapeASelect.value = initial.a.shape;
    shapeBSelect.value = initial.b.shape;
    keys.clear();
    selectedObject = "a";
    dragging = false;
    activePointer = null;
    canvas.classList.remove("is-dragging");
    syncSizeControls();
    setAlgorithm(activeAlgorithm());
    render();
  }
  resetButton.addEventListener("click", resetPositions);

  window.addEventListener("keydown", event => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLButtonElement) return;
    if (keyMap[event.code]) { event.preventDefault(); keys.add(event.code); }
  });
  window.addEventListener("keyup", event => keys.delete(event.code));
  window.addEventListener("blur", () => keys.clear());
  document.addEventListener("visibilitychange", () => { if (document.hidden) keys.clear(); });

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * WORLD.width / rect.width,
      y: (event.clientY - rect.top) * WORLD.height / rect.height
    };
  }

  function containsPoint(object, point) {
    if (object.shape === "circle") return Math.hypot(point.x - object.x, point.y - object.y) <= object.radius + 10;
    return Math.abs(point.x - object.x) <= object.width / 2 + 10 &&
      Math.abs(point.y - object.y) <= object.height / 2 + 10;
  }

  canvas.addEventListener("pointerdown", event => {
    if (activePointer !== null) return;
    event.preventDefault();
    const point = canvasPoint(event);
    const hitA = containsPoint(objects.a, point);
    const hitB = containsPoint(objects.b, point);
    if (hitA || hitB) selectedObject = hitB && (!hitA || selectedObject === "a") ? "b" : "a";
    const object = objects[selectedObject];
    dragOffset.x = object.x - point.x;
    dragOffset.y = object.y - point.y;
    activePointer = event.pointerId;
    dragging = true;
    canvas.classList.add("is-dragging");
    canvas.setPointerCapture(event.pointerId);
    render();
  });

  canvas.addEventListener("pointermove", event => {
    if (!dragging || event.pointerId !== activePointer) return;
    event.preventDefault();
    const point = canvasPoint(event);
    const object = objects[selectedObject];
    object.x = point.x + dragOffset.x;
    object.y = point.y + dragOffset.y;
    clampObject(object);
    render();
  });

  function stopDragging(event) {
    if (activePointer === null || (event && event.pointerId !== activePointer)) return;
    dragging = false;
    activePointer = null;
    canvas.classList.remove("is-dragging");
  }
  canvas.addEventListener("pointerup", stopDragging);
  canvas.addEventListener("pointercancel", stopDragging);
  canvas.addEventListener("lostpointercapture", stopDragging);

  document.querySelectorAll(".code-tab").forEach(button => {
    button.addEventListener("click", () => setAlgorithm(button.dataset.code));
  });
  $("copy-code").addEventListener("click", async event => {
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText(codeDisplay.textContent);
      button.textContent = "Código copiado";
    } catch {
      button.textContent = "Não foi possível copiar";
    }
    window.setTimeout(() => { button.textContent = "Copiar código"; }, 1800);
  });

  $("challenge-check").addEventListener("click", () => {
    challengeActive = true;
    if (isColliding(objects.a, objects.b)) {
      challengeFeedback.textContent = "Desafio concluído! As duas hitboxes estão se sobrepondo.";
      challengeFeedback.classList.add("success");
    } else {
      challengeFeedback.textContent = "Ainda não houve colisão. Volte ao laboratório e aproxime os objetos até as áreas se tocarem.";
      challengeFeedback.classList.remove("success");
    }
  });
  $("challenge-reset").addEventListener("click", () => {
    challengeActive = false;
    objects.a.x = 245; objects.a.y = 250;
    objects.b.x = 610; objects.b.y = 250;
    challengeFeedback.textContent = "Desafio reiniciado. Encontre uma forma de fazer as hitboxes se sobreporem.";
    challengeFeedback.classList.remove("success");
    render();
  });

  function frame(timestamp) {
    const delta = previousTime ? Math.min((timestamp - previousTime) / 1000, .05) : 0;
    previousTime = timestamp;
    const movement = { a: [0, 0], b: [0, 0] };
    for (const code of keys) {
      const control = keyMap[code];
      if (control) {
        movement[control[0]][0] += control[1];
        movement[control[0]][1] += control[2];
      }
    }
    for (const id of ["a", "b"]) {
      const [dx, dy] = movement[id];
      if (dx || dy) {
        const length = Math.hypot(dx, dy);
        objects[id].x += dx / length * SPEED * delta;
        objects[id].y += dy / length * SPEED * delta;
        clampObject(objects[id]);
      }
    }
    render();
    requestAnimationFrame(frame);
  }

  syncSizeControls();
  setAlgorithm(activeAlgorithm());
  render();
  requestAnimationFrame(frame);
})();