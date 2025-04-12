package com.example.idphotogenerator.controller;

import com.example.idphotogenerator.service_alt.BackgroundRemoval;
import com.example.idphotogenerator.service_alt.BatchProcessingService;
import com.example.idphotogenerator.service_alt.ChangeBackground;
import com.example.idphotogenerator.service_alt.ClothesReplacement;
import com.example.idphotogenerator.service_alt.ComplianceChecker;
import com.example.idphotogenerator.service_alt.PhotoEnhancement;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.HttpStatus;

import com.fasterxml.jackson.core.type.TypeReference;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
// import java.util.concurrent.ExecutorService;
// import java.util.concurrent.Executors;
import java.util.stream.Collectors;
import java.util.Base64;
import java.nio.file.Path;

@Controller
public class ImageController_alt {

    static {
        nu.pattern.OpenCV.loadLocally();
    }
    private static final Logger log = LoggerFactory.getLogger(ImageController_alt.class);


    // private final ExecutorService executorService = Executors.newFixedThreadPool(
    //         Math.max(2, Runtime.getRuntime().availableProcessors()));

    private String mapColorNameToHex(String colorName) {
        // Map color names to hex codes for the ChangeBackground class
        Map<String, String> colorMap = new HashMap<>();
        // Basic colors
        colorMap.put("white", "#FFFFFF");
        colorMap.put("black", "#000000");
        colorMap.put("red", "#FF0000");
        colorMap.put("green", "#00FF00");
        colorMap.put("blue", "#87CEEB");
        colorMap.put("yellow", "#FFFF00");
        colorMap.put("gray", "#808080");

        // Add the complex color names from your dropdown
        colorMap.put("light_gray", "#D3D3D3");
        colorMap.put("light_blue", "#87CEEB");
        colorMap.put("steel_blue", "#B0C4DE");
        colorMap.put("off_white", "#F5F5F5");
        colorMap.put("light_cyan", "#E0FFFF");

        // Return the hex if the color name is mapped, or the original string if it appears to be a hex code
        if (colorName.startsWith("#")) {
            return colorName;
        }

        return colorMap.getOrDefault(colorName.toLowerCase(), "#FFFFFF");  // Default to white if not found
    }

    @GetMapping("/")
    public String index() {
        return "index";
    }

