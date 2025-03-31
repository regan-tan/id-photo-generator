package com.example.idphotogenerator.service;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

import javax.imageio.ImageIO;

import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.MatOfByte;
import org.opencv.core.MatOfPoint;
import org.opencv.core.Rect;
import org.opencv.core.Scalar;
import org.opencv.core.Size;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import nu.pattern.OpenCV;

@Service
public class ImageProcessingService {

    @PostConstruct
    public void init() {
        OpenCV.loadLocally();
    }

    public byte[] removeBackground(byte[] imageData, Map<String, List<Double>> rectangles_dim) throws IOException {
        // Convert byte array to Mat
        Mat image = bytesToMat(imageData);

        // Resize image if it's too large (for better performance)
        Mat resized = new Mat();
        double scale = 1.0;
        if (image.width() > 1000 || image.height() > 1000) {
            scale = 1000.0 / Math.max(image.width(), image.height());
            Imgproc.resize(image, resized, new Size(), scale, scale, Imgproc.INTER_AREA);
        } else {
            image.copyTo(resized);
        }
        List<Rect> rectangles = new ArrayList<>();
        // Create a rectangle for initial segmentation
        if (rectangles_dim.isEmpty()) {
            Rect rect1 = new Rect(
                    resized.cols() * 25 / 100, // x (20% from left)
                    resized.rows() / 20, // y (5% from top)
                    resized.cols() * 5 / 10, // width (60% of image)
                    resized.rows() * 19 / 20 // height (spans the top 70% to overlap with rect2)
            );
            Rect rect2 = new Rect(
                    0, // x (no margin on sides)
                    resized.rows() * 8 / 10, // y (starts at 60% of height for overlap)
                    resized.cols(), // width (100% of image)
                    resized.rows() * 2 / 10 // height (covers 30% to the bottom)
            );
            rectangles.add(rect1);
            rectangles.add(rect2);
        } else {

            Set<Entry<String, List<Double>>> entrySet = rectangles_dim.entrySet();
            for (Entry<String, List<Double>> entry : entrySet) {
                Rect rect1 = new Rect(
                        (int) (resized.cols() * (entry.getValue().get(0) / image.width())), // x (20% from left)
                        (int) (resized.rows() * (entry.getValue().get(1) / image.height())), // y (5% from top)
                        (int) (resized.cols() * (entry.getValue().get(2) / image.width())), // width (50% of image)
                        (int) (resized.rows() * (entry.getValue().get(3) / image.height())) // height (spans the top 70%
                // to
                // overlap with rect2)
                );
                rectangles.add(rect1);

            }
        }

        // Prepare masks and temporary arrays for GrabCut
        Mat mask = Mat.zeros(image.size(), CvType.CV_8UC1);
        Mat bgModel = new Mat();
        Mat fgModel = new Mat();
        Mat source = new Mat(1, 1, CvType.CV_8U, new Scalar(Imgproc.GC_PR_FGD));

        // Initialize mask
        mask.create(resized.size(), CvType.CV_8UC1);
        mask.setTo(new Scalar(Imgproc.GC_PR_BGD));

        for (Rect rect : rectangles) {
            mask.submat(rect).setTo(new Scalar(Imgproc.GC_PR_FGD));
        }

        if (image.width() == 0 || image.height() == 0) {
            throw new IllegalArgumentException("Image dimensions must be non-zero.");
        }
        Rect mouthRegion = new Rect(
                resized.cols() * 4 / 10, // x: 30% from left
                resized.rows() * 6 / 10, // y: 60% from top
                resized.cols() * 2 / 10, // width: 40% of image
                resized.rows() * 2 / 10 // height: 20% of image
        );

        Mat result = removal_func(resized, mask, bgModel, fgModel, source);

        // If we resized earlier, resize back to original size
        if (scale != 1.0) {
            Mat finalResult = new Mat();
            Imgproc.resize(result, finalResult, image.size(), 0, 0, Imgproc.INTER_CUBIC);
            result = finalResult;
        }

        // Convert from BGR to RGB
        // Imgproc.cvtColor(result, result, Imgproc.COLOR_BGR2RGB);
        // Convert to RGBA to support transparency
        Mat rgba = new Mat();
        Imgproc.cvtColor(result, rgba, Imgproc.COLOR_RGB2RGBA);

        // Set background pixels to transparent
        byte[] pixels = new byte[4];
        for (int i = 0; i < rgba.rows(); i++) {
            for (int j = 0; j < rgba.cols(); j++) {
                rgba.get(i, j, pixels);
                if (pixels[0] == 0 && pixels[1] == 0 && pixels[2] == 0) {
                    pixels[3] = 0; // Set alpha channel to transparent
                    rgba.put(i, j, pixels);
                }
            }
        }

        // Release resources
        image.release();
        resized.release();
        mask.release();
        bgModel.release();
        fgModel.release();

        result.release();

        return matToBytes(rgba);
    }

