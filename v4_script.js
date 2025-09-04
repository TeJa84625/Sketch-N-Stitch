const viewer = document.getElementById("viewer");
const canvas = document.getElementById("textureCanvas");
const ctx = canvas.getContext("2d");
const imageInput = document.getElementById("imageInput");
const textInput = document.getElementById("textInput");
const modal = document.getElementById("textureModal");
const colorPicker = document.getElementById("colorPicker");
const textColorPicker = document.getElementById("textColorPicker");
const fontSelect = document.getElementById("fontSelect");
const fontSizeInput = document.getElementById("fontSizeInput");
const modelSelect = document.getElementById("modelSelect");
const drawModeToggle = document.getElementById("drawModeToggle");
const penColorPicker = document.getElementById("penColorPicker");
const penSizeSlider = document.getElementById("penSizeSlider");

const images = [], textItems = [], drawingPaths = [];
let baseImage = new Image();
let selectedImageIndex = null;
let selectedTextIndex = null;
let draggingItem = false, draggingText = false, resizingCorner = null;
let offsetX = 0, offsetY = 0;
let isDrawing = false, lastX = 0, lastY = 0;
let penSize = parseInt(penSizeSlider.value);
let selectedColorFactor = null;

const cornerSize = 10;

document.getElementById("resetButton").addEventListener("click", resetToBaseTexture);

function clearDrawing() {
    drawingPaths.length = 0;

    renderCanvas();
}

function resetToBaseTexture() {
    images.length = 0;
    textItems.length = 0;
    drawingPaths.length = 0;
    isDrawing = false;

    const opt = modelSelect.selectedOptions[0];
    baseImage.src = opt.getAttribute("data-texture");

    renderCanvas();
}

penSizeSlider.addEventListener("input", () => {
    penSize = parseInt(penSizeSlider.value);
});

modelSelect.addEventListener("change", () => {
    isDrawing = false;
    const opt = modelSelect.selectedOptions[0];
    viewer.src = opt.value;
    baseImage.src = opt.getAttribute("data-texture");
});

function openEditor() {
    const opt = modelSelect.selectedOptions[0];
    imageInput.value = "";
    isDrawing = false; 
    baseImage.onload = () => {
        modal.classList.add("active");
        renderCanvas();
    };
    baseImage.src = opt.getAttribute("data-texture");
}

function closeEditor() {
    isDrawing = false;
    modal.classList.remove("active");
    selectedImageIndex = null;
    selectedTextIndex = null;
}

imageInput.addEventListener("change", () => {
    isDrawing = false;
    for (const file of imageInput.files) {
        const img = new Image();
        img.onload = () => {
            images.push({
                img,
                x: 50, y: 50,
                width: img.width, height: img.height
            });
            renderCanvas();
        };
        img.src = URL.createObjectURL(file);
    }
});

function addText() {
    isDrawing = false;
    const txt = textInput.value.trim();
    if (!txt) return;
    const fz = parseInt(fontSizeInput.value) || 24;
    textItems.push({
        text: txt, x: 50, y: 50,
        font: `${fz}px ${fontSelect.value}`,
        color: textColorPicker.value
    });
    textInput.value = "";
    renderCanvas();
}

function renderCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (baseImage.complete) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = baseImage.width;
        tempCanvas.height = baseImage.height;
        const tempCtx = tempCanvas.getContext("2d");

        tempCtx.drawImage(baseImage, 0, 0);

        const colorFactor = viewer.model.materials?.[0]?.pbrMetallicRoughness.baseColorFactor;
        if (colorFactor) {
            tempCtx.fillStyle = `rgba(${colorFactor[0] * 255}, ${colorFactor[1] * 255}, ${colorFactor[2] * 255}, ${colorFactor[3]})`;
            tempCtx.globalCompositeOperation = 'multiply';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.globalCompositeOperation = 'source-over'; // Reset to default
        }

        ctx.save();
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);
        ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    images.forEach((it, idx) => {
        ctx.drawImage(it.img, it.x, it.y, it.width, it.height);
        if (idx === selectedImageIndex) {
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 2;
            ctx.strokeRect(it.x, it.y, it.width, it.height);
            drawHandles(it);
        }
    });

    textItems.forEach((txt, idx) => {
        ctx.font = txt.font; ctx.fillStyle = txt.color;
        ctx.fillText(txt.text, txt.x, txt.y);
        if (idx === selectedTextIndex) {
            const width = ctx.measureText(txt.text).width;
            const height = parseInt(txt.font);
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 1;
            ctx.strokeRect(txt.x, txt.y - height, width, height);
        }
    });

    drawingPaths.forEach(path => {
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.size;
        ctx.lineCap = "round";
        ctx.beginPath();
        path.points.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
    });
}

