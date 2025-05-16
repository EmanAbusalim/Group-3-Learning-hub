// Cloudinary configuration
export const cloudinaryConfig = {
    cloudName: 'daut3yukk',
    uploadPreset: 'direct_upload'
};

// Function to generate Cloudinary signature
export function generateSignature(timestamp) {
    // This should be done on your backend server for security
    // For now, we'll use the upload preset which is safer for client-side
    return '';
}

// Function to get upload URL
export function getUploadUrl() {
    return `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/upload`;
}

// Function to prepare upload data
export function prepareUploadData(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    formData.append('resource_type', 'auto');
    return formData;
} 