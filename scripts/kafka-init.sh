#!/bin/bash

echo ">>> Waiting for Kafka broker to be ready..."
until kafka-topics --bootstrap-server kafka:29092 --list > /dev/null 2>&1; do
  echo "    broker not ready yet, retrying in 5s..."
  sleep 5
done

echo ">>> Broker is ready. Creating topics..."

kafka-topics --bootstrap-server kafka:29092 --create --if-not-exists --topic orders.lifecycle     --replication-factor 1 --partitions 3
kafka-topics --bootstrap-server kafka:29092 --create --if-not-exists --topic payments.commands    --replication-factor 1 --partitions 3
kafka-topics --bootstrap-server kafka:29092 --create --if-not-exists --topic payments.events      --replication-factor 1 --partitions 3
kafka-topics --bootstrap-server kafka:29092 --create --if-not-exists --topic restaurant.commands  --replication-factor 1 --partitions 3
kafka-topics --bootstrap-server kafka:29092 --create --if-not-exists --topic restaurant.events    --replication-factor 1 --partitions 3
kafka-topics --bootstrap-server kafka:29092 --create --if-not-exists --topic delivery.commands    --replication-factor 1 --partitions 3
kafka-topics --bootstrap-server kafka:29092 --create --if-not-exists --topic delivery.events      --replication-factor 1 --partitions 3

echo ">>> All topics created. Listing:"
kafka-topics --bootstrap-server kafka:29092 --list