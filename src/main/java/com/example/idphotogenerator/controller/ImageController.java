package com.example.idphotogenerator.controller;

import com.example.idphotogenerator.service.ImageProcessingService;
import com.example.idphotogenerator.service.PhotoEnhancementService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.idphotogenerator.service.ClothesReplacementService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import com.fasterxml.jackson.core.type.TypeReference;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.nio.file.Path;








@Controller
public class ImageController {

    private static final Logger log = LoggerFactory.getLogger(ImageController.class);

    private final ImageProcessingService imageProcessingService;
    private final ClothesReplacementService clothesReplacementService;
    private final PhotoEnhancementService photoEnhancementService;

    @Autowired
    public ImageController(ImageProcessingService imageProcessingService,
            ClothesReplacementService clothesReplacementService,
            PhotoEnhancementService photoEnhancementService) {
        this.imageProcessingService = imageProcessingService;
        this.clothesReplacementService = clothesReplacementService;
        this.photoEnhancementService = photoEnhancementService;
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
                new TypeReference<Map<String, List<Double>>>() {});
        
        byte[] processedImage = imageProcessingService.removeBackground(image.getBytes(), rectangles);
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
            @RequestParam("backgroundColor") String backgroundColor) {
        try {
            if (image.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            byte[] processedImage = imageProcessingService.changeBackground(image.getBytes(), backgroundColor);
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
            byte[] processedImage = clothesReplacementService.replaceClothes(image.getBytes(), clothesTemplateData);

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
            
            byte[] enhancedImage = photoEnhancementService.enhancePhoto(
                image.getBytes(), brightness, contrast, smoothness);
            
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(enhancedImage);
        } catch (IOException e) {
            log.error("Error enhancing photo", e);
            return ResponseEntity.internalServerError().build();
        }
    }

}
