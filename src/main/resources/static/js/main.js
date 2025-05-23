document.addEventListener("DOMContentLoaded", function () {
    let cropper = null;
    let imageHistory = [];
    const image = document.getElementById("image");
    const fileInput = document.getElementById("fileInput");
    const cropBtn = document.getElementById("cropBtn");
    const removeBackgroundBtn = document.getElementById("removeBackgroundBtn");
    const exportBtn = document.getElementById("exportBtn");
    const placeholder = document.getElementById("placeholder");
    const cropModalElement = document.getElementById("cropModal");
    const cropModal = new bootstrap.Modal(cropModalElement);
    const cropImage = document.getElementById("cropImage");
    const undoBtn = document.getElementById("undoBtn");
    const grid_columns = document.getElementById("grid_columns");
    const grid_rows = document.getElementById("grid_rows");
    const clothesBtn = document.getElementById("clothesBtn");
    const clothesModalElement = document.getElementById("clothesModal");
    const clothesModal = new bootstrap.Modal(clothesModalElement);
    const clothesImage = document.getElementById("clothesImage");
    const confirmClothesBtn = document.getElementById("confirmClothesBtn");
    let selectedTemplate = ""; // Variable to track the selected template
    let grid_columnsValue = 1;
    let grid_rowsValue = 1;
    const layoutSelect = document.getElementById("photo_layout");
const gridOptions = document.getElementById("grid_layout_options");

layoutSelect.addEventListener("change", () => {
    if (layoutSelect.value === "grid") {
        gridOptions.classList.remove("d-none");
    } else {
        gridOptions.classList.add("d-none");
    }
});
document.getElementById("customColor").addEventListener("input", function () {
    const customColor = this.value;
    applyBackground(customColor);
});




    function saveImageState() {
        imageHistory.push(image.src);
        if (imageHistory.length > 10) {
            imageHistory.shift(); // Limit history to last 10 states
        }
        undoBtn.disabled = false;
    }

    function undo() {
        if (imageHistory.length > 1) {
            imageHistory.pop(); // Remove current state
            const previousState = imageHistory[imageHistory.length - 1];
            image.src = previousState;
            if (imageHistory.length === 1) {
                undoBtn.disabled = true;
            }
        }
    }

    grid_columns.addEventListener("change", function () {
        grid_columnsValue = grid_columns.value;
    });
    grid_rows.addEventListener("change", function () {
        grid_rowsValue = grid_rows.value;
    });

    undoBtn.addEventListener("click", undo);

    // Handle file input change
    fileInput.addEventListener("change", function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                image.src = e.target.result;
                image.style.display = "block";
                placeholder.style.display = "none";
                enableButtons();
                saveImageState();
            };
            reader.readAsDataURL(file);
        }
    });

    // Enable buttons after image upload
    function enableButtons() {
        cropBtn.disabled = false;
        removeBackgroundBtn.disabled = false;
        exportBtn.disabled = false;
    }

    // Handle drag and drop
    const imageContainer = document.querySelector(".image-container");

    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        imageContainer.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ["dragenter", "dragover"].forEach((eventName) => {
        imageContainer.addEventListener(eventName, highlight, false);
    });

    ["dragleave", "drop"].forEach((eventName) => {
        imageContainer.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        imageContainer.classList.add("drag-over");
    }

    function unhighlight(e) {
        imageContainer.classList.remove("drag-over");
    }

    imageContainer.addEventListener("drop", handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        fileInput.files = dt.files;

        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                image.src = e.target.result;
                image.style.display = "block";
                placeholder.style.display = "none";
                enableButtons();
                saveImageState();
            };
            reader.readAsDataURL(file);
        }
    }

    // Cropping functionality
    cropBtn.addEventListener("click", function () {
        cropImage.src = image.src;

        // Make the modal larger
        cropModalElement.querySelector(".modal-dialog").classList.add("modal-lg");

        // Reset any previous styles
        cropImage.removeAttribute("style");

        // Set the image source
        cropImage.src = image.src;

        // Apply styles for proper sizing
        cropImage.style.maxWidth = "100%";
        cropImage.style.display = "block";
        cropImage.style.margin = "0 auto";

        cropModal.show();

        // Ensure the cropImage container has proper dimensions
        const cropContainer = cropModalElement.querySelector(".modal-body");
        cropContainer.style.padding = "0";
        cropContainer.style.height = "70vh";
        cropContainer.style.overflow = "hidden";

        // Wait for the image to load
        cropImage.onload = function () {
            if (cropper) {
                cropper.destroy();
            }

            // Get the current selected dimensions
            const dimensionsSelect = document.getElementById("dimensionsSelect");
            const dimensions = dimensionsSelect.value.split("x");
            const width = parseFloat(dimensions[0]);
            const height = parseFloat(dimensions[1]);
            const aspectRatio = width / height;

            // Initialize Cropper.js after the image is loaded
            cropper = new Cropper(cropImage, {
                aspectRatio: aspectRatio,
                viewMode: 1,
                dragMode: "move",
                autoCropArea: 0.9,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
        };

        // Handle cases where the image is already loaded
        if (cropImage.complete) {
            setTimeout(() => cropImage.onload(), 200);
        }
    });

    // Replace the dimension change handler with this improved version
    document.getElementById("dimensionsSelect").addEventListener("change", function (e) {
        const dimensions = e.target.value.split("x");
        const width = parseFloat(dimensions[0]); // Use parseFloat instead of parseInt
        const height = parseFloat(dimensions[1]);
        const aspectRatio = width / height;

        console.log("New dimensions:", width, "x", height, "Aspect ratio:", aspectRatio);

        if (cropper) {
            // First set the aspect ratio
            cropper.setAspectRatio(aspectRatio);

            // Then adjust the crop box to match the new aspect ratio
            const containerData = cropper.getContainerData();
            const newWidth = Math.min(containerData.width * 0.8, containerData.height * aspectRatio * 0.8);
            const newHeight = newWidth / aspectRatio;

            // Set the crop box with calculated dimensions
            cropper.setCropBoxData({
                width: newWidth,
                height: newHeight,
                left: (containerData.width - newWidth) / 2,
                top: (containerData.height - newHeight) / 2,
            });
        }
    });

    // Save cropped image
    document.getElementById("cropSaveBtn").addEventListener("click", function () {
        if (cropper) {
            const croppedCanvas = cropper.getCroppedCanvas();
            image.src = croppedCanvas.toDataURL();
            cropModal.hide();
            cropper.destroy();
            cropper = null;
            saveImageState();
        }
    });

    // Background removal
    // Function to initialize rectangle management - moved to global scope
    function initRectangleManagement(canvas, ctx, img) {
        // Rectangle storage
        window.rectangles = [];
        let selectedRectIndex = -1;
        let isResizing = false;
        let resizeHandle = "";
        let isDragging = false;
        let startX, startY;

        // Function to draw all rectangles
        function drawRectangles() {
            // Clear canvas and redraw image
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            // Draw all rectangles
            rectangles.forEach((rect, index) => {
                ctx.beginPath();
                ctx.rect(rect.x, rect.y, rect.width, rect.height);

                if (index === selectedRectIndex) {
                    ctx.strokeStyle = "red";
                    ctx.lineWidth = 2;

                    // Draw resize handles for selected rectangle
                    const handleSize = 8;

                    // Top-left
                    ctx.fillStyle = "white";
                    ctx.fillRect(rect.x - handleSize / 2, rect.y - handleSize / 2, handleSize, handleSize);
                    ctx.strokeRect(rect.x - handleSize / 2, rect.y - handleSize / 2, handleSize, handleSize);

                    // Top-right
                    ctx.fillRect(rect.x + rect.width - handleSize / 2, rect.y - handleSize / 2, handleSize, handleSize);
                    ctx.strokeRect(rect.x + rect.width - handleSize / 2, rect.y - handleSize / 2, handleSize, handleSize);

                    // Bottom-left
                    ctx.fillRect(rect.x - handleSize / 2, rect.y + rect.height - handleSize / 2, handleSize, handleSize);
                    ctx.strokeRect(rect.x - handleSize / 2, rect.y + rect.height - handleSize / 2, handleSize, handleSize);

                    // Bottom-right
                    ctx.fillRect(rect.x + rect.width - handleSize / 2, rect.y + rect.height - handleSize / 2, handleSize, handleSize);
                    ctx.strokeRect(rect.x + rect.width - handleSize / 2, rect.y + rect.height - handleSize / 2, handleSize, handleSize);
                } else {
                    ctx.strokeStyle = "blue";
                    ctx.lineWidth = 1;
                }

                ctx.stroke();
            });

            // Update rectangle info display
        }

        // Function to update rectangle information display
        function updateRectangleInfo() {
            const infoElement = document.getElementById("rectangleInfo");
            if (infoElement) {
                infoElement.innerHTML = rectangles.map((rect, index) => `#${index + 1}: (${Math.round(rect.x)},${Math.round(rect.y)}) ${Math.round(rect.width)}x${Math.round(rect.height)}px`).join(" | ");
            }
        }

        // Function to check if mouse is over a resize handle
        function getResizeHandle(mouseX, mouseY) {
            const handleSize = 10;
        
            for (let i = 0; i < rectangles.length; i++) {
                const rect = rectangles[i];
        
                const withinX = mouseX >= rect.x && mouseX <= rect.x + rect.width;
                const withinY = mouseY >= rect.y && mouseY <= rect.y + rect.height;
        
                const nearLeft = Math.abs(mouseX - rect.x) < handleSize;
                const nearRight = Math.abs(mouseX - (rect.x + rect.width)) < handleSize;
                const nearTop = Math.abs(mouseY - rect.y) < handleSize;
                const nearBottom = Math.abs(mouseY - (rect.y + rect.height)) < handleSize;
        
                if (nearLeft && nearTop) return "tl";
                if (nearRight && nearTop) return "tr";
                if (nearLeft && nearBottom) return "bl";
                if (nearRight && nearBottom) return "br";
                if (nearLeft && withinY) return "l";
                if (nearRight && withinY) return "r";
                if (nearTop && withinX) return "t";
                if (nearBottom && withinX) return "b";
            }
        
            return null;
        }
        

        // Function to check if point is inside a rectangle
        function isPointInRect(x, y, rect) {
            return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
        }

        // Mouse event handlers
        canvas.addEventListener("mousedown", function (e) {
            // Replace the existing mouse coordinate calculation in mousedown, mousemove events
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width; // relationship bitmap vs. element for X
            const scaleY = canvas.height / rect.height; // relationship bitmap vs. element for Y

            // Calculate accurate mouse position
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            // Check for resize handle first
            const handle = getResizeHandle(x, y);
            if (handle) {
                isResizing = true;
                resizeHandle = handle;
                startX = x;
                startY = y;
                return;
            }

            // Check if clicking on an existing rectangle
            let found = false;
            for (let i = rectangles.length - 1; i >= 0; i--) {
                if (isPointInRect(x, y, rectangles[i])) {
                    selectedRectIndex = i;
                    isDragging = true;
                    startX = x;
                    startY = y;
                    found = true;
                    break;
                }
            }

            if (!found) {
                selectedRectIndex = -1;
            }

            drawRectangles();
        });
        canvas.addEventListener("mousemove", function (e) {
            // Replace the existing mouse coordinate calculation in mousedown, mousemove events
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width; // relationship bitmap vs. element for X
            const scaleY = canvas.height / rect.height; // relationship bitmap vs. element for Y
        
            // Calculate accurate mouse position
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
        
            // Update cursor based on position
            if (!isResizing && !isDragging) {
                const handle = getResizeHandle(x, y);
                if (handle === "tl" || handle === "br") {
                    canvas.style.cursor = "nwse-resize";
                } else if (handle === "tr" || handle === "bl") {
                    canvas.style.cursor = "nesw-resize";
                } else {
                    let onRect = false;
                    for (let i = 0; i < rectangles.length; i++) {
                        if (isPointInRect(x, y, rectangles[i])) {
                            canvas.style.cursor = "move";
                            onRect = true;
                            break;
                        }
                    }
                    if (!onRect) {
                        canvas.style.cursor = "default";
                    }
                }
            }
            if (!isResizing && !isDragging) {
                const handle = getResizeHandle(x, y);
                switch (handle) {
                    case "tl":
                    case "br":
                        canvas.style.cursor = "nwse-resize";
                        break;
                    case "tr":
                    case "bl":
                        canvas.style.cursor = "nesw-resize";
                        break;
                    case "l":
                    case "r":
                        canvas.style.cursor = "ew-resize";
                        break;
                    case "t":
                    case "b":
                        canvas.style.cursor = "ns-resize";
                        break;
                    default:
                        // Not on a handle, maybe on a rect?
                        let onRect = false;
                        for (let i = 0; i < rectangles.length; i++) {
                            if (isPointInRect(x, y, rectangles[i])) {
                                canvas.style.cursor = "move";
                                onRect = true;
                                break;
                            }
                        }
                        if (!onRect) {
                            canvas.style.cursor = "default";
                        }
                        break;
                }
            }
            
        
            // Handle resizing
            if (isResizing && selectedRectIndex !== -1) {
                const rect = rectangles[selectedRectIndex];
                const dx = x - startX;
                const dy = y - startY;
        
                // Resizing logic for different handles
                switch (resizeHandle) {
                    case "tl": // top-left
                        rect.x += dx;
                        rect.y += dy;
                        rect.width -= dx;
                        rect.height -= dy;
                        break;
                    case "tr": // top-right
                        rect.y += dy;
                        rect.width += dx;
                        rect.height -= dy;
                        break;
                    case "bl": // bottom-left
                        rect.x += dx;
                        rect.width -= dx;
                        rect.height += dy;
                        break;
                    case "br": // bottom-right
                        rect.width += dx;
                        rect.height += dy;
                        break;
                    case "l": // left
                        rect.x += dx;
                        rect.width -= dx;
                        break;
                    case "r": // right
                        rect.width += dx;
                        break;
                    case "t": // top
                        rect.y += dy;
                        rect.height -= dy;
                        break;
                    case "b": // bottom
                        rect.height += dy;
                        break;
                }
                
                // Ensure minimum size
                if (rect.width < 10) rect.width = 10;
                if (rect.height < 10) rect.height = 10;
        
                // Ensure the rectangle stays within canvas bounds during resizing
                rect.x = Math.max(0, Math.min(rect.x, canvas.width - rect.width));
                rect.y = Math.max(0, Math.min(rect.y, canvas.height - rect.height));
        
                // Redraw the rectangles
                startX = x;
                startY = y;
                drawRectangles();  // Ensure the canvas is updated immediately for smooth resizing
            }
        
            // Handle dragging
            if (isDragging && selectedRectIndex !== -1 && !isResizing) {
                const rect = rectangles[selectedRectIndex];
                const dx = x - startX;
                const dy = y - startY;
        
                // Move the rectangle by the difference in the cursor position
                rect.x += dx;
                rect.y += dy;
        
                // Limit rectangle within canvas bounds without snapping
                rect.x = Math.max(0, Math.min(rect.x, canvas.width - rect.width));
rect.y = Math.max(0, Math.min(rect.y, canvas.height - rect.height));

        
                // Update starting coordinates for the next drag iteration
                startX = x;
                startY = y;
                drawRectangles();  // Update canvas immediately during dragging for smooth movement
            }
        });
        
        window.addEventListener("mouseup", function () {
            isResizing = false;
            isDragging = false;
            resizeHandle = "";
        });
        canvas.addEventListener('mouseleave', () => {
            if (!isDragging && !isResizing) {
                canvas.style.cursor = 'default';
            }
        });
        
        
        

        

        // Add rectangle button
        document.getElementById("addRectBtn").addEventListener("click", function () {
            // Create a new rectangle in the center of the canvas
            const newRect = {
                x: canvas.width / 4,
                y: canvas.height / 4,
                width: canvas.width / 2,
                height: canvas.height / 2,
            };

            rectangles.push(newRect);
            selectedRectIndex = rectangles.length - 1;
            drawRectangles();
        });

        // Remove rectangle button
        document.getElementById("removeRectBtn").addEventListener("click", function () {
            if (selectedRectIndex !== -1) {
                rectangles.splice(selectedRectIndex, 1);
                selectedRectIndex = -1;
                drawRectangles();
            } else {
                alert("Please select a rectangle to remove");
            }
        });

        // Initial draw
        drawRectangles();
    }

    
// Background removal with rectangle preview
removeBackgroundBtn.addEventListener("click", async function () {
    // Create a preview canvas for rectangle drawing
    const previewModal = document.createElement("div");
    previewModal.className = "modal fade";
    previewModal.id = "rectanglePreviewModal";
    previewModal.innerHTML = `
    <div class="modal-dialog modal-md">
    <div class="modal-content">
        <div class="modal-header">
            <h5 class="modal-title">Background Removal Tool</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
            <div class="alert alert-info mb-3">
                <h6 class="mb-2">
                    <i class="fas fa-info-circle me-2"></i>How it works:
                </h6>
                <p class="mb-2">Draw rectangles around parts of the image you want to <strong>keep</strong>. The rest will be removed.</p>
                <ol class="small mb-2">
                    <li>Click <strong>Add Rectangle</strong> to create a box.</li>
                    <li>Drag to move the box over important areas.</li>
                    <li>Resize from edges or corners as needed.</li>
                    <li>You can add multiple boxes for complex shapes.</li>
                </ol>
                <p class="mt-2 small fst-italic">Tip: Want to auto-remove the background? Just skip the rectangles and hit "Remove Background."</p>
                <div class="mt-3">
                    <span class="badge bg-primary me-2" style="font-size: 0.8rem;">Blue Rectangle</span>
                    <span class="small text-muted">= Area to keep</span><br>
                    <span class="badge bg-danger me-2" style="font-size: 0.8rem;">Red Rectangle</span>
                    <span class="small text-muted">= Currently selected rectangle</span><br>
                    <span class="badge bg-light text-dark border me-2 mt-1" style="font-size: 0.8rem;"><i class="fas fa-arrows-alt"></i></span>
                    <span class="small text-muted">= Drag to move</span><br>
                    <span class="badge bg-light text-dark border me-2 mt-1" style="font-size: 0.8rem;">↔️ ↕️ ↘️</span>
                    <span class="small text-muted">= Drag edges/corners to resize</span>
                </div>
            </div>

            <div class="text-center">
                <canvas id="previewCanvas" style="border:1px solid #ddd; max-width: 100%; height: auto; display: inline-block;"></canvas>
            </div>
        </div>
        <div class="modal-footer d-flex justify-content-between">
            <div>
                <button id="addRectBtn" class="btn btn-primary btn-sm me-2">
                    <i class="fas fa-plus-square me-1"></i>Add Rectangle
                </button>
                <button id="removeRectBtn" class="btn btn-danger btn-sm">
                    <i class="fas fa-trash-alt me-1"></i>Remove Selected
                </button>
            </div>
            <button type="button" class="btn btn-primary" id="applyBackgroundRemoval">
                <i class="fas fa-magic me-1"></i>Remove Background
            </button>
        </div>
    </div>
</div>

   `;

        document.body.appendChild(previewModal);
    
        const previewModalInstance = new bootstrap.Modal(previewModal);
        previewModalInstance.show();
    
        // Setup canvas
        const previewCanvas = document.getElementById("previewCanvas");
        const pctx = previewCanvas.getContext("2d");
    
        // Load the current image onto the preview canvas
        const previewImg = new Image();
        previewImg.onload = function () {
            // Set canvas size to match image
            previewCanvas.width = previewImg.width;
            previewCanvas.height = previewImg.height;
    
            // Draw image on canvas
            pctx.drawImage(previewImg, 0, 0);
    
            // Initialize rectangle management
            initRectangleManagement(previewCanvas, pctx, previewImg);
        };
        previewImg.src = image.src;
    
        // Store processing state
        let isProcessing = false;
        let processingPromise = null;
    
        // Apply background removal with rectangles
        document.getElementById("applyBackgroundRemoval").addEventListener("click", function () {
            saveImageState();
    
            // Get rectangle information
            const rectangleInfo = rectangles.map((rect) => ({
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
            }));
    
            // Start processing
            isProcessing = true;
    
            // Create a loading indicator on the main image
            const loadingOverlay = document.createElement("div");
            loadingOverlay.className = "loading-overlay";
            loadingOverlay.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
            loadingOverlay.style.position = "absolute";
            loadingOverlay.style.top = "0";
            loadingOverlay.style.left = "0";
            loadingOverlay.style.width = "100%";
            loadingOverlay.style.height = "100%";
            loadingOverlay.style.display = "flex";
            loadingOverlay.style.alignItems = "center";
            loadingOverlay.style.justifyContent = "center";
            loadingOverlay.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
            loadingOverlay.style.zIndex = "1000";
    
            const imageContainer = image.parentElement;
            imageContainer.style.position = "relative";
            imageContainer.appendChild(loadingOverlay);
    
            // Close the modal but continue processing
            previewModalInstance.hide();
    
            // Process in background
            processingPromise = (async () => {
                const formData = new FormData();
                const blob = await fetch(image.src).then((r) => r.blob());
                formData.append("image", blob);
    
                // Format rectangles as required by the backend
                const rectanglesData = {};
                rectangleInfo.forEach((rect, index) => {
                    // Convert each rectangle to an array of 4 doubles: [x, y, width, height]
                    rectanglesData[`rectangle${index + 1}`] = [rect.x, rect.y, rect.width, rect.height];
                });
    
                // Add rectangles data as a JSON string parameter
                formData.append("rectangles", JSON.stringify(rectanglesData));
    
                try {
                    // Use fetch with appropriate headers for multipart request with JSON body
                    const response = await fetch("/api/remove-background", {
                        method: "POST",
                        body: formData,
                    });
    
                    if (response.ok) {
                        const result = await response.blob();
                        // Store a copy of the transparent version
                        originalTransparentImage = result.slice(0);
                        image.src = URL.createObjectURL(result);
                        saveImageState();
                        // Mark image as having transparent background
                        image.dataset.backgroundRemoved = "true";
                    } else {
                        alert("Failed to remove background. Please try again.");
                    }
                } catch (error) {
                    console.error("Error:", error);
                    alert("An error occurred while processing the image.");
                } finally {
                    // Remove loading overlay
                    imageContainer.removeChild(loadingOverlay);
                    isProcessing = false;
                }
            })();
        });
    
        // Handle modal close event - ensure processing continues
        previewModal.addEventListener("hidden.bs.modal", function () {
            // Remove the modal from DOM after hiding
            document.body.removeChild(previewModal);
    
            // If processing hasn't started yet and user just closed the modal, clean up
            if (!isProcessing && !processingPromise) {
                console.log("Modal closed without processing");
            }
        });
    });

   // Background color selection
const countryColors = {
    "USA": "#FFFFFF",        // White
    "Japan": "#FFFFFF",      // White
    "France": "#F5F5F5",     // Off white / light gray
    "Germany": "#FFFFFF",    // White
    "Brazil": "#FFFFFF",     // White
    "India": "#FFFFFF",      // White
    "Italy": "#FFFFFF",      // White
    "Canada": "#FFFFFF",     // White
    "Malaysia": "#87CEEB",   // Light Blue (Sky Blue)
    "Singapore": "#FFFFFF",  // White
};

// Handle background color button clicks
document.querySelectorAll(".color-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
        const color = this.dataset.color;
        applyBackground(color);  // Pass the color to apply the background
    });
});