function drawHandles(it) {
    const x = it.x, y = it.y, w = it.width, h = it.height;
    ctx.fillStyle = 'white'; ctx.strokeStyle = 'blue'; ctx.lineWidth = 1;
    [
        [x, y], [x + w, y],
        [x + w, y + h], [x, y + h]
    ].forEach(([hx, hy]) => {
        ctx.beginPath();
        ctx.rect(hx - cornerSize / 2, hy - cornerSize / 2, cornerSize, cornerSize);
        ctx.fill();
        ctx.stroke();
    });
}

function updateSelectedText() {
    if (selectedTextIndex === null) return;

    const txt = textItems[selectedTextIndex];
    txt.text = textInput.value;
    txt.color = textColorPicker.value;
    txt.font = `${parseInt(fontSizeInput.value) || 24}px ${fontSelect.value}`;

    renderCanvas();
}

textInput.addEventListener("input", updateSelectedText);
textColorPicker.addEventListener("input", updateSelectedText);
fontSelect.addEventListener("change", updateSelectedText);
fontSizeInput.addEventListener("input", updateSelectedText);

function getMousePos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener("mousedown", e => {
    const pos = getMousePos(e);
    isDrawing = drawModeToggle.checked;
    if (isDrawing) {
        lastX = pos.x; lastY = pos.y;
        drawingPaths.push({ color: penColorPicker.value, size: penSize, points: [{ x: lastX, y: lastY }] });
        return;
    }
    if (selectedTextIndex !== null) {
        const txt = textItems[selectedTextIndex];
        textInput.value = txt.text;

        const fontParts = txt.font.match(/^(\d+)px\s(.+)$/);
        if (fontParts) {
            fontSizeInput.value = fontParts[1];
            fontSelect.value = fontParts[2];
        } else {
            fontSizeInput.value = 24;
            fontSelect.value = "Arial";
        }

        textColorPicker.value = txt.color;
    } else {
        textInput.value = "";
    }


    selectedImageIndex = null;
    selectedTextIndex = null;
    resizingCorner = null;
    draggingItem = false;
    draggingText = false;
    offsetX = 0;
    offsetY = 0;

    for (let i = images.length - 1; i >= 0; i--) {
        const it = images[i];
        const corners = [
            { name: 'tl', x: it.x, y: it.y },
            { name: 'tr', x: it.x + it.width, y: it.y },
            { name: 'br', x: it.x + it.width, y: it.y + it.height },
            { name: 'bl', x: it.x, y: it.y + it.height }
        ];
        for (const c of corners) {
            if (pos.x >= c.x - cornerSize && pos.x <= c.x + cornerSize &&
                pos.y >= c.y - cornerSize && pos.y <= c.y + cornerSize) {
                selectedImageIndex = i;
                resizingCorner = c.name;
                renderCanvas();
                return;
            }
        }
        if (pos.x >= it.x && pos.x <= it.x + it.width &&
            pos.y >= it.y && pos.y <= it.y + it.height) {
            selectedImageIndex = i;
            draggingItem = true;
            offsetX = pos.x - it.x;
            offsetY = pos.y - it.y;
            renderCanvas();
            return;
        }
    }

    for (let i = textItems.length - 1; i >= 0; i--) {
        const txt = textItems[i];
        ctx.font = txt.font;
        const width = ctx.measureText(txt.text).width;
        const height = parseInt(txt.font);
        if (pos.x >= txt.x && pos.x <= txt.x + width &&
            pos.y >= txt.y - height && pos.y <= txt.y) {
            selectedTextIndex = i;
            draggingText = true;
            offsetX = pos.x - txt.x;
            offsetY = pos.y - txt.y;
            renderCanvas();
            return;
        }
    }

    renderCanvas();
});

