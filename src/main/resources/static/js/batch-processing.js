
let processedImages = [];
let currentImageIndex = 0;
let selectedFiles = [];

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const batchFileInput = document.getElementById('batchFileInput');
    const addBatchFilesBtn = document.getElementById('addBatchFilesBtn');
    const selectedBatchFiles = document.getElementById('selectedBatchFiles');
    const processBatchBtn = document.getElementById('processBatchBtn');
    const batchBackgroundColor = document.getElementById('batchBackgroundColor');
    const viewImagesBtn = document.getElementById('viewImagesBtn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const downloadCurrentBtn = document.getElementById('downloadCurrentBtn');

    const openBatchBtn = document.getElementById('openBatchProcessingBtn');
    const closeBatchBtn = document.getElementById('closeBatchProcessingBtn');
    const batchCollapsed = document.getElementById('batchProcessingCollapsed');
    const batchExpanded = document.getElementById('batchProcessingExpanded');
    const batchProcessingToggle = document.getElementById('batchProcessingToggle');
    const batchProcessingSticky = document.getElementById('batchProcessingSticky');

    // Helper: Update Selected Files UI
    function updateSelectedFilesDisplay() {
        selectedBatchFiles.innerHTML = '';

        if (selectedFiles.length === 0) {
            selectedBatchFiles.innerHTML = '<p class="text-muted small text-center">No files selected yet</p>';
            processBatchBtn.disabled = true;
            return;
        }

        selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            const previewImg = document.createElement('img');
previewImg.className = 'img-thumbnail me-2';
previewImg.style.height = '60px';
previewImg.style.objectFit = 'cover';

const reader = new FileReader();
reader.onload = e => previewImg.src = e.target.result;
reader.readAsDataURL(file);

const fileName = document.createElement('div');
fileName.className = 'file-name d-flex align-items-center';
fileName.appendChild(previewImg);

const nameText = document.createElement('div');
nameText.textContent = file.name;
nameText.className = 'ms-2';
fileName.appendChild(nameText);


            const size = (file.size / 1024).toFixed(1);
            const sizeInfo = document.createElement('small');
            sizeInfo.className = 'text-muted ms-2';
            sizeInfo.textContent = `(${size} KB)`;
            fileName.appendChild(sizeInfo);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-file';
            removeBtn.innerHTML = '&times;';
            removeBtn.type = 'button';
            removeBtn.title = 'Remove';
            removeBtn.onclick = () => {
                selectedFiles.splice(index, 1);
                updateSelectedFilesDisplay();
            };

            fileItem.appendChild(fileName);
            fileItem.appendChild(removeBtn);
            selectedBatchFiles.appendChild(fileItem);
        });

        // Footer with count and clear all
        const footer = document.createElement('div');
        footer.className = 'file-count-row';

        const count = document.createElement('div');
        count.textContent = `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected`;

        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn btn-sm btn-outline-danger';
        clearBtn.textContent = 'Clear All';
        clearBtn.onclick = () => {
            selectedFiles = [];
            updateSelectedFilesDisplay();
        };

        footer.appendChild(count);
        footer.appendChild(clearBtn);
        selectedBatchFiles.appendChild(footer);

        processBatchBtn.disabled = false;
    }

    // File Input Handler
    batchFileInput.addEventListener('change', (e) => {
        const newFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
        selectedFiles = [...selectedFiles, ...newFiles].slice(0, 10); // Limit to 10
        if (selectedFiles.length > 10) {
            alert('Maximum 10 images allowed. Only the first 10 were selected.');
        }
        updateSelectedFilesDisplay();
        batchFileInput.value = '';
    });

    // Add Files Button
    if (addBatchFilesBtn) {
        addBatchFilesBtn.addEventListener('click', () => {
            batchFileInput.click();
        });
    }

    // Process Button
    processBatchBtn.addEventListener('click', () => {
        if (selectedFiles.length === 0) return alert('Select at least one image');

        const spinner = processBatchBtn.querySelector('.spinner-border');
        if (spinner) spinner.classList.remove('d-none');
        processBatchBtn.disabled = true;

        const formData = new FormData();
        selectedFiles.forEach(f => formData.append('files', f));
        if (batchBackgroundColor) {
            formData.append('backgroundColor', batchBackgroundColor.value);
        }

        fetch('/api/batch/process', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                processedImages = data.images;
                prepareImageModal();
                document.getElementById('batchResultContainer').style.display = 'block';
            })
            .catch(err => alert('Error: ' + err.message))
            .finally(() => {
                if (spinner) spinner.classList.add('d-none');
                processBatchBtn.disabled = false;
            });
    });

    // Download All
    downloadAllBtn.addEventListener('click', () => {
        if (selectedFiles.length === 0) return;

        const formData = new FormData();
        selectedFiles.forEach(f => formData.append('files', f));
        if (batchBackgroundColor) {
            formData.append('backgroundColor', batchBackgroundColor.value);
        }

        const original = downloadAllBtn.innerHTML;
        downloadAllBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Creating ZIP...';
        downloadAllBtn.disabled = true;

        const timeout = setTimeout(() => {
            const msg = document.createElement('div');
            msg.id = 'downloadMessage';
            msg.className = 'small text-muted mt-2';
            msg.textContent = 'Large files may take a moment to process.';
            downloadAllBtn.parentNode.appendChild(msg);
        }, 3000);

        fetch('/api/batch/download', { method: 'POST', body: formData })
            .then(res => res.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'processed_images.zip';
                a.click();
                URL.revokeObjectURL(url);

                downloadAllBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Download Complete';
                setTimeout(() => {
                    downloadAllBtn.innerHTML = original;
                    downloadAllBtn.disabled = false;
                }, 2000);
            })
            .catch(err => {
                alert('Download failed: ' + err.message);
                downloadAllBtn.innerHTML = original;
                downloadAllBtn.disabled = false;
            })
            .finally(() => {
                clearTimeout(timeout);
                const msg = document.getElementById('downloadMessage');
                if (msg) msg.remove();
            });
    });

    // Download Current
    downloadCurrentBtn.addEventListener('click', () => {
        if (!processedImages[currentImageIndex]) return;

        const base64 = processedImages[currentImageIndex];
        const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const blob = new Blob([byteArray], { type: 'image/png' });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `id_photo_${currentImageIndex + 1}.png`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Image Modal View
    if (viewImagesBtn) {
        viewImagesBtn.addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('imagesModal'));
            modal.show();
        });
    }

    // Carousel Index Update
    const imageCarousel = document.getElementById('imageCarousel');
    if (imageCarousel) {
        imageCarousel.addEventListener('slid.bs.carousel', e => {
            currentImageIndex = parseInt(e.to);
        });
    }

    // Collapsible Sections
    if (batchProcessingToggle) {
        batchProcessingToggle.addEventListener('click', () => {
            batchProcessingSticky.classList.toggle('collapsed');
            batchProcessingToggle.innerHTML = batchProcessingSticky.classList.contains('collapsed')
                ? '<i class="fas fa-chevron-up me-1"></i> Batch Processing'
                : '<i class="fas fa-chevron-down me-1"></i> Batch Processing';
        });
    }

    if (openBatchBtn) {
        openBatchBtn.addEventListener('click', () => {
            batchCollapsed.style.display = 'none';
            batchExpanded.style.display = 'block';
            batchProcessingSticky.classList.remove('collapsed');
        });
    }

    if (closeBatchBtn) {
        closeBatchBtn.addEventListener('click', () => {
            batchExpanded.style.display = 'none';
            batchCollapsed.style.display = 'block';
        });
    }
});

