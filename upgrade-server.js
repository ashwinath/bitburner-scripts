/** @param {NS} ns **/
export async function main(ns) {
	let maxServers = ns.getPurchasedServerLimit();
	let maxSize = ns.getPurchasedServerMaxRam();
	let money = ns.getPlayer().money;

    let currentSize = 0;
    if (ns.serverExists("cattle-0")) {
    	currentSize = ns.getServerMaxRam("cattle-0");
	}

	let ram = 1;

	while (ram * 2 <= maxSize && ns.getPurchasedServerCost(ram * 2) < money / maxServers) {
		ram *= 2;
	}

	if (ram < 2 || ram <= currentSize) {
		ns.tprint("Can't afford upgrade - current " + currentSize + "GB, can afford " + ram + "GB");
		ns.exit();
	}

    ns.tprint("Buying " + maxServers + " " + ram + "GB servers")
    for (let i = 0; i < maxServers; i++) {
    	if (ns.serverExists(getServerName(i))) {
    		ns.killall(getServerName(i));
    		ns.deleteServer(getServerName(i));
		}
    	ns.purchaseServer(getServerName(i), ram);
    }
    ns.tprint("Done buying " + maxServers + " " + ram + "GB servers")
}

function getServerName(number) {
	return "cattle-" + number;
}