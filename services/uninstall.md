# Uninstalling Services

This document describes how to properly uninstall each service from the cluster.

## Prometheus Stack

```bash
# Uninstall the Helm release
helm uninstall prometheus -n monitoring

# Clean up CRDs (Optional - only if you want to completely remove all Prometheus-related resources)
kubectl delete crd alertmanagerconfigs.monitoring.coreos.com
kubectl delete crd alertmanagers.monitoring.coreos.com
kubectl delete crd podmonitors.monitoring.coreos.com
kubectl delete crd probes.monitoring.coreos.com
kubectl delete crd prometheuses.monitoring.coreos.com
kubectl delete crd prometheusrules.monitoring.coreos.com
kubectl delete crd servicemonitors.monitoring.coreos.com
kubectl delete crd thanosrulers.monitoring.coreos.com

```

## MinIO

```bash
# Remove MinIO deployment and service
kubectl delete -f services/minio.yaml

# Delete the namespace if no longer needed
kubectl delete namespace minio
```

## RabbitMQ

```bash
# Remove RabbitMQ cluster
kubectl delete -f services/RabbitMQ.yaml

# Remove RabbitMQ Messaging Topology Operator
kubectl delete -f "https://github.com/rabbitmq/messaging-topology-operator/releases/latest/download/messaging-topology-operator-with-certmanager.yaml"

# Remove RabbitMQ Cluster Operator
kubectl delete -f "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"

# Delete the namespace if no longer needed
kubectl delete namespace rabbitmq
```

## Kafka

```bash
# Remove Kafka Source
kubectl delete -f https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.15.3/eventing-kafka-source.yaml

# Remove Kafka Controller
kubectl delete -f https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.15.3/eventing-kafka-controller.yaml

# Remove Kafka cluster
kubectl delete -f https://strimzi.io/examples/latest/kafka/kraft/kafka-single-node.yaml -n kafka

# Remove Strimzi operator
kubectl delete -f 'https://strimzi.io/install/latest?namespace=kafka' -n kafka

# Delete the namespace if no longer needed
kubectl delete namespace kafka
```

## Tekton

```bash
# Remove Tekton deployment
kubectl delete -f services/tekton.yaml

# Remove the clusterrolebinding
kubectl delete clusterrolebinding default:knative-serving-namespaced-admin
```

## Persistent Volumes

```bash
# Remove PV configuration
kubectl delete -f pv.yaml

# If PVs are stuck in "Terminating" state, force delete them
kubectl patch pv <pv-name> -p '{"metadata":{"finalizers":null}}'
```

## Complete Cluster Cleanup

To completely clean up all services and their resources:

```bash
# Delete all namespaces
kubectl delete namespace minio
kubectl delete namespace monitoring
kubectl delete namespace kafka
kubectl delete namespace rabbitmq

# Remove all CRDs and operators
kubectl delete crd -l app.kubernetes.io/part-of=rabbitmq
kubectl delete crd -l app.kubernetes.io/part-of=kafka
kubectl delete crd -l app.kubernetes.io/part-of=prometheus

# Remove persistent volumes
kubectl delete -f pv.yaml

# Remove any leftover resources
kubectl delete all --all -n default
```