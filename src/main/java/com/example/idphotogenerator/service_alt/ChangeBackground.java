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

    public ChangeBackground(byte[] imageData, String backgroundColor, byte[] backgroundImageData) {
        super(imageData);
        this.backgroundColor = backgroundColor;
        this.backgroundImageData = backgroundImageData;
    }

    public byte[] changeBackground() throws IOException {
        byte[] transparentImage = imageData;

        BufferedImage original = ImageIO.read(new ByteArrayInputStream(transparentImage));
        BufferedImage result = new BufferedImage(original.getWidth(), original.getHeight(), BufferedImage.TYPE_INT_RGB);

        if (backgroundImageData != null && backgroundImageData.length > 0) {
            // Use the background image
            BufferedImage bgImage = ImageIO.read(new ByteArrayInputStream(backgroundImageData));

            for (int x = 0; x < result.getWidth(); x++) {
                for (int y = 0; y < result.getHeight(); y++) {
                    int bgX = x * bgImage.getWidth() / result.getWidth();
                    int bgY = y * bgImage.getHeight() / result.getHeight();

                    bgX = Math.min(bgX, bgImage.getWidth() - 1);
                    bgY = Math.min(bgY, bgImage.getHeight() - 1);

                    result.setRGB(x, y, bgImage.getRGB(bgX, bgY));
                }
            }
        } else {
            Color color = Color.decode(backgroundColor);

            for (int x = 0; x < result.getWidth(); x++) {
                for (int y = 0; y < result.getHeight(); y++) {
                    result.setRGB(x, y, color.getRGB());
                }
            }
        }

        for (int x = 0; x < original.getWidth(); x++) {
            for (int y = 0; y < original.getHeight(); y++) {
                int pixel = original.getRGB(x, y);

                int alpha = (pixel >> 24) & 0xFF; 

                if (alpha > 0) { 
                    int fgRed = (pixel >> 16) & 0xFF;
                    int fgGreen = (pixel >> 8) & 0xFF;
                    int fgBlue = pixel & 0xFF;

                    int bgPixel = result.getRGB(x, y);
                    int bgRed = (bgPixel >> 16) & 0xFF;
                    int bgGreen = (bgPixel >> 8) & 0xFF;
                    int bgBlue = bgPixel & 0xFF;

                    int finalRed = (fgRed * alpha + bgRed * (255 - alpha)) / 255;
                    int finalGreen = (fgGreen * alpha + bgGreen * (255 - alpha)) / 255;
                    int finalBlue = (fgBlue * alpha + bgBlue * (255 - alpha)) / 255;

                    int blendedPixel = (255 << 24) | (finalRed << 16) | (finalGreen << 8) | finalBlue;
                    result.setRGB(x, y, blendedPixel);
                }
            }
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(result, "png", baos);
        return baos.toByteArray();
    }
}
