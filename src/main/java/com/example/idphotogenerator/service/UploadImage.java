package com.example.idphotogenerator.service;

import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.client.http.FileContent;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import java.io.IOException;
import java.util.Arrays;

public class UploadImage {
    public static String uploadImage(String imagePath, String imageName) throws IOException {
        // Load credentials
        GoogleCredentials credentials = GoogleCredentials.getApplicationDefault()
            .createScoped(Arrays.asList(DriveScopes.DRIVE_FILE));
        HttpRequestInitializer requestInitializer = new HttpCredentialsAdapter(credentials);
        
        // Build Drive service
        Drive service = new Drive.Builder(new NetHttpTransport(), 
                                         GsonFactory.getDefaultInstance(), 
                                         requestInitializer)
            .setApplicationName("Drive Sample")
            .build();
        
        // Prepare file metadata
        File fileMetadata = new File();
        fileMetadata.setName(imageName);
        
        // Prepare file content
        java.io.File filePath = new java.io.File(imagePath);
        FileContent mediaContent = new FileContent("image/jpeg", filePath);
        
        try {
            // Upload file
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
}

