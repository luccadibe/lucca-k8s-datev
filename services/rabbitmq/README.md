[Documentation](https://knative.dev/docs/eventing/sources/rabbitmq-source/): 

1. 
	1. Install knative eventing
	2. Install Certmanager
	3. Install RabbitMQ Cluster operator
	4. Install RabbitMQ Messaging Topology Operator
2. Cluster
	1. Deploy Rabbit MQ Cluster (ATTENTION: When a new cluster is deployed username and password change and need to be changed in the producer. to find out uname and pass we need to look for rabbitmq secret and decode them with base64)
 	2. Create a queue via Dashboard with `kubectl port-forward svc/invoice-queue 5672:5672 15672:15672` (name it my_new_queue or it wont work). It needs to be type `quorum` and connected to the `amq.headers` exchange 
  	4. Create a binding to the exchange for the queue via dashboard
	5. Deploy your service
	6. Deploy RabbitMQSource
3. Send message
	1. Specify queue and exchange in producer
	2. RabbitMQSource handles how requests are 

# Login Data
user: default_user_DIvgQNR1vnhX9smMrkS
password: a7s7pp7j5V3oTBMw33k8vbdbDK8xGrwg
