import { run } from "./bot";

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
