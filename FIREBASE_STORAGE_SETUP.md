# Firebase Storage CORS Configuration

## Issue
Firebase Storage blocks cross-origin requests by default, which causes CORS errors when trying to fetch uploaded files from the API route.

## Solution

### 1. Install Google Cloud SDK
Download and install from: https://cloud.google.com/sdk/docs/install

### 2. Authenticate with Google Cloud
```bash
gcloud auth login
```

### 3. Set your Firebase project
```bash
gcloud config set project placecraft-7e528
```

### 4. Apply CORS configuration
Run this command from your project root (where cors.json is located):
```bash
gsutil cors set cors.json gs://placecraft-7e528.firebasestorage.app
```

### 5. Verify CORS configuration
```bash
gsutil cors get gs://placecraft-7e528.firebasestorage.app
```

## Alternative: Firebase Console Method
1. Go to Firebase Console > Storage
2. Click on the "Rules" tab
3. Update your storage rules to allow read access:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /resumes/{studentId}/{allPaths=**} {
      // Allow authenticated users to read any resume
      allow read: if request.auth != null;
      // Allow users to write only to their own folder
      allow write: if request.auth != null;
    }
  }
}
```

## Notes
- The CORS configuration in `cors.json` allows all origins (`*`) for development
- For production, update the origin to your specific domain
- The progress bar will show upload progress in real-time
