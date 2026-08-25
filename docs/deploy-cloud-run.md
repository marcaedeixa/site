# Deploying to Cloud Run

Push to `main` triggers [.github/workflows/deploy-cloud-run.yml](../.github/workflows/deploy-cloud-run.yml), which builds the existing [Dockerfile](../Dockerfile) and deploys it to Cloud Run.

- Project: `marca-e-deixa`
- Artifact Registry repo: `marca-e-deixa-site`
- Region: `us-east1`
- Cloud Run service: `marca-e-deixa-site`

`NEXT_PUBLIC_*` values are **not** baked into the image at build time — the Docker image is built once with placeholder values, and [entrypoint.sh](../entrypoint.sh) rewrites them from real env vars when the container starts. This is why the workflow can pass the real values only at deploy time via `--set-env-vars`, without touching the Dockerfile.

All runtime config — including the server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RECAPTCHA_SECRET_KEY`) — is passed as plain Cloud Run environment variables sourced from GitHub Actions secrets, not Secret Manager. That's simpler and free, at the cost of those values being visible to anyone with read access to the Cloud Run service config (`gcloud run services describe`) rather than living behind Secret Manager's separate IAM/audit trail.

## One-time GCP setup

Run these once (requires `gcloud` authenticated as an owner/editor on the project).

```bash
gcloud config set project marca-e-deixa

gcloud services enable run.googleapis.com artifactregistry.googleapis.com

gcloud artifacts repositories create marca-e-deixa-site \
  --repository-format=docker \
  --location=us-east1 \
  --description="marcaedeixa-site container images"
```

Create a dedicated deploy service account and grant it the minimum roles:

```bash
gcloud iam service-accounts create marca-e-deixa-deployer \
  --display-name="GitHub Actions deployer"

DEPLOYER=marca-e-deixa-deployer@marca-e-deixa.iam.gserviceaccount.com

gcloud projects add-iam-policy-binding marca-e-deixa \
  --member="serviceAccount:$DEPLOYER" --role="roles/run.admin"

gcloud projects add-iam-policy-binding marca-e-deixa \
  --member="serviceAccount:$DEPLOYER" --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding marca-e-deixa \
  --member="serviceAccount:$DEPLOYER" --role="roles/iam.serviceAccountUser"
```

Create a JSON key for that service account (used as `GCP_SA_KEY` below):

```bash
gcloud iam service-accounts keys create marca-e-deixa-deployer-key.json \
  --iam-account="$DEPLOYER"
```

> This is a long-lived credential — store the key only as a GitHub Actions secret, delete the local file after uploading it (`rm marca-e-deixa-deployer-key.json`), and rotate it periodically (`gcloud iam service-accounts keys list --iam-account="$DEPLOYER"` / `keys delete`).

## GitHub repository secrets

Add these under **Settings → Secrets and variables → Actions**:

| Secret | Notes |
|---|---|
| `GCP_SA_KEY` | Full JSON content of the key file created above |
| `NEXT_PUBLIC_APP_URL` | e.g. `https://marca-e-deixa-site-xxxxx.a.run.app` or your custom domain |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (public) |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | reCAPTCHA site key (public) |
| `STRIPE_MODE` | `test` or `live` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `STRIPE_SECRET_KEY` | Stripe secret key (server-only) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (server-only) |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA secret key (server-only) |

All of these end up as plain Cloud Run environment variables (not Secret Manager) — see the note above the workflow steps.

## First deploy

The very first deploy can't happen until `GCP_SA_KEY` and the runtime secrets above all exist in GitHub. Once those are in place, push to `main` (or re-run the workflow) to deploy.

After the first successful deploy, get the live URL with:

```bash
gcloud run services describe marca-e-deixa-site --region=us-east1 --format="value(status.url)"
```

If that differs from the placeholder used for `NEXT_PUBLIC_APP_URL`, update the GitHub secret and redeploy.
