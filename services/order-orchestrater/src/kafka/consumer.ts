import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { AnyEvent } from '@food-delivery/shared';

let consumer: Consumer | null = null;

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID ?? 'order-orchestrator',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
});

// Topics the orchestrator listens to
const SUBSCRIBED_TOPICS = [
  'orders.lifecycle',
  'payments.events',
  'restaurant.events',
  'delivery.events',
];

export async function connectConsumer(
  onMessage: (event: AnyEvent) => Promise<void>
): Promise<void> {
  consumer = kafka.consumer({
    groupId: 'order-orchestrator-group',
  });

  await consumer.connect();

  for (const topic of SUBSCRIBED_TOPICS) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  await consumer.run({
    // Process one message at a time per partition — critical for saga
    // correctness. We must not process two events for the same order
    // concurrently or the state machine can enter an invalid state.
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
        // Log but don't throw — throwing here crashes the consumer
        // and stops ALL message processing. Dead-letter queues would
        // go here in production.
        console.error(`[Consumer] Error handling ${event.type}:`, err);
      }
    },
  });

  console.log('[Consumer] Listening on:', SUBSCRIBED_TOPICS.join(', '));
}

export async function disconnectConsumer(): Promise<void> {
  await consumer?.disconnect();
  console.log('[Consumer] Disconnected');
}