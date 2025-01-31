#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
if ! command_exists kubectl; then
    echo "kubectl is required but not installed. Please install kubectl first."
    exit 1
fi

if ! command_exists helm; then
    echo "helm is required but not installed. Please install helm first."
    exit 1
fi

echo "Creating necessary namespaces..."
kubectl create namespace minio --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace kafka --dry-run=client -o yaml | kubectl apply -f -

echo "Deploying persistent volumes..."
kubectl apply -f pv.yaml

echo "Deploying MinIO..."
kubectl apply -f services/minio.yaml

echo "Installing RabbitMQ operators..."
# Install RabbitMQ Cluster Operator
kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"

# Install RabbitMQ Messaging Topology Operator
kubectl apply -f "https://github.com/rabbitmq/messaging-topology-operator/releases/latest/download/messaging-topology-operator-with-certmanager.yaml"

echo "Deploying RabbitMQ cluster..."
kubectl apply -f services/RabbitMQ.yaml

echo "Setting up Kafka..."
kubectl create -f 'https://strimzi.io/install/latest?namespace=kafka' -n kafka
kubectl apply -f https://strimzi.io/examples/latest/kafka/kraft/kafka-single-node.yaml -n kafka
kubectl apply -f https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.15.3/eventing-kafka-controller.yaml
kubectl apply -f https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.15.3/eventing-kafka-source.yaml

echo "Setting up Tekton..."
kubectl apply -f services/tekton.yaml
kubectl create clusterrolebinding default:knative-serving-namespaced-admin \
    --clusterrole=knative-serving-namespaced-admin \
    --serviceaccount=default:default

echo "Setting up Prometheus Stack..."
# Add Prometheus Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus stack with our values
helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring \
  -f services/prometheus/values.yaml

# Setup Knative monitoring
kubectl apply -f https://raw.githubusercontent.com/knative-extensions/monitoring/main/servicemonitor.yaml

# Setup RabbitMQ monitoring
cat > rabbitmq-servicemonitor.yaml << EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rabbitmq-servicemonitor
  labels:
    app: rabbitmq
spec:
  selector:
    matchLabels:
      app: hello-world-server-0
  endpoints:
    - port: "15692"
      interval: 15s
  namespaceSelector:
    matchNames:
      - default
EOF

kubectl apply -f rabbitmq-servicemonitor.yaml

echo "You can check the status using: kubectl get pods --all-namespaces"