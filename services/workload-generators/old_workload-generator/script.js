import { check } from 'k6';
import { faker } from 'https://cdn.jsdelivr.net/npm/@faker-js/faker/+esm';
import amqp from 'k6/x/amqp';

// environment variables
const RABBIT_ENDPOINT = __ENV.RABBIT_ENDPOINT;
const RABBIT_USER = __ENV.RABBIT_USER;
const RABBIT_PASSWORD = __ENV.RABBIT_PASSWORD;
const QUEUE_NAME = __ENV.QUEUE_NAME || 'my_new_queue';

function generateInvoice() {
  const itemCount = faker.number.int({ min: 1, max: 50 });
  const items = Array(itemCount).fill(null).map(() => ({
    description: faker.commerce.productName(),
    quantity: faker.number.int({ min: 1, max: 10 }),
    price: faker.number.float({ min: 50, max: 500, precision: 2 }),
    taxRate: 0.19
  }));

  const baseAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const taxAmount = baseAmount * 0.19;
  const totalAmountWithTax = baseAmount + taxAmount;

  return {
    seller: {
      name: faker.company.name(),
      address: faker.location.streetAddress(true),
      iban: faker.finance.iban(),
      bic: faker.finance.bic(),
      bank: faker.company.name()
    },
    buyer: {
      name: faker.company.name(),
      address: faker.location.streetAddress(true)
    },
    taxNumber: `DE${faker.number.int({ min: 100000000, max: 999999999 })}`,
    invoiceDate: faker.date.recent().toISOString().split('T')[0],
    invoiceNumber: `INV-${new Date().getFullYear()}-${faker.number.int({ min: 1, max: 999 }).toString().padStart(3, '0')}`,
    items: items,
    deliveryDate: faker.date.future().toISOString().split('T')[0],
    totalAmount: {
      baseAmount: baseAmount,
      taxRate: 0.19,
      taxAmount: taxAmount,
      totalAmountWithTax: totalAmountWithTax
    },
    discount: faker.number.float({ min: 0, max: 50, precision: 2 }),
    isCreditNote: faker.datatype.boolean(),
    reverseCharge: faker.datatype.boolean(),
    dueDate: faker.date.future({ days: 45 }).toISOString().split('T')[0]
  };
}

export default function () {
  const conn = amqp.connect(RABBIT_ENDPOINT, RABBIT_USER, RABBIT_PASSWORD);
  
  const invoice = generateInvoice();
  
  // Create CloudEvent
  const cloudEvent = {
    specversion: "1.0",
    type: "invoice",
    source: "invoice",
    id: faker.string.alphanumeric(10),
    data: invoice
  };

  // Publish message
  const result = conn.publish(QUEUE_NAME, JSON.stringify(cloudEvent), {
    contentType: 'application/json',
    deliveryMode: 2
  });

  check(result, {
    'message published': (r) => r === true,
  });

  conn.close();
}