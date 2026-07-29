import { Kafka, Producer, ProducerRecord, Partitioners } from 'kafkajs';
import { AnyEvent } from '@food-delivery/shared';

let producer: Producer | null = null;

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID ?? 'api-gateway',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
});

export async function connectProducer(): Promise<void> {
  try {
    producer = kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
    });
    await producer.connect();
    console.log('[Gateway:Producer] Connected to Kafka');
  } catch (err) {
    console.error('[Gateway:Producer] Initial connection failed:', err);
    producer = null;
  }
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
  if (!producer) {
    console.log('[Gateway:Producer] Producer not connected, connecting now...');
    await connectProducer();
  }

  if (!producer) {
    throw new Error('Kafka producer is unavailable');
  }

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

  try {
    await producer.send(record);
    console.log(`[Gateway:Producer] Published ${event.type} to ${topic}`);
  } catch (err) {
    console.error('[Gateway:Producer] Send error, attempting reconnect...', err);
    await connectProducer();
    if (producer) {
      await producer.send(record);
      console.log(`[Gateway:Producer] Published ${event.type} to ${topic} after reconnect`);
    } else {
      throw err;
    }
  }
}