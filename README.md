

# ID Photo Generator

A Spring Boot web application for generating ID photos with features like background removal, cropping, and resizing.

## Features

1. **Photo Upload and Display**
   - Supports JPEG and PNG formats
   - Drag-and-drop interface
   - Real-time image preview

2. **Image Cropping and Resizing**
   - Manual cropping with aspect ratio constraints
   - Standard ID photo dimensions
   - Automatic resizing while maintaining aspect ratio

3. **Background Removal and Replacement**
   - Automatic background removal using OpenCV
   - Optional background color replacement
   - Common ID photo background colors (e.g. white, blue)

4. **Photo Export**
   - Exports in PNG format
   - High-resolution output
   - Maintains image quality

5. **User-Friendly Interface**
   - Modern, responsive design
   - Intuitive controls
   - Real-time preview updates

---

## Prerequisites

- Java 17 or later
- (Optional) Maven 3.6 or later — *only required if building from source*

---

## Setup & Installation

### Option 1: Run from JAR (recommended for non-developers)

1. **Download the JAR**
   - Make sure you've built or received `id-photo-generator-1.0.0.jar` (usually located in `target/` folder).

2. **Run the application**
   ```bash
   java -jar target/id-photo-generator-1.0.0.jar
   ```

   > If you get a "port already in use" error, make sure no other app is using port 8080. You can free the port with:
   >
   > ```bash
   > lsof -i :8080
   > kill -9 <PID>
   > ```

3. **Open the app**
   Open your browser and go to:  
   `http://localhost:8080`

---

### Option 2: Build and Run with Maven (for developers)

1. **Clone the repository**
   ```bash
   git clone https://github.com/regan-tan/id-photo-generator.git
   cd id-photo-generator
   ```

2. **Build the project**
   ```bash
   mvn clean install
   ```

3. **Run the application**
   ```bash
   mvn spring-boot:run
   ```

4. **Open in browser**
   Go to:  
   `http://localhost:8080`

---

## Usage

1. **Upload Photo**
   - Click the upload button or drag-and-drop an image
   - Supported formats: JPEG, PNG

2. **Crop Photo**
   - Click "Crop Image" to open the cropping tool
   - Choose ID photo dimensions and crop
   - Click "Save Changes"

3. **Remove Background**
   - Click "Remove Background"
   - Choose a background color

4. **Export**
   - Click "Export Photo"
   - Your edited photo will be downloaded in PNG format

---

## Technical Details

- Spring Boot 3.2.2
- OpenCV 4.8.1 (auto-loaded via Maven)
- Frontend: Bootstrap 5 + Cropper.js
- Fully responsive for mobile and desktop

---

