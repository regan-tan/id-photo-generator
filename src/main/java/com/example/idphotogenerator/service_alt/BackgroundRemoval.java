package com.example.idphotogenerator.service_alt;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.MatOfPoint;
import org.opencv.core.Rect;
import org.opencv.core.Scalar;
import org.opencv.core.Size;
import org.opencv.imgproc.Imgproc;

public class BackgroundRemoval extends ImageProcessor {
    private Map<String, List<Double>> rectangles_dim;

    public BackgroundRemoval(byte[] imageData, Map<String, List<Double>> rectangles_dim) {
        super(imageData);
        this.rectangles_dim = rectangles_dim;
    }

    public byte[] removeBackground() throws IOException {

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
     
        if (rectangles_dim.isEmpty() || rectangles_dim==null) {
            Rect rect1 = new Rect(
                    resized.cols() * 25 / 100, 
                    resized.rows() / 20, 
                    resized.cols() * 5 / 10, 
                    resized.rows() * 19 / 20 
            );
            Rect rect2 = new Rect(
                    0, 
                    resized.rows() * 8 / 10, 
                    resized.cols(), 
                    resized.rows() * 2 / 10 
            );
            rectangles.add(rect1);
            rectangles.add(rect2);
        } else {

            Set<Entry<String, List<Double>>> entrySet = rectangles_dim.entrySet();
            for (Entry<String, List<Double>> entry : entrySet) {
                Rect rect1 = new Rect(
                        (int) (resized.cols() * (entry.getValue().get(0) / image.width())), 
                        (int) (resized.rows() * (entry.getValue().get(1) / image.height())), 
                        (int) (resized.cols() * (entry.getValue().get(2) / image.width())), 
                        (int) (resized.rows() * (entry.getValue().get(3) / image.height())) 
         
                );
                rectangles.add(rect1);

            }
        }

        Mat mask = Mat.zeros(image.size(), CvType.CV_8UC1);
        Mat bgModel = new Mat();
        Mat fgModel = new Mat();
        Mat source = new Mat(1, 1, CvType.CV_8U, new Scalar(Imgproc.GC_PR_FGD));

        mask.create(resized.size(), CvType.CV_8UC1);
        mask.setTo(new Scalar(Imgproc.GC_PR_BGD));

        for (Rect rect : rectangles) {
            mask.submat(rect).setTo(new Scalar(Imgproc.GC_PR_FGD));
        }

        if (image.width() == 0 || image.height() == 0) {
            throw new IllegalArgumentException("Image dimensions must be non-zero.");
        }

        Mat result = removal_func(resized, mask, bgModel, fgModel, source);

      
        if (scale != 1.0) {
            Mat finalResult = new Mat();
            Imgproc.resize(result, finalResult, image.size(), 0, 0, Imgproc.INTER_CUBIC);
            result = finalResult;
        }

        Mat rgba = new Mat();
        Imgproc.cvtColor(result, rgba, Imgproc.COLOR_RGB2RGBA);

        byte[] pixels = new byte[4];
        for (int i = 0; i < rgba.rows(); i++) {
            for (int j = 0; j < rgba.cols(); j++) {
                rgba.get(i, j, pixels);
                if (pixels[0] == 0 && pixels[1] == 0 && pixels[2] == 0) {
                    pixels[3] = 0; 
                    rgba.put(i, j, pixels);
                }
            }
        }

        image.release();
        resized.release();
        mask.release();
        bgModel.release();
        fgModel.release();

        result.release();

        return matToBytes(rgba);
    }

    private Mat removal_func(Mat resized, Mat mask, Mat bgModel, Mat fgModel, Mat source) {
        Imgproc.grabCut(resized, mask, new Rect(), bgModel, fgModel, 5, Imgproc.GC_INIT_WITH_MASK);

        Mat binaryMask = new Mat();
        Core.compare(mask, source, binaryMask, Core.CMP_EQ);

        Mat bilateralFiltered = new Mat();
        Imgproc.bilateralFilter(resized, bilateralFiltered, 9, 75, 75);

        Mat adaptiveThresholded = new Mat();
        Imgproc.cvtColor(bilateralFiltered, bilateralFiltered, Imgproc.COLOR_BGR2GRAY);
        Imgproc.adaptiveThreshold(bilateralFiltered, adaptiveThresholded, 255, Imgproc.ADAPTIVE_THRESH_MEAN_C,
                Imgproc.THRESH_BINARY, 5, 2);

        Mat edges = new Mat();
        Imgproc.Sobel(adaptiveThresholded, edges, CvType.CV_8U, 1, 1, 1, 1, 0, Core.BORDER_DEFAULT); 

     
        Core.bitwise_or(binaryMask, edges, binaryMask);

        List<MatOfPoint> contours = new ArrayList<>();
        Mat hierarchy = new Mat();
        Imgproc.findContours(binaryMask.clone(), contours, hierarchy, Imgproc.RETR_EXTERNAL,
                Imgproc.CHAIN_APPROX_SIMPLE);

        double maxArea = 0;
        int maxAreaIndex = -1;
        for (int i = 0; i < contours.size(); i++) {
            double area = Imgproc.contourArea(contours.get(i));
            if (area > maxArea) {
                maxArea = area;
                maxAreaIndex = i;
            }
        }

        Mat finalMask = Mat.zeros(binaryMask.size(), CvType.CV_8UC1);
        if (maxAreaIndex != -1) {
            Imgproc.drawContours(finalMask, contours, maxAreaIndex, new Scalar(255), -1);
        }

        Mat result = new Mat();
        resized.copyTo(result, finalMask);

        Mat rgba = new Mat();
        Imgproc.cvtColor(result, rgba, Imgproc.COLOR_BGR2RGBA);

        for (int i = 0; i < rgba.rows(); i++) {
            for (int j = 0; j < rgba.cols(); j++) {
                double[] pixel = rgba.get(i, j);

                if (finalMask.get(i, j)[0] == 0) { 
                    double edgeValue = edges.get(i, j)[0];
                    if (edgeValue > 0) {

                        pixel[3] = Math.min(edgeValue / 255.0 + 0.2, 1.0);
                    } else {
                        pixel[3] = 0; 
                    }
                } else {
                    pixel[3] = 255; 
                }
                rgba.put(i, j, pixel);
            }
        }

        bilateralFiltered.release();
        edges.release();
        contours.clear();
        hierarchy.release();
        binaryMask.release();

        return rgba;
    }



}
