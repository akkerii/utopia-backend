# 🛠️ Deployment Troubleshooting Guide

## Current Issue: Service Management Permission Error

### Problem

```
ERROR: (gcloud.services.enable) PERMISSION_DENIED: Permission denied to enable service [cloudbuild.googleapis.com]
```

### Root Cause

The GitHub Actions service account doesn't have sufficient permissions to enable APIs. This requires Owner or Editor role, which is too broad for a CI/CD service account.

## 🔧 Solution

### 1. Manual API Enablement (Required Once)

As a project owner, enable required APIs manually:

1. **Visit Cloud Console**: https://console.cloud.google.com/apis/dashboard?project=dotted-banner-363222

2. **Enable these APIs**:

   ```bash
   # Run these commands as project owner
   gcloud auth login

   gcloud config set project dotted-banner-363222

   # Enable required APIs
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   gcloud services enable cloudresourcemanager.googleapis.com
   ```

   Or enable via Console:
   - [Enable Cloud Build API](https://console.cloud.google.com/apis/library/cloudbuild.googleapis.com)
   - [Enable Cloud Run API](https://console.cloud.google.com/apis/library/run.googleapis.com)
   - [Enable Artifact Registry API](https://console.cloud.google.com/apis/library/artifactregistry.googleapis.com)
   - [Enable Container Registry API](https://console.cloud.google.com/apis/library/containerregistry.googleapis.com)
   - [Enable Resource Manager API](https://console.cloud.google.com/apis/library/cloudresourcemanager.googleapis.com)

### 2. Service Account Permissions

After APIs are enabled, grant these roles to the service account:

```bash
# Basic service usage viewer (no API enablement)
gcloud projects add-iam-policy-binding dotted-banner-363222 \
  --member="serviceAccount:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
  --role="roles/serviceusage.serviceUsageViewer"

# Cloud Build permissions
gcloud projects add-iam-policy-binding dotted-banner-363222 \
  --member="serviceAccount:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"

# Cloud Run permissions
gcloud projects add-iam-policy-binding dotted-banner-363222 \
  --member="serviceAccount:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Service Account User role
gcloud projects add-iam-policy-binding dotted-banner-363222 \
  --member="serviceAccount:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Artifact Registry permissions
gcloud projects add-iam-policy-binding dotted-banner-363222 \
  --member="serviceAccount:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

### 3. Verify Setup

1. **Check APIs are Enabled**:

   ```bash
   # As project owner
   gcloud services list --enabled \
     --filter="name:cloudbuild.googleapis.com OR name:run.googleapis.com OR name:artifactregistry.googleapis.com"
   ```

2. **Verify Service Account Roles**:
   ```bash
   gcloud projects get-iam-policy dotted-banner-363222 \
     --filter="bindings.members:github-actions-sa@dotted-banner-363222.iam.gserviceaccount.com" \
     --format="table(bindings.role)"
   ```

## 🚀 Testing Deployment

After enabling APIs and setting permissions:

1. **Trigger deployment**:

   ```bash
   git add .
   git commit -m "test: Verify deployment with enabled APIs"
   git push origin main
   ```

2. **Monitor**:
   - [GitHub Actions](https://github.com/your-org/utopia-backend/actions)
   - [Cloud Build Console](https://console.cloud.google.com/cloud-build/builds?project=dotted-banner-363222)
   - [Cloud Run Console](https://console.cloud.google.com/run?project=dotted-banner-363222)

## 📝 Best Practices

1. **API Management**:
   - Enable APIs once during project setup
   - Keep service account permissions minimal
   - Use separate accounts for CI/CD and API management

2. **Security**:
   - Never grant Owner/Editor to service accounts
   - Use principle of least privilege
   - Regularly audit permissions

3. **Monitoring**:
   - Watch Cloud Build logs for issues
   - Monitor API quotas
   - Set up alerts for deployment failures

## 🆘 Common Issues

1. **Permission Denied**:
   - Verify APIs are enabled
   - Check service account roles
   - Review audit logs

2. **Build Failures**:
   - Check Cloud Build logs
   - Verify Dockerfile
   - Check resource quotas

3. **API Issues**:
   - Confirm API enablement
   - Check API quotas
   - Review service dependencies
