const TRAIN_TYPE = [
    "str",
    "def",
    "dex",
    "agi",
];

const TARGET = 850;

export async function main(ns) {
    ns.stopAction();
    ns.travelToCity("Sector-12");
    for (const t of TRAIN_TYPE) {
        await trainToTarget(t);
    }
}

async function trainToTarget(type) {
  while(ns.getStats().strength < TARGET) {
    ns.gymWorkout('Powerhouse Gym', type);
    await ns.sleep(600);
    ns.stopAction();
  }
}
