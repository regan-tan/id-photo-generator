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
       
        Mat originalImage = bytesToMat(imageData);
        
        enhancedImage = originalImage.clone();
        
        if (brightness != 0 || contrast != 0) {
            adjustBrightnessContrast();
        }
        
        if (smoothness > 0) {
            smoothSkin();
        }
        
        byte[] resultBytes = matToBytes(enhancedImage);
        
        originalImage.release();
        enhancedImage.release();
        
        return resultBytes;
    }
    private void adjustBrightnessContrast() {
  
        double alpha = (100.0 + contrast) / 100.0;
        double beta = brightness; 
        
        enhancedImage.convertTo(enhancedImage, -1, alpha, beta);
    }
        private void smoothSkin() {
      
        Mat skinMask = detectSkin();
        Mat result = enhancedImage.clone();
        
        int d = 7 + (smoothness / 20); 
        double sigmaColor = smoothness * 2.0; 
        double sigmaSpace = smoothness / 2.0; 
        
        Mat smoothed = new Mat();
        Imgproc.bilateralFilter(enhancedImage, smoothed, d, sigmaColor, sigmaSpace);
    
        for (int y = 0; y < enhancedImage.rows(); y++) {
            for (int x = 0; x < enhancedImage.cols(); x++) {
                double[] skinValue = skinMask.get(y, x);
                if (skinValue != null && skinValue[0] > 0) {
            
                    result.put(y, x, smoothed.get(y, x));
                }
            }
        }
        
        // Clean up
        skinMask.release();
        smoothed.release();
        
        enhancedImage = result;
    }
    
    private Mat detectSkin() {
    
        Mat hsv = new Mat();
        Imgproc.cvtColor(enhancedImage, hsv, Imgproc.COLOR_BGR2HSV);
        

        Mat skinMask = new Mat();
        Scalar lowerBound = new Scalar(0, 20, 70); 
        Scalar upperBound = new Scalar(20, 150, 255);
        
        Core.inRange(hsv, lowerBound, upperBound, skinMask);
        
        Mat kernel = Imgproc.getStructuringElement(Imgproc.MORPH_ELLIPSE, new Size(11, 11));
        Imgproc.morphologyEx(skinMask, skinMask, Imgproc.MORPH_OPEN, kernel);
       
        hsv.release();
        kernel.release();
        
        return skinMask;
    }
}