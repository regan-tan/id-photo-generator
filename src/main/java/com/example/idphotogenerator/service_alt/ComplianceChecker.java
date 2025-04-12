package com.example.idphotogenerator.service_alt;

import java.io.File;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Paths;
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
    // Load from classpath as InputStream
    InputStream cascadeStream = getClass().getClassLoader().getResourceAsStream("haarcascade_frontalface_default.xml");
    if (cascadeStream == null) {
        throw new RuntimeException("❌ Haarcascade file not found in resources.");
    }

    // Create a temporary file and copy the contents of the stream to it
    File tempFile = File.createTempFile("haarcascade", ".xml");
    tempFile.deleteOnExit();
    Files.copy(cascadeStream, tempFile.toPath(), StandardCopyOption.REPLACE_EXISTING);

    // Load the classifier from the temp file
    faceDetector = new CascadeClassifier(tempFile.getAbsolutePath());
    if (faceDetector.empty()) {
        throw new RuntimeException("❌ Failed to load Haar Cascade from: " + tempFile.getAbsolutePath());
    }

    this.image = bytesToMat(imageData);
} catch (Exception e) {
    throw new RuntimeException("❌ Error initializing ComplianceCheckerService: " + e.getMessage(), e);
}

    }
    public Map<String, Object> checkCompliance() {
        Map<String, Object> result = new HashMap<>();

        // Detect faces
        MatOfRect faceDetections = new MatOfRect();
        faceDetector.detectMultiScale(image, faceDetections);

        if (faceDetections.empty()) {
            result.put("status", "Fail");
            result.put("reason", "No face detected.");
            return result;
        }

        Rect face = faceDetections.toArray()[0]; // Assume first face
        double faceCenterY = face.y + face.height / 2.0;
        double imageCenterY = image.height() / 2.0;
        double verticalRatio = (double) face.height / image.height();

        // Loosened thresholds
        boolean isCentered = Math.abs(faceCenterY - imageCenterY) < 80; // allow more vertical offset
        boolean properSize = verticalRatio > 0.4 && verticalRatio < 0.95; // allow smaller/larger faces

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
