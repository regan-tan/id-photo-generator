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

        Mat resizedOutfit = resizeOutfitToFit(userImage, outfitTemplate);

        Mat resultImage = overlayImages(userImage, resizedOutfit);

        return matToBytes(resultImage);
    }
    private Mat resizeOutfitToFit(Mat userImage, Mat outfitTemplate) {
        Size userSize = userImage.size();
        Mat resizedOutfit = new Mat();
        Imgproc.resize(outfitTemplate, resizedOutfit, userSize); 
        return resizedOutfit;
    }
    private Mat overlayImages(Mat userImage, Mat outfitTemplate) {
    
        Mat resizedOutfit = new Mat();
        Imgproc.resize(outfitTemplate, resizedOutfit, new Size(userImage.width(), userImage.height()));

        List<Mat> outfitChannels = new ArrayList<>();
        List<Mat> userChannels = new ArrayList<>();

        Core.split(resizedOutfit, outfitChannels);
        Core.split(userImage, userChannels);

        if (outfitChannels.size() == 4) { 
            Mat alpha = outfitChannels.get(3); 

            Mat alphaNormalized = new Mat();
            alpha.convertTo(alphaNormalized, CvType.CV_32F, 1.0 / 255.0);

            Mat inverseAlpha = new Mat(alphaNormalized.size(), alphaNormalized.type(), Scalar.all(1.0));
            Core.subtract(inverseAlpha, alphaNormalized, inverseAlpha); 

            for (int i = 0; i < 3; i++) {
                Mat blendedChannel = new Mat();
                Mat outfitFloat = new Mat();
                Mat userFloat = new Mat();

                outfitChannels.get(i).convertTo(outfitFloat, CvType.CV_32F);
                userChannels.get(i).convertTo(userFloat, CvType.CV_32F);

                Core.multiply(outfitFloat, alphaNormalized, outfitFloat);
                Core.multiply(userFloat, inverseAlpha, userFloat);
                Core.add(outfitFloat, userFloat, blendedChannel);

                blendedChannel.convertTo(userChannels.get(i), CvType.CV_8U);
            }

            Core.merge(userChannels, userImage);
        }

        return userImage;
    }
}
