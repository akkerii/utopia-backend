# 🛠️ Deployment Troubleshooting Guide

## Issue: Cloud Build Permission Error

### Problem

```
ERROR: (gcloud.builds.log) [github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com] does not have permission to access 218476677732.cloudbuild-logs.googleusercontent.com instance
```

### Root Cause

The GitHub Actions service account `github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com` doesn't have sufficient permissions to:

1. Access Cloud Build logs
2. Potentially other required Cloud Build operations

## 🔧 Solution Steps

### 1. Check Current Service Account Permissions

```bash
gcloud projects get-iam-policy dotted-banner-363222 \
  --filter="bindings.members:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

### 2. Add Required Permissions

The service account needs these roles:

```bash
# Cloud Build permissions
gcloud projects add-iam-policy-binding dotted-banner-363222 \
  --member="serviceAccount:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"

# Storage permissions for logs
gcloud projects add-iam-policy-binding dotted-banner-363222 \
  --member="serviceAccount:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# Cloud Build logs viewer
gcloud projects add-iam-policy-binding dotted-banner-363222 \
  --member="serviceAccount:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.viewer"

# Cloud Run deployment permissions
gcloud projects add-iam-policy-binding dotted-banner-363222 \
  --member="serviceAccount:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
  --role="roles/run.developer"

# Artifact Registry permissions
gcloud projects add-iam-policy-binding dotted-banner-363222 \
  --member="serviceAccount:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

### 3. Verify APIs are Enabled

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable storage.googleapis.com
```

### 4. Alternative: Use Workload Identity Federation (Recommended)

Instead of using service account keys, consider using Workload Identity Federation for better security:

1. Create a Workload Identity Pool
2. Configure the GitHub provider
3. Update the workflow to use `google-github-actions/auth@v2` with `workload_identity_provider`

## 🚀 Quick Fix Applied

The deployment workflow has been updated to:

1. ✅ Remove the problematic `gcloud builds log` command
2. ✅ Add better error handling with build URLs for manual log viewing
3. ✅ Add timeout management (30 minutes)
4. ✅ Provide debugging information for permission issues

## 📊 Test the Deployment

After applying the permissions, test with:

```bash
git add .
git commit -m "fix: Update deployment permissions and error handling"
git push origin main
```

## 🔍 Monitoring

- **Build Logs**: https://console.cloud.google.com/cloud-build/builds?project=dotted-banner-363222
- **Cloud Run**: https://console.cloud.google.com/run?project=dotted-banner-363222
- **IAM**: https://console.cloud.google.com/iam-admin/iam?project=dotted-banner-363222

## 📝 Notes

- The workflow now provides direct links to Cloud Build logs in the console
- Build failures will show the build ID and console URL for manual inspection
- Added 30-minute timeout to prevent infinite waiting
- Enhanced debugging output for troubleshooting permissions
