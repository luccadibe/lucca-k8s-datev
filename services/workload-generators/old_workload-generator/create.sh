# Create the script.js file locally
kubectl create configmap k6s-script --from-file=script.js

# Update the RabbitMQ secrets with your actual values
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: rabbitmq-secrets
type: Opaque
data:
  endpoint: $(echo -n "amqp://your-rabbitmq-host:5672" | base64)
  username: $(echo -n "your-username" | base64)
  password: $(echo -n "your-password" | base64)
EOF



kubectl apply -f job.yaml

kubectl get jobs
kubectl logs job/k6s-workload-generator