canvas.addEventListener("mousemove", e => {
    const pos = getMousePos(e);

    if (isDrawing) {
        const path = drawingPaths[drawingPaths.length - 1];
        path.points.push({ x: pos.x, y: pos.y });
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.size;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastX = pos.x; lastY = pos.y;
        return;
    }

    if (resizingCorner !== null && selectedImageIndex !== null) {
        const it = images[selectedImageIndex];
        const prev = { x: it.x, y: it.y, w: it.width, h: it.height };

        switch (resizingCorner) {
            case 'tl':
                it.width += it.x - pos.x;
                it.height += it.y - pos.y;
                it.x = pos.x;
                it.y = pos.y;
                break;
            case 'tr':
                it.width = pos.x - it.x;
                it.height += it.y - pos.y;
                it.y = pos.y;
                break;
            case 'br':
                it.width = pos.x - it.x;
                it.height = pos.y - it.y;
                break;
            case 'bl':
                it.width += it.x - pos.x;
                it.height = pos.y - it.y;
                it.x = pos.x;
                break;
        }
        if (it.width < 20) { it.width = prev.w; it.x = prev.x; }
        if (it.height < 20) { it.height = prev.h; it.y = prev.y; }

        renderCanvas();
    } else if (draggingItem && selectedImageIndex !== null) {
        const it = images[selectedImageIndex];
        it.x = pos.x - offsetX;
        it.y = pos.y - offsetY;
        renderCanvas();
    } else if (draggingText && selectedTextIndex !== null) {
        const txt = textItems[selectedTextIndex];
        txt.x = pos.x - offsetX;
        txt.y = pos.y - offsetY;
        renderCanvas();
    }
});

canvas.addEventListener("mouseup", () => {
    isDrawing = false;
    resizingCorner = null;
    draggingItem = false;
    draggingText = false;
});

function deleteSelected() {
    if (selectedImageIndex !== null) {
        images.splice(selectedImageIndex, 1);
        selectedImageIndex = null;
        renderCanvas();
    } else if (selectedTextIndex !== null) {
        textItems.splice(selectedTextIndex, 1);
        selectedTextIndex = null;
        renderCanvas();
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
    }
});

async function applyTexture() {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext("2d");

    if (baseImage.complete) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = baseImage.width;
        tempCanvas.height = baseImage.height;
        const tempCtx = tempCanvas.getContext("2d");

        tempCtx.drawImage(baseImage, 0, 0);

        const colorFactor = selectedColorFactor;
        if (colorFactor) {
            tempCtx.fillStyle = `rgba(${colorFactor[0] * 255}, ${colorFactor[1] * 255}, ${colorFactor[2] * 255}, ${colorFactor[3]})`;
            tempCtx.globalCompositeOperation = 'multiply';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.globalCompositeOperation = 'source-over'; 
        }
        exportCtx.drawImage(tempCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
    }

    exportCtx.save();
    exportCtx.translate(0, exportCanvas.height);
    exportCtx.scale(1, -1);

    for (const item of images) {
        exportCtx.drawImage(item.img, item.x, item.y, item.width, item.height);
    }

    for (const txt of textItems) {
        exportCtx.font = txt.font;
        exportCtx.fillStyle = txt.color;
        exportCtx.fillText(txt.text, txt.x, txt.y);
    }

    for (const path of drawingPaths) {
        exportCtx.strokeStyle = path.color;
        exportCtx.lineWidth = path.size || 2;
        exportCtx.lineCap = "round";
        exportCtx.beginPath();
        for (let i = 1; i < path.points.length; i++) {
            exportCtx.moveTo(path.points[i - 1].x, path.points[i - 1].y);
            exportCtx.lineTo(path.points[i].x, path.points[i].y);
        }
        exportCtx.stroke();
    }

    exportCtx.restore();

    const dataURL = exportCanvas.toDataURL("image/png");
    const material = viewer.model.materials?.[0];
    if (!material) {
        alert("Model not loaded or doesn't support texture editing.");
        return;
    }

    const newTexture = await viewer.createTexture(dataURL);
    const baseColor = material.pbrMetallicRoughness.baseColorTexture;
    if (baseColor) {
        baseColor.setTexture(newTexture);
    } else {
        material.pbrMetallicRoughness.setBaseColorTexture(newTexture);
    }

    closeEditor();
}

document.querySelectorAll('input[name="color"]').forEach((input) => {
            input.addEventListener("change", (event) => {
                const hex = event.target.value;
                changeModelColor(hex);
            });
});

function changeModelColor(hex) {
    const [r, g, b] = hex.match(/[A-Fa-f0-9]{2}/g).map(h => parseInt(h, 16) / 255);
    selectedColorFactor = [r, g, b, 1];
    applyTexture()
}
