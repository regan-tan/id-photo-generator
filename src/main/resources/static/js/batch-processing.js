let processedImages = [];
let currentImageIndex = 0;
document.addEventListener('DOMContentLoaded', function () {
    // Get elements
    const batchProcessingSticky = document.getElementById('batchProcessingSticky');
    const batchProcessingToggle = document.getElementById('batchProcessingToggle');
    const openBatchBtn = document.getElementById('openBatchProcessingBtn');
    const closeBatchBtn = document.getElementById('closeBatchProcessingBtn');
    const batchCollapsed = document.getElementById('batchProcessingCollapsed');
    const batchExpanded = document.getElementById('batchProcessingExpanded');
    const batchFileInput = document.getElementById('batchFileInput');
    const addBatchFilesBtn = document.getElementById('addBatchFilesBtn');
    const processBatchBtn = document.getElementById('processBatchBtn');
    const batchBackgroundColor = document.getElementById('batchBackgroundColor');
    const viewImagesBtn = document.getElementById('viewImagesBtn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const downloadCurrentBtn = document.getElementById('downloadCurrentBtn');

    console.log("Batch file input:", batchFileInput);
    console.log("Add batch files button:", addBatchFilesBtn);

    // Global variables
    let selectedFiles = [];

    // If the file input exists but there's no Add Files button yet or it's in the HTML
    if (batchFileInput) {
        // Hide the original file input
        batchFileInput.style.display = 'none';

        // Check if an add files button already exists in the HTML
        let existingAddBtn = document.getElementById('addBatchFilesBtn');

        // If no button exists yet, create it
        if (!existingAddBtn) {
            console.log("Creating new Add Files button");

            // Create Add Files button
            const addFilesBtn = document.createElement('button');
            addFilesBtn.id = 'addBatchFilesBtn';
            addFilesBtn.className = 'btn btn-secondary w-100';
            addFilesBtn.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Add Photos';

            // Create container for selected files if it doesn't exist
            let selectedFilesContainer = document.getElementById('selectedBatchFiles');
            if (!selectedFilesContainer) {
                selectedFilesContainer = document.createElement('div');
                selectedFilesContainer.id = 'selectedBatchFiles';
                selectedFilesContainer.className = 'mt-2 selected-files-container';
                selectedFilesContainer.innerHTML = '<p class="text-muted small text-center">No files selected yet</p>';
            }

            // Insert elements
            if (batchFileInput.parentNode) {
                batchFileInput.parentNode.insertBefore(addFilesBtn, batchFileInput);

                // Only insert the container if it was newly created
                if (!document.getElementById('selectedBatchFiles')) {
                    batchFileInput.parentNode.insertBefore(selectedFilesContainer, batchFileInput.nextSibling);
                }

                // Add event listener to the newly created button
                addFilesBtn.addEventListener('click', function () {
                    console.log("Add Files button clicked");
                    batchFileInput.click();
                });
            }
        } else {
            // If button already exists in HTML, just add the event listener
            console.log("Using existing Add Files button");
            existingAddBtn.addEventListener('click', function () {
                console.log("Add Files button clicked");
                batchFileInput.click();
            });
        }
    }

    // Toggle the expanded/collapsed state when clicking the toggle button
    if (batchProcessingToggle) {
        batchProcessingToggle.addEventListener('click', function () {
            if (batchProcessingSticky.classList.contains('collapsed')) {
                batchProcessingSticky.classList.remove('collapsed');
                batchProcessingToggle.innerHTML = '<i class="fas fa-chevron-down me-1"></i> Batch Processing';
            } else {
                batchProcessingSticky.classList.add('collapsed');
                batchProcessingToggle.innerHTML = '<i class="fas fa-chevron-up me-1"></i> Batch Processing';

                // Also close the expanded view if it's open
                if (batchExpanded && batchExpanded.style.display !== 'none') {
                    batchExpanded.style.display = 'none';
                    batchCollapsed.style.display = 'block';
                }
            }
        });
    }

    // Show expanded batch processing section when open button is clicked
    if (openBatchBtn) {
        openBatchBtn.addEventListener('click', function () {
            if (batchCollapsed) batchCollapsed.style.display = 'none';
            if (batchExpanded) batchExpanded.style.display = 'block';

            // Make sure the container is fully expanded
            if (batchProcessingSticky) {
                batchProcessingSticky.classList.remove('collapsed');
                if (batchProcessingToggle) {
                    batchProcessingToggle.innerHTML = '<i class="fas fa-chevron-down me-1"></i> Batch Processing';
                }
            }
        });
    }

    // Hide expanded section when close button is clicked
    if (closeBatchBtn) {
        closeBatchBtn.addEventListener('click', function () {
            if (batchExpanded) batchExpanded.style.display = 'none';
            if (batchCollapsed) batchCollapsed.style.display = 'block';
        });
    }

    // Handle file selection
    if (batchFileInput) {
        batchFileInput.addEventListener('change', function (e) {
            if (e.target.files.length > 0) {
                // Convert FileList to array and add to selectedFiles
                const newFiles = Array.from(e.target.files);

                // Add new files to existing selection
                selectedFiles = [...selectedFiles, ...newFiles];

                // Limit to maximum 10 files
                if (selectedFiles.length > 10) {
                    selectedFiles = selectedFiles.slice(0, 10);
                    alert('Maximum 10 files can be selected. Only the first 10 will be used.');
                }

                // Update the display
                updateSelectedFilesDisplay();

                // Reset the input so the same file can be selected again if needed
                batchFileInput.value = '';
            }
        });
    }

    // Function to update the display of selected files
    function updateSelectedFilesDisplay() {
        const selectedBatchFiles = document.getElementById('selectedBatchFiles');
        if (!selectedBatchFiles) return;

        // Clear current content
        selectedBatchFiles.innerHTML = '';

        // If no files selected, show message
        if (selectedFiles.length === 0) {
            selectedBatchFiles.innerHTML = '<p class="text-muted small text-center">No files selected yet</p>';
            if (processBatchBtn) processBatchBtn.disabled = true;
            return;
        }

        // Enable the process button
        if (processBatchBtn) processBatchBtn.disabled = false;

        // Create file items
        selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            // File name
            const fileName = document.createElement('div');
            fileName.className = 'file-name';
            fileName.textContent = file.name;

            // File size
            const fileSize = (file.size / 1024).toFixed(1);
            const sizeText = document.createElement('small');
            sizeText.className = 'text-muted ms-2';
            sizeText.textContent = `(${fileSize} KB)`;
            fileName.appendChild(sizeText);

            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-file';
            removeBtn.innerHTML = '&times;';
            removeBtn.setAttribute('type', 'button');
            removeBtn.setAttribute('title', 'Remove file');
            removeBtn.setAttribute('data-index', index);
            removeBtn.addEventListener('click', function () {
                const idx = parseInt(this.getAttribute('data-index'));
                removeFile(idx);
            });

            fileItem.appendChild(fileName);
            fileItem.appendChild(removeBtn);
            selectedBatchFiles.appendChild(fileItem);
        });

        // Add file count and clear all button if there are files
        if (selectedFiles.length > 0) {
            const countRow = document.createElement('div');
            countRow.className = 'file-count-row';

            const fileCount = document.createElement('div');
            fileCount.textContent = `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} selected`;

            const clearAllBtn = document.createElement('button');
            clearAllBtn.className = 'btn btn-sm btn-outline-danger';
            clearAllBtn.textContent = 'Clear All';
            clearAllBtn.setAttribute('type', 'button');
            clearAllBtn.addEventListener('click', function () {
                selectedFiles = [];
                updateSelectedFilesDisplay();
            });

            countRow.appendChild(fileCount);
            countRow.appendChild(clearAllBtn);
            selectedBatchFiles.appendChild(countRow);
        }
    }

    // Function to remove a file
    function removeFile(index) {
        if (index >= 0 && index < selectedFiles.length) {
            // Remove the file at the specified index
            selectedFiles.splice(index, 1);
            // Update the display
            updateSelectedFilesDisplay();
        }
    }

    // Handle batch processing button click
    if (processBatchBtn) {
        processBatchBtn.addEventListener('click', function () {
            if (selectedFiles.length === 0) {
                alert('Please select at least one image to process');
                return;
            }

            // Show spinner
            const spinner = processBatchBtn.querySelector('.spinner-border');
            if (spinner) spinner.classList.remove('d-none');
            processBatchBtn.disabled = true;

            // Prepare form data
            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });

            // Get background color
            if (batchBackgroundColor) {
                formData.append('backgroundColor', batchBackgroundColor.value);
            }

            // Process batch
            fetch('/api/batch/process', {
                method: 'POST',
                body: formData
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Server error: ' + response.status);
                    }
                    return response.json();
                })
                .then(data => {
                    // Handle successful response
                    console.log('Processed images:', data);

                    if (data.error) {
                        throw new Error(data.error);
                    }

                    // Store the processed images
                    processedImages = data.images;

                    // Show success message
                    const resultContainer = document.getElementById('batchResultContainer');
                    if (resultContainer) {
                        resultContainer.style.display = 'block';
                    }

                    // Prepare the images modal
                    prepareImageModal();
                })
                .catch(error => {
                    console.error('Error processing batch:', error);
                    alert('Error: ' + error.message);
                })
                .finally(() => {
                    // Hide spinner
                    if (spinner) spinner.classList.add('d-none');
                    processBatchBtn.disabled = false;
                });
        });
    }

    // View Images button click handler
    if (viewImagesBtn) {
        viewImagesBtn.addEventListener('click', function () {
            const imagesModal = document.getElementById('imagesModal');
            if (imagesModal) {
                const modal = new bootstrap.Modal(imagesModal);
                modal.show();
            }
        });
    }

    // Download All button click handler
    // Update the download button handler with better feedback

    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', function () {
            if (selectedFiles.length === 0) return;

            // Change button state to show download is in progress
            const originalText = downloadAllBtn.innerHTML;
            downloadAllBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating ZIP...';
            downloadAllBtn.disabled = true;

            // Prepare form data for download
            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });

            if (batchBackgroundColor) {
                formData.append('backgroundColor', batchBackgroundColor.value);
            }

            // Add a timeout to show message if it takes longer than expected
            const downloadTimeout = setTimeout(() => {
                // Show message below button if taking longer than 3 seconds
                const downloadMessage = document.createElement('div');
                downloadMessage.id = 'downloadMessage';
                downloadMessage.className = 'small text-muted mt-2';
                downloadMessage.innerHTML = 'Large files may take a moment to process. Please wait...';
                downloadAllBtn.parentNode.appendChild(downloadMessage);
            }, 3000);

            fetch('/api/batch/download', {
                method: 'POST',
                body: formData
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Server error: ' + response.status);
                    }
                    return response.blob();
                })
                .then(blob => {
                    // Create and trigger download
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = 'processed_images.zip';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);

                    // Show success message
                    downloadAllBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Download Complete';
                    setTimeout(() => {
                        downloadAllBtn.innerHTML = originalText;
                        downloadAllBtn.disabled = false;
                    }, 2000);
                })
                .catch(error => {
                    console.error('Error downloading zip:', error);
                    alert('Failed to download images: ' + error.message);
                    downloadAllBtn.innerHTML = originalText;
                    downloadAllBtn.disabled = false;
                })
                .finally(() => {
                    // Clear timeout and remove message if it exists
                    clearTimeout(downloadTimeout);
                    const downloadMessage = document.getElementById('downloadMessage');
                    if (downloadMessage) {
                        downloadMessage.parentNode.removeChild(downloadMessage);
                    }
                });
        });
    }

    // Download Current button click handler
    if (downloadCurrentBtn) {
        downloadCurrentBtn.addEventListener('click', function () {
            if (processedImages.length === 0) return;

            const base64Image = processedImages[currentImageIndex];
            const byteCharacters = atob(base64Image);
            const byteNumbers = new Array(byteCharacters.length);

            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `id_photo_${currentImageIndex + 1}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        });
    }

    // Set up the image carousel events
    const imageCarousel = document.getElementById('imageCarousel');
    if (imageCarousel) {
        imageCarousel.addEventListener('slid.bs.carousel', function (e) {
            currentImageIndex = parseInt(e.to);
        });
    }
});

// Function to prepare the modal with images
function prepareImageModal() {
    const indicators = document.getElementById('carouselIndicators');
    const carouselInner = document.getElementById('carouselInner');
    const thumbnailsContainer = document.getElementById('imageThumbnails');

    if (!indicators || !carouselInner || !thumbnailsContainer) {
        console.error('Modal elements not found');
        return;
    }

    // Clear previous content
    indicators.innerHTML = '';
    carouselInner.innerHTML = '';
    thumbnailsContainer.innerHTML = '';

    processedImages.forEach((base64Image, index) => {
        // Create indicator for carousel
        const indicator = document.createElement('li');
        indicator.setAttribute('data-bs-target', '#imageCarousel');
        indicator.setAttribute('data-bs-slide-to', index.toString());
        if (index === 0) indicator.classList.add('active');
        indicators.appendChild(indicator);

        // Create carousel item
        const carouselItem = document.createElement('div');
        carouselItem.className = index === 0 ? 'carousel-item active' : 'carousel-item';

        // Create image element for carousel
        const img = document.createElement('img');
        img.className = 'd-block w-100';
        img.src = 'data:image/png;base64,' + base64Image;
        img.alt = `Processed Image ${index + 1}`;
        img.style.maxHeight = '60vh';
        img.style.objectFit = 'contain';

        carouselItem.appendChild(img);
        carouselInner.appendChild(carouselItem);

        // Create thumbnail
        const col = document.createElement('div');
        col.className = 'col-3 col-md-2 mb-2';

        const thumbnail = document.createElement('img');
        thumbnail.src = 'data:image/png;base64,' + base64Image;
        thumbnail.className = 'img-thumbnail';
        thumbnail.style.cursor = 'pointer';
        thumbnail.alt = `Thumbnail ${index + 1}`;
        thumbnail.addEventListener('click', function () {
            // Update carousel to show the clicked image
            const carousel = document.getElementById('imageCarousel');
            if (carousel) {
                const bsCarousel = bootstrap.Carousel.getInstance(carousel);
                if (bsCarousel) {
                    bsCarousel.to(index);
                    currentImageIndex = index;
                }
            }
        });

        col.appendChild(thumbnail);
        thumbnailsContainer.appendChild(col);
    });

    console.log('Modal prepared with', processedImages.length, 'images');
}