# ID Photo Generator

A Spring Boot web application for generating ID photos with features like background removal, cropping, and resizing.

## Features

1. Photo Upload and Display
   - Support for JPEG and PNG formats
   - Drag and drop interface
   - Image preview

2. Image Cropping and Resizing
   - Manual cropping with aspect ratio constraints
   - Support for standard ID photo dimensions
   - Automatic resizing while maintaining aspect ratio

3. Background Removal and Replacement
   - Automatic background removal using OpenCV
   - Background color replacement options
   - Support for common ID photo background colors

4. Photo Export
   - Export in PNG format
   - High-resolution output
   - Maintains image quality

5. User-Friendly Interface
   - Modern, responsive design
   - Intuitive controls
   - Real-time preview

## Prerequisites

- Java 17 or later
- Maven 3.6 or later
- OpenCV 4.8.1 (automatically downloaded via Maven)

## Setup and Installation

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd id-photo-generator
   ```

2. Build the project:
   ```bash
   mvn clean install
   ```

3. Run the application:
   ```bash
   mvn spring-boot:run
   ```

4. Access the application:
   Open your web browser and navigate to `http://localhost:8080`

## Usage

1. Upload Photo:
   - Click the upload button or drag and drop an image
   - Supported formats: JPEG, PNG

2. Crop Photo:
   - Click "Crop Image" to open the cropping tool
   - Select the desired ID photo dimensions
   - Adjust the crop area as needed
   - Click "Save Changes" to apply

3. Remove Background:
   - Click "Remove Background" to automatically remove the background
   - Select a new background color from the available options

4. Export:
   - Click "Export Photo" to download the processed image
   - The image will be saved in PNG format

## Technical Details

- Built with Spring Boot 3.2.2
- Uses OpenCV for image processing
- Frontend built with Bootstrap 5 and Cropper.js
- Responsive design for desktop and mobile use

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
