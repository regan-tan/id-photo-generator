package com.example.idphotogenerator.controller;

import com.example.idphotogenerator.service.ImageProcessingService;
import com.example.idphotogenerator.service.ClothesReplacementService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Autowired;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.Path;


@Controller
@Slf4j
public class ImageController {

    private final ImageProcessingService imageProcessingService;
    private final ClothesReplacementService clothesReplacementService;

    @Autowired
    public ImageController(ImageProcessingService imageProcessingService, ClothesReplacementService clothesReplacementService) {
        this.imageProcessingService = imageProcessingService;
        this.clothesReplacementService = clothesReplacementService;
    }

    @GetMapping("/")
    public String index() {
        return "index";
    }

    @PostMapping(value = "/api/remove-background", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> removeBackground(@RequestParam("image") MultipartFile image) {
        try {
            if (image.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            byte[] processedImage = imageProcessingService.removeBackground(image.getBytes());
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(processedImage);
        } catch (IOException e) {
            log.error("Error processing image for background removal", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping(value = "/api/change-background", produces = MediaType.IMAGE_PNG_VALUE)
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

}
