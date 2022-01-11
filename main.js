// Main credit go to the OP of this post: https://old.reddit.com/r/Bitburner/comments/rl7t9c/proud_of_my_ultimate_hacking_manager_on_5th_day/
// This is a mere readaption and some changes according to my gameplay.

// If the percentage of money on server is LESS than this, grow it to max
const growPercent =  90;
// hack the sever only if the percentage of money on server is MORE than this 
const hackPercent =  75;
// hack the sever only if the security of the server is this many above the minimal
const secThreshold = 50;

const WRITE_MODE = "w";

const functionLogsToDisable = [
    "getServerRequiredHackingLevel",
    "getServerMoneyAvailable",
    "getServerMaxMoney",
    "getServerMinSecurityLevel",
    "getServerSecurityLevel",
    "getHackingLevel",
    "getServerGrowth",
    "getServerUsedRam",
    "getServerMaxRam",
    "scp",
    "scan",
    "hackAnalyzeThreads",
    "growthAnalyze",
    "exec",
    "installBackdoor",
    "write",
    "disableLog",
]

const serversRequiringBackdoors = new Set([
    "CSEC",
    "I.I.I.I",
    "avmnite-02h",
    "run4theh111z",
]);

const programmesToWrite = [
    "hack",
    "weaken",
    "grow",
];

/** @param {NS} ns **/
export async function main(ns) {
    // Generate hack.js, grow.js and weaken.js
    for (const p of programmesToWrite) {
        await generateProgramme(ns, p);
    }

    // Disable logs, too noisy.
    for (const func of functionLogsToDisable) {
        ns.disableLog(func);
    }

    for (;;) {
        // Graph search of all accessible servers
        const servers = scanAndHack(ns);
        // Transfer file to servers
        await transferHacks(ns, servers);
        // Install backdoors if we have singularity module.
        await installBackdoors(ns, servers);
        // find servers that we can run scripts on
        const freeRams = getFreeRam(ns, servers);
        // find servers that we can hack
        const hackables = getHackable(ns, servers);
        // get currently running scripts on servers
        const hackstates = getHackStates(ns, servers, hackables);
 
        // Main logic sits here, determine whether or not and how many threads
        // we should call weaken, grow and hack asynchronously 
        manageAndHack(ns, freeRams, hackables, hackstates);
 
        await ns.sleep(2000);
    }
}
 
function manageAndHack(ns, freeRams, hackables, hackstates) {
    for (const target of hackables) {
        const money = ns.getServerMoneyAvailable(target);
        const maxMoney = ns.getServerMaxMoney(target);
        const minSec = ns.getServerMinSecurityLevel(target);
        const sec = ns.getServerSecurityLevel(target);
 
        const secDiff = sec - minSec;
        // weaken if the security of the host is not at its minimum
        if (secDiff > 0) {
            const threads = Math.floor(secDiff * 20) - hackstates.get(target).weaken;
            if (threads > 0 && !findPlaceToRun(ns, "weaken.js", threads, freeRams, target)) {
                ns.print(`Could not find a place to run weaken.js: ${target}`);
                return;
            }
        }
 
        const moneyPercent = money / maxMoney * 100;
        // grow if money is less then the percentage 
        if (moneyPercent < growPercent) {
            const threads = Math.floor(ns.growthAnalyze(target, 100 / moneyPercent)) - hackstates.get(target).grow;
            if (threads > 0 && !findPlaceToRun(ns, "grow.js", threads, freeRams, target)) {
                ns.print(`Could not find a place to run grow.js: ${target}`);
                return;
            }
        }
 
        // if it is worth hacking, we hack.
        if (moneyPercent > hackPercent && secDiff < secThreshold) {
            const threads = Math.floor(ns.hackAnalyzeThreads(target, money - (0.4 * maxMoney))) - hackstates.get(target).hack;
            if (threads > 0 && !findPlaceToRun(ns, "hack.js", threads, freeRams, target)) {
                ns.print(`Could not find a place to run hack.js: ${target}`);
                return;
            }
        }
        ns.print(`target:${target} secDiff:${secDiff.toFixed(2)} moneyPercent:${moneyPercent.toFixed(2)}`);
    }
}
 
// find some place to run the script with given amount of threads
// returns ture means script was executed, false means it didnt
function findPlaceToRun(ns, script, threads, freeRams, target) {
    const scriptRam = ns.getScriptRam(script);
    let remainingThreads = threads;
    while (freeRams.length > 0) {
        // try with first availiable host
        const host = freeRams[0].host;
        const ram = freeRams[0].freeRam;
 
        // if not enough ram on host to even run 1 thread, remove the host from list
        if (ram < scriptRam) {
            freeRams.shift();
        } else if (ram < scriptRam * remainingThreads) {
            // else if the ram on the host is not enough to run all threads, just run as much as it can
            const threadForThisHost = Math.floor(ram / scriptRam)
 
            // try to run the script, at this point this will only fail if
            // the host is already running the script against the same target,
            // from an earlier cycle
            if (ns.exec(script, host, threadForThisHost, target) === 0) {
                // if failed, than find the next host to run it, and return its result
                return findPlaceToRun(ns, script, threads, freeRams.slice(1), target)
            } else {
                // if run successed update thread to run and remove this host from the list
                remainingThreads -= threadForThisHost
                freeRams.shift()
            }
        } else {
            // try to run the script, at this point this will only fail if
            // the host is already running the script against the same target,
            // from an earlier cycle
            if (ns.exec(script, host, remainingThreads, target) === 0) {
                // if failed, than find the next host to run it, and return its result
                if (!findPlaceToRun(ns, script, threads, freeRams.slice(1), target)) {
                    return false;
                }
            } else {
                // if run successed update the remaining ram for this host
                freeRams[0].freeRam -= scriptRam * remainingThreads
            }
 
            return true;
        }
    }
    return false;
}
 