// Handle country selection from dropdown
document.getElementById("country-select").addEventListener("change", function () {
    const selectedColor = this.value;
    if (selectedColor) {
        applyBackground(selectedColor);  // Apply background based on selected color
    }
});

document.getElementById("backgroundImageInput").addEventListener("change", function (event) {
    const file = event.target.files[0];
    console.log("Selected file:", file); // Log the selected file

    if (file) {
        // Ensure that the file is a valid image type (jpeg, png, etc.)
        const validTypes = ["image/jpeg", "image/png"];
        if (validTypes.includes(file.type)) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const backgroundImage = new Image();
                backgroundImage.src = e.target.result;
                backgroundImage.onload = function () {
                    // Apply the background image after it is loaded
                    applyBackgroundImage(backgroundImage, file);
                };
            };
            reader.readAsDataURL(file);
        } else {
            alert("Please upload a valid image (JPEG or PNG).");
        }
    }
});

function applyBackgroundImage(backgroundImage, file) {
    saveImageState();
    
    // Create a FormData object for the request
    const formData = new FormData();
    
    // Check if originalTransparentImage exists
    if (typeof window.originalTransparentImage !== 'undefined') {
        console.log("Using stored transparent image");
        formData.append("image", window.originalTransparentImage);
        proceedWithRequest();
    } else {
        console.log("No transparent image found, using current image");
        fetch(image.src)
            .then(response => response.blob())
            .then(blob => {
                formData.append("image", blob);
                proceedWithRequest();
            })
            .catch(error => {
                console.error("Error fetching image:", error);
                alert("Error processing the image. Please try again.");
            });
    }
    
    function proceedWithRequest() {
        // Add a valid hex color code for backgroundColor
        formData.append("backgroundColor", "#FFFFFF");
        
        // Append the background image file
        formData.append("backgroundImage", file);
        
        // Log FormData contents to verify
        console.log("FormData before sending:");
        formData.forEach((value, key) => {
            console.log(key, value);
        });
        
        // Send the data to the backend
        fetch("/api/change-background", {
            method: "POST",
            body: formData,
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`Server error (${response.status}): ${text}`);
                });
            }
            return response.blob();
        })
        .then(result => {
            image.src = URL.createObjectURL(result);
            image.dataset.backgroundRemoved = "false";
            
            // Show the reset button
            document.getElementById("resetBackgroundBtn").style.display = "block";
        })
        .catch(error => {
            console.error("Error:", error);
            alert("An error occurred while changing the background image.");
        });
    }
}

