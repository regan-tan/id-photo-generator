package com.example.idphotogenerator.service_alt;

import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;

import org.opencv.core.Mat;
import org.opencv.core.MatOfRect;
import org.opencv.core.Rect;
import org.opencv.objdetect.CascadeClassifier;



public class ComplianceChecker extends ImageProcessor{
    static {
        nu.pattern.OpenCV.loadLocally();
    }
    private final CascadeClassifier faceDetector;
    private Mat image;
    public ComplianceChecker(byte[] imageData){
        super(imageData);
          try {
 
    InputStream cascadeStream = getClass().getClassLoader().getResourceAsStream("haarcascade_frontalface_default.xml");
    if (cascadeStream == null) {
        throw new RuntimeException("Haarcascade file not found in resources.");
    }


    File tempFile = File.createTempFile("haarcascade", ".xml");
    tempFile.deleteOnExit();
    Files.copy(cascadeStream, tempFile.toPath(), StandardCopyOption.REPLACE_EXISTING);

   
    faceDetector = new CascadeClassifier(tempFile.getAbsolutePath());
    if (faceDetector.empty()) {
        throw new RuntimeException("Failed to load Haar Cascade from: " + tempFile.getAbsolutePath());
    }

    this.image = bytesToMat(imageData);
} catch (Exception e) {
    throw new RuntimeException("Error initializing ComplianceCheckerService: " + e.getMessage(), e);
}

    }
    public Map<String, Object> checkCompliance() {
        Map<String, Object> result = new HashMap<>();

     
        MatOfRect faceDetections = new MatOfRect();
        faceDetector.detectMultiScale(image, faceDetections);

        if (faceDetections.empty()) {
            result.put("status", "Fail");
            result.put("reason", "No face detected.");
            return result;
        }

        Rect face = faceDetections.toArray()[0]; 
        double faceCenterY = face.y + face.height / 2.0;
        double imageCenterY = image.height() / 2.0;
        double verticalRatio = (double) face.height / image.height();

      
        boolean isCentered = Math.abs(faceCenterY - imageCenterY) < 80; 
        boolean properSize = verticalRatio > 0.4 && verticalRatio < 0.95; 

        if (isCentered && properSize) {
            result.put("status", "Pass");
            result.put("details", "Face is centered and properly sized.");
        } else {
            result.put("status", "Fail");
            result.put("reason", "Face not centered or not properly sized.");
        }
        return result;
    }
}
