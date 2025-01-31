package com.example.idphotogenerator.controller;

import com.example.idphotogenerator.service.ImageProcessingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Controller
@RequiredArgsConstructor
public class ImageController {

    private final ImageProcessingService imageProcessingService;

    @GetMapping("/")
    public String index() {
        return "index";
    }

    @PostMapping(value = "/api/remove-background", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> removeBackground(@RequestParam("image") MultipartFile image) {
        try {
            byte[] processedImage = imageProcessingService.removeBackground(image.getBytes());
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(processedImage);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping(value = "/api/change-background", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> changeBackground(
            @RequestParam("image") MultipartFile image,
            @RequestParam("backgroundColor") String backgroundColor) {
        try {
            byte[] processedImage = imageProcessingService.changeBackground(image.getBytes(), backgroundColor);
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(processedImage);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