// Handle reset background button click
document.getElementById("resetBackgroundBtn").addEventListener("click", function () {
    resetBackground();
});

// Function to reset the background to a default state
function resetBackground() {
    // Reset to default behavior (e.g., white or transparent background)
    applyBackground("#FFFFFF");  // Assuming white is the default background color

    // Hide the reset button again
    document.getElementById("resetBackgroundBtn").style.display = "none";
}

// Apply background color if needed
function applyBackground(color) {
    saveImageState();  // Assuming this function saves the image state

    const formData = new FormData();
    let sourceImage = originalTransparentImage.slice(0);  // Create a copy to send each time

    // Add color as background data
    formData.append("image", sourceImage);
    formData.append("backgroundColor", color);  // Send the color if available

    fetch("/api/change-background", {
        method: "POST",
        body: formData,
    })
    .then((response) => response.blob())
    .then((result) => {
        image.src = URL.createObjectURL(result);
        image.dataset.backgroundRemoved = "false";  // Optional, depending on your setup
    })
    .catch((error) => {
        console.error("Error:", error);
        alert("An error occurred while changing the background color.");
    });
}


function applyBackground(color) {
    saveImageState();  // Assuming this function saves the image state

    const formData = new FormData();
    let sourceImage = originalTransparentImage.slice(0);  // Create a copy to send each time

    // Add color as background data
    formData.append("image", sourceImage);
    formData.append("backgroundColor", color);  // Send the color if available

    fetch("/api/change-background", {
        method: "POST",
        body: formData,
    })
    .then((response) => response.blob())
    .then((result) => {
        image.src = URL.createObjectURL(result);
        image.dataset.backgroundRemoved = "false";
    })
    .catch((error) => {
        console.error("Error:", error);
        alert("An error occurred while changing the background color.");
    });
}