// Prepare Modal Images
function prepareImageModal() {
    const indicators = document.getElementById('carouselIndicators');
    const carouselInner = document.getElementById('carouselInner');
    const thumbnails = document.getElementById('imageThumbnails');

    indicators.innerHTML = '';
    carouselInner.innerHTML = '';
    thumbnails.innerHTML = '';

    processedImages.forEach((base64, index) => {
        const active = index === 0 ? 'active' : '';

        const indicator = document.createElement('li');
        indicator.dataset.bsTarget = '#imageCarousel';
        indicator.dataset.bsSlideTo = index.toString();
        if (active) indicator.classList.add(active);
        indicators.appendChild(indicator);

        const item = document.createElement('div');
        item.className = `carousel-item ${active}`;

        const img = document.createElement('img');
        img.src = 'data:image/png;base64,' + base64;
        img.className = 'd-block w-100';
        img.alt = `Processed Image ${index + 1}`;
        img.style.maxHeight = '60vh';
        img.style.objectFit = 'contain';

        item.appendChild(img);
        carouselInner.appendChild(item);

        const thumb = document.createElement('img');
        thumb.src = 'data:image/png;base64,' + base64;
        thumb.className = 'img-thumbnail';
        thumb.style.cursor = 'pointer';
        thumb.onclick = () => {
            const carousel = bootstrap.Carousel.getInstance(document.getElementById('imageCarousel'));
            if (carousel) {
                carousel.to(index);
                currentImageIndex = index;
            }
        };

        const col = document.createElement('div');
        col.className = 'col-3 col-md-2 mb-2';
        col.appendChild(thumb);
        thumbnails.appendChild(col);
    });
}

