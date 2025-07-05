# Quick Cloud Run Setup (Service Account Key Method)

This is the fastest way to get your app deployed to Cloud Run using a service account key.

## Step 1: Enable APIs and Create Resources

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Create Artifact Registry repository
gcloud artifacts repositories create utopia-backend \
    --repository-format=docker \
    --location=us-central1 \
    --description="Docker repository for Utopia Backend"
```

## Step 2: Create Service Account and Key

```bash
# Create service account
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

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.admin"

# Create and download service account key
gcloud iam service-accounts keys create ~/github-actions-key.json \
    --iam-account=github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com
```

## Step 3: Create Secret for OpenAI API Key

```bash
# Create secret for OpenAI API key
echo "your-openai-api-key-here" | gcloud secrets create openai-api-key --data-file=-
```

## Step 4: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add these secrets:

1. **`GCP_PROJECT_ID`**
   ```
   your-project-id
   ```

2. **`GCP_SA_KEY`**
   ```
   {
     "type": "service_account",
     "project_id": "your-project-id",
     ...
   }
   ```
   (Copy the entire contents of the `~/github-actions-key.json` file)

3. **`OPENAI_API_KEY`**
   ```
   your-openai-api-key
   ```

## Step 5: Use the Simple Workflow

1. **Delete or rename** the current workflow file:
   ```bash
   mv .github/workflows/deploy-cloud-run.yml .github/workflows/deploy-cloud-run-wif.yml.backup
   ```

2. **Rename the simple workflow**:
   ```bash
   mv .github/workflows/deploy-cloud-run-simple.yml .github/workflows/deploy-cloud-run.yml
   ```

3. **Push to main branch** to trigger deployment!

## Step 6: Clean Up

After testing, **delete the service account key file** for security:
```bash
rm ~/github-actions-key.json
```

## What's Next?

Once this is working, you can later migrate to the more secure Workload Identity Federation approach using the full setup guide in `CLOUD_RUN_SETUP.md`.

## Troubleshooting

- **"Repository not found"**: Make sure the Artifact Registry repository exists
- **"Permission denied"**: Verify all IAM roles are assigned correctly
- **"Secret not found"**: Ensure the OpenAI API key secret is created in Secret Manager 