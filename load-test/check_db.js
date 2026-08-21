const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/order_db' });
  await client.connect();

  const rejectRes = await client.query(`SELECT status, count(*) FROM "Order" WHERE "restaurantId" = 'rest-reject-test' GROUP BY status`);
  console.log('Reject Test Orders Status Breakdown:', rejectRes.rows);

  const sagaRes = await client.query(`SELECT "currentStep", status, count(*) FROM "SagaState" WHERE "orderId" IN (SELECT id FROM "Order" WHERE "restaurantId" = 'rest-reject-test') GROUP BY "currentStep", status`);
  console.log('Reject Test SagaState Breakdown:', sagaRes.rows);

  await client.end();
}

main().catch(console.error);
