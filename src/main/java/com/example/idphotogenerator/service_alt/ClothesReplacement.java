package com.example.idphotogenerator.service_alt;

import java.io.IOException;

import java.util.ArrayList;
import java.util.List;



import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;

import org.opencv.core.Scalar;
import org.opencv.core.Size;

import org.opencv.imgproc.Imgproc;



public class ClothesReplacement extends ImageProcessor{
    private byte[] outfitTemplateData;
    public ClothesReplacement(byte[] imageData,byte[] outfitTemplateData){
        super(imageData);
        this.outfitTemplateData = outfitTemplateData;

    }
    public byte[] replaceClothes() throws IOException {
        Mat userImage = bytesToMat_clothReplace(imageData);
        Mat outfitTemplate = bytesToMat_clothReplace(outfitTemplateData);

        // Resize outfit to fit user image
        Mat resizedOutfit = resizeOutfitToFit(userImage, outfitTemplate);

        // Overlay outfit onto user image
        Mat resultImage = overlayImages(userImage, resizedOutfit);

        // Convert to byte array and return
        return matToBytes(resultImage);
    }
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
}
