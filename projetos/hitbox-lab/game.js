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
    let selectedObject = "a";
    let activePointer = null;
    let dragging = false;
    let dragOffset = { x: 0, y: 0 };
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
            ctx.setLineDash([3, 4]);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(0, 0, Math.max(object.width, object.radius * 2) / 2 + 10, 0, Math.PI * 2); ctx.stroke();
        }
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
            : `Objeto ${selectedObject.toUpperCase()} selecionado. Toque no outro objeto para selecioná-lo.`;
    }

    function render() {
        const colliding = isColliding(objects.a, objects.b);
        drawGrid();
        drawObject(objects.a, COLORS.a, "OBJETO A", colliding, selectedObject === "a");
        drawObject(objects.b, COLORS.b, "OBJETO B", colliding, selectedObject === "b");
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
        selectedObject = "a";
        dragging = false;
        canvas.classList.remove("is-dragging");
        render();
    });

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
        if (object.shape === "circle") {
            return Math.hypot(point.x - object.x, point.y - object.y) <= object.radius + 10;
        }
        return Math.abs(point.x - object.x) <= object.width / 2 + 10 &&
               Math.abs(point.y - object.y) <= object.height / 2 + 10;
    }

    canvas.addEventListener("pointerdown", event => {
        if (activePointer !== null) return;
        event.preventDefault();
        const point = canvasPoint(event);
        const hitA = containsPoint(objects.a, point);
        const hitB = containsPoint(objects.b, point);
        if (hitA || hitB) {
            selectedObject = hitB && (!hitA || selectedObject === "a") ? "b" : "a";
        }
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
