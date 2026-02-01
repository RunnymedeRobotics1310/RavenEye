# RavenEye Deployment Guide

This guide documents the deployment process for RavenEye, the data scouting web application for the 1310 Runnymede Robotics scouting system.

## Overview

RavenEye is a React-based Single Page Application (SPA) that connects to the RavenBrain backend API. It is deployed as a Docker container running nginx to serve static files over HTTPS.

RavenBrain is a backend API written in Java that provides data storage and retrieval for RavenEye. It is deployed as a Docker container running *Micronaut* and *MySQL Database*.

## Prerequisites

- Docker installed on the server
- SSL certificates for HTTPS
- GitHub self-hosted runner configured (for CI/CD)

## Server Setup

### 1. Create Directory Structure

```bash
sudo mkdir -p /mnt/nas/raveneye/code
sudo mkdir -p /mnt/nas/raveneye/certs
sudo mkdir -p /mnt/nas/raveneye/backups
sudo chown -R 999:999 /mnt/nas/raveneye/backup
```

The `chown` command exists because the mysql user runs as `999` and needs permission to operate on the files.

### 2. Copy Docker Compose Files

Checkout this repo to `/mnt/nas/raveneye/code`:

```bash
git clone https://github.com/RunnymedeRobotics1310/RavenEye.git
```

### 3. SSL Certificate Setup

Place your SSL certificates in `/mnt/nas/raveneye/certs/`:
- `fullchain.pem` - Full certificate chain
- `privkey.pem` - Private key

For Let's Encrypt certificates, you can create symbolic links:

```bash
sudo ln -s /etc/letsencrypt/live/raveneye.team1310.ca/fullchain.pem /mnt/nas/raveneye/certs/fullchain.pem
sudo ln -s /etc/letsencrypt/live/raveneye.team1310.ca/privkey.pem /mnt/nas/raveneye/certs/privkey.pem
```

### 4. Configure GitHub Repository Variables

You will be setting up your environment variable settings (`.env`) in the source code folder next to the `docker-compose.prod.yml` and `docker-compose.yml` files. Use `.env.production.example` as an example. The properties are all documented in that file.

Note, *MySQL Database* working files are ***not*** stored in a separate data file; they are stored in a docker volume. Backups run twice a day. As long as the volumes aren't deleted, they should persist between restarts. If there is a problem, you can restore the database by following the instructions in the *RavenBrain* documentation.

#### Secure the file:

```bash
sudo chmod 600 .env
sudo chown root:root .env
```

#### Security Rationale

This deployment uses a `.env` file for configuration secrets. This approach is simple and well-supported by Docker
Compose, which automatically reads variables from `.env` in the working directory.

**Why this approach:**

- Simple to set up and maintain
- No additional tooling required
- Easy to update configuration without modifying compose files
- Works identically across bare metal, VMs, and LXC containers (e.g., Proxmox)

**Security considerations:**

- Secrets are stored in plain text on disk - ensure file permissions are restrictive (`chmod 600`, owned by root)
- Do not include the `.env` file in backups that leave the server
- The LXC container or VM hosting Docker should itself be properly secured

**Alternatives for higher-security environments:**

- Systemd `EnvironmentFile` directive to load secrets into the service
- External secret management (HashiCorp Vault, etc.)
- Docker Swarm secrets (requires Swarm mode)

For most self-hosted deployments, the `.env` file approach with proper file permissions provides adequate security.

### 5. GitHub Self-Hosted Runner

The deployment uses a self-hosted GitHub Actions runner. Ensure the runner:
- Has Docker installed and accessible
- Has write access to `/mnt/nas/raveneye/`
- Is registered with the repository

## Manual Deployment

If you need to deploy manually without CI/CD:

