package com.example.idphotogenerator.service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

import javax.imageio.ImageIO;

import org.opencv.calib3d.Calib3d;
import org.opencv.core.*;
import org.opencv.features2d.ORB;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;
import org.opencv.objdetect.CascadeClassifier;
import org.springframework.stereotype.Service;

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

        // Resize the outfit template to match the user image size
        Mat resizedOutfit = resizeOutfitToFit(userImage, outfitTemplate);

        // Detect the shoulder region from the user's image
        Rect shoulderRegion = detectShoulders(userImage);

        int shiftAmount = 100; // Adjust this value as needed
        Mat adjustedOutfit = shiftShoulders(resizedOutfit, shoulderRegion, shiftAmount);


        // Create a mask for the clothing area on the user image
        Mat clothingMask = createClothingMask(userImage);

        // Warp the outfit to match the user's body shape
        Mat warpedOutfit = applyPerspectiveTransform(userImage, adjustedOutfit, clothingMask);

        // Overlay the outfit onto the user's image
        Mat resultImage = overlayImages(userImage, warpedOutfit, clothingMask);

        // Convert to byte array and return the result
        return matToBytes(resultImage);
    }

    // Resize outfit template to match user's image while maintaining aspect ratio
    private Mat resizeOutfitToFit(Mat userImage, Mat outfitTemplate) {
        Size userSize = userImage.size();
        Mat resizedOutfit = new Mat();
        Imgproc.resize(outfitTemplate, resizedOutfit, userSize); // Resize to match user image size
        return resizedOutfit;
    }

    // Create a clothing mask for the user image using contours or edge detection
    private Mat createClothingMask(Mat userImage) {
        // Convert the image to grayscale
        Mat gray = new Mat();
        Imgproc.cvtColor(userImage, gray, Imgproc.COLOR_BGR2GRAY);

        // Use Canny edge detection to identify edges
        Mat edges = new Mat();
        Imgproc.Canny(gray, edges, 100, 200);

        // Find contours in the edges
        List<MatOfPoint> contours = new ArrayList<>();
        Mat hierarchy = new Mat();
        Imgproc.findContours(edges, contours, hierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE);

        // Create a mask for the clothing area on the user image
        Mat clothingMask = Mat.zeros(userImage.size(), CvType.CV_8UC1);
        for (MatOfPoint contour : contours) {
            // We assume the clothing contours are large enough, filtering out small contours
            if (Imgproc.contourArea(contour) > 1000) {
                Imgproc.drawContours(clothingMask, contours, contours.indexOf(contour), new Scalar(255), -1); // Fill the contours
            }
        }

        return clothingMask;
    }

    private Mat applyPerspectiveTransform(Mat userImage, Mat outfitTemplate, Mat mask) {
        // Detect ORB keypoints and descriptors in both images
        ORB orb = ORB.create();
        MatOfKeyPoint keypoints1 = new MatOfKeyPoint();
        MatOfKeyPoint keypoints2 = new MatOfKeyPoint();
        Mat descriptors1 = new Mat();
        Mat descriptors2 = new Mat();
    
        orb.detectAndCompute(userImage, mask, keypoints1, descriptors1);
        orb.detectAndCompute(outfitTemplate, mask, keypoints2, descriptors2);
    
        // Perform brute-force matching using Core.norm() to calculate the distance (similar to BFMatcher)
        List<MatOfDMatch> matches = new ArrayList<>();
        List<DMatch> goodMatches = new ArrayList<>();
    
        for (int i = 0; i < descriptors1.rows(); i++) {
            double minDist = Double.MAX_VALUE;
            int bestMatchIdx = -1;
    
            for (int j = 0; j < descriptors2.rows(); j++) {
                double dist = Core.norm(descriptors1.row(i), descriptors2.row(j), Core.NORM_HAMMING); // Use Hamming for ORB descriptors
                if (dist < minDist) {
                    minDist = dist;
                    bestMatchIdx = j;
                }
            }
    
            // Apply Lowe's ratio test
            if (minDist < 0.75 * minDist) { 
                DMatch match = new DMatch(i, bestMatchIdx, (float) minDist);
                goodMatches.add(match);
            }
        }
    
        // Compute homography matrix to warp the outfit template
        MatOfDMatch goodMatchesMat = new MatOfDMatch();
        goodMatchesMat.fromList(goodMatches);
    
        // Extract points from good matches
        List<Point> srcPoints = new ArrayList<>();
        List<Point> dstPoints = new ArrayList<>();
        for (DMatch match : goodMatches) {
            srcPoints.add(keypoints1.toList().get(match.queryIdx).pt);
            dstPoints.add(keypoints2.toList().get(match.trainIdx).pt);
        }
    
        // Compute homography matrix to warp the outfit template
        Mat homography = Calib3d.findHomography(new MatOfPoint2f(srcPoints.toArray(new Point[0])), new MatOfPoint2f(dstPoints.toArray(new Point[0])));
    
        // Use detected shoulder region to adjust the position dynamically
        Rect shoulderRegion = detectShoulders(userImage);
        Mat translationMatrix = Mat.eye(3, 3, CvType.CV_32F);
        translationMatrix.put(0, 2, 0);  // No shift in x-direction
        translationMatrix.put(1, 2, (shoulderRegion.y + shoulderRegion.height / 2)); // Shift based on detected shoulder position
    
        // Combine homography and translation
        Mat combinedMatrix = new Mat();
        Core.gemm(homography, translationMatrix, 1, new Mat(), 0, combinedMatrix); 
    
        // Warp the outfit template
        Mat warpedOutfit = new Mat();
        Imgproc.warpPerspective(outfitTemplate, warpedOutfit, combinedMatrix, userImage.size());
    
        return warpedOutfit;
    }

    private Rect detectShoulders(Mat image) {
        // Load the pre-trained cascade classifier for upper body detection
        CascadeClassifier bodyCascade = new CascadeClassifier("resources/haarcascade_upperbody.xml");

        // Convert to grayscale
        Mat gray = new Mat();
        Imgproc.cvtColor(image, gray, Imgproc.COLOR_BGR2GRAY);

        // Detect upper body
        MatOfRect bodies = new MatOfRect();
        bodyCascade.detectMultiScale(gray, bodies);

        // If an upper body is detected, estimate the shoulder position (top 1/3 of the body)
        if (bodies.toArray().length > 0) {
            Rect body = bodies.toArray()[0];
            int shoulderHeight = body.y + body.height / 3; // Estimate shoulder height as top 1/3 of the upper body
            return new Rect(body.x, shoulderHeight, body.width, body.height / 3); // Assume shoulder region
        }

        return new Rect(0, 0, image.width(), image.height()); // Default if no body is detected
    }
    private Mat shiftShoulders(Mat outfitTemplate, Rect shoulderRegion, int shiftAmount) {
        // Get the size of the template (outfit)
        Size templateSize = outfitTemplate.size();
    
        // Define the region of interest for the upper part (shoulders)
        int shoulderHeight = shoulderRegion.height;
        Rect upperPartRect = new Rect(0, 0, (int) templateSize.width, shoulderHeight); // Define the upper part (shoulder region)
        Rect lowerPartRect = new Rect(0, shoulderHeight, (int) templateSize.width, (int) templateSize.height - shoulderHeight); // Define the lower part (below shoulders)
    
        // Create the upper and lower parts of the template (submatrices)
        Mat upperPart = outfitTemplate.submat(upperPartRect);
        Mat lowerPart = outfitTemplate.submat(lowerPartRect);
    
        // Create a translation matrix for the upper part to shift it upwards based on shoulder position
        Mat translationMatrix = Mat.eye(2, 3, CvType.CV_32F); // 2x3 matrix for translation
        translationMatrix.put(0, 2, 0);  // No shift in x-direction
        translationMatrix.put(1, 2, -shiftAmount);  // Move upward in y-direction (negative for upwards)
    
        // Apply translation to upper part (shift the shoulder region)
        Mat shiftedUpperPart = new Mat();
        Imgproc.warpAffine(upperPart, shiftedUpperPart, translationMatrix, upperPart.size());
    
        // Now, concatenate the upper and lower parts back together
        List<Mat> parts = new ArrayList<>();
        parts.add(shiftedUpperPart);  // Add shifted upper part
        parts.add(lowerPart);         // Add lower part
    
        // Concatenate the upper and lower parts using Core.vconcat()
        Mat result = new Mat();
        Core.vconcat(parts, result);  // Correctly use vconcat with a List<Mat> of parts
    
        return result;
    }
    
    private Mat overlayImages(Mat userImage, Mat outfitTemplate, Mat mask) {
        // Ensure the outfit template matches the user's image size
        Mat resizedOutfit = new Mat();
        Imgproc.resize(outfitTemplate, resizedOutfit, new Size(userImage.width(), userImage.height()));

        // Convert user image and outfit template to float for better blending
        Mat userFloat = new Mat();
        Mat outfitFloat = new Mat();
        userImage.convertTo(userFloat, CvType.CV_32F);
        resizedOutfit.convertTo(outfitFloat, CvType.CV_32F);

        // Perform alpha blending (user * (1 - mask) + outfit * mask)
        Mat invertedMask = new Mat();

        // Create a Mat filled with 1.0 (to represent the scalar value 1)
        Mat one = Mat.ones(mask.size(), mask.type()); // Mat of the same size as mask, filled with 1.0

        // Subtract the mask from the Mat filled with 1.0 (this effectively inverts the mask)
        Core.subtract(one, mask, invertedMask); // Invert the mask (1 - mask)

        // Now multiply by inverted mask and original mask to apply blending
        Mat blended = new Mat();
        Core.multiply(userFloat, invertedMask, userFloat); // Apply (1 - mask) on user image
        Core.multiply(outfitFloat, mask, outfitFloat); // Apply mask on outfit image
        Core.add(userFloat, outfitFloat, blended); // Add both images

        // Convert back to 8-bit image
        blended.convertTo(userImage, CvType.CV_8U);

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
            // Correct BGR ordering for OpenCV
            data[i * 4] = (byte) (pixel & 0xFF); // Blue
            data[i * 4 + 1] = (byte) ((pixel >> 8) & 0xFF); // Green
            data[i * 4 + 2] = (byte) ((pixel >> 16) & 0xFF); // Red
            data[i * 4 + 3] = (byte) ((pixel >> 24) & 0xFF); // Alpha
        }

        mat.put(0, 0, data);
        return mat;
    }
}
