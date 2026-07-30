import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { RestaurantCommand } from '@food-delivery/shared';

let consumer: Consumer | null = null;

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID ?? 'restaurant-service',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
});

export async function connectConsumer(
  onMessage: (event: RestaurantCommand) => Promise<void>
): Promise<void> {
  for (let attempt = 1; attempt <= 15; attempt++) {
    try {
      consumer = kafka.consumer({
        groupId: 'restaurant-service-group',
      });

      await consumer.connect();
      await consumer.subscribe({ topic: 'restaurant.commands', fromBeginning: false });

      await consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          const { topic, partition, message } = payload;

          if (!message.value) {
            console.warn(`[Restaurant:Consumer] Empty message on ${topic}:${partition}`);
            return;
          }

          let event: RestaurantCommand;
          try {
            event = JSON.parse(message.value.toString()) as RestaurantCommand;
          } catch (err) {
            console.error('[Restaurant:Consumer] Failed to parse message:', err);
            return;
          }

          console.log(`[Restaurant:Consumer] Received ${event.type} (offset: ${message.offset})`);

          try {
            await onMessage(event);
          } catch (err) {
            console.error(`[Restaurant:Consumer] Error handling ${event.type}:`, err);
          }
        },
      });

      console.log('[Restaurant:Consumer] Listening on: restaurant.commands');
      return;
    } catch (err) {
      console.warn(`[Restaurant:Consumer] Waiting for Kafka topics (attempt ${attempt}/15)...`);
      await consumer?.disconnect().catch(() => {});
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

export async function disconnectConsumer(): Promise<void> {
  await consumer?.disconnect();
  console.log('[Restaurant:Consumer] Disconnected');
}