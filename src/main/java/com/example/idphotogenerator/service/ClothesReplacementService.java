package com.example.idphotogenerator.service;

import org.opencv.core.*;
import org.opencv.imgproc.Imgproc;
import org.opencv.imgcodecs.Imgcodecs;
import org.springframework.stereotype.Service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

import javax.imageio.ImageIO;

@Service
public class ClothesReplacementService {

    // Load the suit template from the images directory
    public Mat loadOutfitTemplate(String templateName) throws IOException {
        Path path = Paths.get("resources/static/images/" + templateName);
        byte[] outfitTemplateData = Files.readAllBytes(path);
        return bytesToMat(outfitTemplateData);
    }

    // Replace clothes by overlaying the outfit template onto the user's image
    public byte[] replaceClothes(byte[] userImageData, byte[] outfitTemplateData) throws IOException {
        Mat userImage = bytesToMat(userImageData);
        Mat outfitTemplate = bytesToMat(outfitTemplateData);

        // Resize outfit to fit user image
        Mat resizedOutfit = resizeOutfitToFit(userImage, outfitTemplate);

        // Overlay outfit onto user image
        Mat resultImage = overlayImages(userImage, resizedOutfit);

        // Convert to byte array and return
        return matToBytes(resultImage);
    }

    // Resize outfit template to match user's image while maintaining aspect ratio
    private Mat resizeOutfitToFit(Mat userImage, Mat outfitTemplate) {
        Size userSize = userImage.size();
        Mat resizedOutfit = new Mat();
        Imgproc.resize(outfitTemplate, resizedOutfit, userSize); // Resize to match user image size
        return resizedOutfit;
    }

private Mat overlayImages(Mat userImage, Mat outfitTemplate) {
    // Ensure the outfit template matches the user's image size
    Mat resizedOutfit = new Mat();
    Imgproc.resize(outfitTemplate, resizedOutfit, new Size(userImage.width(), userImage.height()));

    // Split channels
    List<Mat> outfitChannels = new ArrayList<>();
    List<Mat> userChannels = new ArrayList<>();
    
    Core.split(resizedOutfit, outfitChannels);
    Core.split(userImage, userChannels);

    if (outfitChannels.size() == 4) { // Ensure template has an alpha channel
        Mat alpha = outfitChannels.get(3); // Extract alpha channel

        // Normalize alpha channel to range [0,1]
        Mat alphaNormalized = new Mat();
        alpha.convertTo(alphaNormalized, CvType.CV_32F, 1.0 / 255.0);

        // Create an inverse alpha mask (1 - alpha)
        Mat inverseAlpha = new Mat(alphaNormalized.size(), alphaNormalized.type(), Scalar.all(1.0));
        Core.subtract(inverseAlpha, alphaNormalized, inverseAlpha); // Corrected subtraction

        // Convert user image to float for blending
        for (int i = 0; i < 3; i++) {
            Mat blendedChannel = new Mat();
            Mat outfitFloat = new Mat();
            Mat userFloat = new Mat();

            outfitChannels.get(i).convertTo(outfitFloat, CvType.CV_32F);
            userChannels.get(i).convertTo(userFloat, CvType.CV_32F);

            // Perform blending: new_pixel = outfit * alpha + user * (1 - alpha)
            Core.multiply(outfitFloat, alphaNormalized, outfitFloat);
            Core.multiply(userFloat, inverseAlpha, userFloat);
            Core.add(outfitFloat, userFloat, blendedChannel);

            blendedChannel.convertTo(userChannels.get(i), CvType.CV_8U);
        }

        // Merge the blended channels back into a single image
        Core.merge(userChannels, userImage);
    }

    return userImage;
}



    // Convert byte array to OpenCV Mat
    private Mat bytesToMat(byte[] imageData) throws IOException {
        ByteArrayInputStream inputStream = new ByteArrayInputStream(imageData);
        BufferedImage bufferedImage = ImageIO.read(inputStream);

        if (bufferedImage == null) {
            throw new IOException("Failed to decode image");
        }

        // Convert BufferedImage to OpenCV Mat
        return bufferedImageToMat(bufferedImage);
    }

    // Convert OpenCV Mat to byte array
    private byte[] matToBytes(Mat mat) throws IOException {
        MatOfByte buffer = new MatOfByte();
        Imgcodecs.imencode(".png", mat, buffer);
        return buffer.toArray();
    }

    // Convert BufferedImage to OpenCV Mat
    private Mat bufferedImageToMat(BufferedImage image) {
        int width = image.getWidth();
        int height = image.getHeight();
        Mat mat = new Mat(height, width, CvType.CV_8UC4); // 4 channels (RGBA)

        int[] pixels = new int[width * height];
        image.getRGB(0, 0, width, height, pixels, 0, width);
        byte[] data = new byte[width * height * 4]; // RGBA storage

        for (int i = 0; i < pixels.length; i++) {
            int pixel = pixels[i];
            data[i * 4] = (byte) ((pixel >> 16) & 0xFF); // Red
            data[i * 4 + 1] = (byte) ((pixel >> 8) & 0xFF); // Green
            data[i * 4 + 2] = (byte) (pixel & 0xFF); // Blue
            data[i * 4 + 3] = (byte) ((pixel >> 24) & 0xFF); // Alpha
        }

        mat.put(0, 0, data);
        return mat;
    }
}
