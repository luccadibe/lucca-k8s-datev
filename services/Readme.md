# Services Documentation

This document contains detailed information about the setup and configuration of each service in the cluster.

## MinIO

MinIO is deployed using:

```bash
kubectl apply -f minio.yaml
```

### Cluster Access
To access MinIO from within the cluster, use: `http://minio-service.minio.svc.cluster.local:9000`

## RabbitMQ

### Setup

RabbitMQ requires the following prerequisites:
- Knative Eventing
- Cert Manager v1.5.4
- RabbitMQ Cluster Operator
- RabbitMQ Messaging Topology Operator

Deploy a basic cluster using:

```yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: CLUSTER_NAME
```

### Architecture Overview
The current setup follows this flow:
1. Producer (Go) generates JSON documents as Cloud Events
2. Events are sent to the `amq.headers` exchange
3. Exchange is bound to `my_new_queue` queue
4. RabbitMQSource (`datev-queue-source`) consumes from the queue
5. Events are distributed to Knative service containers (currently `generate-invoice`)

### Cluster Access
Internal cluster access: `rabbitmq-service.rabbitmq.svc.cluster.local:5672`

## Kafka

### Version 1
Deploy using:
```bash
kubectl apply -f kafka.yaml
```

### Version 2 (Work in Progress)
Installation steps:
```bash
kubectl create -f 'https://strimzi.io/install/latest?namespace=kafka' -n kafka
kubectl apply -f https://strimzi.io/examples/latest/kafka/kraft/kafka-single-node.yaml -n kafka

kubectl apply -f https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.15.3/eventing-kafka-controller.yaml
kubectl apply -f https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.15.3/eventing-kafka-source.yaml
```

## Tekton

Deploy using:
```bash
kubectl apply -f tekton.yaml
kubectl create clusterrolebinding default:knative-serving-namespaced-admin \
--clusterrole=knative-serving-namespaced-admin  --serviceaccount=default:default
```

## Prometheus Stack

The Prometheus Stack includes Prometheus, Grafana, and other monitoring tools. It's configured to monitor both Knative and RabbitMQ metrics.

### Installation

1. Install using Helm with our custom values:
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring \
  -f services/prometheus/values.yaml
```

### Note: to update the helm chart, run:
```bash
helm repo update
helm upgrade prometheus prometheus-community/kube-prometheus-stack -n monitoring -f services/prometheus/values.yaml
```

2. Setup Knative monitoring:
```bash
kubectl apply -f https://raw.githubusercontent.com/knative-extensions/monitoring/main/servicemonitor.yaml
```

3. Only do this if you want to use the OpenCensus exporter:
```bash
kubectl create namespace metrics
kubectl apply -f https://raw.githubusercontent.com/knative/docs/main/docs/serving/observability/metrics/collector.yaml
#Then, edit the `config-observability` configmaps in the namespaces `knative-serving` and `knative-eventing`:
kubectl patch --namespace knative-serving configmap/config-observability \
  --type merge \
  --patch '{"data":{"metrics.backend-destination":"opencensus","metrics.request-metrics-backend-destination":"opencensus","metrics.opencensus-address":"otel-collector.metrics:55678"}}'
kubectl patch --namespace knative-eventing configmap/config-observability \
  --type merge \
  --patch '{"data":{"metrics.backend-destination":"opencensus","metrics.opencensus-address":"otel-collector.metrics:55678"}}'
```



3. Setup RabbitMQ monitoring:
```bash
kubectl apply -f services/prometheus/rabbitMQServiceMonitor.yaml
kubectl apply -f services/prometheus/rabbitMQPodMonitor.yaml
```
### Note: Any changes to the RabbitMQ cluster name will require changes to the `rabbitMQServiceMonitor.yaml` and `rabbitMQPodMonitor.yaml` files.

### Monitoring Configuration

The stack is configured to:
- Monitor Knative metrics through service monitors
- Collect RabbitMQ metrics via both service and pod monitors
- Expose metrics through Grafana dashboards

To view RabbitMQ metrics in Grafana:
1. Access Grafana (port-forward to port 3000)
2. Go to "Explore"
3. Use PromQL queries like:
   - `rabbitmq_queue_messages_ready`: Number of messages ready to be delivered
   - `rabbitmq_queue_messages_published_total`: Total number of messages published
   - `rabbitmq_queue_messages_delivered_total`: Total number of messages delivered

To change this configuration introducing new values:
```bash
helm upgrade prometheus prometheus-community/kube-prometheus-stack -f services/prometheus/values.yaml -n monitoring
```



## MongoDB

First, the mongo secret needs to be created:
```bash
./secrets/generateSecrets.sh
```
Then, apply the ConfigMap:
```bash
kubectl apply -f mongodb/mongoConfigMap.yaml
```

Then, deploy the MongoDB service:
```bash
kubectl apply -f mongodb/mongoDeployment.yaml
```
Finally, apply the Service:
```bash
kubectl apply -f mongodb/mongoService.yaml
```

To access the mongo shell, see the [`Readme.md`](../mongodb/Readme.md) file in the `mongodb` directory.


## Persistent Volumes

The cluster uses persistent volumes for various services. Deploy the base PV configuration using:

```bash
kubectl apply -f pv.yaml
```

This creates the necessary persistent volumes that will be used by services like MinIO, RabbitMQ, and others.
