package com.example.idphotogenerator.service;

import java.net.URL;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

import org.opencv.core.Mat;
import org.opencv.core.MatOfRect;
import org.opencv.core.Rect;
import org.opencv.objdetect.CascadeClassifier;
import org.springframework.stereotype.Service;


@Service
public class ComplianceCheckerService {

    private final CascadeClassifier faceDetector;

    public ComplianceCheckerService() {
    try {
        URL resource = getClass().getClassLoader().getResource("haarcascade_frontalface_default.xml");
        if (resource == null) {
            throw new RuntimeException("❌ Haarcascade file not found in resources.");
        }

        String modelPath = Paths.get(resource.toURI()).toString();
        faceDetector = new CascadeClassifier(modelPath);

        if (faceDetector.empty()) {
            throw new RuntimeException("❌ Failed to load Haar Cascade from: " + modelPath);
        }

    } catch (Exception e) {
        throw new RuntimeException("❌ Error initializing ComplianceCheckerService: " + e.getMessage(), e);
    }
}

    public Map<String, Object> checkCompliance(Mat image) {
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
