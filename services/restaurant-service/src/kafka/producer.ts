import { Kafka, Producer, ProducerRecord, Partitioners } from 'kafkajs';
import { AnyEvent } from '@food-delivery/shared';

let producer: Producer | null = null;

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID ?? 'restaurant-service',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
});

export async function connectProducer(): Promise<void> {
  producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner, 
  });
  await producer.connect();
  console.log('[Restaurant:Producer] Connected to Kafka');
}

export async function disconnectProducer(): Promise<void> {
  await producer?.disconnect();
  console.log('[Restaurant:Producer] Disconnected');
}

export async function publishEvent(
  topic: string,
  event: AnyEvent,
  key: string
): Promise<void> {
  if (!producer) throw new Error('Producer not connected');

  const record: ProducerRecord = {
    topic,
    messages: [
      {
        key,
        value: JSON.stringify(event),
        headers: {
          eventType: event.type,
          timestamp: new Date().toISOString(),
        },
      },
    ],
  };

  await producer.send(record);
  console.log(`[Restaurant:Producer] Published ${event.type} to ${topic}`);
}