// gets the number of running threads against hackable servers
function getHackStates(ns, servers, hackables) {
    var hackstates = new Map();
    for (const server of servers.values()) {
        for (const hackable of hackables.values()) {
            const weakenScript = ns.getRunningScript("weaken.js", server, hackable);
            const growScript = ns.getRunningScript("grow.js", server, hackable);
            const hackScript = ns.getRunningScript("hack.js", server, hackable);
            if (hackstates.has(hackable)) {
                hackstates.get(hackable).weaken += weakenScript === null ? 0 : weakenScript.threads;
                hackstates.get(hackable).grow += growScript === null ? 0 : growScript.threads;
                hackstates.get(hackable).hack += hackScript === null ? 0 : hackScript.threads;
            } else {
                hackstates.set(hackable, {
                    weaken: weakenScript === null ? 0 : weakenScript.threads,
                    grow: growScript === null ? 0 : growScript.threads,
                    hack: hackScript === null ? 0 : hackScript.threads
                });
            }
        }
    }
    return hackstates;
}
 
// filter the list for hackable servers
function getHackable(ns, servers) {
    return [...servers.values()].filter(server => ns.getServerMaxMoney(server) > 100000
        && ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel()
        && ns.getServerMoneyAvailable(server) > 1000
        && ns.getServerGrowth(server))
        .sort((a, b) => ns.getServerRequiredHackingLevel(a) - ns.getServerRequiredHackingLevel(b));
}
 
// filter the list for servers where we can run script on
function getFreeRam(ns, servers) {
    const freeRams = [];
    let home = null;
    for (const server of servers) {
        const freeRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
        if (freeRam > 1) {
            // We do not add home, always prioritise home because it has the highest processing power regardless of ram
            if (server === "home") {
                home = { host: server, freeRam: freeRam };
                continue;
            }
            freeRams.push({ host: server, freeRam: freeRam });
        }
    }

    const sortedFreeRams = freeRams.sort((a, b) => b.freeRam - a.freeRam);

    // prioritise home because home has stronger cores
    if (home) {
       sortedFreeRams.unshift(home);
    }

    return sortedFreeRams;
}

// The hacks and the appropriate js function
const hacksAvailable = {
    "BruteSSH.exe": "brutessh",
    "FTPCrack.exe": "ftpcrack",
    "HTTPWorm.exe": "httpworm",
    "relaySMTP.exe": "relaysmtp",
    "SQLInject.exe": "sqlinject",
}
 
// scan all servers from home and hack them if we can
// TODO: test this
function scanAndHack(ns) {
    const servers = new Set(["home"]);
    scanAll("home", servers, ns);
    const accesibleServers = new Set();
    for (const server of servers) {
        if (ns.hasRootAccess(server)) {
            accesibleServers.add(server);
            continue;
        }

        let portOpened = 0;
        for (const exe in hacksAvailable) {
            if (ns.fileExists(exe)) {
                ns[hacksAvailable[exe]](server);
                portOpened++;
            }
        }

        if (ns.getServerNumPortsRequired(server) <= portOpened) {
            ns.nuke(server);
            accesibleServers.add(server);
        }
    }

    return accesibleServers;
}
 
function scanAll(host, servers, ns) {
    const hosts = ns.scan(host);
    for (let i = 0; i < hosts.length; i++) {
        if (!servers.has(hosts[i])) {
            servers.add(hosts[i]);
            scanAll(hosts[i], servers, ns);
        }
    }
}

// some script to help you save time backdooring servers, requires singularity module
async function installBackdoors(ns, servers) {
    try {
        for (const server of servers) {
            if (serversRequiringBackdoors.has(server)) {
                // This function takes a lot of RAM, so comment it if not required.
                await ns.installBackdoor(server)
            }
        }
    } catch (e) {
        // Do nothing
    }
}
 
async function transferHacks(ns, servers) {
    for (const server of servers) {
        await ns.scp("hack.js", "home", server)
        await ns.scp("weaken.js", "home", server)
        await ns.scp("grow.js", "home", server)
    }
}

async function generateProgramme(ns, functionType) {
	const programmeContents = `/** @param {NS} ns **/
export async function main(ns) {
	await ns.${functionType}(ns.args[0]);
}`
	await ns.write(`${functionType}.js`, programmeContents, WRITE_MODE);
}
