import amqb from "amqplib";
import logger from "../logger/logger.js";
import config from "../config/index.js";
const EXCHANGE = [
  {
    name: "ledger_debt_exchange",
    type: "topic",
    options: { durable: true },
  },
  {
    name: "ledger_repayment_exchange",
    type: "topic",
    options: { durable: true },
  },
  {
    name: "audit_all_exchange",
    type: "topic",
    options: { durable: true },
  },
];

const QUEUES = [
  { name: "debt_events", bindingKey: "debt.*" },
  { name: "repayment_events", bindingKey: "repayment.*" },
  { name: "audit_all_events", bindingKey: "#" },
];

let channel;
let connection;

const connect = async (url) => {
  try {
    connection = await amqb.connect(url);
    connection.on("error", (err) =>
      logger.error({ err }, "rabbitmq: connection error"),
    );

    connection.on("close", () => {
      logger.warn("rabbitmq: connection closed — clearing state");
      connection = null;
      channel = null;
    });
    channel = await connection.createChannel();

    channel.on("error", (err) =>
      logger.error({ err }, "rabbitmq: channel error"),
    );
    channel.on("close", () => {
      logger.warn("rabbitmq: channel closed");
      channel = null;
    });

    logger.info("rabbitmq: connection and channel established");
  } catch (err) {
    logger.error({ err }, "rabbitmq: failed to connect");
    throw err;
  }
};
const assertTopology = async () => {
  try {
    logger.info("rabbitmq: asserting exchanges and queues");
    if (!channel) {
      throw new Error("Channel is not initialized");
    }
    for (const exchange of EXCHANGE) {
      await channel.assertExchange(
        exchange.name,
        exchange.type,
        exchange.options,
      );
      logger.info({ exchange: exchange.name }, "rabbitmq: exchange asserted");
    }

    for (let i = 0; i < QUEUES.length; i++) {
      const queue = QUEUES[i];
      await channel.assertQueue(queue.name, { durable: true });
      await channel.bindQueue(queue.name, EXCHANGE[i].name, queue.bindingKey);
      logger.info(
        { queue: queue.name, bindingKey: queue.bindingKey },
        "rabbitmq: queue asserted and bound",
      );
    }
    logger.info("rabbitmq: topology assertion complete");
  } catch (err) {
    logger.error({ err }, "rabbitmq: failed to assert topology");
    throw err;
  }
};

export const publishToDebt = async (routingKey, payload) => {
  const message = Buffer.from(JSON.stringify(payload));
  const options = {
    persistent: true,
    contentType: "application/json",
    timestamp: Math.floor(Date.now() / 1000),
  };
  try {
    channel.publish(EXCHANGE[0].name, routingKey, message, options);
    logger.info({ routingKey }, "rabbitmq: message published");
  } catch (error) {
    logger.error(
      { err, routingKey },
      "rabbitmq: publish failed — attempting reconnect",
    );
    throw error;
  }
};

export const publishToRepayment = async (routingKey, payload) => {
  const message = Buffer.from(JSON.stringify(payload));
  const options = {
    persistent: true,
    contentType: "application/json",
    timestamp: Math.floor(Date.now() / 1000),
  };
  try {
    channel.publish(EXCHANGE[1].name, routingKey, message, options);
    logger.info({ routingKey }, "rabbitmq: message published");
  } catch (error) {
    logger.error(
      { err, routingKey },
      "rabbitmq: publish failed — attempting reconnect",
    );
    throw error;
  }
};
const connectQueue = async () => {
  try {
    await connect(config.rabbitmq.url);
    logger.info("rabbitmq connected, setting up exchanges and queues");
    await assertTopology();
  } catch (err) {
    logger.error({ err }, "rabbitmq: failed to connect and setup queues");
    // process.exit(1);
  }
};
export { connectQueue, channel };
