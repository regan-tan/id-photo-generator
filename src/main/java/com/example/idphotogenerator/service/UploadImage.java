package com.example.idphotogenerator.service;

import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;

import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.client.http.FileContent;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;


public class UploadImage {

    private static Drive getDriveService() throws IOException {
        GoogleCredentials credentials = GoogleCredentials.getApplicationDefault()
                .createScoped(Arrays.asList(DriveScopes.DRIVE));
        HttpRequestInitializer requestInitializer = new HttpCredentialsAdapter(credentials);

        return new Drive.Builder(new NetHttpTransport(),
                GsonFactory.getDefaultInstance(),
                requestInitializer)
                .setApplicationName("Drive Sample")
                .build();
    }

    public static String uploadImage(String imagePath, String imageName) throws IOException {
        Drive service = getDriveService();

        File fileMetadata = new File();
        fileMetadata.setName(imageName);

        java.io.File filePath = new java.io.File(imagePath);
        FileContent mediaContent = new FileContent("image/jpeg", filePath);

        try {
            File file = service.files().create(fileMetadata, mediaContent)
                    .setFields("id")
                    .execute();
            System.out.println("File ID: " + file.getId());
            return file.getId();
        } catch (GoogleJsonResponseException e) {
            System.err.println("Unable to upload file: " + e.getDetails());
            throw e;
        }
    }

    // List image files from Google Drive
    public static List<File> listImageFiles() throws IOException {
        Drive service = getDriveService();
        FileList result = service.files().list()
                .setQ("mimeType contains 'image/'")
                .setFields("files(id, name)")
                .execute();
    
        return result.getFiles(); // return full File objects
    }
    

    // Download specific image by fileId
    public static String downloadImageById(String fileId, String outputPath) throws IOException {
        Drive service = getDriveService();

        java.io.File outputFile = new java.io.File(outputPath);
        try (FileOutputStream outputStream = new FileOutputStream(outputFile)) {
            service.files().get(fileId).executeMediaAndDownloadTo(outputStream);
        }

        return outputPath;
    }
}
