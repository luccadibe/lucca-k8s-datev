# Development

To interact with the different services or view their frontends, you need to port forward from k8s:

```bash
# MiniO | addr: localhost:9001
# username: minioadmin
# password: minioadmin
# minio access key: xyTKJR3zwYJrdvnxLAHn
# secret key: N7eZ14alh6wXOc5ciObuzgO8ruCQPWyxIi7AJ5Ur
kubectl port-forward -n minio services/minio-service 9000:9000 9001:9001

# RabbitMQ | addr: localhost:15672
# username: default_user_DIvgQNR1vnhX9smMrkS
# password: a7s7pp7j5V3oTBMw33k8vbdbDK8xGrwg
kubectl port-forward svc/invoice-queue  15672:15672 5672:5672

# Grafana (via prometheus-stack) | addr: localhost:3000
# username: admin
# password: prom-operator
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Prometheus | addr: localhost:9090
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090

# For testing Knative endpoints
kubectl port-forward svc/kourier 8080:80 -n kourier-system


# for running the workload-generator

kubectl run workload-generator \
  --image=europe-west10-docker.pkg.dev/schirmer-project/swc/workload-generator:latest \
  --env=ENDPOINT="invoice-queue.default.svc.cluster.local:5672" \
  --env=RABBITMQ_USER="default_user_DIvgQNR1vnhX9smMrkS" \
  --env=RABBITMQ_PASS="a7s7pp7j5V3oTBMw33k8vbdbDK8xGrwg" \
  --env=INVOICES_PER_SECOND="5" \
  --env=MID_ITEMS_PER_INVOICE="10" \
  --env=MIN_ITEMS_PER_INVOICE="3" \
  --env=MAX_ITEMS_PER_INVOICE="20" \
  --env=GENERATE_LARGE_INVOICE="false" \
  --env=ITEMS_LARGE_INVOICE="100000" \
  --env=DURATION="10000" \
  --restart=Never \
  --command -- k6 run script.js

#after running:
kubectl delete pod workload-generator


#to send bomb:
kubectl run send-bomb \
  --image=europe-west10-docker.pkg.dev/schirmer-project/swc/send-bomb:latest \
  --env=ENDPOINT="invoice-queue.default.svc.cluster.local:5672" \
  --env=RABBITMQ_USER="default_user_DIvgQNR1vnhX9smMrkS" \
  --env=RABBITMQ_PASS="a7s7pp7j5V3oTBMw33k8vbdbDK8xGrwg" \
  --env=ITEMS_LARGE_INVOICE="100000" \
  --restart=Never \
  --command -- k6 run /script.js


#after running
kubectl delete pod send-bomb

```

For detailed information about each service's setup and configuration, see the documentation in the [services folder](./services/).

