package com.example.idphotogenerator.service;

import org.opencv.core.*;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;
import org.springframework.stereotype.Service;
import nu.pattern.OpenCV;

import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.awt.Color;

@Service
public class ImageProcessingService {

    @PostConstruct
    public void init() {
        OpenCV.loadLocally();
    }

    public byte[] removeBackground(byte[] imageData) throws IOException {
        // Convert byte array to Mat
        Mat image = bytesToMat(imageData);
        
        // Convert to HSV color space
        Mat hsv = new Mat();
        Imgproc.cvtColor(image, hsv, Imgproc.COLOR_BGR2HSV);
        
        // Create mask for skin color detection
        Scalar lowerBound = new Scalar(0, 20, 70);
        Scalar upperBound = new Scalar(20, 255, 255);
        Mat mask = new Mat();
        Core.inRange(hsv, lowerBound, upperBound, mask);
        
        // Apply morphological operations to improve mask
        Mat kernel = Imgproc.getStructuringElement(Imgproc.MORPH_ELLIPSE, new Size(5, 5));
        Imgproc.morphologyEx(mask, mask, Imgproc.MORPH_CLOSE, kernel);
        Imgproc.morphologyEx(mask, mask, Imgproc.MORPH_OPEN, kernel);
        
        // Find the largest contour (assumed to be the person)
        Mat hierarchy = new Mat();
        java.util.List<MatOfPoint> contours = new java.util.ArrayList<>();
        Imgproc.findContours(mask, contours, hierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE);
        
        if (!contours.isEmpty()) {
            // Find the largest contour
            MatOfPoint largestContour = contours.get(0);
            for (MatOfPoint contour : contours) {
                if (Imgproc.contourArea(contour) > Imgproc.contourArea(largestContour)) {
                    largestContour = contour;
                }
            }
            
            // Create new mask with only the largest contour
            mask.setTo(new Scalar(0));
            Imgproc.drawContours(mask, java.util.Arrays.asList(largestContour), -1, new Scalar(255), -1);
        }
        
        // Apply the mask to the original image
        Mat result = new Mat();
        image.copyTo(result, mask);
        
        return matToBytes(result);
    }

    public byte[] changeBackground(byte[] imageData, String backgroundColor) throws IOException {
        // First remove the background
        byte[] transparentImage = removeBackground(imageData);
        
        // Convert the color string to RGB values
        Color color = Color.decode(backgroundColor);
        
        // Create a new image with the specified background color
        BufferedImage original = ImageIO.read(new ByteArrayInputStream(transparentImage));
        BufferedImage result = new BufferedImage(original.getWidth(), original.getHeight(), BufferedImage.TYPE_INT_RGB);
        
        // Fill the background with the specified color
        for (int x = 0; x < result.getWidth(); x++) {
            for (int y = 0; y < result.getHeight(); y++) {
                result.setRGB(x, y, color.getRGB());
            }
        }
        
        // Copy the foreground from the original image
        for (int x = 0; x < original.getWidth(); x++) {
            for (int y = 0; y < original.getHeight(); y++) {
                int pixel = original.getRGB(x, y);
                if ((pixel >> 24) != 0) { // If not transparent
                    result.setRGB(x, y, pixel);
                }
            }
        }
        
        // Convert the result back to bytes
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(result, "png", baos);
        return baos.toByteArray();
    }

    private Mat bytesToMat(byte[] imageData) throws IOException {
        // Convert byte array to BufferedImage
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageData));
        
        // Convert BufferedImage to Mat
        Mat mat = new Mat(image.getHeight(), image.getWidth(), CvType.CV_8UC3);
        byte[] data = new byte[image.getWidth() * image.getHeight() * (int)mat.elemSize()];
        int[] dataBuff = new int[image.getWidth() * image.getHeight()];
        image.getRGB(0, 0, image.getWidth(), image.getHeight(), dataBuff, 0, image.getWidth());
        
        for (int i = 0; i < dataBuff.length; i++) {
            data[i * 3] = (byte) ((dataBuff[i] >> 16) & 0xFF);
            data[i * 3 + 1] = (byte) ((dataBuff[i] >> 8) & 0xFF);
            data[i * 3 + 2] = (byte) ((dataBuff[i]) & 0xFF);
        }
        
        mat.put(0, 0, data);
        return mat;
    }

    private byte[] matToBytes(Mat mat) throws IOException {
        // Create a temporary buffer to store the image
        MatOfByte mob = new MatOfByte();
        Imgcodecs.imencode(".png", mat, mob);
        return mob.toArray();
    }
}
