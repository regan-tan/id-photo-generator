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
    const layout_height = document.getElementById("layout_height");
    const layout_width = document.getElementById("layout_width");
    const clothesBtn = document.getElementById("clothesBtn");
    const clothesModalElement = document.getElementById("clothesModal");
    const clothesModal = new bootstrap.Modal(clothesModalElement);
    const clothesImage = document.getElementById("clothesImage");
    const confirmClothesBtn = document.getElementById("confirmClothesBtn");
    let selectedTemplate = ""; // Variable to track the selected template
    let layout_heightValue = 1;
    let layout_widthValue = 1;

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

    layout_height.addEventListener("change", function () {
        layout_heightValue = layout_height.value;
    });
    layout_width.addEventListener("change", function () {
        layout_widthValue = layout_width.value;
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
        function getResizeHandle(x, y) {
            if (selectedRectIndex === -1) return "";

            const rect = rectangles[selectedRectIndex];
            const handleSize = 8;

            // Check each handle
            if (Math.abs(x - rect.x) <= handleSize && Math.abs(y - rect.y) <= handleSize) {
                return "tl"; // top-left
            } else if (Math.abs(x - (rect.x + rect.width)) <= handleSize && Math.abs(y - rect.y) <= handleSize) {
                return "tr"; // top-right
            } else if (Math.abs(x - rect.x) <= handleSize && Math.abs(y - (rect.y + rect.height)) <= handleSize) {
                return "bl"; // bottom-left
            } else if (Math.abs(x - (rect.x + rect.width)) <= handleSize && Math.abs(y - (rect.y + rect.height)) <= handleSize) {
                return "br"; // bottom-right
            }

            return "";
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

            // Handle resizing
            if (isResizing && selectedRectIndex !== -1) {
                const rect = rectangles[selectedRectIndex];
                const dx = x - startX;
                const dy = y - startY;

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
                }

                // Ensure minimum size
                if (rect.width < 10) rect.width = 10;
                if (rect.height < 10) rect.height = 10;

                startX = x;
                startY = y;
                drawRectangles();
            }

            // Handle dragging
            if (isDragging && selectedRectIndex !== -1 && !isResizing) {
                const rect = rectangles[selectedRectIndex];
                rect.x += x - startX;
                rect.y += y - startY;

                // Keep rectangle within canvas bounds
                if (rect.x < 0) rect.x = 0;
                if (rect.y < 0) rect.y = 0;
                if (rect.x + rect.width > canvas.width) rect.x = canvas.width - rect.width;
                if (rect.y + rect.height > canvas.height) rect.y = canvas.height - rect.height;

                startX = x;
                startY = y;
                drawRectangles();
            }
        });

        canvas.addEventListener("mouseup", function () {
            isResizing = false;
            isDragging = false;
            resizeHandle = "";
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
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Background Removal</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                <div class="instructions-container mb-3">
                    <p class="mb-2">Draw rectangles around areas to keep in your image:</p>
                    <ul class="small">
                        <li>Click <strong>Add Rectangle</strong>  to create a selection area</li>
                        <li>Drag the corners to resize the rectangle</li>
                        <li>Add multiple rectangles for complex images</li>
                        <li><strong>Do not use a rectangle</strong> for fully automatic background removal</li>
                    </ul>
                </div>
    
                <div class="text-center">
                    <canvas id="previewCanvas" style="border:1px solid #ddd; max-width: 80%; height: auto; display: inline-block;"></canvas>
                </div>
            </div>
            <div class="modal-footer d-flex justify-content-between">
                <div>
                    <button id="addRectBtn" class="btn btn-primary btn-sm me-2">Add New Rectangle</button>
                    <button id="removeRectBtn" class="btn btn-danger btn-sm">Remove Selected Rectangle</button>
                </div>
                <button type="button" class="btn btn-primary" id="applyBackgroundRemoval">Remove Background</button>
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
    document.querySelectorAll(".color-btn").forEach((btn) => {
        btn.addEventListener("click", async function () {
            saveImageState();
            const color = this.dataset.color;
            const formData = new FormData();

            // Use the original transparent image if available
            let sourceImage;
            if (originalTransparentImage && image.dataset.backgroundRemoved === "true") {
                sourceImage = originalTransparentImage.slice(0);
            } else {
                sourceImage = await fetch(image.src).then((r) => r.blob());
            }

            const blob = await fetch(image.src).then((r) => r.blob());
            formData.append("image", blob);
            formData.append("backgroundColor", color);

            try {
                const response = await fetch("/api/change-background", {
                    method: "POST",
                    body: formData,
                });

                if (response.ok) {
                    const result = await response.blob();
                    image.src = URL.createObjectURL(result);
                    // Mark image as not having transparent background
                    image.dataset.backgroundRemoved = "false";
                }
            } catch (error) {
                console.error("Error:", error);
                alert("An error occurred while changing the background color.");
            }
        });
    });

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
        // Add this when initializing the canvas
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");

        // Get the original image
        const imageObj = new Image();
        imageObj.src = image.src;

        // Wait for the image to load
        imageObj.onload = function () {
            const imgWidth = imageObj.width;
            const imgHeight = imageObj.height;
            console.log(layout_heightValue, layout_widthValue);
            // Set canvas size for a 4x2 grid (4 columns, 2 rows)
            canvas.width = imgWidth * layout_widthValue; // 4 images in a row
            canvas.height = imgHeight * layout_heightValue; // 2 images in a column

            // Draw the original image 8 times (4x2 grid)

            for (let i = 0; i < layout_heightValue; i++) {
                for (let j = 0; j < layout_widthValue; j++) {
                    ctx.drawImage(imageObj, j * imgWidth, i * imgHeight, imgWidth, imgHeight);
                }
            }

            canvas.toBlob(async function (blob) {
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "id-photo.png";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
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

    const loadDriveImagesBtn = document.getElementById("loadDriveImagesBtn");
    const driveImageSelect = document.getElementById("driveImageSelect");
    const previewDriveImageBtn = document.getElementById("previewDriveImageBtn");

    // 1. Load Google Drive images
    loadDriveImagesBtn.addEventListener("click", async () => {
        try {
            const res = await fetch("/api/drive/images");
            const files = await res.json();

            driveImageSelect.innerHTML = "";
            files.forEach((file) => {
                const option = document.createElement("option");
                option.value = file.id;
                option.text = file.name;
                driveImageSelect.appendChild(option);
            });

            driveImageSelect.style.display = "block";
            previewDriveImageBtn.style.display = "block";
        } catch (err) {
            alert("Failed to load Google Drive images");
            console.error(err);
        }
    });

    // 2. Preview selected image
    previewDriveImageBtn.addEventListener("click", async () => {
        const fileId = driveImageSelect.value;
        if (!fileId) return;

        try {
            const res = await fetch(`/api/drive/download/${fileId}`);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);

            image.src = url;
            image.style.display = "block";
            placeholder.style.display = "none";
            enableButtons();
            saveImageState();
        } catch (err) {
            alert("Failed to preview image");
            console.error(err);
        }
    });
});
