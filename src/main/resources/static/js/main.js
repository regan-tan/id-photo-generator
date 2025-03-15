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
  document
    .getElementById("dimensionsSelect")
    .addEventListener("change", function (e) {
      const dimensions = e.target.value.split("x");
      const width = parseFloat(dimensions[0]); // Use parseFloat instead of parseInt
      const height = parseFloat(dimensions[1]);
      const aspectRatio = width / height;

      console.log(
        "New dimensions:",
        width,
        "x",
        height,
        "Aspect ratio:",
        aspectRatio
      );

      if (cropper) {
        // First set the aspect ratio
        cropper.setAspectRatio(aspectRatio);

        // Then adjust the crop box to match the new aspect ratio
        const containerData = cropper.getContainerData();
        const newWidth = Math.min(
          containerData.width * 0.8,
          containerData.height * aspectRatio * 0.8
        );
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
  removeBackgroundBtn.addEventListener("click", async function () {
    saveImageState();
    const formData = new FormData();
    const blob = await fetch(image.src).then((r) => r.blob());
    formData.append("image", blob);

    try {
      const response = await fetch("/api/remove-background", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.blob();
        image.src = URL.createObjectURL(result);
        // Mark image as having transparent background
        image.dataset.backgroundRemoved = 'true';
      } else {
        alert("Failed to remove background. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while processing the image.");
    }
  });

  // Background color selection
  document.querySelectorAll(".color-btn").forEach((btn) => {
    btn.addEventListener("click", async function () {
      saveImageState();
      const color = this.dataset.color;
      const formData = new FormData();
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
          image.dataset.backgroundRemoved = 'false';
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
      .then(response => response.blob())
      .then(blob => {
        formData.append("image", blob);  // Append the user image to formData
        formData.append("templateName", template);  // Append the selected template name

        // Send the request to replace clothes
        fetch("/api/replace-clothes", {
          method: "POST",
          body: formData,  // Send the form data with image and template name
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Request failed with status: ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          const objectURL = URL.createObjectURL(blob);
          clothesImage.src = objectURL; // Set the result image to the clothes image
        })
        .catch(error => {
          console.error("Error applying clothes:", error);
          alert("An error occurred while applying the clothes template.");
        });
      })
      .catch(error => {
        console.error("Error fetching user image:", error);
      });
  }


  function getClothesImage(template) {
    // Replace with server-side path to fetch the clothes images
    switch (template) {
      case 'bluesuit':
        return fetchImageFile('../images/bluesuit.png'); // Update path as per resources/static/images
      case 'blacksuit':
        return fetchImageFile('../images/blacksuit.png'); // Update path as per resources/static/images
      case 'graysuit':
        return fetchImageFile('../images/graysuit.png'); // Update path as per resources/static/images
      default:
        return null;
    }
  }

  function fetchImageFile(imagePath) {
    return fetch(imagePath)
      .then(response => response.blob())
      .catch(error => {
        console.error("Error fetching template image:", error);
        return null;
      });
  }

  // Export functionality
  exportBtn.addEventListener("click", async function () {
    const canvas = document.createElement("canvas");
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
          ctx.drawImage(
            imageObj,
            j * imgWidth,
            i * imgHeight,
            imgWidth,
            imgHeight
          );
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
  const enhanceBtn = document.getElementById('enhanceBtn');
  const newEnhanceBtn = enhanceBtn.cloneNode(true);
  enhanceBtn.parentNode.replaceChild(newEnhanceBtn, enhanceBtn);

  // Add single event listener for enhance button
  document.getElementById('enhanceBtn').addEventListener('click', function(e) {
    e.preventDefault();
    
    if (!document.getElementById('image').src || document.getElementById('image').src === window.location.href) {
      alert('Please upload an image first');
      return;
    }
    
    // Store a copy of the current image for enhancement
    const currentImg = document.getElementById('image');
    originalImageForEnhancement = new Image();
    originalImageForEnhancement.src = currentImg.src;
    
    // Wait for image to load before proceeding
    originalImageForEnhancement.onload = function() {
      // Check if the image has a transparent background
      hasTransparentBackground = checkForTransparentBackground(currentImg);
      
      // Set the preview image in the modal
      const previewImg = document.getElementById('enhancePreviewImg');
      previewImg.src = currentImg.src;
      
      // Reset sliders to default values
      document.getElementById('brightnessSlider').value = 0;
      document.getElementById('contrastSlider').value = 0;
      document.getElementById('smoothnessSlider').value = 30;
      
      // Show the modal
      const enhanceModalElement = document.getElementById('enhanceModal');
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
    return img.dataset.backgroundRemoved === 'true' || 
           img.src.includes('data:image/png') || 
           img.src.includes('background');
  }

  // Apply enhancement in real-time as sliders change
  const brightnessSlider = document.getElementById('brightnessSlider');
  const contrastSlider = document.getElementById('contrastSlider');
  const smoothnessSlider = document.getElementById('smoothnessSlider');

  // Add input event listeners to all sliders for real-time updates
  [brightnessSlider, contrastSlider, smoothnessSlider].forEach(slider => {
    if (slider) {
      slider.addEventListener('input', updateEnhancementPreview);
    }
  });

  function updateEnhancementPreview() {
    if (!originalImageForEnhancement) return;
    
    const brightness = parseInt(brightnessSlider.value);
    const contrast = parseInt(contrastSlider.value);
    const smoothness = parseInt(smoothnessSlider.value);
    
    // Show real-time changes in the preview image
    applyClientSideEnhancements(
      originalImageForEnhancement, 
      document.getElementById('enhancePreviewImg'),
      brightness,
      contrast,
      smoothness,
      hasTransparentBackground
    );
  }

  // This is the improved client-side version for real-time feedback with better transparency handling
  function applyClientSideEnhancements(sourceImg, targetImg, brightness, contrast, smoothness, preserveTransparency) {
    // Create a canvas with proper alpha channel support and color management
    const canvas = document.createElement('canvas');
    canvas.width = sourceImg.naturalWidth;
    canvas.height = sourceImg.naturalHeight;
    const ctx = canvas.getContext('2d', { 
      alpha: true,
      colorSpace: 'srgb' // Explicitly set color space
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
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d', { alpha: true });
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
      const g = data[i+1];
      const b = data[i+2];
      const a = data[i+3]; // Alpha channel
      
      // Skip completely transparent pixels
      if (a === 0) continue;
      
      // Skip background pixels if preserving transparency
      if (preserveTransparency && (r > 240 && g > 240 && b > 240 && a < 255)) {
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
          newG = Math.round(newG * (1 - smoothFactor) + smoothedData[i+1] * smoothFactor);
          newB = Math.round(newB * (1 - smoothFactor) + smoothedData[i+2] * smoothFactor);
        }
      }
      
      // Fix for blue tint - slightly boost red channel
      newR = Math.min(255, Math.round(newR * 1.05));
      
      // Update the pixel data (but keep original alpha)
      data[i] = newR;
      data[i+1] = newG;
      data[i+2] = newB;
      // data[i+3] remains unchanged to preserve transparency
    }
    
    // Put the modified image data back to the canvas
    ctx.putImageData(imageData, 0, 0);
    
    // Set the result to the target image with proper format
    targetImg.src = canvas.toDataURL(preserveTransparency ? 'image/png' : 'image/jpeg', 0.95);
}

  // Helper function to detect skin tones using a more accurate YCrCb-approximation method
  function isSkinTone(r, g, b) {
    // Convert RGB to approximate YCrCb
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cr = r - y + 128;
    const cb = b - y + 128;
    
    // Standard skin tone range in YCrCb color space
    const skinRegion = (cr >= 135 && cr <= 180 && cb >= 85 && cb <= 135);
    
    // Additional check for certain skin tones
    const skinRegionRGB = (r > 95 && g > 40 && b > 20 && 
                          r > g && r > b && 
                          Math.abs(r - g) > 15);
    
    return skinRegion || skinRegionRGB;
  }

  // Apply enhancement button functionality - this function uses server-side processing for final image
  // Apply enhancement button functionality - updated to use client-side processing for final image
document.getElementById('applyEnhanceBtn').addEventListener('click', async function() {
  if (!originalImageForEnhancement) return;
  
  const brightness = parseInt(brightnessSlider.value);
  const contrast = parseInt(contrastSlider.value);
  const smoothness = parseInt(smoothnessSlider.value);
  
  try {
    // Save the current state before making changes
    saveImageState();
    
    // Show loading indicator
    const mainImage = document.getElementById('image');
    mainImage.style.opacity = "0.6";
    
    // Instead of sending to server, apply the same client-side enhancements for the final image
    const tempImg = new Image();
    tempImg.onload = function() {
      // Create a canvas for the final output
      const canvas = document.createElement('canvas');
      canvas.width = tempImg.naturalWidth;
      canvas.height = tempImg.naturalHeight;
      const ctx = canvas.getContext('2d', { alpha: true });
      
      // Use the same enhancement function that works for the preview
      applyClientSideEnhancements(
        originalImageForEnhancement,
        tempImg,
        brightness,
        contrast,
        smoothness,
        hasTransparentBackground
      );
      
      // Wait for the temp image to update
      tempImg.onload = function() {
        // Apply the result to the main image
        mainImage.src = tempImg.src;
        mainImage.style.opacity = "1";
        
        // Close the modal properly
        const enhanceModal = bootstrap.Modal.getInstance(document.getElementById('enhanceModal'));
        if (enhanceModal) {
          enhanceModal.hide();
        }
        
        // Clean up modal backdrops
        setTimeout(() => {
          document.body.classList.remove('modal-open');
          const backdrops = document.querySelectorAll('.modal-backdrop');
          backdrops.forEach(el => el.remove());
        }, 200);
      };
    };
    
    tempImg.src = originalImageForEnhancement.src;
    
  } catch (error) {
    console.error("Error enhancing photo:", error);
    alert("An error occurred while enhancing the photo.");
    document.getElementById('image').style.opacity = "1";
  }
});

  // Make sure the modal properly cleans up when hidden
  const enhanceModalElement = document.getElementById('enhanceModal');
  if (enhanceModalElement) {
    enhanceModalElement.addEventListener('hidden.bs.modal', function () {
      // Reset everything when modal is closed
      originalImageForEnhancement = null;
      const previewImg = document.getElementById('enhancePreviewImg');
      if (previewImg) {
        previewImg.src = '';
      }
    });
  }

  // Cancel button handler
  const cancelBtn = document.querySelector('#enhanceModal .btn-secondary');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      const enhanceModalEl = document.getElementById('enhanceModal');
      const enhanceModalInstance = bootstrap.Modal.getInstance(enhanceModalEl);
      
      if (enhanceModalInstance) {
        // Clear any modified preview before closing
        const previewImg = document.getElementById('enhancePreviewImg');
        if (originalImageForEnhancement && previewImg) {
          previewImg.src = originalImageForEnhancement.src;
        }
        
        // Close the modal
        enhanceModalInstance.hide();
        
        // Additional cleanup
        setTimeout(() => {
          document.body.classList.remove('modal-open');
          document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        }, 200);
      }
    });
  }

  // Also ensure modal close button (×) works
  const closeBtn = document.querySelector('#enhanceModal .btn-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      // Ensure modal is properly closed
      const enhanceModalEl = document.getElementById('enhanceModal');
      const enhanceModalInstance = bootstrap.Modal.getInstance(enhanceModalEl);
      
      if (enhanceModalInstance) {
        enhanceModalInstance.hide();
        
        // Additional cleanup for proper modal removal
        setTimeout(() => {
          document.body.classList.remove('modal-open');
          document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        }, 150);
      }
    });
  }
});