function resetBackground() {
    // Reset to default behavior (e.g., white or transparent background)
    applyBackground("#FFFFFF");  // Assuming white is the default background color

    // Hide the reset button again
    document.getElementById("resetBackgroundBtn").style.display = "none";
}



function resetBackground() {
    // Reset to default behavior (e.g., white or transparent background)
    applyBackground("#FFFFFF");  // Assuming white is the default background color

    // Hide the reset button again
    document.getElementById("resetBackgroundBtn").style.display = "none";
}

    // Clothes Replacement Modal
    clothesBtn.addEventListener("click", function () {
        clothesImage.src = image.src;
        clothesImage.style.display = "block";
        clothesModal.show();
    });

    // Template buttons for Clothes Replacement (Update to regular buttons)
    document.getElementById("blueSuitBtn").addEventListener("click", function () {
        selectedTemplate = "bluesuit"; // Set template to suit
        applyClothesTemplate("bluesuit");
    });

    document.getElementById("blackSuitBtn").addEventListener("click", function () {
        selectedTemplate = "blacksuit"; // Set template to tshirt
        applyClothesTemplate("blacksuit");
    });

    document.getElementById("graySuitBtn").addEventListener("click", function () {
        selectedTemplate = "graysuit"; // Set template to casual
        applyClothesTemplate("graysuit");
    });

    // When the confirm button is clicked in the clothes modal
    confirmClothesBtn.addEventListener("click", function () {
        // Save the current state of the image in the modal
        saveImageState();

        // Check if a template is selected, and apply it
        if (selectedTemplate) {
            // Apply the selected clothes template (already handled in the modal)
            applyClothesTemplate(selectedTemplate);
        } else {
            // If no template selected, keep the original image in the modal
            alert("No template selected. Using the original image.");
        }

        // Update the main image on the screen with the image in the modal
        image.src = clothesImage.src;

        // Close the modal after confirmation
        clothesModal.hide();
    });

    function applyClothesTemplate(template) {
        // Save the image state before applying the template
        saveImageState();

        // Create a FormData object to send the user image and selected template name
        const formData = new FormData();

        // Fetch the user image as a blob
        fetch(image.src)
            .then((response) => response.blob())
            .then((blob) => {
                formData.append("image", blob); // Append the user image to formData
                formData.append("templateName", template); // Append the selected template name

                // Send the request to replace clothes
                fetch("/api/replace-clothes", {
                    method: "POST",
                    body: formData, // Send the form data with image and template name
                })
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error(`Request failed with status: ${response.status}`);
                        }
                        return response.blob();
                    })
                    .then((blob) => {
                        const objectURL = URL.createObjectURL(blob);
                        clothesImage.src = objectURL; // Set the result image to the clothes image
                    })
                    .catch((error) => {
                        console.error("Error applying clothes:", error);
                        alert("An error occurred while applying the clothes template.");
                    });
            })
            .catch((error) => {
                console.error("Error fetching user image:", error);
            });
    }

    function getClothesImage(template) {
        // Replace with server-side path to fetch the clothes images
        switch (template) {
            case "bluesuit":
                return fetchImageFile("../images/bluesuit.png"); // Update path as per resources/static/images
            case "blacksuit":
                return fetchImageFile("../images/blacksuit.png"); // Update path as per resources/static/images
            case "graysuit":
                return fetchImageFile("../images/graysuit.png"); // Update path as per resources/static/images
            default:
                return null;
        }
    }

    function fetchImageFile(imagePath) {
        return fetch(imagePath)
            .then((response) => response.blob())
            .catch((error) => {
                console.error("Error fetching template image:", error);
                return null;
            });
    }

   // Export functionality
