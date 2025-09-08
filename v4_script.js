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
const rotationInput = document.getElementById("rotationInput");

const images = [],
    textItems = [],
    drawingPaths = [];
let baseImage = new Image();
let selectedImageIndex = null;
let selectedTextIndex = null;
let draggingItem = false,
    draggingText = false,
    resizingCorner = null;
let offsetX = 0,
    offsetY = 0;
let isDrawing = false,
    lastX = 0,
    lastY = 0;
let penSize = parseInt(penSizeSlider.value);
let selectedColorFactor = null;

const cornerSize = 10;

function deselectAll() {
    selectedImageIndex = null;
    selectedTextIndex = null;
    isDrawing = false;
    drawModeToggle.checked = false;
    if (rotationInput) {
        rotationInput.style.display = 'none';
    }
}

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
    deselectAll();
    const opt = modelSelect.selectedOptions[0];
    viewer.src = opt.value;
    baseImage.src = opt.getAttribute("data-texture");
});

function openEditor() {
    deselectAll();
    const opt = modelSelect.selectedOptions[0];
    imageInput.value = "";
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
    if (rotationInput) {
        rotationInput.style.display = 'none';
    }
}

imageInput.addEventListener("change", () => {
    deselectAll();
    for (const file of imageInput.files) {
        const img = new Image();
        img.onload = () => {
            images.push({
                img,
                x: 50,
                y: 50,
                width: img.width,
                height: img.height,
                rotation: 0
            });
            renderCanvas();
        };
        img.src = URL.createObjectURL(file);
    }
});

function addText() {
    deselectAll();
    const txt = textInput.value.trim();
    if (!txt) return;
    const fz = parseInt(fontSizeInput.value) || 24;
    textItems.push({
        text: txt,
        x: 250,
        y: 250,
        font: `${fz}px ${fontSelect.value}`,
        color: textColorPicker.value,
        rotation: 0
    });
    textInput.value = "";
    renderCanvas();
}

function renderCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (baseImage.complete && baseImage.width > 0 && baseImage.height > 0) {
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
            tempCtx.globalCompositeOperation = 'source-over';
        }

        ctx.save();
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);
        ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    images.forEach((it, idx) => {
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.rotate(it.rotation);
        ctx.drawImage(it.img, -it.width / 2, -it.height / 2, it.width, it.height);

        if (idx === selectedImageIndex) {
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 2;
            ctx.strokeRect(-it.width / 2, -it.height / 2, it.width, it.height);
            drawHandles({
                x: -it.width / 2,
                y: -it.height / 2,
                width: it.width,
                height: it.height
            });
        }
        ctx.restore();
    });

    textItems.forEach((txt, idx) => {
        ctx.save();
        ctx.font = txt.font;
        const width = ctx.measureText(txt.text).width;
        const height = parseInt(txt.font);
        ctx.translate(txt.x, txt.y);
        ctx.rotate(txt.rotation);
        ctx.fillStyle = txt.color;
        ctx.fillText(txt.text, -width / 2, height / 2);

        if (idx === selectedTextIndex) {
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 1;
            ctx.strokeRect(-width / 2, -height / 2, width, height);
        }
        ctx.restore();
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
    const x = it.x,
        y = it.y,
        w = it.width,
        h = it.height;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 1;
    [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h]
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
drawModeToggle.addEventListener("change", () => {
    isDrawing = drawModeToggle.checked;
    selectedImageIndex = null;
    selectedTextIndex = null;
    renderCanvas();
});

if (rotationInput) {
    rotationInput.addEventListener("input", () => {
        const degrees = parseFloat(rotationInput.value) || 0;
        const radians = degrees * Math.PI / 180;
        if (selectedImageIndex !== null) {
            images[selectedImageIndex].rotation = radians;
        } else if (selectedTextIndex !== null) {
            textItems[selectedTextIndex].rotation = radians;
        }
        renderCanvas();
    });
}

function getMousePos(e) {
    const r = canvas.getBoundingClientRect();
    return {
        x: e.clientX - r.left,
        y: e.clientY - r.top
    };
}

canvas.addEventListener("mousedown", e => {
    const pos = getMousePos(e);
    isDrawing = drawModeToggle.checked;
    if (isDrawing) {
        lastX = pos.x;
        lastY = pos.y;
        drawingPaths.push({
            color: penColorPicker.value,
            size: penSize,
            points: [{
                x: lastX,
                y: lastY
            }]
        });
        return;
    }

    selectedImageIndex = null;
    selectedTextIndex = null;
    resizingCorner = null;
    draggingItem = false;
    draggingText = false;
    if (rotationInput) {
        rotationInput.style.display = 'none';
    }

    // Check for images
    for (let i = images.length - 1; i >= 0; i--) {
        const it = images[i];
        const center = {
            x: it.x,
            y: it.y
        };
        const rotatedPos = rotatePoint(pos, center, -it.rotation);

        if (rotatedPos.x >= it.x - it.width / 2 && rotatedPos.x <= it.x + it.width / 2 &&
            rotatedPos.y >= it.y - it.height / 2 && rotatedPos.y <= it.y + it.height / 2) {

            // Check for resize handles first
            const corners = [{
                x: it.x - it.width / 2,
                y: it.y - it.height / 2
            }, {
                x: it.x + it.width / 2,
                y: it.y - it.height / 2
            }, {
                x: it.x + it.width / 2,
                y: it.y + it.height / 2
            }, {
                x: it.x - it.width / 2,
                y: it.y + it.height / 2
            }];
            const rotatedCorners = corners.map(c => rotatePoint(c, center, it.rotation));
            for (let j = 0; j < rotatedCorners.length; j++) {
                if (Math.hypot(pos.x - rotatedCorners[j].x, pos.y - rotatedCorners[j].y) < cornerSize) {
                    selectedImageIndex = i;
                    resizingCorner = ['tl', 'tr', 'br', 'bl'][j];
                    if (rotationInput) {
                        rotationInput.style.display = 'block';
                        rotationInput.value = (it.rotation * 180 / Math.PI).toFixed(1);
                    }
                    renderCanvas();
                    return;
                }
            }
            
            // If not a resize handle, it's a drag
            selectedImageIndex = i;
            draggingItem = true;
            offsetX = rotatedPos.x - it.x;
            offsetY = rotatedPos.y - it.y;
            if (rotationInput) {
                rotationInput.style.display = 'block';
                rotationInput.value = (it.rotation * 180 / Math.PI).toFixed(1);
            }
            renderCanvas();
            return;
        }
    }

    // Check for text items
    for (let i = textItems.length - 1; i >= 0; i--) {
        const txt = textItems[i];
        ctx.font = txt.font;
        const width = ctx.measureText(txt.text).width;
        const height = parseInt(txt.font);
        const center = {
            x: txt.x,
            y: txt.y
        };
        const rotatedPos = rotatePoint(pos, center, -txt.rotation);
        if (rotatedPos.x >= txt.x - width / 2 && rotatedPos.x <= txt.x + width / 2 &&
            rotatedPos.y >= txt.y - height / 2 && rotatedPos.y <= txt.y + height / 2) {
            selectedTextIndex = i;
            draggingText = true;
            offsetX = rotatedPos.x - txt.x;
            offsetY = rotatedPos.y - txt.y;
            if (rotationInput) {
                rotationInput.style.display = 'block';
                rotationInput.value = (txt.rotation * 180 / Math.PI).toFixed(1);
            }
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
        path.points.push({
            x: pos.x,
            y: pos.y
        });
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.size;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastX = pos.x;
        lastY = pos.y;
        return;
    }
    if (resizingCorner !== null && selectedImageIndex !== null) {
        const it = images[selectedImageIndex];
        const center = {
            x: it.x,
            y: it.y
        };
        const rotatedPos = rotatePoint(pos, center, -it.rotation);
        const prev = {
            w: it.width,
            h: it.height
        };

        switch (resizingCorner) {
            case 'tl':
                it.width = (it.x - rotatedPos.x) * 2;
                it.height = (it.y - rotatedPos.y) * 2;
                break;
            case 'tr':
                it.width = (rotatedPos.x - it.x) * 2;
                it.height = (it.y - rotatedPos.y) * 2;
                break;
            case 'br':
                it.width = (rotatedPos.x - it.x) * 2;
                it.height = (rotatedPos.y - it.y) * 2;
                break;
            case 'bl':
                it.width = (it.x - rotatedPos.x) * 2;
                it.height = (rotatedPos.y - it.y) * 2;
                break;
        }
        if (it.width < 20) {
            it.width = prev.w;
        }
        if (it.height < 20) {
            it.height = prev.h;
        }
        renderCanvas();
    } else if (draggingItem && selectedImageIndex !== null) {
        const it = images[selectedImageIndex];
        const center = { x: it.x, y: it.y };
        const rotatedPos = rotatePoint(pos, center, -it.rotation);
        
        // This is the key fix. We use the rotated mouse position to update the item's coordinates.
        it.x = rotatedPos.x - offsetX;
        it.y = rotatedPos.y - offsetY;
        
        renderCanvas();
    } else if (draggingText && selectedTextIndex !== null) {
        const txt = textItems[selectedTextIndex];
        const center = { x: txt.x, y: txt.y };
        const rotatedPos = rotatePoint(pos, center, -txt.rotation);
        
        // This is the key fix for text.
        txt.x = rotatedPos.x - offsetX;
        txt.y = rotatedPos.y - offsetY;
        
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
    } else if (selectedTextIndex !== null) {
        textItems.splice(selectedTextIndex, 1);
        selectedTextIndex = null;
    }
    if (rotationInput) {
        rotationInput.style.display = 'none';
    }
    renderCanvas();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' ) { //|| e.key === 'Backspace'
        deleteSelected();
    }
});

function rotatePoint(point, center, angle) {
    const x = point.x - center.x;
    const y = point.y - center.y;
    const newX = x * Math.cos(angle) - y * Math.sin(angle);
    const newY = x * Math.sin(angle) + y * Math.cos(angle);
    return {
        x: newX + center.x,
        y: newY + center.y
    };
}

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
        exportCtx.save();
        exportCtx.translate(item.x, item.y);
        exportCtx.rotate(item.rotation);
        exportCtx.drawImage(item.img, -item.width / 2, -item.height / 2, item.width, item.height);
        exportCtx.restore();
    }

    for (const txt of textItems) {
        exportCtx.save();
        exportCtx.font = txt.font;
        const width = exportCtx.measureText(txt.text).width;
        const height = parseInt(txt.font);
        exportCtx.translate(txt.x, txt.y);
        exportCtx.rotate(txt.rotation);
        exportCtx.fillStyle = txt.color;
        exportCtx.fillText(txt.text, -width / 2, height / 2);
        exportCtx.restore();
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
