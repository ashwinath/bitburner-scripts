// the trick to finding run4theh111z
const servers = {};

// Do not allow too many cycles, if not I have to restart
let depth = 0;
const MAX_DEPTH_ALLOWED = 30;

/** @param {NS} ns **/
export async function main(ns) {
    const toFind = ns.args[0];
    if (!toFind) {
        ns.tprint("requires an argument.");
        ns.exit();
    }
    scanAll("home", ns);

    let currentServer = toFind;
    const serverLink = [currentServer];

    while (currentServer !== "home") {
        // Prevent crashing from too deep recursion.
        depth++;
        if (depth > MAX_DEPTH_ALLOWED) {
            // Prevent shit from hanging.
            ns.tprint("Too deep, something is wrong.");
            ns.exit();
        }

        // Actual searching logic
        for (const current in servers) {
            if (servers[current].has(currentServer)) {
                currentServer = current;
                serverLink.unshift(current);
                break;
            }
        }
    }

    ns.tprint(JSON.stringify(serverLink));
}

function scanAll(host, ns) {
    const hosts = ns.scan(host);
    for (const innerHost of hosts) {
        if (!(innerHost in servers)) {
            if (!(host in servers)) {
                servers[host] = new Set();
            }
            servers[host].add(innerHost);
            scanAll(innerHost, ns);
        }
    }
}
