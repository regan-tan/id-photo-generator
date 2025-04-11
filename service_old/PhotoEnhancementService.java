package com.example.idphotogenerator.service_old;

import org.opencv.core.*;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;

@Service
public class PhotoEnhancementService {

    /**
     * Enhances a photo with adjustable parameters
     */
    public byte[] enhancePhoto(byte[] imageData, int brightness, int contrast, int smoothness) throws IOException {
        // Convert byte array to OpenCV Mat format
        Mat originalImage = bytesToMat(imageData);
        
        // Apply enhancements
        Mat enhancedImage = originalImage.clone();
        
        // Apply brightness and contrast adjustment
        if (brightness != 0 || contrast != 0) {
            enhancedImage = adjustBrightnessContrast(enhancedImage, brightness, contrast);
        }
        
        // Apply skin smoothing if needed
        if (smoothness > 0) {
            enhancedImage = smoothSkin(enhancedImage, smoothness);
        }
        
        // Convert back to byte array
        byte[] resultBytes = matToBytes(enhancedImage);
        
        // Clean up resources
        originalImage.release();
        enhancedImage.release();
        
        return resultBytes;
    }
    
    /**
     * Adjusts brightness and contrast of an image
     */
    private Mat adjustBrightnessContrast(Mat image, int brightness, int contrast) {
        Mat result = new Mat();
        
        // Normalize parameters to OpenCV expected ranges
        double alpha = (100.0 + contrast) / 100.0; // Contrast control (1.0-3.0)
        double beta = brightness; // Brightness control (0-100)
        
        // Apply brightness and contrast adjustment
        image.convertTo(result, -1, alpha, beta);
        
        return result;
    }
    
    /**
     * Applies skin smoothing effect
     */
    private Mat smoothSkin(Mat image, int smoothness) {
        // Clone original for face/skin detection
        Mat skinMask = detectSkin(image);
        Mat result = image.clone();
        
        // Scale smoothness to appropriate bilateral filter parameters
        int d = 7 + (smoothness / 20); // Filter size based on smoothness
        double sigmaColor = smoothness * 2.0; // Color sigma based on smoothness
        double sigmaSpace = smoothness / 2.0; // Space sigma based on smoothness
        
        // Apply bilateral filter (edge-preserving smoothing)
        Mat smoothed = new Mat();
        Imgproc.bilateralFilter(image, smoothed, d, sigmaColor, sigmaSpace);
        
        // Blend original with smoothed only in skin regions
        for (int y = 0; y < image.rows(); y++) {
            for (int x = 0; x < image.cols(); x++) {
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
        
        return result;
    }
    
    /**
     * Detects skin regions in an image
     */
    private Mat detectSkin(Mat image) {
        // Convert to HSV color space
        Mat hsv = new Mat();
        Imgproc.cvtColor(image, hsv, Imgproc.COLOR_BGR2HSV);
        
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
    
    /**
     * Convert byte array to OpenCV Mat
     */
    private Mat bytesToMat(byte[] imageData) throws IOException {
        ByteArrayInputStream inputStream = new ByteArrayInputStream(imageData);
        BufferedImage bufferedImage = ImageIO.read(inputStream);
        
        if (bufferedImage == null) {
            throw new IOException("Failed to decode image");
        }
        
        // Convert BufferedImage to Mat
        int width = bufferedImage.getWidth();
        int height = bufferedImage.getHeight();
        
        Mat mat = new Mat(height, width, CvType.CV_8UC3);
        byte[] data = new byte[width * height * 3];
        
        int[] pixels = new int[width * height];
        bufferedImage.getRGB(0, 0, width, height, pixels, 0, width);
        
        for (int i = 0; i < pixels.length; i++) {
            int rgb = pixels[i];
            data[i * 3] = (byte) ((rgb >> 16) & 0xFF); // Red
            data[i * 3 + 1] = (byte) ((rgb >> 8) & 0xFF); // Green
            data[i * 3 + 2] = (byte) (rgb & 0xFF); // Blue
        }
        
        mat.put(0, 0, data);
        return mat;
    }
    
    /**
     * Convert OpenCV Mat to byte array
     */
    private byte[] matToBytes(Mat mat) throws IOException {
        MatOfByte buffer = new MatOfByte();
        Imgcodecs.imencode(".png", mat, buffer);
        return buffer.toArray();
    }
}