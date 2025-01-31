import Amqp from 'k6/x/amqp';
import Queue from 'k6/x/amqp/queue';
import { Random } from 'k6/x/random';
import { shuffle } from 'k6/x/random';
import encoding from 'k6/encoding';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import exec from 'k6/execution';

// Validate required environment variables
const REQUIRED_ENV_VARS = [
    'ENDPOINT',
    'RABBITMQ_USER',
    'RABBITMQ_PASS',
    'INVOICES_PER_SECOND',
    'MID_ITEMS_PER_INVOICE',
    'MIN_ITEMS_PER_INVOICE',
    'MAX_ITEMS_PER_INVOICE',
    'GENERATE_LARGE_INVOICE',
    'ITEMS_LARGE_INVOICE',
    'DURATION'
];

const queueName = 'my_new_queue';
const connIds = new Map();

export let options = {
    scenarios: {
        'publish-invoices': {
            executor: 'constant-arrival-rate',
            preAllocatedVUs: 1,
            maxVUs: 1,
            rate: Number(__ENV.INVOICES_PER_SECOND),
            duration: Number(__ENV.DURATION),
            timeUnit: '1s'
        },
    },
    setupTimeout: '600s'
};

function getConnectionId(vuId) {
    if (!connIds.has(vuId)) {
        const rabbitmqUrl = `amqp://${__ENV.RABBITMQ_USER}:${__ENV.RABBITMQ_PASS}@${__ENV.ENDPOINT}`;
        const connectionId = Amqp.start({ connection_url: rabbitmqUrl });
        connIds.set(vuId, connectionId);
    }
    return connIds.get(vuId);
}

export function setup() {
    REQUIRED_ENV_VARS.forEach(varName => {
        if (!__ENV[varName]) {
            throw new Error(`Missing required environment variable: ${varName}`);
        }
    });

    const rabbitmqUrl = `amqp://${__ENV.RABBITMQ_USER}:${__ENV.RABBITMQ_PASS}@${__ENV.ENDPOINT}`;
    const connectionId = Amqp.start({ connection_url: rabbitmqUrl });
    connIds.set('setup', connectionId); // Store setup connection for queue declaration

    Queue.declare({
        connection_id: connectionId,
        name: queueName,
        durable: true,
        args: {
            'x-queue-type': 'quorum',
        },
    });

    let preGeneratedLargeInvoice = null;
    if (__ENV.GENERATE_LARGE_INVOICE && __ENV.GENERATE_LARGE_INVOICE.toLowerCase() === 'true') {
        console.log('Pre-generating large invoice in setup...');
        preGeneratedLargeInvoice = generateInvoice(Number(__ENV.ITEMS_LARGE_INVOICE));
    }

    return { preGeneratedLargeInvoice };
}

export default function (data) {

    const vuId = exec.vu.idInInstance;
    const iteration = exec.vu.iterationInInstance;
    const connectionId = getConnectionId(vuId);
    let invoice;

    // Send the large invoice exactly once, at the start of the first VU's first iteration
    if (vuId === 1 && iteration === 0 && data.preGeneratedLargeInvoice) {
        console.log(`Sending large invoice with 100,000 items.`);
        invoice = data.preGeneratedLargeInvoice;
    } else {
        const rand = randomIntBetween(1, 3);
        const itemCount = {
            1: Number(__ENV.MAX_ITEMS_PER_INVOICE),
            2: Number(__ENV.MID_ITEMS_PER_INVOICE),
            3: Number(__ENV.MIN_ITEMS_PER_INVOICE)
        }[rand];
        invoice = generateInvoice(itemCount);
    }

    // Create the CloudEvent
    const cloudEvent = {
        specversion: "1.0",
        id: `${exec.vu.idInInstance}-${exec.vu.iterationInInstance}-${Date.now()}`,
        source: "invoice",
        type: "invoice",
        datacontenttype: "application/json",
        data_base64: encoding.b64encode(JSON.stringify(invoice))
    };

    // Publish the CloudEvent
    try {
        Amqp.publish({
            connection_id: connectionId,
            queue_name: queueName,
            body: JSON.stringify(cloudEvent),
            content_type: "application/json",
        });
        console.log(`CloudEvent sent successfully! Items: ${invoice.items.length}, Invoice Number: ${invoice.invoiceNumber}`);
    } catch (error) {
        console.error(`Failed to send CloudEvent (ID: ${cloudEvent.id}):`, error);
    }
}

export function teardown() {
    // Close all connections established during the test
    connIds.forEach((connectionId, key) => {
        Amqp.close(connectionId);
        console.log(`AMQP connection closed for ${key}`);
    });
}


function generateInvoice(itemCount) {
    let rng = new Random();

    const sellerNames = ['ABC Corp', 'XYZ Ltd', '123 LLC', 'Tech Innovations', 'Creative Solutions'];
    const buyerNames = ['Client A', 'Client B', 'Client C', 'Client D', 'Client E'];
    const itemDescriptions = ['Widget A', 'Gadget B', 'Service C', 'Product D', 'Tool E'];
    const validIbans = [
        "DE89370400440532013000", // Commerzbank
        "DE45700500003901190315"

    ];
    const bics = ['DEUTDEFF', 'CHASUS33', 'BARCGB22', 'BNPAFRPP', 'CITIGB2L', 'IRVTUS3N', 'UBSWCHZH', 'HSBCHKHH', 'MIDLGB22', 'SOGEFRPP'];

    shuffle(validIbans);
    const selectedIban = validIbans[0];
    shuffle(sellerNames);
    const sellerName = sellerNames[0];
    shuffle(buyerNames);
    const buyerName = buyerNames[0];

    shuffle(bics);
    const selectedBic = bics[0];

    const items = [];
    let baseAmount = 0;

    for (let i = 0; i < itemCount; i++) {
        shuffle(itemDescriptions);
        const description = itemDescriptions[0];

        const quantity = rng.intBetween(1, 5);
        const price = rng.floatBetween(50.0, 500.0).toFixed(2);

        baseAmount += quantity * price;

        items.push({
            description: description,
            quantity: quantity,
            price: parseFloat(price),
            taxRate: 0.19,
        });
    }

    const taxAmount = baseAmount * 0.19;
    const totalAmountWithTax = (baseAmount + taxAmount).toFixed(2);

    return {
        seller: {
            name: sellerName,
            address: '123 Business St, Business City, BC 12345',
            iban: selectedIban,
            bic: selectedBic,
        },
        buyer: {
            name: buyerName,
            address: '456 Client Ave, Client City, CC 67890',
        },
        taxNumber: `DE${generateRandomDigits(9)}`,
        invoiceDate: new Date().toISOString().split('T')[0],
        invoiceNumber: `${exec.vu.idInInstance}-${exec.vu.iterationInInstance}-${Date.now()}`,
        items: items,
        deliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        totalAmount: {
            baseAmount: baseAmount.toFixed(2),
            taxRate: 0.19,
            taxAmount: taxAmount.toFixed(2),
            totalAmountWithTax: totalAmountWithTax,
        },
        discount: rng.floatBetween(0, 50).toFixed(2),
        isCreditNote: rng.boolean(),
        reverseCharge: rng.boolean(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
}

function generateRandomDigits(length) {
    let digits = '';
    for (let i = 0; i < length; i++) {
        digits += Math.floor(Math.random() * 10);
    }
    return digits;
}
