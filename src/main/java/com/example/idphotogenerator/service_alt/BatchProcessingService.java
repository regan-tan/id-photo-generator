package com.example.idphotogenerator.service_alt;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class BatchProcessingService {

    private static final Logger log = LoggerFactory.getLogger(BatchProcessingService.class);

    private final ExecutorService executorService = Executors.newFixedThreadPool(
            Math.max(2, Runtime.getRuntime().availableProcessors()));

    public List<byte[]> processBatchImages(List<MultipartFile> files,
            String backgroundColor) throws Exception {
        log.info("Processing batch of {} images with background color: {}", files.size(), backgroundColor);

        List<CompletableFuture<byte[]>> futures = new ArrayList<>();

        // Submit each image for processing
        for (MultipartFile file : files) {
            log.info("Processing file: {}, size: {}", file.getOriginalFilename(), file.getSize());

            CompletableFuture<byte[]> future = CompletableFuture.supplyAsync(() -> {
                try {
                    // Validate file
                    if (file.isEmpty()) {
                        log.error("Empty file detected");
                        throw new IllegalArgumentException("Empty file detected");
                    }

                    byte[] fileBytes = file.getBytes();
                    if (fileBytes.length == 0) {
                        log.error("File has zero bytes");
                        throw new IllegalArgumentException("File has zero bytes");
                    }

                    // Call your existing processing methods - WITH NULL RECTANGLES
                    // This will use automatic background removal instead of manual
                    log.debug("Removing background for file: {}", file.getOriginalFilename());
                    BackgroundRemoval backgroundRemoval = new BackgroundRemoval(fileBytes, null);
                    byte[] withoutBackground = backgroundRemoval.removeBackground();

                    if (withoutBackground == null || withoutBackground.length == 0) {
                        log.error("Background removal produced empty result");
                        throw new RuntimeException("Background removal failed to produce a valid image");
                    }

                    log.debug("Changing background color to: {}", backgroundColor);
                    ChangeBackground changeBackground = new ChangeBackground(withoutBackground, backgroundColor, null);
                    byte[] result = changeBackground.changeBackground();

                    if (result == null || result.length == 0) {
                        log.error("Background color change produced empty result");
                        throw new RuntimeException("Background color change failed to produce a valid image");
                    }

                    log.debug("Successfully processed file: {}", file.getOriginalFilename());
                    return result;
                } catch (Exception e) {
                    log.error("Error processing image: {}", e.getMessage(), e);
                    throw new RuntimeException("Failed to process image: " + e.getMessage(), e);
                }
            }, executorService);

            futures.add(future);
        }

        try {
            // Wait for all futures to complete and collect results
            CompletableFuture<Void> allFutures = CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]));

            // Get all processed images
            List<byte[]> results = allFutures.thenApply(v -> futures.stream()
                    .map(CompletableFuture::join)
                    .collect(Collectors.toList())).get();

            log.info("Successfully processed {} images", results.size());
            return results;
        } catch (Exception e) {
            log.error("Error waiting for batch processing to complete", e);
            throw e;
        }
    }

    public byte[] createZipFromProcessedImages(List<byte[]> processedImages) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ZipOutputStream zos = new ZipOutputStream(baos);

        for (int i = 0; i < processedImages.size(); i++) {
            ZipEntry entry = new ZipEntry("id_photo_" + (i + 1) + ".png");
            zos.putNextEntry(entry);
            zos.write(processedImages.get(i));
            zos.closeEntry();
        }

        zos.close();
        return baos.toByteArray();
    }
}
