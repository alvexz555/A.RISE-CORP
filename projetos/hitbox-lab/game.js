(() => {
    "use strict";

    const canvas = document.getElementById("lab-canvas");
    const ctx = canvas.getContext("2d");
    const shapeASelect = document.getElementById("shape-a");
    const shapeBSelect = document.getElementById("shape-b");
    const resetButton = document.getElementById("reset-button");
    const readout = document.getElementById("collision-readout");
    const collisionTitle = document.getElementById("collision-title");
    const collisionDetail = document.getElementById("collision-detail");

    const WORLD = { width: canvas.width, height: canvas.height };
    const SPEED = 250;
    const COLORS = { a: "#ff3b45", b: "#4aa8ff" };
    const initial = {
        a: { x: 245, y: 250, width: 92, height: 92, radius: 46, shape: "rect" },
        b: { x: 610, y: 250, width: 100, height: 100, radius: 50, shape: "circle" }
    };
    const objects = { a: { ...initial.a }, b: { ...initial.b } };
    const keys = new Set();
    const keyMap = {
        KeyW: ["a", 0, -1], KeyS: ["a", 0, 1],
        KeyA: ["a", -1, 0], KeyD: ["a", 1, 0],
        ArrowUp: ["b", 0, -1], ArrowDown: ["b", 0, 1],
        ArrowLeft: ["b", -1, 0], ArrowRight: ["b", 1, 0]
    };

    function clampObject(object) {
        object.x = Math.max(object.width / 2, Math.min(WORLD.width - object.width / 2, object.x));
        object.y = Math.max(object.height / 2, Math.min(WORLD.height - object.height / 2, object.y));
    }

    function rectRect(a, b) {
        return Math.abs(a.x - b.x) * 2 <= a.width + b.width &&
               Math.abs(a.y - b.y) * 2 <= a.height + b.height;
    }

    function circleCircle(a, b) {
        const dx = a.x - b.x, dy = a.y - b.y, radius = a.radius + b.radius;
        return dx * dx + dy * dy <= radius * radius;
    }

    function circleRect(circle, rect) {
        const nearestX = Math.max(rect.x - rect.width / 2, Math.min(circle.x, rect.x + rect.width / 2));
        const nearestY = Math.max(rect.y - rect.height / 2, Math.min(circle.y, rect.y + rect.height / 2));
        const dx = circle.x - nearestX, dy = circle.y - nearestY;
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

    function drawObject(object, color, label, colliding) {
        ctx.save();
        ctx.translate(object.x, object.y);
        ctx.fillStyle = color + "22";
        ctx.strokeStyle = colliding ? "#ffffff" : color;
        ctx.lineWidth = colliding ? 3 : 2;
        ctx.setLineDash(colliding ? [] : [7, 5]);
        if (object.shape === "circle") {
            ctx.beginPath(); ctx.arc(0, 0, object.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        } else {
            ctx.fillRect(-object.width / 2, -object.height / 2, object.width, object.height);
            ctx.strokeRect(-object.width / 2, -object.height / 2, object.width, object.height);
        }
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.font = "700 12px ui-sans-serif, system-ui";
        ctx.textAlign = "center";
        ctx.fillText(label, 0, -Math.max(object.height, object.radius * 2) / 2 - 13);
        ctx.restore();
    }

    function updateReadout(colliding) {
        readout.dataset.state = colliding ? "hit" : "clear";
        collisionTitle.textContent = colliding ? "COLISÃO DETECTADA" : "SEM COLISÃO";
        collisionDetail.textContent = colliding
            ? "As hitboxes dos objetos A e B estão se sobrepondo."
            : "As hitboxes estão separadas. Continue movimentando os objetos.";
    }

    function render() {
        const colliding = isColliding(objects.a, objects.b);
        drawGrid();
        drawObject(objects.a, COLORS.a, "OBJETO A", colliding);
        drawObject(objects.b, COLORS.b, "OBJETO B", colliding);
        updateReadout(colliding);
    }

    shapeASelect.addEventListener("change", () => { objects.a.shape = shapeASelect.value; render(); });
    shapeBSelect.addEventListener("change", () => { objects.b.shape = shapeBSelect.value; render(); });

    resetButton.addEventListener("click", () => {
        Object.assign(objects.a, initial.a);
        Object.assign(objects.b, initial.b);
        shapeASelect.value = initial.a.shape;
        shapeBSelect.value = initial.b.shape;
        keys.clear();
        document.querySelectorAll("[data-key]").forEach(button => button.classList.remove("is-pressed"));
        render();
    });

    window.addEventListener("keydown", event => {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLButtonElement) return;
        if (keyMap[event.code]) { event.preventDefault(); keys.add(event.code); }
    });
    window.addEventListener("keyup", event => keys.delete(event.code));
    window.addEventListener("blur", () => keys.clear());
    document.addEventListener("visibilitychange", () => { if (document.hidden) keys.clear(); });

    document.querySelectorAll("[data-key]").forEach(button => {
        const code = button.dataset.key;
        const release = event => {
            if (event) event.preventDefault();
            keys.delete(code);
            button.classList.remove("is-pressed");
        };
        button.addEventListener("pointerdown", event => {
            event.preventDefault();
            keys.add(code);
            button.classList.add("is-pressed");
            button.setPointerCapture(event.pointerId);
        });
        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("lostpointercapture", release);
        button.addEventListener("contextmenu", event => event.preventDefault());
    });

    let previousTime = 0;
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

    render();
    requestAnimationFrame(frame);
})();