```bash
# Build the Docker image
sudo docker build \
  --build-arg VITE_API_HOST=https://ravenbrain.team1310.ca \
  -t raveneye:latest \
  .

# Deploy using Docker Compose
cd /mnt/nas/raveneye/code
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically:
1. Triggers on pushes to the `main` branch
2. Builds the Docker image with the configured API host
3. Deploys the application using Docker Compose
4. Verifies the deployment
5. Cleans up old Docker images

## Monitoring

### Check Application Status

```bash
docker compose -f /opt/raveneye/docker-compose.yml -f /opt/raveneye/docker-compose.prod.yml ps
```

### View Logs

```bash
docker compose -f /opt/raveneye/docker-compose.yml -f /opt/raveneye/docker-compose.prod.yml logs -f app
```

### Health Check

The application exposes a health endpoint at `/health`:

```bash
curl -k https://localhost/health
```

## Troubleshooting

### SSL Certificate Issues

If you see SSL errors, verify:
1. Certificate files exist and are readable
2. Certificate paths are correct in docker-compose
3. Certificates are not expired

```bash
openssl x509 -in /mnt/data/raveneye/certs/fullchain.pem -text -noout | grep -A2 "Validity"
```

### Container Won't Start

Check the logs for errors:

```bash
docker compose -f /opt/raveneye/docker-compose.yml -f /opt/raveneye/docker-compose.prod.yml logs app
```

### API Connection Issues

Verify the `VITE_API_HOST` was set correctly during build:
1. Check the browser's network tab for API requests
2. Ensure RavenBrain is running and accessible
3. Verify CORS settings on RavenBrain allow requests from RavenEye's domain

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Docker Server                                   │
│                                                                              │
│  ┌─────────────────────┐    ┌──────────────────────────────────────────────┐ │
│  │     RavenEye        │    │           RavenBrain Docker Compose          │ │
│  │  (nginx + React)    │    │  ┌─────────────────┐  ┌─────────────────┐    │ │
│  │     Port 443        │───▶│  │    Micronaut    │  │      MySQL      │    │ │
│  └──────────┬──────────┘    │  │    Port 443     │─▶│    Port 3007    │    │ │
│             │               │  └────┬────────────┘  └─────────────────┘    │ │
│             │               │       │                                      │ │
│             │               │       │      ┌────────────────────┐          │ │
│             │               │       │      │    Backup Runner   │          │ │
│             │               │       │      │ (Database Backups) │          │ │
│             │               │       │      └───────────┬────────┘          │ │
│             │               └───────┼──────────────────┼───────────────────┘ │
│             │                       │                  │                     │
│             │                       │                  │                     │
└─────────────┼──────────────────────────────────────────┼─────────────────────┘
              │                       │                  │             
              ▼                       ▼                  ▼            
┌──────────────────────────────────────────────────────────────────────────────┐
│                         Mercury File Server                                  │
│                        (Shared Volume Mounts)                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Related Projects

- [RavenBrain](https://github.com/RunnymedeRobotics1310/RavenBrain) - Backend API server


## Auto-Start on Boot (linux)

Create a systemd service file at `/etc/systemd/system/raveneye.service`:

```ini
[Unit]
Description=RavenEye Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/raveneye
ExecStart=/usr/bin/docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.yml -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable raveneye
sudo systemctl start raveneye
```

### Update Application

After pushing to `main`, the image is automatically built and published. On the server:

```bash
cd /opt/raveneye
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
docker pull ghcr.io/runnymederobotics1310/ravenbrain:latest
docker tag ghcr.io/runnymederobotics1310/ravenbrain:latest ravenbrain:latest
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```



## Advanced Administration

The following settings should already be implemented, but the following miscellaneous sections provide some of the
internals already implemented via docker, docker-compose, and github actions.

### Building the Docker Image

On your development machine, build the production Docker image:

```bash
./gradlew dockerBuild
```

This creates the `ravenbrain:latest` image.

### Configure SSL Certificates

The production deployment runs HTTPS on port 443. You need to provide SSL certificate files.

#### Certificate Files Required

Place the following PEM files in the certs directory (`/mnt/nas/raveneye/certs/`):

| File            | Description                                          |
|-----------------|------------------------------------------------------|
| `privkey.pem`   | Private key                                          |
| `fullchain.pem` | Full certificate chain (certificate + intermediates) |

#### Obtaining Certificates

**Option A: Let's Encrypt (free, automated)**

Use certbot to obtain certificates:

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d ravenbrain.team1310.ca
```

Certificates are saved to `/etc/letsencrypt/live/ravenbrain.team1310.ca/`. Copy or symlink them:

```bash
sudo cp /etc/letsencrypt/live/ravenbrain.team1310.ca/privkey.pem /mnt/nas/raveneye/certs/
sudo cp /etc/letsencrypt/live/ravenbrain.team1310.ca/fullchain.pem /mnt/nas/raveneye/certs/
```

**Option B: Provided Certificate (this is in production for 2026)**

If you have certificate files from another source (e.g., your organization), copy them to the certs directory:

```bash
sudo cp /path/to/your/privkey.pem /mnt/nas/raveneye/certs/
sudo cp /path/to/your/fullchain.pem /mnt/nas/raveneye/certs/
```

We are using cert files obtained from CloudFlare.

#### Secure the Certificate Files

```bash
sudo chmod 600 /mnt/nas/raveneye/certs/*.pem
sudo chown root:root /mnt/nas/raveneye/certs/*.pem
```

#### Certificate Renewal

If using Let's Encrypt, set up automatic renewal:

```bash
sudo crontab -e
```

Add:

```cron
0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/ravenbrain.team1310.ca/*.pem /mnt/data/ravenbrain/certs/ && docker restart ravenbrain-app
```





