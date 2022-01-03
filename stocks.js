// Main credit goes to https://old.reddit.com/r/Bitburner/comments/rn7l84/stock_script_to_end_your_financial_problems/
// Recommended to buy when you have at least $50b.
// This is my adaptation, although there aren't many changes here.

const maxSharePer = 1.00;
const stockBuyPer = 0.60;
const stockVolPer = 0.05;
const moneyKeep = 1E9;
const minSharePer = 5;

const functionLogsToDisable = [
    "disableLog",
    "getServerMoneyAvailable",
];

const SHARES_POSITION = 0;

/** @param {NS} ns **/
export async function main(ns) {
    // Disable logs.
    for (const func of functionLogsToDisable) {
        ns.disableLog(func);
    }

    for (;;) {
        const stocks = ns.stock.getSymbols()
        for (const stock of stocks) {
            const position = ns.stock.getPosition(stock);
            if (position[0]) {
                sellPositions(ns, stock, position[SHARES_POSITION]);
            }
            buyPositions(ns, stock, position[SHARES_POSITION]);
        }

        await ns.sleep(6000);
    }
}

function buyPositions(ns, stock, shares) {
    const maxShares = (ns.stock.getMaxShares(stock) * maxSharePer) - shares;
    const askPrice = ns.stock.getAskPrice(stock);
    const forecast = ns.stock.getForecast(stock);
    const volPer = ns.stock.getVolatility(stock);
    const playerMoney = ns.getServerMoneyAvailable('home');
    
    if (forecast >= stockBuyPer && volPer <= stockVolPer) {
        if (playerMoney - moneyKeep > ns.stock.getPurchaseCost(stock, minSharePer, "Long")) {
            const shares = Math.min((playerMoney - moneyKeep - 1E5) / askPrice, maxShares);
            ns.stock.buy(stock, shares);
        }
    }      
}

function sellPositions(ns, stock, shares) {
    var forecast = ns.stock.getForecast(stock);
    if (forecast < 0.5) {
        ns.stock.sell(stock, shares);
    }
}