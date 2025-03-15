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
        document.getElementById("backgroundOptions").style.display = "block";
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

});
