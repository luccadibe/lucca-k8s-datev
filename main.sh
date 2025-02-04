#!/bin/bash

set -e

ARGOCD_NAMESPACE="argocd"
GIT_REPO="git@github.com:luccadibe/lucca-k8s-datev.git"
GIT_BRANCH="argo"

# Install ArgoCD
kubectl create namespace $ARGOCD_NAMESPACE || true
kubectl apply -n $ARGOCD_NAMESPACE -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl wait --for=condition=available --timeout=600s deployment/argocd-server -n $ARGOCD_NAMESPACE

# Get ArgoCD initial admin password
PASSWORD=$(argocd admin initial-password -n argocd | head -n 1)





# Install ArgoCD CLI if not installed
if ! command -v argocd &> /dev/null; then
    curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
    chmod +x /usr/local/bin/argocd
fi

# Login to ArgoCD
argocd login localhost:8080 --username admin --password $PASSWORD --insecure

# Register the Git repo
argocd repo add $GIT_REPO --ssh-private-key-path ~/.ssh/id_rsa

# Deploy the "App of Apps" which will bootstrap everything
argocd app create app-of-apps \
  --repo $GIT_REPO \
  --path "argocd/apps" \
  --dest-namespace argocd \
  --dest-server https://kubernetes.default.svc \
  --sync-policy automated \
  --revision $GIT_BRANCH

# Sync the application
argocd app sync app-of-apps

echo "ArgoCD setup complete! It will now manage Knative and other services."

