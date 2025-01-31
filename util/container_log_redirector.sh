#!/bin/bash

# Directory to store logs
LOG_DIR="./container_logs"
mkdir -p "$LOG_DIR"  # Create the directory if it doesn't exist

# Temporary file to track containers already processed
TRACKED_CONTAINERS="./tracked_containers.tmp"
touch "$TRACKED_CONTAINERS"

# The prefix of the container names to filter for
NAME_PREFIX="generate-invoice-00009-deployment"

# Main loop to check containers periodically
while true; do
  # Get list of running containers with their IDs and names
  kubectl get pods --no-headers -o custom-columns=":metadata.name" > current_containers.tmp

  # Check for new containers with the target name prefix
  while IFS= read -r line; do

    # Filter containers matching the name prefix and not yet tracked
    if [[ "$line" == "$NAME_PREFIX"* ]] && ! grep -q "$line" "$TRACKED_CONTAINERS"; then
      echo "Found new container: $line"

      # Add the container ID to the tracked list
      echo "$line" >> "$TRACKED_CONTAINERS"

      kubectl wait --for=condition=ready pod "$line" --timeout=60s

      # Start streaming logs to a file in the background
      log_file="$LOG_DIR/$line.log"
      kubectl logs -f "$line" >> "$log_file" 2>&1 &i
    fi
  done < current_containers.tmp

  # Sleep for 0.25 seconds before checking again
  sleep 0.25
done
