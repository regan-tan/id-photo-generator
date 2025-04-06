package com.example.idphotogenerator.service_alt;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;

import java.io.IOException;

import javax.imageio.ImageIO;

import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.MatOfByte;
import org.opencv.imgcodecs.Imgcodecs;


import nu.pattern.OpenCV;



public class ImageProcessor{
    protected byte[] imageData;
    static {
        OpenCV.loadLocally();
    }

    public ImageProcessor(byte[] imageData){
        this.imageData = imageData;
        OpenCV.loadLocally();
    }
    protected Mat bytesToMat_clothReplace(byte[] imageData) throws IOException {
        ByteArrayInputStream inputStream = new ByteArrayInputStream(imageData);
        BufferedImage bufferedImage = ImageIO.read(inputStream);

        if (bufferedImage == null) {
            throw new IOException("Failed to decode image");
        }

        // Convert BufferedImage to OpenCV Mat
        return bufferedImageToMat(bufferedImage);
    }
        protected Mat bytesToMat(byte[] imageData) throws IOException {
        // Convert byte array to BufferedImage
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageData));

        // Convert BufferedImage to Mat
        Mat mat = new Mat(image.getHeight(), image.getWidth(), CvType.CV_8UC3);
        byte[] data = new byte[image.getWidth() * image.getHeight() * (int) mat.elemSize()];
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
        protected byte[] matToBytes(Mat mat) throws IOException {
        // Create a temporary buffer to store the image
        MatOfByte mob = new MatOfByte();
        Imgcodecs.imencode(".png", mat, mob);
        return mob.toArray();
    }
    private Mat bufferedImageToMat(BufferedImage image) {
        int width = image.getWidth();
        int height = image.getHeight();
        Mat mat = new Mat(height, width, CvType.CV_8UC4); // 4 channels (RGBA)

        int[] pixels = new int[width * height];
        image.getRGB(0, 0, width, height, pixels, 0, width);
        byte[] data = new byte[width * height * 4]; // RGBA storage

        for (int i = 0; i < pixels.length; i++) {
            int pixel = pixels[i];
            // Correct BGR ordering for OpenCV
            data[i * 4] = (byte) (pixel & 0xFF);           // Blue
            data[i * 4 + 1] = (byte) ((pixel >> 8) & 0xFF); // Green
            data[i * 4 + 2] = (byte) ((pixel >> 16) & 0xFF); // Red
            data[i * 4 + 3] = (byte) ((pixel >> 24) & 0xFF); // Alpha
        }

        mat.put(0, 0, data);
        return mat;
    }
}
