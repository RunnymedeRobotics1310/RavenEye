# RavenEye Deployment Guide

This guide documents the deployment process for RavenEye, the frontend web application for the 1310 Runnymede Robotics scouting system.

## Overview

RavenEye is a React-based Single Page Application (SPA) that connects to the RavenBrain backend API. It is deployed as a Docker container running nginx to serve static files over HTTPS.

## Prerequisites

- Docker and Docker Compose installed on the server
- SSL certificates for HTTPS
- GitHub self-hosted runner configured (for CI/CD)
- RavenBrain backend running and accessible

## Server Setup

### 1. Create Directory Structure

```bash
sudo mkdir -p /mnt/nas/raveneye/re-git
sudo mkdir -p /mnt/nas/raveneye/re-data/certs
```

### 2. Copy Docker Compose Files

Checkout this repo to `/mnt/nas/raveneye/re-git`:

```bash
git clone https://github.com/RunnymedeRobotics1310/RavenEye.git
```

### 3. SSL Certificate Setup

Place your SSL certificates in `/mnt/nas/raveneye/re-data/certs/`:
- `fullchain.pem` - Full certificate chain
- `privkey.pem` - Private key

For Let's Encrypt certificates, you can create symbolic links:

```bash
sudo ln -s /etc/letsencrypt/live/raveneye.team1310.ca/fullchain.pem /mnt/nas/raveneye/re-data/certs/fullchain.pem
sudo ln -s /etc/letsencrypt/live/raveneye.team1310.ca/privkey.pem /mnt/nas/raveneye/re-data/certs/privkey.pem
```

### 4. Configure GitHub Repository Variables

In your GitHub repository settings (.env), add the following variable:
- `VITE_API_HOST`: The URL of your RavenBrain API (e.g., `https://ravenbrain.team1310.ca`)

### 5. GitHub Self-Hosted Runner

The deployment uses a self-hosted GitHub Actions runner. Ensure the runner:
- Has Docker installed and accessible
- Has write access to `/mnt/nas/raveneye/re-git/`
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
cd /mnt/nas/raveneye/re-git
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
│             │               │  └────┬────────────┘  └──┬───────────┬──┘    │ │
│             │               │       │                  │           │       │ │
│             │               │       │      ┌───────────┴────────┐  │       │ │
│             │               │       │      │    Backup Runner   │  │       │ │
│             │               │       │      │ (Database Backups) │  │       │ │
│             │               │       │      └───────────┬────────┘  │       │ │
│             │               └───────┼──────────────────┼───────────┼───────┘ │
│             │                       │                  │           │         │
│             │                       │                  │           │         │
└─────────────┼──────────────────────────────────────────┼───────────┼─────────┘
              │                       │                  │           │ 
              ▼                       ▼                  ▼           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         Mercury File Server                                  │
│                        (Shared Volume Mounts)                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Related Projects

- [RavenBrain](https://github.com/RunnymedeRobotics1310/RavenBrain) - Backend API server
