package com.example.idphotogenerator.service_alt;


import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;



import javax.imageio.ImageIO;





public class ChangeBackground extends ImageProcessor{
    private String backgroundColor;
    public ChangeBackground(byte[] imageData, String backgroundColor) {
        super(imageData);
        this.backgroundColor = backgroundColor;
    }
    public byte[] changeBackground() throws IOException {
        // First remove the background
        byte[] transparentImage = imageData;

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

                // // For non transparent
                // if ((pixel >> 24) != 0) {
                // result.setRGB(x, y, pixel);
                // }
                // Alpha bleding to remove Fringing
                int alpha = (pixel >> 24) & 0xFF; // Extract alpha channel (0-255)
                int fgRed = (pixel >> 16) & 0xFF;
                int fgGreen = (pixel >> 8) & 0xFF;
                int fgBlue = pixel & 0xFF;

                // Blend with the background using alpha
                int bgRed = color.getRed();
                int bgGreen = color.getGreen();
                int bgBlue = color.getBlue();

                int finalRed = (fgRed * alpha + bgRed * (255 - alpha)) / 255;
                int finalGreen = (fgGreen * alpha + bgGreen * (255 - alpha)) / 255;
                int finalBlue = (fgBlue * alpha + bgBlue * (255 - alpha)) / 255;

                int blendedPixel = (255 << 24) | (finalRed << 16) | (finalGreen << 8) | finalBlue;
                result.setRGB(x, y, blendedPixel);
            }
        }

        // Convert the result back to bytes
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(result, "png", baos);
        return baos.toByteArray();
    }


}
