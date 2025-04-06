package com.example.idphotogenerator.service_alt;

import org.opencv.core.*;

import org.opencv.imgproc.Imgproc;


import java.io.IOException;



public class PhotoEnhancement extends ImageProcessor{
    private int brightness;
    private int contrast;
    private int smoothness;
    private Mat enhancedImage;

    public PhotoEnhancement(byte[] imageData,             
    int brightness,
    int contrast,
    int smoothness){
        super(imageData);
        this.brightness = brightness;
        this.contrast = contrast;
        this.smoothness = smoothness;
    }
        public byte[] enhancePhoto() throws IOException {
        // Convert byte array to OpenCV Mat format
        Mat originalImage = bytesToMat(imageData);
        
        // Apply enhancements
        enhancedImage = originalImage.clone();
        
        // Apply brightness and contrast adjustment
        if (brightness != 0 || contrast != 0) {
            adjustBrightnessContrast();
        }
        
        // Apply skin smoothing if needed
        if (smoothness > 0) {
            smoothSkin();
        }
        
        // Convert back to byte array
        byte[] resultBytes = matToBytes(enhancedImage);
        
        // Clean up resources
        originalImage.release();
        enhancedImage.release();
        
        return resultBytes;
    }
    private void adjustBrightnessContrast() {
        
        // Normalize parameters to OpenCV expected ranges
        double alpha = (100.0 + contrast) / 100.0; // Contrast control (1.0-3.0)
        double beta = brightness; // Brightness control (0-100)
        
        // Apply brightness and contrast adjustment
        enhancedImage.convertTo(enhancedImage, -1, alpha, beta);
        

    }
        private void smoothSkin() {
        // Clone original for face/skin detection
        Mat skinMask = detectSkin();
        Mat result = enhancedImage.clone();
        
        // Scale smoothness to appropriate bilateral filter parameters
        int d = 7 + (smoothness / 20); // Filter size based on smoothness
        double sigmaColor = smoothness * 2.0; // Color sigma based on smoothness
        double sigmaSpace = smoothness / 2.0; // Space sigma based on smoothness
        
        // Apply bilateral filter (edge-preserving smoothing)
        Mat smoothed = new Mat();
        Imgproc.bilateralFilter(enhancedImage, smoothed, d, sigmaColor, sigmaSpace);
        
        // Blend original with smoothed only in skin regions
        for (int y = 0; y < enhancedImage.rows(); y++) {
            for (int x = 0; x < enhancedImage.cols(); x++) {
                double[] skinValue = skinMask.get(y, x);
                if (skinValue != null && skinValue[0] > 0) {
                    // This is a skin pixel - use smoothed version
                    result.put(y, x, smoothed.get(y, x));
                }
            }
        }
        
        // Clean up
        skinMask.release();
        smoothed.release();
        
        enhancedImage = result;
    }
    
    /**
     * Detects skin regions in an image
     */
    private Mat detectSkin() {
        // Convert to HSV color space
        Mat hsv = new Mat();
        Imgproc.cvtColor(enhancedImage, hsv, Imgproc.COLOR_BGR2HSV);
        
        // Define range of skin color in HSV
        Mat skinMask = new Mat();
        Scalar lowerBound = new Scalar(0, 20, 70); // Lower threshold for skin
        Scalar upperBound = new Scalar(20, 150, 255); // Upper threshold for skin
        
        // Create binary mask of skin pixels
        Core.inRange(hsv, lowerBound, upperBound, skinMask);
        
        // Improve mask with morphological operations
        Mat kernel = Imgproc.getStructuringElement(Imgproc.MORPH_ELLIPSE, new Size(11, 11));
        Imgproc.morphologyEx(skinMask, skinMask, Imgproc.MORPH_OPEN, kernel);
        
        // Clean up
        hsv.release();
        kernel.release();
        
        return skinMask;
    }
}
