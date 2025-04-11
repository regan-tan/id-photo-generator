package com.example.idphotogenerator.service_alt;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import javax.imageio.ImageIO;

public class ChangeBackground extends ImageProcessor {

    private String backgroundColor;
    private byte[] backgroundImageData;

    // Updated constructor to accept background image data
    public ChangeBackground(byte[] imageData, String backgroundColor, byte[] backgroundImageData) {
        super(imageData);
        this.backgroundColor = backgroundColor;
        this.backgroundImageData = backgroundImageData;
    }

    public byte[] changeBackground() throws IOException {
        // First remove the background
        byte[] transparentImage = imageData;

        // Create a new image
        BufferedImage original = ImageIO.read(new ByteArrayInputStream(transparentImage));
        BufferedImage result = new BufferedImage(original.getWidth(), original.getHeight(), BufferedImage.TYPE_INT_RGB);

        // Check if we have a background image or just a color
        if (backgroundImageData != null && backgroundImageData.length > 0) {
            // Use the background image
            BufferedImage bgImage = ImageIO.read(new ByteArrayInputStream(backgroundImageData));

            // Fill the result with the background image, scaled or tiled as needed
            // This is a simple scale approach - you might want to implement tiling or other methods
            for (int x = 0; x < result.getWidth(); x++) {
                for (int y = 0; y < result.getHeight(); y++) {
                    // Scale coordinates to the background image dimensions
                    int bgX = x * bgImage.getWidth() / result.getWidth();
                    int bgY = y * bgImage.getHeight() / result.getHeight();

                    // Keep coordinates in bounds
                    bgX = Math.min(bgX, bgImage.getWidth() - 1);
                    bgY = Math.min(bgY, bgImage.getHeight() - 1);

                    result.setRGB(x, y, bgImage.getRGB(bgX, bgY));
                }
            }
        } else {
            // Use the background color if no image is provided
            Color color = Color.decode(backgroundColor);

            // Fill the background with the specified color
            for (int x = 0; x < result.getWidth(); x++) {
                for (int y = 0; y < result.getHeight(); y++) {
                    result.setRGB(x, y, color.getRGB());
                }
            }
        }

        // Copy the foreground from the original image with alpha blending
        for (int x = 0; x < original.getWidth(); x++) {
            for (int y = 0; y < original.getHeight(); y++) {
                int pixel = original.getRGB(x, y);

                // Alpha blending to remove fringing
                int alpha = (pixel >> 24) & 0xFF; // Extract alpha channel (0-255)

                if (alpha > 0) { // Only process non-fully transparent pixels
                    int fgRed = (pixel >> 16) & 0xFF;
                    int fgGreen = (pixel >> 8) & 0xFF;
                    int fgBlue = pixel & 0xFF;

                    // Get background pixel (either from color or image)
                    int bgPixel = result.getRGB(x, y);
                    int bgRed = (bgPixel >> 16) & 0xFF;
                    int bgGreen = (bgPixel >> 8) & 0xFF;
                    int bgBlue = bgPixel & 0xFF;

                    // Blend with the background using alpha
                    int finalRed = (fgRed * alpha + bgRed * (255 - alpha)) / 255;
                    int finalGreen = (fgGreen * alpha + bgGreen * (255 - alpha)) / 255;
                    int finalBlue = (fgBlue * alpha + bgBlue * (255 - alpha)) / 255;

                    int blendedPixel = (255 << 24) | (finalRed << 16) | (finalGreen << 8) | finalBlue;
                    result.setRGB(x, y, blendedPixel);
                }
            }
        }

        // Convert the result back to bytes
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(result, "png", baos);
        return baos.toByteArray();
    }
}
