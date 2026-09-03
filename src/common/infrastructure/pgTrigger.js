// import { sequelize } from "./database.js";
// import logger from "../logger/logger.js";

// export const installTrigger = async () => {
//   try {
//     await sequelize.query(`
//       CREATE OR REPLACE FUNCTION notify_on_notification_insert()
//       RETURNS trigger AS $$
//       BEGIN
//         PERFORM pg_notify('notifications_channel', row_to_json(NEW)::text);
//         RETURN NEW;
//       END;
//       $$ LANGUAGE plpgsql;
//     `);

//     await sequelize.query(`
//       DO $$
//       BEGIN
//         IF NOT EXISTS (
//           SELECT 1 FROM pg_trigger WHERE tgname = 'notifications_insert_trigger'
//         ) THEN
//           CREATE TRIGGER notifications_insert_trigger
//           AFTER INSERT ON notifications
//           FOR EACH ROW
//           EXECUTE FUNCTION notify_on_notification_insert();
//         END IF;
//       END;
//       $$;
//     `);

//     logger.info("pgTrigger: trigger installed successfully");
//   } catch (err) {
//     logger.error({ err }, "pgTrigger: failed to install trigger");
//     throw err;
//   }
// };
