document.addEventListener('DOMContentLoaded', function() {
    let cropper = null;
    const image = document.getElementById('image');
    const fileInput = document.getElementById('fileInput');
    const cropBtn = document.getElementById('cropBtn');
    const removeBackgroundBtn = document.getElementById('removeBackgroundBtn');
    const exportBtn = document.getElementById('exportBtn');
    const placeholder = document.getElementById('placeholder');
    const cropModal = new bootstrap.Modal(document.getElementById('cropModal'));
    const cropImage = document.getElementById('cropImage');
    
    // Handle file input change
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                image.src = e.target.result;
                image.style.display = 'block';
                placeholder.style.display = 'none';
                enableButtons();
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
    const imageContainer = document.querySelector('.image-container');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        imageContainer.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        imageContainer.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        imageContainer.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        imageContainer.classList.add('drag-over');
    }

    function unhighlight(e) {
        imageContainer.classList.remove('drag-over');
    }

    imageContainer.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        fileInput.files = dt.files;
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                image.src = e.target.result;
                image.style.display = 'block';
                placeholder.style.display = 'none';
                enableButtons();
            };
            reader.readAsDataURL(file);
        }
    }

    // Cropping functionality
    cropBtn.addEventListener('click', function() {
        cropImage.src = image.src;
        cropModal.show();
        
        if (cropper) {
            cropper.destroy();
        }

        cropper = new Cropper(cropImage, {
            aspectRatio: 35/45,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.8,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false
        });
    });

    // Handle dimension changes
    document.getElementById('dimensionsSelect').addEventListener('change', function(e) {
        const dimensions = e.target.value.split('x');
        const aspectRatio = parseInt(dimensions[0]) / parseInt(dimensions[1]);
        
        if (cropper) {
            cropper.setAspectRatio(aspectRatio);
        }
    });

    // Save cropped image
    document.getElementById('cropSaveBtn').addEventListener('click', function() {
        if (cropper) {
            const croppedCanvas = cropper.getCroppedCanvas();
            image.src = croppedCanvas.toDataURL();
            cropModal.hide();
            cropper.destroy();
            cropper = null;
        }
    });

    // Background removal
    removeBackgroundBtn.addEventListener('click', async function() {
        const formData = new FormData();
        const blob = await fetch(image.src).then(r => r.blob());
        formData.append('image', blob);

        try {
            const response = await fetch('/api/remove-background', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.blob();
                image.src = URL.createObjectURL(result);
                document.getElementById('backgroundOptions').style.display = 'block';
            } else {
                alert('Failed to remove background. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while processing the image.');
        }
    });

    // Background color selection
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const color = this.dataset.color;
            const formData = new FormData();
            const blob = await fetch(image.src).then(r => r.blob());
            formData.append('image', blob);
            formData.append('backgroundColor', color);

            try {
                const response = await fetch('/api/change-background', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.blob();
                    image.src = URL.createObjectURL(result);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while changing the background color.');
            }
        });
    });

    // Export functionality
    exportBtn.addEventListener('click', async function() {
        const link = document.createElement('a');
        const blob = await fetch(image.src).then(r => r.blob());
        link.href = URL.createObjectURL(blob);
        link.download = 'id-photo.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});
