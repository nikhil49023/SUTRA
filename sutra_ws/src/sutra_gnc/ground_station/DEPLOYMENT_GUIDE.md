# Smart Horizon GCS — Production Deployment Guide

## Overview
This document provides production deployment instructions for containerized Nginx serving, Docker Compose stack orchestration, and Kubernetes cluster deployment.

---

## 1. Local Docker Compose Deployment

```bash
cd sutra_ws/src/sutra_gnc/ground_station

# Build and start container stack
docker-compose up -d --build

# Verify container status
docker-compose ps
```

---

## 2. Production Kubernetes Cluster Deployment

```bash
# 1. Create dedicated namespace
kubectl create namespace sutra-uav-system

# 2. Apply ConfigMap, Deployment, and Service
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# 3. Check deployment status
kubectl get pods -n sutra-uav-system
kubectl get svc -n sutra-uav-system
```

---

## 3. Rollback & Versioning Strategy

```bash
# Undo deployment rollout
kubectl rollout undo deployment/smart-horizon-gcs-deployment -n sutra-uav-system
```
