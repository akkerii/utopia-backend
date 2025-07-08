# 🛠️ Deployment Troubleshooting Guide

## Current Issue: Service Management Permission Error

### Problem

```
ERROR: (gcloud.services.list) [github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com] does not have permission to access projects instance [dotted-banner-363222]
```

### Root Cause

The GitHub Actions service account lacks necessary permissions to:

1. List and manage services
2. Access project resources
3. Manage Cloud Build and Cloud Run

## 🔧 Immediate Fix

### 1. Add Required Service Management Roles

Run these commands in Cloud Shell or local gcloud CLI:

```bash
# Service Management permissions
gcloud projects add-iam-policy-binding dotted-banner-363222 \
  --member="serviceAccount:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
  --role="roles/serviceusage.serviceUsageViewer"

gcloud projects add-iam-policy-binding dotted-banner-363222 \
  --member="serviceAccount:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
  --role="roles/serviceusage.serviceUsageAdmin"

# Project level access
gcloud projects add-iam-policy-binding dotted-banner-363222 \
  --member="serviceAccount:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
  --role="roles/viewer"

# Cloud Build permissions
gcloud projects add-iam-policy-binding dotted-banner-363222 \
  --member="serviceAccount:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"

# Cloud Run permissions
gcloud projects add-iam-policy-binding dotted-banner-363222 \
  --member="serviceAccount:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Service Account User role (needed to act as service account)
gcloud projects add-iam-policy-binding dotted-banner-363222 \
  --member="serviceAccount:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### 2. Enable Required APIs

After adding permissions, enable these APIs:

```bash
# List of essential APIs to enable
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
```

### 3. Verify Service Account Permissions

```bash
# Check current permissions
gcloud projects get-iam-policy dotted-banner-363222 \
  --filter="bindings.members:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

## 🔍 Monitoring Deployment

After applying permissions:

1. **Check Service Account Status**:

```bash
gcloud iam service-accounts get-iam-policy \
  github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com
```

2. **Verify API Status**:

```bash
gcloud services list --enabled
```

3. **Monitor Build Logs**:

- Build Console: https://console.cloud.google.com/cloud-build/builds?project=dotted-banner-363222
- Cloud Run: https://console.cloud.google.com/run?project=dotted-banner-363222

## 📝 Additional Notes

1. **Service Account Best Practices**:
   - Use minimum required permissions
   - Consider using Workload Identity Federation
   - Regularly audit permissions

2. **Common Issues**:
   - Permission denied errors usually mean missing IAM roles
   - API not enabled errors require both permissions AND API enablement
   - Build failures might need additional service account permissions

3. **Security Considerations**:
   - Review permissions regularly
   - Remove unused roles
   - Use service account key rotation if not using Workload Identity

## 🚀 Testing Deployment

After applying fixes:

1. **Trigger a test deployment**:

```bash
git add .
git commit -m "test: Verify deployment with updated permissions"
git push origin main
```

2. **Monitor the deployment**:
   - Check GitHub Actions tab
   - Watch Cloud Build logs
   - Verify Cloud Run service update

## 🆘 Still Having Issues?

1. Check the full error message in GitHub Actions logs
2. Verify project number matches (218476677732)
3. Ensure service account exists and is active
4. Review audit logs for permission denials
