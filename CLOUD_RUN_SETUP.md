# Google Cloud Run Deployment Setup

This guide will help you deploy your Utopia AI Backend to Google Cloud Run.

## Prerequisites

1. **Google Cloud Project**: Create a new project or use an existing one
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Google Cloud CLI**: Install and configure the gcloud CLI tool

## Step 1: Set up Google Cloud Resources

### 1.1 Enable Required APIs

```bash
# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 1.2 Create Artifact Registry Repository

```bash
# Create repository for Docker images
gcloud artifacts repositories create utopia-backend \
    --repository-format=docker \
    --location=us-central1 \
    --description="Docker repository for Utopia Backend"
```

### 1.3 Create Service Account for Cloud Run

```bash
# Create service account
gcloud iam service-accounts create utopia-backend-sa \
    --display-name="Utopia Backend Service Account"

# Get your project ID
PROJECT_ID=$(gcloud config get-value project)

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:utopia-backend-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### 1.4 Store OpenAI API Key in Secret Manager

```bash
# Create secret for OpenAI API key
echo "your-openai-api-key-here" | gcloud secrets create openai-api-key --data-file=-

# Grant access to the service account
gcloud secrets add-iam-policy-binding openai-api-key \
    --member="serviceAccount:utopia-backend-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## Step 2: Set up Workload Identity Federation

### 2.1 Create Workload Identity Pool

```bash
# Create workload identity pool
gcloud iam workload-identity-pools create "github-pool" \
    --location="global" \
    --description="GitHub Actions pool" \
    --display-name="GitHub pool"

# Get the pool ID
POOL_ID=$(gcloud iam workload-identity-pools describe "github-pool" \
    --location="global" \
    --format="value(name)")
```

### 2.2 Create Workload Identity Provider

```bash
# Create workload identity provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
    --workload-identity-pool="github-pool" \
    --location="global" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
    --attribute-condition="assertion.repository_owner=='YOUR_GITHUB_USERNAME'"
```

**Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username!**

### 2.3 Create Service Account for GitHub Actions

```bash
# Create service account for GitHub Actions
gcloud iam service-accounts create github-actions-sa \
    --display-name="GitHub Actions Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"
```

### 2.4 Bind Service Account to Workload Identity

```bash
# Allow GitHub Actions to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding \
    --role roles/iam.workloadIdentityUser \
    --member "principalSet://iam.googleapis.com/$POOL_ID/attribute.repository/YOUR_GITHUB_USERNAME/utopia-backend" \
    github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com
```

**Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username!**

## Step 3: Configure GitHub Secrets

Go to your GitHub repository settings → Secrets and variables → Actions, and add these secrets:

### Required Secrets:

1. **`GCP_PROJECT_ID`**
   ```
   your-gcp-project-id
   ```

2. **`WIF_PROVIDER`**
   ```
   projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider
   ```

3. **`WIF_SERVICE_ACCOUNT`**
   ```
   github-actions-sa@your-project-id.iam.gserviceaccount.com
   ```

4. **`CLOUD_RUN_SERVICE_ACCOUNT`**
   ```
   utopia-backend-sa@your-project-id.iam.gserviceaccount.com
   ```

5. **`OPENAI_API_KEY`** (for the secret reference)
   ```
   your-openai-api-key
   ```

### Getting Project Number:

```bash
# Get your project number
gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
```

## Step 4: Deploy

1. **Push to main branch**: The deployment will trigger automatically
2. **Or manually trigger**: Go to Actions tab → Deploy to Cloud Run → Run workflow

## Step 5: Access Your Application

After deployment, you'll get a Cloud Run URL like:
```
https://utopia-backend-HASH-uc.a.run.app
```

Your API will be available at:
```
https://utopia-backend-HASH-uc.a.run.app/api/chat
```

## Troubleshooting

### Common Issues:

1. **"Permission denied" errors**: Check that all IAM roles are properly assigned
2. **"Secret not found"**: Ensure the OpenAI API key is stored in Secret Manager
3. **"Workload Identity Federation failed"**: Verify the pool, provider, and service account binding

### Useful Commands:

```bash
# View Cloud Run logs
gcloud run services logs read utopia-backend --region=us-central1

# List current deployments
gcloud run services list

# Update environment variables
gcloud run services update utopia-backend \
    --region=us-central1 \
    --set-env-vars="NEW_VAR=value"
```

## Cost Optimization

Cloud Run pricing is based on:
- **CPU and Memory**: Only charged when processing requests
- **Requests**: $0.40 per million requests
- **Networking**: Egress charges apply

The current configuration:
- **Memory**: 512Mi
- **CPU**: 1 vCPU
- **Min instances**: 0 (scales to zero)
- **Max instances**: 10

This should cost approximately $5-20/month for moderate usage.

## Security Considerations

1. **Secrets**: All sensitive data is stored in Secret Manager
2. **IAM**: Least privilege principle applied
3. **Network**: Service is publicly accessible but can be restricted
4. **Authentication**: Consider adding Cloud Identity-Aware Proxy for additional security

## Next Steps

1. **Custom Domain**: Set up a custom domain for your API
2. **Monitoring**: Set up Cloud Monitoring and Logging
3. **Alerts**: Configure alerts for errors and performance issues
4. **Backup**: Consider backing up your session data to Cloud Storage 