    @PostMapping(value = "/api/remove-background", produces = MediaType.IMAGE_PNG_VALUE)
    @ResponseBody
    public ResponseEntity<byte[]> removeBackground(
            @RequestParam("image") MultipartFile image,
            @RequestParam("rectangles") String rectanglesJson) {
        try {
            if (image.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            // Parse the JSON string to a Map
            ObjectMapper mapper = new ObjectMapper();
            Map<String, List<Double>> rectangles = mapper.readValue(rectanglesJson,
                    new TypeReference<Map<String, List<Double>>>() {
            });
            BackgroundRemoval backgroundRemoval = new BackgroundRemoval(image.getBytes(), rectangles);
            byte[] processedImage = backgroundRemoval.removeBackground();
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(processedImage);
        } catch (IOException e) {
            log.error("Error processing image for background removal", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping(value = "/api/change-background", produces = MediaType.IMAGE_PNG_VALUE)
    @ResponseBody
    public ResponseEntity<byte[]> changeBackground(
            @RequestParam("image") MultipartFile image,
            @RequestParam("backgroundColor") String backgroundColor,
            @RequestParam(value = "backgroundImage", required = false) MultipartFile backgroundImage) {
        try {
            if (image.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            byte[] backgroundImageData = null;
            if (backgroundImage != null && !backgroundImage.isEmpty()) {
                backgroundImageData = backgroundImage.getBytes();
            }

            // Create the ChangeBackground instance with the correct parameters, including backgroundImageData
            ChangeBackground changeBackground = new ChangeBackground(
                    image.getBytes(),
                    backgroundColor,
                    backgroundImageData
            );

            // Call the changeBackground method without parameters
            byte[] processedImage = changeBackground.changeBackground();

            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(processedImage);
        } catch (IOException e) {
            log.error("Error processing image for background change", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping(value = "/api/replace-clothes", produces = MediaType.IMAGE_PNG_VALUE)
    @ResponseBody
    public ResponseEntity<byte[]> replaceClothes(@RequestParam("image") MultipartFile image,
            @RequestParam("templateName") String templateName) {
        try {
            if (image.isEmpty()) {
                log.error("User image is missing");
                return ResponseEntity.badRequest().build();
            }

            log.info("Received user image for clothes replacement with template: {}", templateName);

            // Dynamically build the path based on the templateName
            Path clothesTemplatePath = Paths.get("src/main/resources/static/images/" + templateName + ".png");
            if (!Files.exists(clothesTemplatePath)) {
                log.error("Clothes template not found: {}", templateName);
                return ResponseEntity.badRequest().build();
            }

            byte[] clothesTemplateData = Files.readAllBytes(clothesTemplatePath);

            // Process the images and get the result
            ClothesReplacement clothesReplacement = new ClothesReplacement(image.getBytes(), clothesTemplateData);
            byte[] processedImage = clothesReplacement.replaceClothes();

            // Return the processed image as a response
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(processedImage);
        } catch (IOException e) {
            log.error("Error processing image for clothes replacement", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping(value = "/api/enhance-photo", produces = MediaType.IMAGE_PNG_VALUE)
    @ResponseBody
    public ResponseEntity<byte[]> enhancePhoto(
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "brightness", defaultValue = "0") int brightness,
            @RequestParam(value = "contrast", defaultValue = "0") int contrast,
            @RequestParam(value = "smoothness", defaultValue = "0") int smoothness) {
        try {
            if (image.isEmpty()) {
                log.error("Image is missing for enhancement");
                return ResponseEntity.badRequest().build();
            }

            // Validate parameters
            brightness = Math.max(-100, Math.min(100, brightness));
            contrast = Math.max(-100, Math.min(100, contrast));
            smoothness = Math.max(0, Math.min(100, smoothness));

            log.info("Enhancing photo with brightness={}, contrast={}, smoothness={}",
                    brightness, contrast, smoothness);
            PhotoEnhancement photoEnhancement = new PhotoEnhancement(image.getBytes(), brightness, contrast,
                    smoothness);
            byte[] enhancedImage = photoEnhancement.enhancePhoto();

            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(enhancedImage);
        } catch (IOException e) {
            log.error("Error enhancing photo", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/api/check-compliance")
    @ResponseBody
    public Map<String, Object> checkCompliance(@RequestParam("file") MultipartFile file) throws IOException {
        ComplianceChecker complianceChecker = new ComplianceChecker(file.getBytes());
        return complianceChecker.checkCompliance();
    }

    @Autowired
    private BatchProcessingService batchProcessingService;

// Endpoint for batch processing
    @PostMapping("/api/batch/process")
    @ResponseBody

    public ResponseEntity<?> processBatch(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "backgroundColor", defaultValue = "white") String backgroundColor,
            @RequestParam(value = "backgroundImage", required = false) MultipartFile backgroundImage) {

        try {
            if (files == null || files.isEmpty()) {
                log.warn("No files uploaded for batch processing");
                return ResponseEntity.badRequest().body(Map.of("error", "No files uploaded"));
            }

            if (files.size() > 10) {
                log.warn("Too many files uploaded: {}", files.size());
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Maximum 10 images allowed for batch processing"));
            }

            log.info("Starting batch processing for {} images with background color: {}",
                    files.size(), backgroundColor);

            // Get background image data if provided
            byte[] backgroundImageData = null;
            if (backgroundImage != null && !backgroundImage.isEmpty()) {
                backgroundImageData = backgroundImage.getBytes();
                log.info("Using background image: {}, size: {}", backgroundImage.getOriginalFilename(), backgroundImage.getSize());
            }

            // Process images sequentially instead of using the batch service
            List<byte[]> processedImages = new ArrayList<>();

            for (MultipartFile file : files) {
                try {
                    log.info("Processing file: {}, size: {}", file.getOriginalFilename(), file.getSize());

                    // Create an empty map for rectangles instead of using a string
                    // ObjectMapper mapper = new ObjectMapper();
                    Map<String, List<Double>> emptyRectangles = new HashMap<>();

                    // Use the correct constructor that takes a Map
                    BackgroundRemoval backgroundRemoval = new BackgroundRemoval(file.getBytes(), emptyRectangles);
                    byte[] withoutBackground = backgroundRemoval.removeBackground();

                    // Change background color using the updated constructor
                    String colorToUse = mapColorNameToHex(backgroundColor);
                    ChangeBackground changeBackground = new ChangeBackground(withoutBackground, colorToUse, backgroundImageData);
                    byte[] result = changeBackground.changeBackground();

                    processedImages.add(result);
                    log.info("Successfully processed file: {}", file.getOriginalFilename());
                } catch (Exception e) {
                    log.error("Error processing file: {}", file.getOriginalFilename(), e);
                    // Continue with next file
                }
            }

            if (processedImages.isEmpty()) {
                return ResponseEntity.internalServerError()
                        .body(Map.of("error", "Failed to process any images"));
            }

            // Convert to base64 for JSON response
            List<String> base64Images = processedImages.stream()
                    .map(Base64.getEncoder()::encodeToString)
                    .collect(Collectors.toList());

            log.info("Batch processing completed successfully for {} images", processedImages.size());
            Map<String, Object> response = new HashMap<>();
            response.put("images", base64Images);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error in batch processing", e);
            String errorMessage = e.getMessage();
            if (e.getCause() != null) {
                errorMessage += " | Cause: " + e.getCause().getMessage();
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error processing batch: " + errorMessage));
        }
    }

    @PostMapping(value = "/api/batch/download", produces = "application/zip")
    public ResponseEntity<byte[]> downloadBatchZip(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "backgroundColor", defaultValue = "white") String backgroundColor,
            @RequestParam(value = "backgroundImage", required = false) MultipartFile backgroundImage) {

        try {
            if (files == null || files.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            log.info("Preparing batch download for {} images", files.size());

            // Get background image data if provided
            byte[] backgroundImageData = null;
            if (backgroundImage != null && !backgroundImage.isEmpty()) {
                backgroundImageData = backgroundImage.getBytes();
                log.info("Using background image for download: {}", backgroundImage.getOriginalFilename());
            }

            // Process the images same as in processBatch method
            List<byte[]> processedImages = new ArrayList<>();

            for (MultipartFile file : files) {
                try {
                    // ObjectMapper mapper = new ObjectMapper();
                    Map<String, List<Double>> emptyRectangles = new HashMap<>();

                    BackgroundRemoval backgroundRemoval = new BackgroundRemoval(file.getBytes(), emptyRectangles);
                    byte[] withoutBackground = backgroundRemoval.removeBackground();

                    String colorToUse = mapColorNameToHex(backgroundColor);
                    // Use the updated constructor with background image
                    ChangeBackground changeBackground = new ChangeBackground(withoutBackground, colorToUse, backgroundImageData);
                    byte[] result = changeBackground.changeBackground();

                    processedImages.add(result);
                } catch (Exception e) {
                    log.error("Error processing file for download: {}", file.getOriginalFilename(), e);
                    // Continue with next file
                }
            }

            if (processedImages.isEmpty()) {
                return ResponseEntity.internalServerError().build();
            }

            // Create zip file
            byte[] zipData = batchProcessingService.createZipFromProcessedImages(processedImages);

            // Return as attachment
            return ResponseEntity.ok()
                    .header("Content-Disposition", "attachment; filename=\"processed_images.zip\"")
                    .body(zipData);

        } catch (Exception e) {
            log.error("Error creating batch download", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}