## CI/CD with GitHub Actions

RavenEye uses GitHub Actions with a self-hosted runner for automated deployments. When code is pushed to the `main`
branch, the workflow automatically creates a release, builds a Docker image, and deploys to production.

### How It Works

1. Code is pushed to the `main` branch on GitHub
2. The `publish` job runs on GitHub-hosted Ubuntu runners:
   - Runs type checking and builds the application
   - Creates a semantic release (version bump, changelog, git tag)
3. The `build` job runs on GitHub-hosted Ubuntu runners:
   - Builds a multi-architecture Docker image (amd64/arm64)
   - Pushes the image to GitHub Container Registry (ghcr.io)
4. The `deploy` job runs on the self-hosted runner (Linux container on Windows 11):
   - Pulls the latest Docker image
   - Restarts only the nginx (RavenEye) container
   - The database and RavenBrain containers are not affected

### Self-Hosted Runner Architecture

The GitHub runner runs in a Linux container on the Windows 11 Docker host. This approach provides:

| Approach | Pros | Cons |
| --- | --- | --- |
| Runner in Linux container (current) | Consistent Linux environment, matches workflow syntax, easy to manage | Requires Docker socket access |
| Runner on Windows host | Direct access | Windows path/shell issues, harder to maintain |
| Runner on separate server | Clean separation | Would need remote access to deploy |

The runner container:
- Uses the host's Docker daemon via socket mount
- Has the config directory (with `.env`) mounted at `/opt/raveneye-config`
- Checks out compose files from the repository during workflow runs
- Only handles lightweight deployment tasks (pull image, restart container)

### Triggering Deployments

The workflow supports multiple triggers:

| Trigger | Use Case |
| --- | --- |
| Push to `main` | Normal RavenEye development - builds, releases, and deploys |
| Manual (`workflow_dispatch`) | Re-run deployment from GitHub Actions UI |
| External (`repository_dispatch`) | Triggered by RavenBrain to deploy its container |

**To trigger from RavenBrain**, add this to RavenBrain's workflow:
```yaml
- name: Trigger RavenEye deployment
  run: |
    gh api repos/RunnymedeRobotics1310/RavenEye/dispatches \
      -f event_type=deploy \
      -f 'client_payload={"service":"app"}'
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Or manually via CLI:
```bash
gh api repos/RunnymedeRobotics1310/RavenEye/dispatches \
  -f event_type=deploy \
  -f 'client_payload={"service":"app"}'
```

### Setting Up the Self-Hosted Runner

#### 1. Get the Registration Token

1. Go to the repository on GitHub: `https://github.com/RunnymedeRobotics1310/RavenEye`
2. Click **Settings** → **Actions** → **Runners**
3. Click **New self-hosted runner**
4. Copy the registration token shown (valid for 1 hour)

#### 2. Create the Config Directory

Create a config directory on the host to store your `.env` file:

```bash
mkdir -p /C/Users/q/raveneye/config
```

Copy your production `.env` file to this directory and add the runner token:

```bash
# In /C/Users/q/raveneye/config/.env
GITHUB_RUNNER_TOKEN=your_registration_token_here
RAVENEYE_CONFIG=/C/Users/q/raveneye/config
# ... other config values
```

#### 3. Start the Runner

From the code directory, start the runner:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d github-runner
```

The runner will automatically:
- Register itself with GitHub using the token
- Store its credentials in the `github-runner-data` volume
- Appear as "Online" in GitHub Settings → Actions → Runners

After initial registration, the `GITHUB_RUNNER_TOKEN` is no longer needed (credentials are persisted in the volume).

#### 4. Verify the Runner

Check that the runner is running:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs github-runner
```

The runner should show as **Online** at: `https://github.com/RunnymedeRobotics1310/RavenEye/settings/actions/runners`

### Manual Deployment Trigger

You can manually trigger a deployment from GitHub:

1. Go to the repository → **Actions** → **Generate Release and Deploy to Production**
2. Click **Run workflow** → **Run workflow**

### Viewing Deployment Logs

Deployment logs are available in GitHub:

1. Go to the repository → **Actions**
2. Click on the workflow run to see logs

Or check locally on the server:

```bash
# Runner logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f github-runner

# Application logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f nginx
```

### Troubleshooting

**Runner shows as offline:**
```bash
# Check runner status
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps github-runner

# Restart the runner
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart github-runner
```

**Re-register the runner** (if credentials are lost):
```bash
# Remove the runner data volume and re-register
docker compose -f docker-compose.yml -f docker-compose.prod.yml down github-runner
docker volume rm raveneye_github-runner-data
# Add a new GITHUB_RUNNER_TOKEN to .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d github-runner
```