    public byte[] changeBackground(byte[] imageData, String backgroundColor) throws IOException {
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

    private Mat bytesToMat(byte[] imageData) throws IOException {
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

    private byte[] matToBytes(Mat mat) throws IOException {
        // Create a temporary buffer to store the image
        MatOfByte mob = new MatOfByte();
        Imgcodecs.imencode(".png", mat, mob);
        return mob.toArray();
    }

    public static Mat mergeGrabCutMasks(Mat mask1, Mat mask2) {
        Mat mergedMask = new Mat(mask1.size(), mask1.type());

        for (int i = 0; i < mask1.rows(); i++) {
            for (int j = 0; j < mask1.cols(); j++) {
                byte pixel1 = (byte) mask1.get(i, j)[0];
                byte pixel2 = (byte) mask2.get(i, j)[0];

                if (pixel1 == Imgproc.GC_FGD || pixel2 == Imgproc.GC_FGD) {
                    mergedMask.put(i, j, Imgproc.GC_FGD);
                } else if (pixel1 == Imgproc.GC_PR_FGD || pixel2 == Imgproc.GC_PR_FGD) {
                    mergedMask.put(i, j, Imgproc.GC_PR_FGD);
                } else if (pixel1 == Imgproc.GC_PR_BGD || pixel2 == Imgproc.GC_PR_BGD) {
                    mergedMask.put(i, j, Imgproc.GC_PR_BGD);
                } else {
                    mergedMask.put(i, j, Imgproc.GC_BGD);
                }
            }
        }
        return mergedMask;
    }

    private Mat removal_func(Mat resized, Mat mask, Mat bgModel, Mat fgModel, Mat source) {
        // Step 1: Run GrabCut to create an initial foreground mask
        Imgproc.grabCut(resized, mask, new Rect(), bgModel, fgModel, 5, Imgproc.GC_INIT_WITH_MASK);

        // Step 2: Convert GrabCut mask to binary foreground mask
        Mat binaryMask = new Mat();
        Core.compare(mask, source, binaryMask, Core.CMP_EQ);

        // Step 3: Apply Bilateral Filter to smooth while preserving edges
        Mat bilateralFiltered = new Mat();
        Imgproc.bilateralFilter(resized, bilateralFiltered, 9, 75, 75);

        // Step 4: Apply Adaptive Thresholding for cleaner edges
        Mat adaptiveThresholded = new Mat();
        Imgproc.cvtColor(bilateralFiltered, bilateralFiltered, Imgproc.COLOR_BGR2GRAY);
        Imgproc.adaptiveThreshold(bilateralFiltered, adaptiveThresholded, 255, Imgproc.ADAPTIVE_THRESH_MEAN_C,
                Imgproc.THRESH_BINARY, 5, 2); // Reduce block size to avoid excessive noise

        // Step 5: Find edges using Sobel (adjust kernel size for less aggressive edge
        // detection)
        Mat edges = new Mat();
        Imgproc.Sobel(adaptiveThresholded, edges, CvType.CV_8U, 1, 1, 1, 1, 0, Core.BORDER_DEFAULT); // Smaller kernel

        // Step 6: Remove dilation (optional, if it is causing unwanted protrusions)
        // You can re-enable dilation with a smaller kernel if necessary.
        // Mat kernel = Imgproc.getStructuringElement(Imgproc.MORPH_ELLIPSE, new Size(3,
        // 3));
        // Imgproc.dilate(edges, edges, kernel);
        // Step 7: Combine binary mask with edges to refine the foreground mask
        Core.bitwise_or(binaryMask, edges, binaryMask);

        // Step 8: Find contours and refine mask further
        List<MatOfPoint> contours = new ArrayList<>();
        Mat hierarchy = new Mat();
        Imgproc.findContours(binaryMask.clone(), contours, hierarchy, Imgproc.RETR_EXTERNAL,
                Imgproc.CHAIN_APPROX_SIMPLE);

        // Step 9: Filter out small contours and keep the largest
        double maxArea = 0;
        int maxAreaIndex = -1;
        for (int i = 0; i < contours.size(); i++) {
            double area = Imgproc.contourArea(contours.get(i));
            if (area > maxArea) {
                maxArea = area;
                maxAreaIndex = i;
            }
        }

        // Create a mask to keep only the largest contour
        Mat finalMask = Mat.zeros(binaryMask.size(), CvType.CV_8UC1);
        if (maxAreaIndex != -1) {
            Imgproc.drawContours(finalMask, contours, maxAreaIndex, new Scalar(255), -1);
        }

        // Step 10: Apply final mask to remove the background
        Mat result = new Mat();
        resized.copyTo(result, finalMask);

        // Step 11: Convert result to RGBA
        Mat rgba = new Mat();
        Imgproc.cvtColor(result, rgba, Imgproc.COLOR_BGR2RGBA);

        // Step 12: Apply transparency to edges for smoother blending
        for (int i = 0; i < rgba.rows(); i++) {
            for (int j = 0; j < rgba.cols(); j++) {
                double[] pixel = rgba.get(i, j);

                // Check if pixel is near the edge (transparency effect based on distance to
                // edge)
                if (finalMask.get(i, j)[0] == 0) { // Background pixel
                    // Set transparency gradually based on proximity to the edge
                    double edgeValue = edges.get(i, j)[0];
                    if (edgeValue > 0) {
                        // Gradually increase transparency near edges (smoother effect)
                        pixel[3] = Math.min(edgeValue / 255.0 + 0.2, 1.0); // Adjust transparency (alpha channel)
                    } else {
                        pixel[3] = 0; // Fully transparent for background
                    }
                } else {
                    pixel[3] = 255; // Fully opaque for foreground
                }
                rgba.put(i, j, pixel);
            }
        }

        // Cleanup
        bilateralFiltered.release();
        edges.release();
        contours.clear();
        hierarchy.release();
        binaryMask.release();

        return rgba;
    }

}
