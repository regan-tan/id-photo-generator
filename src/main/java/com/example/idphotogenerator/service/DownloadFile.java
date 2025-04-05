package com.example.idphotogenerator.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Arrays;

import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;

public class DownloadFile {
    public static ByteArrayOutputStream downloadFile(String fileId) throws IOException {
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

        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream(); // ✅ Correct usage
            service.files().get(fileId)
                    .executeMediaAndDownloadTo(outputStream);
            return outputStream;
        } catch (GoogleJsonResponseException e) {
            System.err.println("Unable to download file: " + e.getDetails());
            throw e;
        }
    }
}
