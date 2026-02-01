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

RavenBrain uses GitHub Actions with a self-hosted runner for automated deployments. When code is pushed to the `main`
branch, the runner on your server automatically builds and deploys the updated application.

### How It Works

1. Code is pushed to the `main` branch on GitHub
2. GitHub signals the self-hosted runner on your server
3. The runner checks out the code, builds the Docker image, and restarts the app container
4. The database container is not affected

### Setting Up the Self-Hosted Runner

The github self-hosted runner should run on the Docker host. There are other deployment options,
including running it in Docker or on a totally separate server. Here is the rationale for running
it on the docker hosts:

| Approach | Pros | Cons |
| --- | --- | --- |
| Runner on host (current) | Simple, direct Docker access | Mixes CI/CD with app |
| Runner in Docker | Isolated | Requires Docker-in-Docker or socket mounting, adds complexity and security considerations |
| Runner on separate server | Clean separation | Would need to SSH/access production server to deploy, defeating the purpose |

The problem with Docker-in-Docker:

The runner needs to:

1. Run ./gradlew dockerBuild (build a Docker image)
2. Run docker compose up (restart containers)

If the runner is in a container, it would need access to the host's Docker daemon (via socket mount), which has security
implications and adds complexity.

Run the runner directly on the host (which in our case is a Proxmox LXC container), not in Docker. It's:

- A lightweight Go process that idles most of the time
- Needs direct Docker access anyway
- Simple to install and maintain

The runner and RavenBrain share the same LXC container, but they're separate processes with different purposes.
This is a common and practical setup for small deployments.

#### 1. Get the Registration Token

1. Go to the repository on GitHub: `https://github.com/RunnymedeRobotics1310/RavenBrain`
2. Click **Settings** → **Actions** → **Runners**
3. Click **New self-hosted runner**
4. Select **Linux** and your architecture (x64 or ARM64)
5. Copy the registration token shown (valid for 1 hour)

#### 2. Install the Runner on Your Server

SSH into your production server and run:

```bash
# Create a directory for the runner
mkdir -p /opt/github-runner && cd /opt/github-runner

# Download the runner (check GitHub for latest version)
curl -o actions-runner-linux-x64-2.321.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-x64-2.321.0.tar.gz

# Extract
tar xzf actions-runner-linux-x64-2.321.0.tar.gz

# Configure the runner
./config.sh --url https://github.com/RunnymedeRobotics1310/RavenBrain --token <YOUR_TOKEN>
```

When prompted:

- **Runner group**: Press Enter for default
- **Runner name**: Enter a name like `ravenbrain-prod`
- **Labels**: Press Enter for default (or add `production`)
- **Work folder**: Press Enter for default

#### 3. Install as a Service

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

Verify the runner is connected:

```bash
sudo ./svc.sh status
```

The runner should now appear as "Online" in GitHub Settings → Actions → Runners.

#### 4. Grant Docker Permissions

The runner needs permission to use Docker:

```bash
sudo usermod -aG docker $(whoami)
```

Log out and back in for the change to take effect.

### Manual Deployment Trigger

You can manually trigger a deployment from GitHub:

1. Go to the repository → **Actions** → **Deploy to Production**
2. Click **Run workflow** → **Run workflow**

### Viewing Deployment Logs

Deployment logs are available in GitHub:

1. Go to the repository → **Actions**
2. Click on the workflow run to see logs

Or check locally on the server:

```bash
# Runner logs
journalctl -u actions.runner.RunnymedeRobotics1310-RavenBrain.ravenbrain-prod.service -f

# Application logs
docker compose -f /opt/ravenbrain/docker-compose.yml -f /opt/ravenbrain/docker-compose.prod.yml logs -f app
```
