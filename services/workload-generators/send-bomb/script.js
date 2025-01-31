import Amqp from 'k6/x/amqp';
import Queue from 'k6/x/amqp/queue';
import { Random } from 'k6/x/random';
import { shuffle } from 'k6/x/random';
import encoding from 'k6/encoding';
import exec from 'k6/execution';

// Validate required environment variables
const REQUIRED_ENV_VARS = [
    'ENDPOINT',
    'RABBITMQ_USER',
    'RABBITMQ_PASS',
    'ITEMS_LARGE_INVOICE',
];

const queueName = 'my_new_queue';
const connIds = new Map();

export let options = {
    scenarios: {
        'send-large-invoice': {
            executor: 'constant-arrival-rate',
            preAllocatedVUs: 1,
            maxVUs: 1,
            rate: 1, // Send only once
            duration: '1s', // Just run once
            timeUnit: '1s'
        },
    },
    setupTimeout: '600s'
};

// Create connection ID function
function getConnectionId(vuId) {
    if (!connIds.has(vuId)) {
        const rabbitmqUrl = `amqp://${__ENV.RABBITMQ_USER}:${__ENV.RABBITMQ_PASS}@${__ENV.ENDPOINT}`;
        const connectionId = Amqp.start({ connection_url: rabbitmqUrl });
        connIds.set(vuId, connectionId);
    }
    return connIds.get(vuId);
}

// Setup phase to generate and send the large invoice only once
export function setup() {
    REQUIRED_ENV_VARS.forEach(varName => {
        if (!__ENV[varName]) {
            throw new Error(`Missing required environment variable: ${varName}`);
        }
    });

    const rabbitmqUrl = `amqp://${__ENV.RABBITMQ_USER}:${__ENV.RABBITMQ_PASS}@${__ENV.ENDPOINT}`;
    const connectionId = Amqp.start({ connection_url: rabbitmqUrl });
    connIds.set('setup', connectionId); // Store setup connection for queue declaration

    // Declare queue
    Queue.declare({
        connection_id: connectionId,
        name: queueName,
        durable: true,
        args: {
            'x-queue-type': 'quorum',
        },
    });

    // Generate large invoice
    console.log('Generating large invoice...');
    const largeInvoice = generateInvoice(Number(__ENV.ITEMS_LARGE_INVOICE)); // Generate once with the provided env variable

    // Send the invoice
    const cloudEvent = {
        specversion: "1.0",
        id: `INV-setup-${Date.now()}`,
        source: "invoice",
        type: "invoice",
        datacontenttype: "application/json",
        data_base64: encoding.b64encode(JSON.stringify(largeInvoice)),
    };

    try {
        Amqp.publish({
            connection_id: connectionId,
            queue_name: queueName,
            body: JSON.stringify(cloudEvent),
            content_type: "application/json",
        });
        console.log(`CloudEvent sent successfully! ID: ${cloudEvent.id}, Items: ${largeInvoice.items.length}, Invoice Number: ${largeInvoice.invoiceNumber}`);
    } catch (error) {
        console.error(`Failed to send CloudEvent (ID: ${cloudEvent.id}):`, error);
    }

    return {}; // Return an empty object as the data since we're not using it in default()
}

// Default function does nothing in this case
export default function () {
    // No operations here, we don't need to send anything after setup
}

// Teardown phase to close connections
export function teardown() {
    connIds.forEach((connectionId, key) => {
        Amqp.close(connectionId);
        console.log(`AMQP connection closed for ${key}`);
    });
}

// Invoice generation logic (same as before)
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
        invoiceNumber: `INV-${rng.intBetween(1000, 9999)}`,
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
