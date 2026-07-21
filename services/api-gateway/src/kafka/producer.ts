import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { AnyEvent } from '@food-delivery/shared';

let producer: Producer | null = null;

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID ?? 'api-gateway',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
});

export async function connectProducer(): Promise<void> {
  producer = kafka.producer();
  await producer.connect();
  console.log('[Gateway:Producer] Connected to Kafka');
}

export async function disconnectProducer(): Promise<void> {
  await producer?.disconnect();
  console.log('[Gateway:Producer] Disconnected');
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
  console.log(`[Gateway:Producer] Published ${event.type} to ${topic}`);
}