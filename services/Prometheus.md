```
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
```

```
 helm repo update
```

```
 helm install prometheus prometheus-community/prometheus
```

~~output:~~

~~NAME: prometheus  
LAST DEPLOYED: Mon Oct 28 12:20:26 2024  
NAMESPACE: default  
STATUS: deployed  
REVISION: 1  
TEST SUITE: None  
NOTES:  
The Prometheus server can be accessed via port 80 on the following DNS name from within your cluster:  
prometheus-server.default.svc.cluster.local~~

~~Get the Prometheus server URL by running these commands in the same shell:  
export POD_NAME=$(kubectl get pods --namespace default -l "app.kubernetes.io/name=prometheus,app.kubernetes.io/instance=prometheus" -o jsonpath="{.items\[0\].metadata.name}")  
kubectl --namespace default port-forward $POD_NAME 9090~~

~~The Prometheus alertmanager can be accessed via port 9093 on the following DNS name from within your cluster:  
prometheus-alertmanager.default.svc.cluster.local~~

~~Get the Alertmanager URL by running these commands in the same shell:  
export POD_NAME=$(kubectl get pods --namespace default -l "app.kubernetes.io/name=alertmanager,app.kubernetes.io/instance=prometheus" -o jsonpath="{.items\[0\].metadata.name}")  
kubectl --namespace default port-forward $POD_NAME 9093  
\#################################################################################  
\######   WARNING: Pod Security Policy has been disabled by default since    #####  
\######            it deprecated after k8s 1.25+. use                        #####  
\######            (index .Values "prometheus-node-exporter" "rbac"          #####  
\###### .          "pspEnabled") with (index .Values                         #####  
\######            "prometheus-node-exporter" "rbac" "pspAnnotations")       #####  
\######            in case you still need it.                                #####  
\#################################################################################~~

~~The Prometheus PushGateway can be accessed via port 9091 on the following DNS name from within your cluster:  
prometheus-prometheus-pushgateway.default.svc.cluster.local~~

~~Get the PushGateway URL by running these commands in the same shell:  
export POD_NAME=$(kubectl get pods --namespace default -l "app=prometheus-pushgateway,component=pushgateway" -o jsonpath="{.items\[0\].metadata.name}")  
kubectl --namespace default port-forward $POD_NAME 9091~~

~~For more information on running Prometheus, visit:  
[https://prometheus.io/](https://prometheus.io/)~~

~~The configuration is stored in a configmap:~~

```
kubectl get configmap prometheus-server -o yaml  
```

~~Then, we add an initContainer that gives permissions to the prometheus user:~~

```
kubectl edit deployment prometheus-server -n default
```

~~paste the contents of prometheusDeployment.yaml inside there!~~

~~We need to add the services that prometheus should track:~~

```
kubectl edit configmap prometheus-server -n monitoring  
```

~~under "**scrape_configs:**" add this:~~

\~\~    - job_name: 'rabbitmq'  
scrape_interval: 15s  
metrics_path: '/metrics'  
static_configs:  
\- targets: \['10.244.3.67:15692'\]\~\~

**~~The IP here is our current RabbitMQ cluster. This is hardcoded and wont work if we change the instance.~~**

New approach:

---

"prometheusStackValues.yaml"

```yaml
kube-state-metrics:
  metricLabelsAllowlist:
    - pods=[*]
    - deployments=[app.kubernetes.io/name,app.kubernetes.io/component,app.kubernetes.io/instance]
prometheus:
  prometheusSpec:
    serviceMonitorSelectorNilUsesHelmValues: false
    podMonitorSelectorNilUsesHelmValues: false
```

then

```
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts helm repo update helm install prometheus prometheus-community/kube-prometheus-stack -n default -f values.yaml
```

```
kubectl apply -f https://raw.githubusercontent.com/knative-extensions/monitoring/main/servicemonitor.yaml
```

<https://knative.dev/docs/serving/observability/metrics/collecting-metrics/#setting-up-the-prometheus-stack>

```
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
```

then

"rabbitmq-servicemonitor.yaml"

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rabbitmq-servicemonitor
  labels:
    app: rabbitmq
spec:
  selector:
    matchLabels:
      app: hello-world-server-0  # for now the name of the rabbimq cluster
  endpoints:
    - port: "15692"
      interval: 15s
  namespaceSelector:
    matchNames:
      - default 
```

kubectl apply -f rabbitmq-servicemonitor.yaml

<http://localhost:9090/service-discovery?search=>

RabbitMQ service is found by prometheus

However the board doesnt work