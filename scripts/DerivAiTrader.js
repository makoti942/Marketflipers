/**
 * DerivAiTrader - Standalone High-Precision Deriv AI Scanner & Trading Engine
 * 
 * Architecture Overview:
 * 1. User selects strategy profile & parameters (stake, tradeCount, lookback, marketFilter)
 * 2. Connects to Deriv WebSocket & authorizes (optional or existing connection)
 * 3. Fetches active volatility symbols (standard R_xx & 1s 1HZxxV)
 * 4. Subscribes to tick streams on all active volatility markets
 * 5. Parses tick quotes with exact pip_size precision to extract the last digit
 * 6. Evaluates consecutive digit history against the strategy barrier
 * 7. On match: Locks symbol, switches to "trading", sends 1-tick DIGITOVER/DIGITUNDER buy payload
 * 8. Subscribes to proposal_open_contract, streams contract status to completion
 * 9. On close (is_sold / sold): Unsubscribes contract feed, updates PnL, decrements remaining trades
 * 10. Sequences until trade count is completed, then unsubscribes all feeds & resets
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exp = factory();
    root.DerivAiTrader = exp.DerivAiTrader;
    root.DERIV_AI_PRESET_STRATEGIES = exp.DERIV_AI_PRESET_STRATEGIES;
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const DERIV_AI_PRESET_STRATEGIES = [
    {
      id: "over_1_pro",
      name: "Over 1 Pro",
      direction: "over",
      barrier: 1,
      lookback: 3,
      contractType: "DIGITOVER",
      description: "Triggers DIGITOVER (barrier 1) when last 3 digits are <= 1."
    },
    {
      id: "under_8_pro",
      name: "Under 8 Pro",
      direction: "under",
      barrier: 8,
      lookback: 3,
      contractType: "DIGITUNDER",
      description: "Triggers DIGITUNDER (barrier 8) when last 3 digits are >= 8."
    },
    {
      id: "over_2_pro",
      name: "Over 2 Pro",
      direction: "over",
      barrier: 2,
      lookback: 4,
      contractType: "DIGITOVER",
      description: "Triggers DIGITOVER (barrier 2) when last 4 digits are <= 2."
    },
    {
      id: "under_7_pro",
      name: "Under 7 Pro",
      direction: "under",
      barrier: 7,
      lookback: 4,
      contractType: "DIGITUNDER",
      description: "Triggers DIGITUNDER (barrier 7) when last 4 digits are >= 7."
    },
    {
      id: "over_3_pro",
      name: "Over 3 Pro",
      direction: "over",
      barrier: 3,
      lookback: 5,
      contractType: "DIGITOVER",
      description: "Triggers DIGITOVER (barrier 3) when last 5 digits are <= 3."
    },
    {
      id: "under_6_pro",
      name: "Under 6 Pro",
      direction: "under",
      barrier: 6,
      lookback: 5,
      contractType: "DIGITUNDER",
      description: "Triggers DIGITUNDER (barrier 6) when last 5 digits are >= 6."
    }
  ];

  class DerivAiTrader {
    constructor(options = {}) {
      this.wsUrl = options.wsUrl || "wss://ws.derivws.com/websockets/v3?app_id=1089";
      this.token = options.token || null;
      this.existingWs = options.ws || null;
      this.currency = options.currency || "USD";
      
      // Internal state
      this.ws = this.existingWs;
      this.digitHistories = new Map();
      this.tickSubscriptions = new Set();
      this.isRunning = false;
      this.isTrading = false;
      this.lockedSymbol = null;
      this.tradesRemaining = 0;
      this.totalTradesPlanned = 0;
      this.completedTrades = [];
      this.activeContractId = null;

      this.mockSimulation = !!options.mockSimulation;
      this._listeners = {};

      // Strategy parameters
      this.strategy = null;
      this.stake = Number(options.stake) || 1.0;
      this.lookback = Number(options.lookback) || 3;
      this.marketFilter = options.marketFilter || "all"; // 'standard' | 'one-second' | 'all'

      // Callbacks
      this.callbacks = {
        onStatusChange: options.onStatusChange || (() => {}),
        onMarketsLoaded: options.onMarketsLoaded || (() => {}),
        onTick: options.onTick || (() => {}),
        onSignalMatch: options.onSignalMatch || (() => {}),
        onTradePlaced: options.onTradePlaced || (() => {}),
        onTradeTick: options.onTradeTick || (() => {}),
        onTradeClosed: options.onTradeClosed || (() => {}),
        onSequenceComplete: options.onSequenceComplete || (() => {}),
        onError: options.onError || (() => {})
      };

      this._messageListener = (event) => {
        try {
          const raw = typeof event.data === "string" ? event.data : event.data.toString();
          const msg = JSON.parse(raw);
          this.handleMessage(msg);
        } catch (err) {
          // Ignore unparseable frames
        }
      };
    }

    /**
     * Subscribe to trader lifecycle events (EventEmitter style)
     */
    on(event, handler) {
      if (typeof handler !== "function") return this;
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(handler);
      return this;
    }

    /**
     * Emit lifecycle events to both registered callbacks and on() listeners
     */
    emit(event, ...args) {
      const cbMap = {
        connected: "onConnected",
        statusChange: "onStatusChange",
        stateChange: "onStatusChange",
        marketsLoaded: "onMarketsLoaded",
        tick: "onTick",
        signalMatch: "onSignalMatch",
        tradePlaced: "onTradePlaced",
        tradeTick: "onTradeTick",
        tradeClosed: "onTradeClosed",
        sequenceComplete: "onSequenceComplete",
        error: "onError"
      };

      const cbKey = cbMap[event] || event;
      if (typeof this.callbacks[cbKey] === "function") {
        try { this.callbacks[cbKey](...args); } catch (e) { console.error(e); }
      }

      if (this._listeners && Array.isArray(this._listeners[event])) {
        for (const fn of this._listeners[event]) {
          try { fn(...args); } catch (e) { console.error(e); }
        }
      }

      // Also trigger stateChange listener if statusChange is fired
      if (event === "statusChange" && this._listeners && Array.isArray(this._listeners["stateChange"])) {
        for (const fn of this._listeners["stateChange"]) {
          try { fn({ state: args[0], message: args[1] }); } catch (e) { console.error(e); }
        }
      }
    }

    /**
     * Extract exact last digit from quote using decimal pip precision
     */
    extractDigit(quote, pipSize = 2) {
      const num = Number(quote);
      return Number(num.toFixed(Number(pipSize ?? 2)).slice(-1));
    }

    /**
     * Check if digit history matches the strategy pattern
     */
    checkSignal(strategy, history) {
      const strat = strategy || this.strategy;
      const lookback = strat.lookback || this.lookback || 3;
      if (!Array.isArray(history) || history.length < lookback) return false;
      const slice = history.slice(-lookback);
      if (strat.direction === "over") {
        return slice.every((d) => d <= strat.barrier);
      } else if (strat.direction === "under") {
        return slice.every((d) => d >= strat.barrier);
      }
      return false;
    }

    /**
     * Build direct Deriv Buy payload
     */
    buildBuyPayload(strategy, symbol, stake = this.stake, currency = this.currency || "USD") {
      const strat = strategy || this.strategy;
      const contractType = strat.direction === "over" ? "DIGITOVER" : "DIGITUNDER";
      const barrier = strat.barrier;
      return {
        buy: "1",
        price: Number(stake),
        parameters: {
          amount: Number(stake),
          basis: "stake",
          contract_type: contractType,
          currency: currency,
          duration: 1,
          duration_unit: "t",
          underlying_symbol: symbol,
          barrier: barrier,
          selected_tick: barrier
        }
      };
    }

    /**
     * Connect to WebSocket (if not reusing existing connection)
     */
    async connect() {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        if (this.ws.readyState === WebSocket.OPEN) {
          this._bindWsEvents();
          if (this.token) await this.authorize(this.token);
          this.emit("connected");
          this.emit("statusChange", "connected", "Connected to WebSocket.");
          return this.ws;
        }
        return new Promise((resolve, reject) => {
          this.ws.addEventListener("open", async () => {
            this._bindWsEvents();
            if (this.token) {
              try { await this.authorize(this.token); } catch (e) { return reject(e); }
            }
            this.emit("connected");
            this.emit("statusChange", "connected", "Connected to WebSocket.");
            resolve(this.ws);
          }, { once: true });
          this.ws.addEventListener("error", reject, { once: true });
        });
      }

      return new Promise((resolve, reject) => {
        this.emit("statusChange", "connecting", "Connecting to Deriv WebSocket...");
        this.ws = new WebSocket(this.wsUrl);
        this._bindWsEvents();

        this.ws.onopen = async () => {
          try {
            if (this.token) {
              await this.authorize(this.token);
            }
            this.emit("connected");
            this.emit("statusChange", "connected", "Connected to Deriv WebSocket.");
            resolve(this.ws);
          } catch (err) {
            this.emit("error", err);
            reject(err);
          }
        };

        this.ws.onerror = (err) => {
          this.emit("error", err);
          reject(err);
        };
      });
    }

    _bindWsEvents() {
      if (!this.ws) return;
      this.ws.removeEventListener("message", this._messageListener);
      this.ws.addEventListener("message", this._messageListener);
    }

    /**
     * Send JSON request and await response matched by req_id
     */
    send(payload) {
      return new Promise((resolve, reject) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          return reject(new Error("WebSocket is not connected."));
        }

        const reqId = Date.now() + Math.floor(Math.random() * 100000);
        payload.req_id = reqId;

        const timeout = setTimeout(() => {
          this.ws.removeEventListener("message", handler);
          reject(new Error(`WebSocket request timed out (${payload.msg_type || Object.keys(payload)[0]})`));
        }, 15000);

        const handler = (event) => {
          try {
            const raw = typeof event.data === "string" ? event.data : event.data.toString();
            const msg = JSON.parse(raw);
            if (msg.req_id === reqId) {
              clearTimeout(timeout);
              this.ws.removeEventListener("message", handler);
              if (msg.error) {
                reject(msg.error);
              } else {
                resolve(msg);
              }
            }
          } catch {}
        };

        this.ws.addEventListener("message", handler);
        this.ws.send(JSON.stringify(payload));
      });
    }

    /**
     * Authorize with token
     */
    async authorize(token) {
      this.token = token;
      const res = await this.send({ authorize: token });
      if (res.authorize?.currency) {
        this.currency = res.authorize.currency;
      }
      return res.authorize;
    }

    /**
     * Fetch and filter active volatility symbols from Deriv
     */
    async fetchActiveSymbols(filter = this.marketFilter || "all") {
      const res = await this.send({ active_symbols: "brief" });
      const activeSymbols = res.active_symbols || [];

      const is1s = (sym) => /^1HZ\d+V$/i.test(sym.symbol);
      const isStandardVol = (sym) => /^R_\d+$/i.test(sym.symbol) || sym.submarket === "random_index";

      const markets = activeSymbols.filter((s) => {
        if (Number(s.is_trading_suspended) === 1) return false;
        const matchVol = isStandardVol(s) || is1s(s);
        if (!matchVol) return false;

        if (filter === "one-second") return is1s(s);
        if (filter === "standard") return !is1s(s);
        return true;
      });

      markets.sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
      return markets;
    }

    /**
     * Start AI Scanner (convenience wrapper)
     */
    start(strategy, options = {}) {
      if (typeof strategy === "object" && !strategy.direction && !strategy.barrier && strategy.strategy) {
        return this.startScanner(strategy);
      }
      return this.startScanner({ strategy, ...options });
    }

    /**
     * Start AI Scanner with specified strategy and parameters
     */
    async startScanner({
      strategy,
      stake = 1.0,
      tradeCount = 5,
      lookback = null,
      marketFilter = "all"
    }) {
      if (!strategy) {
        throw new Error("A valid strategy profile is required (e.g. Over 1 Pro or custom { direction, barrier, lookback }).");
      }

      // Resolve strategy preset if string passed
      if (typeof strategy === "string") {
        const found = DERIV_AI_PRESET_STRATEGIES.find(
          (s) => s.id === strategy || s.name.toLowerCase() === strategy.toLowerCase()
        );
        if (!found) throw new Error(`Unknown preset strategy: ${strategy}`);
        strategy = found;
      }

      this.strategy = strategy;
      this.stake = Math.max(0.35, Number(stake) || 1.0);
      this.tradesRemaining = Math.max(1, Math.floor(Number(tradeCount) || 1));
      this.totalTradesPlanned = this.tradesRemaining;
      this.lookback = lookback !== null && Number.isFinite(Number(lookback)) ? Number(lookback) : (strategy.lookback || 3);
      this.marketFilter = marketFilter || "all";

      this.isRunning = true;
      this.isTrading = false;
      this.lockedSymbol = null;
      this.completedTrades = [];
      this.digitHistories.clear();
      this.tickSubscriptions.clear();

      this.emit("statusChange", "loading", "Initializing market feeds...");

      // Close any previous tick streams
      try {
        this.ws.send(JSON.stringify({ forget_all: "ticks" }));
      } catch {}

      // 1. Fetch Volatility Markets
      const markets = await this.fetchActiveSymbols(this.marketFilter);

      if (!markets.length) {
        this.stop();
        throw new Error("No active volatility markets found matching filter.");
      }

      this.emit("marketsLoaded", markets);

      this.emit(
        "statusChange",
        "scanning",
        `Scanning ${markets.length} markets for pattern [${this.strategy.name || `${this.strategy.direction.toUpperCase()} ${this.strategy.barrier}`} (lookback: ${this.lookback})]...`
      );

      // 2. Subscribe to ticks on all filtered markets
      for (const m of markets) {
        try {
          this.ws.send(JSON.stringify({ ticks: m.symbol, subscribe: 1 }));
        } catch (err) {
          console.warn(`[DerivAiTrader] Failed to subscribe to ${m.symbol}:`, err);
        }
      }
    }

    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(msg) {
      if (!this.isRunning) return;

      if (msg.msg_type === "tick" && msg.tick) {
        if (msg.subscription?.id) {
          this.tickSubscriptions.add(msg.subscription.id);
        }
        this.processTick(msg.tick);
      }
    }

    /**
     * Process individual market tick
     */
    async processTick(tick) {
      const symbol = tick.symbol;
      if (!symbol || !Number.isFinite(Number(tick.quote))) return;

      // Decimal precision pip size
      const quote = Number(tick.quote);
      const pipSize = Number(tick.pip_size ?? 2);
      const lastDigit = this.extractDigit(quote, pipSize);

      // Update historical digits buffer
      const history = [...(this.digitHistories.get(symbol) || []), lastDigit].slice(-this.lookback);
      this.digitHistories.set(symbol, history);

      // Check entry pattern match condition
      const isMatch = this.checkSignal(this.strategy, history);

      this.emit("tick", {
        symbol,
        quote,
        pipSize,
        digit: lastDigit,
        lastDigit,
        history,
        isMatch,
        status: this.isTrading ? "trading" : "scanning"
      });

      // If currently scanning and signal detected:
      if (!this.isTrading && isMatch && this.tradesRemaining > 0) {
        this.lockedSymbol = symbol;
        this.isTrading = true;

        this.emit("signal", { symbol, history, strategy: this.strategy });
        this.emit("signalMatch", symbol, history, this.strategy);
        this.emit(
          "statusChange",
          "trading",
          `Signal matched on ${symbol}! History: [${history.join(", ")}]. Executing trade ${this.totalTradesPlanned - this.tradesRemaining + 1}/${this.totalTradesPlanned}...`
        );

        await this.executeSequenceTrade(symbol);
      } else if (this.isTrading && this.lockedSymbol === symbol && !this.activeContractId && this.tradesRemaining > 0) {
        // Continue next trade in sequence on locked symbol if prior closed
        await this.executeSequenceTrade(symbol);
      }
    }

    /**
     * Place Deriv Direct Buy and monitor to completion
     */
    async executeSequenceTrade(symbol) {
      if (this.activeContractId || !this.isRunning || this.tradesRemaining <= 0) return;

      const contractType = this.strategy.direction === "over" ? "DIGITOVER" : "DIGITUNDER";
      const barrier = this.strategy.barrier;

      // Simulated trade resolution for demo testing without authorized token
      if (this.mockSimulation) {
        this.activeContractId = `sim_${Date.now()}`;
        const contractId = this.activeContractId;
        const buyPrice = this.stake;

        this.emit("tradePlaced", {
          contractId,
          transactionId: Date.now(),
          symbol,
          contractType,
          stake: this.stake,
          buyPrice,
          balanceAfter: 10000
        });

        // Await 1.2s to simulate 1-tick contract lifecycle
        await new Promise((resolve) => setTimeout(resolve, 1200));

        const exitDigit = Math.floor(Math.random() * 10);
        const isWin = (contractType === "DIGITOVER" && exitDigit > barrier) ||
                      (contractType === "DIGITUNDER" && exitDigit < barrier);
        const payoutRate = contractType === "DIGITOVER" ? (barrier === 1 ? 0.23 : barrier === 2 ? 0.38 : 0.60) :
                                                          (barrier === 8 ? 0.23 : barrier === 7 ? 0.38 : 0.60);
        const profit = isWin ? Number((this.stake * payoutRate).toFixed(2)) : -this.stake;

        this.tradesRemaining -= 1;
        const tradeRecord = {
          contractId,
          symbol,
          contractType,
          stake: this.stake,
          profit,
          isWin,
          entryTick: 1000.50,
          exitTick: 1000.50 + exitDigit * 0.01,
          exitDigit,
          barrier,
          result: isWin ? "win" : "loss",
          closedAt: new Date().toISOString()
        };

        this.completedTrades.push(tradeRecord);
        this.emit("tradeClosed", tradeRecord);
        this.activeContractId = null;

        if (this.tradesRemaining <= 0) {
          this.emit("statusChange", "complete", "All trades in sequence successfully executed.");
          const summary = this.getSummary();
          this.emit("sequenceComplete", summary);
          this.stop();
        } else {
          this.emit(
            "statusChange",
            "trading",
            `Trade finished (${isWin ? "WIN" : "LOSS"}: ${profit >= 0 ? "+" : ""}${profit.toFixed(2)}). ${this.tradesRemaining} remaining in sequence...`
          );
        }
        return;
      }

      const buyPayload = this.buildBuyPayload(this.strategy, symbol, this.stake, this.currency);

      try {
        this.activeContractId = "pending";
        const buyRes = await this.send(buyPayload);

        if (buyRes.error) {
          throw new Error(buyRes.error.message || "Purchase rejected by Deriv.");
        }

        const buyData = buyRes.buy;
        if (!buyData || !buyData.contract_id) {
          throw new Error("Purchase failed - contract ID not received from Deriv.");
        }

        const contractId = buyData.contract_id;
        this.activeContractId = contractId;

        this.emit("tradePlaced", {
          contractId,
          transactionId: buyData.transaction_id,
          symbol,
          contractType,
          stake: this.stake,
          buyPrice: buyData.buy_price,
          balanceAfter: buyData.balance_after
        });

        // Monitor contract status on proposal_open_contract until complete
        const pocResult = await this.monitorContract(contractId);

        // Decrement sequence count
        this.tradesRemaining -= 1;
        const profit = Number(pocResult.profit || 0);
        const isWin = profit > 0 || pocResult.status === "won";

        const tradeRecord = {
          contractId,
          symbol,
          contractType,
          stake: this.stake,
          profit,
          isWin,
          entryTick: pocResult.entry_tick,
          exitTick: pocResult.exit_tick,
          barrier: pocResult.barrier,
          closedAt: new Date().toISOString()
        };

        this.completedTrades.push(tradeRecord);
        this.emit("tradeClosed", tradeRecord);

        this.activeContractId = null;

        if (this.tradesRemaining <= 0) {
          // Sequence completed!
          this.emit("statusChange", "complete", "All trades in sequence successfully executed.");
          const summary = this.getSummary();
          this.emit("sequenceComplete", summary);
          this.stop();
        } else {
          this.emit(
            "statusChange",
            "trading",
            `Trade finished (${isWin ? "WIN" : "LOSS"}: ${profit >= 0 ? "+" : ""}${profit.toFixed(2)}). ${this.tradesRemaining} remaining in sequence...`
          );
        }
      } catch (err) {
        this.activeContractId = null;
        this.isTrading = false;
        this.callbacks.onError(err);
        this.callbacks.onStatusChange("error", `Trade Error: ${err.message || err}`);
      }
    }

    /**
     * Monitor contract until sold / expired, then forget subscription
     */
    monitorContract(contractId) {
      return new Promise((resolve) => {
        let subId = null;
        let isResolved = false;

        const timeout = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            this.ws.removeEventListener("message", listener);
            if (subId) {
              try { this.ws.send(JSON.stringify({ forget: subId })); } catch {}
            }
            resolve({ contract_id: contractId, is_sold: 1, status: "closed", profit: 0 });
          }
        }, 20000);

        const listener = (event) => {
          try {
            const raw = typeof event.data === "string" ? event.data : event.data.toString();
            const msg = JSON.parse(raw);
            if (msg.msg_type === "proposal_open_contract") {
              const poc = msg.proposal_open_contract;
              if (poc && String(poc.contract_id) === String(contractId)) {
                if (msg.subscription?.id) {
                  subId = msg.subscription.id;
                }

                this.callbacks.onTradeTick(poc);

                if (poc.is_sold === 1 || poc.status === "sold" || poc.is_expired === 1) {
                  if (!isResolved) {
                    isResolved = true;
                    clearTimeout(timeout);
                    this.ws.removeEventListener("message", listener);

                    if (subId) {
                      try { this.ws.send(JSON.stringify({ forget: subId })); } catch {}
                    }

                    resolve(poc);
                  }
                }
              }
            }
          } catch {}
        };

        this.ws.addEventListener("message", listener);

        // Subscribe to open contract updates
        this.ws.send(
          JSON.stringify({
            proposal_open_contract: 1,
            contract_id: Number(contractId),
            subscribe: 1
          })
        );
      });
    }

    /**
     * Stop scanner and unsubscribe from all tick streams
     */
    stop() {
      this.isRunning = false;
      this.isTrading = false;
      this.lockedSymbol = null;
      this.activeContractId = null;

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ forget_all: "ticks" }));
          this.ws.send(JSON.stringify({ forget_all: "proposal_open_contract" }));
        } catch {}
      }

      this.emit("statusChange", "idle", "Scanner stopped.");
    }

    /**
     * Get summary of current session
     */
    getSummary() {
      const total = this.completedTrades.length;
      const wins = this.completedTrades.filter((t) => t.isWin).length;
      const losses = total - wins;
      const netProfit = this.completedTrades.reduce((acc, t) => acc + t.profit, 0);

      return {
        totalTrades: total,
        wins,
        losses,
        winRate: total ? (wins / total) * 100 : 0,
        netProfit: Number(netProfit.toFixed(2)),
        trades: [...this.completedTrades]
      };
    }
  }

  return { DerivAiTrader, DERIV_AI_PRESET_STRATEGIES };
}));
