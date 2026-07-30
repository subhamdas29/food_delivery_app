import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { AnyEvent } from '@food-delivery/shared';

let consumer: Consumer | null = null;

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID ?? 'order-orchestrator',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
});

const SUBSCRIBED_TOPICS = [
  'orders.lifecycle',
  'payments.events',
  'restaurant.events',
  'delivery.events',
];

export async function connectConsumer(
  onMessage: (event: AnyEvent) => Promise<void>
): Promise<void> {
  for (let attempt = 1; attempt <= 15; attempt++) {
    try {
      consumer = kafka.consumer({
        groupId: 'order-orchestrator-group',
      });

      await consumer.connect();

      for (const topic of SUBSCRIBED_TOPICS) {
        await consumer.subscribe({ topic, fromBeginning: true });
      }

      await consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          const { topic, partition, message } = payload;

          if (!message.value) {
            console.warn(`[Consumer] Empty message on ${topic}:${partition}`);
            return;
          }

          let event: AnyEvent;
          try {
            event = JSON.parse(message.value.toString()) as AnyEvent;
          } catch (err) {
            console.error('[Consumer] Failed to parse message:', err);
            return;
          }

          console.log(
            `[Consumer] Received ${event.type} from ${topic} ` +
            `(partition: ${partition}, offset: ${message.offset})`
          );

          try {
            await onMessage(event);
          } catch (err) {
            console.error(`[Consumer] Error handling ${event.type}:`, err);
          }
        },
      });

      console.log('[Consumer] Listening on:', SUBSCRIBED_TOPICS.join(', '));
      return;
    } catch (err) {
      console.warn(`[Consumer] Kafka topics initializing (attempt ${attempt}/15)...`);
      await consumer?.disconnect().catch(() => {});
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

export async function disconnectConsumer(): Promise<void> {
  await consumer?.disconnect();
  console.log('[Consumer] Disconnected');
}