exportBtn.addEventListener("click", async function () {
    const canvas = document.createElement("canvas");
    const layoutHeight = parseFloat(document.getElementById("grid_columns").value);
    const layoutWidth = parseFloat(document.getElementById("grid_rows").value);
    const outputFormat = document.getElementById("output_format").value;
    const outputResolution = parseInt(document.getElementById("output_resolution").value);
    const fileName = document.getElementById("file_name").value || "id-photo";  // Default file name if none provided
    const photoLayout = document.getElementById("photo_layout").value;  // Get selected layout type
    
    // For grid layout, fetch values from grid_columns and grid_rows
    let gridColumns = 1;
    let gridRows = 1;
    if (photoLayout === "grid") {
        gridColumns = parseInt(document.getElementById("grid_columns").value);
        gridRows = parseInt(document.getElementById("grid_rows").value);
    }
    
    // Get the original image (ensure image is defined)
    const imageObj = new Image();
    imageObj.src = image.src || "";  // Ensure the image is being referenced correctly

    // Wait for the image to load
    imageObj.onload = function () {
        const imgWidth = imageObj.width;
        const imgHeight = imageObj.height;

        if (photoLayout === "single") {
            // Single photo layout logic
            canvas.width = imgWidth;
            canvas.height = imgHeight;
        } else {
            // Grid layout logic
            canvas.width = imgWidth * gridColumns;
            canvas.height = imgHeight * gridRows;
            const scaleFactor = outputResolution / 300;  // Assuming 300 DPI is the base resolution
            canvas.width *= scaleFactor;
            canvas.height *= scaleFactor;
        }

        const ctx = canvas.getContext("2d");

        if (photoLayout === "single") {
            // Draw a single image on the canvas
            ctx.drawImage(imageObj, 0, 0, imgWidth, imgHeight);
        } else {
            // Draw the image in a grid layout
            for (let i = 0; i < gridRows; i++) {
                for (let j = 0; j < gridColumns; j++) {
                    ctx.drawImage(imageObj, j * imgWidth, i * imgHeight, imgWidth, imgHeight);
                }
            }
        }

        // Export the image to Blob and download it
        canvas.toBlob(async function (blob) {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${fileName}.${outputFormat}`;  // Use the provided or default file name with the selected format
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }, `image/${outputFormat}`, 1.0);  // Specify output format
    };
});

    
    
    // Variables for image enhancement
    let originalImageForEnhancement = null;
    let hasTransparentBackground = false;

    // Clean up multiple event listeners to have just one
    // Remove all previous event listeners from enhanceBtn (not working in this example, but good practice)
    const enhanceBtn = document.getElementById("enhanceBtn");
    const newEnhanceBtn = enhanceBtn.cloneNode(true);
    enhanceBtn.parentNode.replaceChild(newEnhanceBtn, enhanceBtn);

    // Add single event listener for enhance button
    document.getElementById("enhanceBtn").addEventListener("click", function (e) {
        e.preventDefault();

        if (!document.getElementById("image").src || document.getElementById("image").src === window.location.href) {
            alert("Please upload an image first");
            return;
        }

        // Store a copy of the current image for enhancement
        const currentImg = document.getElementById("image");
        originalImageForEnhancement = new Image();
        originalImageForEnhancement.src = currentImg.src;

        // Wait for image to load before proceeding
        originalImageForEnhancement.onload = function () {
            // Check if the image has a transparent background
            hasTransparentBackground = checkForTransparentBackground(currentImg);

            // Set the preview image in the modal
            const previewImg = document.getElementById("enhancePreviewImg");
            previewImg.src = currentImg.src;

            // Reset sliders to default values
            document.getElementById("brightnessSlider").value = 0;
            document.getElementById("contrastSlider").value = 0;
            document.getElementById("smoothnessSlider").value = 30;

            // Show the modal
            const enhanceModalElement = document.getElementById("enhanceModal");
            if (enhanceModalElement) {
                const enhanceModal = new bootstrap.Modal(enhanceModalElement);
                enhanceModal.show();
                console.log("Enhance modal shown");
            } else {
                console.error("Enhance modal not found in the DOM");
            }
        };
    });

    // Function to check if image has transparent background
    function checkForTransparentBackground(img) {
        // If we've previously removed the background or the image URL contains indicators
        return img.dataset.backgroundRemoved === "true" || img.src.includes("data:image/png") || img.src.includes("background");
    }

    // Apply enhancement in real-time as sliders change
    const brightnessSlider = document.getElementById("brightnessSlider");
    const contrastSlider = document.getElementById("contrastSlider");
    const smoothnessSlider = document.getElementById("smoothnessSlider");

    // Add input event listeners to all sliders for real-time updates
    [brightnessSlider, contrastSlider, smoothnessSlider].forEach((slider) => {
        if (slider) {
            slider.addEventListener("input", updateEnhancementPreview);
        }
    });

    function updateEnhancementPreview() {
        if (!originalImageForEnhancement) return;

        const brightness = parseInt(brightnessSlider.value);
        const contrast = parseInt(contrastSlider.value);
        const smoothness = parseInt(smoothnessSlider.value);

        // Show real-time changes in the preview image
        applyClientSideEnhancements(originalImageForEnhancement, document.getElementById("enhancePreviewImg"), brightness, contrast, smoothness, hasTransparentBackground);
    }

    // This is the improved client-side version for real-time feedback with better transparency handling
    function applyClientSideEnhancements(sourceImg, targetImg, brightness, contrast, smoothness, preserveTransparency) {
        // Create a canvas with proper alpha channel support and color management
        const canvas = document.createElement("canvas");
        canvas.width = sourceImg.naturalWidth;
        canvas.height = sourceImg.naturalHeight;
        const ctx = canvas.getContext("2d", {
            alpha: true,
            colorSpace: "srgb", // Explicitly set color space
        });

        // Clear the canvas with white background first (helps with color consistency)
        if (preserveTransparency) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw the image onto the canvas
        ctx.drawImage(sourceImg, 0, 0);

        // Get the image data with alpha channel
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Skip processing if no adjustments are needed
        if (brightness === 0 && contrast === 0 && smoothness === 0) {
            targetImg.src = sourceImg.src;
            return;
        }

        // Create a copy of the image data for skin smoothing
        let smoothedData = null;
        if (smoothness > 0) {
            // Create a simple blur version for skin smoothing
            const tempCanvas = document.createElement("canvas");
            const tempCtx = tempCanvas.getContext("2d", { alpha: true });
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;

            // Draw the image and apply a blur filter
            tempCtx.drawImage(sourceImg, 0, 0);
            tempCtx.filter = `blur(${smoothness / 20}px)`;
            tempCtx.drawImage(tempCanvas, 0, 0);

            // Get the blurred data
            smoothedData = tempCtx.getImageData(0, 0, canvas.width, canvas.height).data;
        }

        // Process every pixel
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3]; // Alpha channel

            // Skip completely transparent pixels
            if (a === 0) continue;

            // Skip background pixels if preserving transparency
            if (preserveTransparency && r > 240 && g > 240 && b > 240 && a < 255) {
                continue;
            }

            // Apply contrast adjustment
            let newR = r;
            let newG = g;
            let newB = b;

            if (contrast !== 0) {
                const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
                newR = Math.max(0, Math.min(255, Math.round(factor * (newR - 128) + 128)));
                newG = Math.max(0, Math.min(255, Math.round(factor * (newG - 128) + 128)));
                newB = Math.max(0, Math.min(255, Math.round(factor * (newB - 128) + 128)));
            }

            // Apply brightness adjustment
            if (brightness !== 0) {
                newR = Math.max(0, Math.min(255, newR + brightness));
                newG = Math.max(0, Math.min(255, newG + brightness));
                newB = Math.max(0, Math.min(255, newB + brightness));
            }

            // Apply skin smoothing if enabled
            if (smoothness > 0) {
                // Check if this pixel is likely to be skin using YCrCb approximation
                const isSkin = isSkinTone(r, g, b);

                if (isSkin) {
                    const smoothFactor = smoothness / 100;

                    // Blend original (adjusted) pixel with the blurred version
                    newR = Math.round(newR * (1 - smoothFactor) + smoothedData[i] * smoothFactor);
                    newG = Math.round(newG * (1 - smoothFactor) + smoothedData[i + 1] * smoothFactor);
                    newB = Math.round(newB * (1 - smoothFactor) + smoothedData[i + 2] * smoothFactor);
                }
            }

            // Fix for blue tint - slightly boost red channel
            newR = Math.min(255, Math.round(newR * 1.05));

            // Update the pixel data (but keep original alpha)
            data[i] = newR;
            data[i + 1] = newG;
            data[i + 2] = newB;
            // data[i+3] remains unchanged to preserve transparency
        }

        // Put the modified image data back to the canvas
        ctx.putImageData(imageData, 0, 0);

        // Set the result to the target image with proper format
        targetImg.src = canvas.toDataURL(preserveTransparency ? "image/png" : "image/jpeg", 0.95);
    }

    // Helper function to detect skin tones using a more accurate YCrCb-approximation method
    function isSkinTone(r, g, b) {
        // Convert RGB to approximate YCrCb
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        const cr = r - y + 128;
        const cb = b - y + 128;

        // Standard skin tone range in YCrCb color space
        const skinRegion = cr >= 135 && cr <= 180 && cb >= 85 && cb <= 135;

        // Additional check for certain skin tones
        const skinRegionRGB = r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15;

        return skinRegion || skinRegionRGB;
    }

    // Apply enhancement button functionality - this function uses server-side processing for final image
    // Apply enhancement button functionality - updated to use client-side processing for final image
    document.getElementById("applyEnhanceBtn").addEventListener("click", async function () {
        if (!originalImageForEnhancement) return;

        const brightness = parseInt(brightnessSlider.value);
        const contrast = parseInt(contrastSlider.value);
        const smoothness = parseInt(smoothnessSlider.value);

        try {
            // Save the current state before making changes
            saveImageState();

            // Show loading indicator
            const mainImage = document.getElementById("image");
            mainImage.style.opacity = "0.6";

            // Instead of sending to server, apply the same client-side enhancements for the final image
            const tempImg = new Image();
            tempImg.onload = function () {
                // Create a canvas for the final output
                const canvas = document.createElement("canvas");
                canvas.width = tempImg.naturalWidth;
                canvas.height = tempImg.naturalHeight;
                const ctx = canvas.getContext("2d", { alpha: true });

                // Use the same enhancement function that works for the preview
                applyClientSideEnhancements(originalImageForEnhancement, tempImg, brightness, contrast, smoothness, hasTransparentBackground);

                // Wait for the temp image to update
                tempImg.onload = function () {
                    // Apply the result to the main image
                    mainImage.src = tempImg.src;
                    mainImage.style.opacity = "1";

                    // Close the modal properly
                    const enhanceModal = bootstrap.Modal.getInstance(document.getElementById("enhanceModal"));
                    if (enhanceModal) {
                        enhanceModal.hide();
                    }

                    // Clean up modal backdrops
                    setTimeout(() => {
                        document.body.classList.remove("modal-open");
                        const backdrops = document.querySelectorAll(".modal-backdrop");
                        backdrops.forEach((el) => el.remove());
                    }, 200);
                };
            };

            tempImg.src = originalImageForEnhancement.src;
        } catch (error) {
            console.error("Error enhancing photo:", error);
            alert("An error occurred while enhancing the photo.");
            document.getElementById("image").style.opacity = "1";
        }
    });

    // Make sure the modal properly cleans up when hidden
    const enhanceModalElement = document.getElementById("enhanceModal");
    if (enhanceModalElement) {
        enhanceModalElement.addEventListener("hidden.bs.modal", function () {
            // Reset everything when modal is closed
            originalImageForEnhancement = null;
            const previewImg = document.getElementById("enhancePreviewImg");
            if (previewImg) {
                previewImg.src = "";
            }
        });
    }

    // Cancel button handler
    const cancelBtn = document.querySelector("#enhanceModal .btn-secondary");
    if (cancelBtn) {
        cancelBtn.addEventListener("click", function () {
            const enhanceModalEl = document.getElementById("enhanceModal");
            const enhanceModalInstance = bootstrap.Modal.getInstance(enhanceModalEl);

            if (enhanceModalInstance) {
                // Clear any modified preview before closing
                const previewImg = document.getElementById("enhancePreviewImg");
                if (originalImageForEnhancement && previewImg) {
                    previewImg.src = originalImageForEnhancement.src;
                }

                // Close the modal
                enhanceModalInstance.hide();

                // Additional cleanup
                setTimeout(() => {
                    document.body.classList.remove("modal-open");
                    document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
                }, 200);
            }
        });
    }

    // Also ensure modal close button (×) works
    const closeBtn = document.querySelector("#enhanceModal .btn-close");
    if (closeBtn) {
        closeBtn.addEventListener("click", function () {
            // Ensure modal is properly closed
            const enhanceModalEl = document.getElementById("enhanceModal");
            const enhanceModalInstance = bootstrap.Modal.getInstance(enhanceModalEl);

            if (enhanceModalInstance) {
                enhanceModalInstance.hide();

                // Additional cleanup for proper modal removal
                setTimeout(() => {
                    document.body.classList.remove("modal-open");
                    document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
                }, 150);
            }
        });
    }

    // Compliance Checker logic
    const checkBtn = document.getElementById("checkBtn");
    const complianceResult = document.getElementById("complianceResult");

    checkBtn.addEventListener("click", async () => {
        if (!image.src || image.src === window.location.href) {
            alert("Please upload an image first.");
            return;
        }

        try {
            complianceResult.textContent = "Checking compliance...";
            complianceResult.classList.remove("text-danger", "text-success");

            const blob = await fetch(image.src).then((res) => res.blob());
            const formData = new FormData();
            formData.append("file", blob, "image.png");

            const response = await fetch("/api/check-compliance", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (result.status === "Pass") {
                complianceResult.textContent = `✅ ${result.details || "Photo passed compliance check."}`;
                complianceResult.classList.add("text-success");
            } else {
                complianceResult.textContent = `❌ ${result.reason || "Photo failed compliance check."}`;
                complianceResult.classList.add("text-danger");
            }
        } catch (error) {
            console.error("Compliance check failed:", error);
            complianceResult.textContent = "❌ Error checking compliance.";
            complianceResult.classList.add("text-danger");
        }
    });




});
