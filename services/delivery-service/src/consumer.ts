import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { DeliveryCommand } from '@food-delivery/shared';

let consumer: Consumer | null = null;

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID ?? 'delivery-service',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
});

export async function connectConsumer(
  onMessage: (event: DeliveryCommand) => Promise<void>
): Promise<void> {
  consumer = kafka.consumer({
    groupId: 'delivery-service-group',
  });

  await consumer.connect();
  await consumer.subscribe({ topic: 'delivery.commands', fromBeginning: false });

  await consumer.run({
    eachMessage: async (payload: EachMessagePayload) => {
      const { topic, partition, message } = payload;

      if (!message.value) {
        console.warn(`[Delivery:Consumer] Empty message on ${topic}:${partition}`);
        return;
      }

      let event: DeliveryCommand;
      try {
        event = JSON.parse(message.value.toString()) as DeliveryCommand;
      } catch (err) {
        console.error('[Delivery:Consumer] Failed to parse message:', err);
        return;
      }

      console.log(`[Delivery:Consumer] Received ${event.type} (offset: ${message.offset})`);

      try {
        await onMessage(event);
      } catch (err) {
        console.error(`[Delivery:Consumer] Error handling ${event.type}:`, err);
      }
    },
  });

  console.log('[Delivery:Consumer] Listening on: delivery.commands');
}

export async function disconnectConsumer(): Promise<void> {
  await consumer?.disconnect();
  console.log('[Delivery:Consumer] Disconnected');
}