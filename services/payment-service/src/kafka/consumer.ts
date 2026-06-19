import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { PaymentCommand } from '@food-delivery/shared';

let consumer: Consumer | null = null;

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID ?? 'payment-service',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
});

export async function connectConsumer(
  onMessage: (event: PaymentCommand) => Promise<void>
): Promise<void> {
  consumer = kafka.consumer({
    groupId: 'payment-service-group',
  });

  await consumer.connect();
  await consumer.subscribe({ topic: 'payments.commands', fromBeginning: false });

  await consumer.run({
    eachMessage: async (payload: EachMessagePayload) => {
      const { topic, partition, message } = payload;

      if (!message.value) {
        console.warn(`[Payment:Consumer] Empty message on ${topic}:${partition}`);
        return;
      }

      let event: PaymentCommand;
      try {
        event = JSON.parse(message.value.toString()) as PaymentCommand;
      } catch (err) {
        console.error('[Payment:Consumer] Failed to parse message:', err);
        return;
      }

      console.log(`[Payment:Consumer] Received ${event.type} (offset: ${message.offset})`);

      try {
        await onMessage(event);
      } catch (err) {
        console.error(`[Payment:Consumer] Error handling ${event.type}:`, err);
      }
    },
  });

  console.log('[Payment:Consumer] Listening on: payments.commands');
}

export async function disconnectConsumer(): Promise<void> {
  await consumer?.disconnect();
  console.log('[Payment:Consumer] Disconnected');
}