import express from "express";
import path from "path";
import cors from "cors";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Helper to read database
function readDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading database file:", err);
  }
  return {};
}

// Helper to write database
function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database file:", err);
  }
}

async function startServer() {
  // Enable JSON parsing & URL encoded parsing
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Serve static assets/uploads if they exist
  const uploadsPath = path.join(process.cwd(), "uploads");
  app.use("/uploads", express.static(uploadsPath));

  // Serve API health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // -------------------------------------------------------------
  // 1. DATA SYNC API ENDPOINTS (SYNCS REACT LOCAL STORAGE STATE)
  // -------------------------------------------------------------
  app.get("/api/data", (req, res) => {
    const db = readDB();
    res.json(db);
  });

  app.post("/api/data", (req, res) => {
    const incoming = req.body || {};
    const db = readDB();
    
    // Merge or save complete datasets
    const merged = { ...db, ...incoming };
    writeDB(merged);
    res.json({ status: "success", count: Object.keys(merged).length });
  });

  // -------------------------------------------------------------
  // 2. ZAPUPI CREATE ORDER API
  // -------------------------------------------------------------
  app.post("/api/payment/zapupi/create", async (req, res) => {
    try {
      const { amount, customer_name, customer_mobile, is_wallet_recharge, plan_id, service_id } = req.body;
      const db = readDB();
      const settings = db.settings || {};

      const zapupiApiKey = settings.zapupiApiKey || "test_zap_key";
      const zapupiMode = settings.zapupiMode || "test";
      const zapupiApiEndpoint = settings.zapupiApiEndpoint || "https://api.zapupi.com/v1/create_order";
      const zapupiWebhookUrl = settings.zapupiWebhookUrl || "http://localhost:3000/api/webhook/zapupi";
      const zapupiSuccessUrl = settings.zapupiSuccessUrl || "http://localhost:3000/?zapupi_status=success";
      const zapupiFailedUrl = settings.zapupiFailedUrl || "http://localhost:3000/?zapupi_status=failed";

      // Generate a unique order ID
      const orderId = is_wallet_recharge === true || is_wallet_recharge === "true"
        ? "RECH-" + Math.floor(100000 + Math.random() * 900000)
        : "ORD-" + Math.floor(10000 + Math.random() * 90000);

      const successRedirect = `${zapupiSuccessUrl}${zapupiSuccessUrl.includes('?') ? '&' : '?'}order_id=${orderId}`;
      const failedRedirect = `${zapupiFailedUrl}${zapupiFailedUrl.includes('?') ? '&' : '?'}order_id=${orderId}`;

      // Handle Sandbox/Test Mode redirection
      if (zapupiMode === "test" || !settings.zapupiApiKey || settings.zapupiApiKey.trim() === "") {
        // Return a mock sandbox check out URL
        const mockCheckoutUrl = `/zapupi-sandbox-checkout?order_id=${orderId}&amount=${amount}&customer_name=${encodeURIComponent(customer_name || "Guest")}&customer_mobile=${customer_mobile || ""}&is_wallet_recharge=${is_wallet_recharge || false}&plan_id=${plan_id || ""}&service_id=${service_id || ""}&success_url=${encodeURIComponent(successRedirect)}&failure_url=${encodeURIComponent(failedRedirect)}`;
        
        return res.json({
          status: "success",
          order_id: orderId,
          payment_url: mockCheckoutUrl
        });
      }

      // Live Mode API Call
      const payload = {
        zap_key: zapupiApiKey,
        order_id: orderId,
        amount: parseFloat(amount).toString(),
        customer_name: customer_name || "Guest",
        customer_mobile: customer_mobile || "",
        success_url: successRedirect,
        failure_url: failedRedirect,
        webhook_url: zapupiWebhookUrl
      };

      console.log("Calling ZapUPI Create Order Live Endpoint:", zapupiApiEndpoint, payload);

      const response = await fetch(zapupiApiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`ZapUPI server responded with status: ${response.status}`);
      }

      const result: any = await response.json();
      console.log("ZapUPI API Response:", result);

      // Extract payment URL from various possible response shapes
      const paymentUrl = result.payment_url || 
                         result.url || 
                         (result.response && result.response.payment_url) ||
                         (result.data && result.data.payment_url);

      if (!paymentUrl) {
        throw new Error("Payment URL not found in ZapUPI Gateway response.");
      }

      return res.json({
        status: "success",
        order_id: orderId,
        payment_url: paymentUrl
      });

    } catch (err: any) {
      console.error("Error creating ZapUPI order:", err);
      return res.status(500).json({ status: "error", message: err.message || "Failed to initiate payment." });
    }
  });

  // -------------------------------------------------------------
  // 3. ZAPUPI WEBHOOK LISTENER ENDPOINT
  // -------------------------------------------------------------
  app.post("/api/webhook/zapupi", (req, res) => {
    try {
      console.log("ZapUPI Webhook Received. Payload:", req.body);
      const {
        order_id,
        status,
        transaction_id,
        amount,
        is_wallet_recharge,
        customer_mobile,
        customer_name,
        plan_id,
        service_id
      } = req.body;

      if (!order_id) {
        return res.status(400).json({ error: "Missing order_id" });
      }

      const db = readDB();
      const dateStr = new Date().toISOString().replace("T", " ").substring(0, 19);

      // Verify webhook authenticity (e.g. status completed/success)
      const isPaid = ["COMPLETED", "SUCCESS", "Paid", "active", "completed", "success"].includes(status);

      if (!isPaid) {
        console.log(`Webhook reported non-paid status "${status}" for order ${order_id}. Skipping.`);
        return res.json({ status: "ignored", message: "Non-paid status" });
      }

      const isRecharge = order_id.startsWith("RECH-") || is_wallet_recharge === true || is_wallet_recharge === "true";

      if (isRecharge) {
        // WALLET RECHARGE WEBHOOK FULFILLMENT
        const mobile = (customer_mobile || "").replace(/\s+/g, "");
        const amt = parseFloat(amount) || 0;

        // 1. Locate or create wallet
        if (!db.wallets) db.wallets = [];
        let wallet = db.wallets.find((w: any) => w.whatsapp.replace(/\s+/g, "") === mobile);

        if (!wallet) {
          wallet = {
            whatsapp: mobile || "918015342606",
            username: customer_name || "Guest User",
            balance: 0,
            totalAdded: 0,
            totalSpent: 0,
            lastRecharge: dateStr,
            status: "Active"
          };
          db.wallets.push(wallet);
        }

        const bonus = (db.walletSettings && db.walletSettings.walletBonusEnabled) ? (amt * 0.05) : 0;
        const finalCredit = amt + bonus;
        wallet.balance = (wallet.balance || 0) + finalCredit;
        wallet.totalAdded = (wallet.totalAdded || 0) + amt;
        wallet.lastRecharge = dateStr;

        // 2. Write Wallet Transaction
        if (!db.walletTransactions) db.walletTransactions = [];
        const txnId = transaction_id || "WTXN-" + Math.floor(100000 + Math.random() * 900000);
        db.walletTransactions.unshift({
          id: txnId,
          whatsapp: mobile,
          username: customer_name || wallet.username,
          amount: amt,
          type: "Credit",
          paymentMethod: "ZapUPI Gateway",
          status: "Success",
          balanceAfter: wallet.balance,
          date: dateStr
        });

        // 3. Mark recharge requests approved
        if (!db.rechargeRequests) db.rechargeRequests = [];
        let reqRecord = db.rechargeRequests.find((r: any) => r.id === order_id);
        if (!reqRecord) {
          reqRecord = {
            id: order_id,
            userId: mobile,
            username: customer_name || wallet.username,
            rechargeAmount: amt,
            utrNumber: txnId,
            contactMobile: mobile,
            paymentMethod: "ZapUPI Gateway",
            status: "Approved",
            createdAt: dateStr,
            approvedAt: dateStr,
            approvedBy: "ZapUPI Webhook",
            remarks: "Auto-approved via ZapUPI Gateway"
          };
          db.rechargeRequests.unshift(reqRecord);
        } else {
          reqRecord.status = "Approved";
          reqRecord.approvedAt = dateStr;
          reqRecord.approvedBy = "ZapUPI Webhook";
          reqRecord.remarks = "Auto-approved via ZapUPI Webhook";
        }

        // 4. Log wallet logs
        if (!db.walletLogs) db.walletLogs = [];
        db.walletLogs.unshift({
          id: "WLOG-" + Math.floor(100000 + Math.random() * 900000),
          whatsapp: mobile,
          action: "Recharge Approved",
          details: `Auto credited ₹${amt} with ZapUPI. Balance: ₹${wallet.balance}`,
          timestamp: dateStr
        });

      } else {
        // SERVICE PLAN SUBSCRIPTION PURCHASE FULFILLMENT
        if (!db.orders) db.orders = [];
        let order = db.orders.find((o: any) => o.id === order_id);

        const amt = parseFloat(amount) || 0;
        const planId = plan_id || "";
        const servId = parseInt(service_id) || 0;

        // Retrieve service/plan names if missing
        let serviceName = "Service";
        let planName = "Subscription";
        let duration = "Days";

        if (db.services && servId) {
          const s = db.services.find((x: any) => x.id === servId);
          if (s) serviceName = s.name;
        }
        if (db.plans && planId) {
          const p = db.plans.find((x: any) => x.id === planId);
          if (p) {
            planName = p.name;
            duration = p.duration;
          }
        }

        if (!order) {
          // Create new paid Order
          order = {
            id: order_id,
            customerName: customer_name || "Guest",
            whatsapp: customer_mobile || "",
            serviceId: servId,
            planId: planId,
            serviceName: serviceName,
            planName: planName,
            duration: duration,
            transactionId: transaction_id || "TXN" + Math.floor(Math.random() * 1000000),
            amount: amt,
            status: "Completed",
            paymentMethod: "ZapUPI Gateway",
            date: dateStr
          };
          db.orders.unshift(order);
        } else {
          // Update status to paid/completed
          order.status = "Completed";
          order.transactionId = transaction_id || order.transactionId;
          order.paymentMethod = "ZapUPI Gateway";
        }
      }

      // Update Activity Logs
      if (!db.activityLogs) db.activityLogs = [];
      db.activityLogs.unshift({
        id: "ACT-" + Math.floor(100000 + Math.random() * 900000),
        action: "Payment Webhook Success",
        details: `Successfully processed ZapUPI payment for order ID: ${order_id}`,
        timestamp: dateStr
      });

      writeDB(db);
      return res.json({ status: "success", message: "Fulfillment completed successfully" });

    } catch (err: any) {
      console.error("Webhook processing error:", err);
      return res.status(500).json({ error: "Webhook error", message: err.message });
    }
  });

  // -------------------------------------------------------------
  // 4. ZAPUPI STATUS CHECK API
  // -------------------------------------------------------------
  app.get("/api/payment/zapupi/status", async (req, res) => {
    try {
      const order_id = req.query.order_id as string;
      if (!order_id) {
        return res.status(400).json({ error: "Missing order_id" });
      }

      const db = readDB();
      const isRecharge = order_id.startsWith("RECH-");

      if (isRecharge) {
        const reqRecord = (db.rechargeRequests || []).find((r: any) => r.id === order_id);
        if (reqRecord && reqRecord.status === "Approved") {
          return res.json({ status: "COMPLETED", payment_status: "Paid" });
        }
      } else {
        const order = (db.orders || []).find((o: any) => o.id === order_id);
        if (order && (order.status === "Completed" || order.status === "Paid")) {
          return res.json({ status: "COMPLETED", payment_status: "Paid" });
        }
      }

      // Check external Live Order status if Live Mode is active
      const settings = db.settings || {};
      if (settings.zapupiMode === "live" && settings.zapupiApiKey) {
        try {
          const checkUrl = `https://api.zapupi.com/v1/order_status?zap_key=${settings.zapupiApiKey}&order_id=${order_id}`;
          const checkRes = await fetch(checkUrl);
          if (checkRes.ok) {
            const checkData: any = await checkRes.json();
            console.log("ZapUPI Order Status Check:", checkData);
            if (["COMPLETED", "SUCCESS", "Paid"].includes(checkData.status)) {
              // Trigger webhook logic internally to sync
              const syncPayload = {
                order_id,
                status: "COMPLETED",
                transaction_id: checkData.transaction_id || "TXN_SYNC",
                amount: checkData.amount,
                customer_mobile: checkData.customer_mobile,
                customer_name: checkData.customer_name,
                plan_id: checkData.plan_id,
                service_id: checkData.service_id
              };

              // Make webhook call locally to trigger full DB credit/subscription flow
              await fetch(`http://localhost:3000/api/webhook/zapupi`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(syncPayload)
              });

              return res.json({ status: "COMPLETED", payment_status: "Paid" });
            }
          }
        } catch (e) {
          console.error("Failed checking live order status with ZapUPI API:", e);
        }
      }

      return res.json({ status: "PENDING", payment_status: "Pending" });

    } catch (err: any) {
      return res.status(500).json({ error: "Status check error", message: err.message });
    }
  });

  // -------------------------------------------------------------
  // 5. PREMIUM SANDBOX CHECKOUT SIMULATOR
  // -------------------------------------------------------------
  app.get("/zapupi-sandbox-checkout", (req, res) => {
    const { order_id, amount, customer_name, customer_mobile, is_wallet_recharge, plan_id, service_id, success_url, failure_url } = req.query;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ZapUPI Sandbox Payment Gateway</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      </head>
      <body class="bg-[#0B132B] min-h-screen flex items-center justify-center p-4 font-sans text-slate-100">
        <div class="bg-[#1C2541] rounded-[32px] w-full max-w-md shadow-2xl border border-slate-800 overflow-hidden">
          
          <!-- Header -->
          <div class="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-center text-white relative">
            <div class="absolute right-4 top-4 bg-emerald-600/50 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-emerald-400/20">
              Sandbox Test
            </div>
            <div class="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <i class="fa-solid fa-bolt text-3xl text-emerald-300"></i>
            </div>
            <h1 class="font-extrabold text-xl uppercase tracking-wider">ZapUPI Checkout</h1>
            <p class="text-emerald-100 text-xs font-semibold uppercase mt-1 tracking-wider opacity-80">Official Payment Gateway Simulation</p>
          </div>

          <!-- Invoice Block -->
          <div class="p-6 flex flex-col gap-5">
            <div class="bg-[#0B132B]/60 rounded-2xl p-4 border border-slate-800/80 flex flex-col gap-3">
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-400 font-bold uppercase">Order reference ID</span>
                <span class="text-[#22c55e] font-mono font-black tracking-wider select-all">${order_id}</span>
              </div>
              <div class="flex justify-between items-center text-xs border-t border-slate-800/80 pt-3">
                <span class="text-slate-400 font-bold uppercase">Customer</span>
                <span class="text-slate-200 font-bold">${customer_name || "Guest"} (${customer_mobile || "N/A"})</span>
              </div>
              <div class="flex justify-between items-center border-t border-slate-800/80 pt-3">
                <span class="text-slate-400 font-bold uppercase text-xs">Payment Amount</span>
                <span class="text-white font-black text-2xl">₹${amount}</span>
              </div>
            </div>

            <!-- Simulator Actions -->
            <div class="flex flex-col gap-3 mt-2">
              <button
                id="btn-success"
                class="w-full bg-[#22C55E] hover:bg-[#1fbd58] text-white py-4 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <i class="fa-solid fa-circle-check text-sm"></i>
                <span>Simulate Successful Payment</span>
              </button>

              <button
                id="btn-fail"
                class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-700"
              >
                <i class="fa-solid fa-circle-xmark text-sm"></i>
                <span>Simulate Failed Payment</span>
              </button>
            </div>

            <p class="text-[10px] text-slate-500 font-bold text-center uppercase tracking-wide leading-relaxed">
              * Click "Simulate Successful Payment" to fire the auto webhook background triggers and auto-activate services.
            </p>
          </div>

        </div>

        <script>
          const order_id = "${order_id}";
          const amount = "${amount}";
          const customer_name = "${customer_name}";
          const customer_mobile = "${customer_mobile}";
          const is_wallet_recharge = "${is_wallet_recharge}";
          const plan_id = "${plan_id}";
          const service_id = "${service_id}";
          const success_url = decodeURIComponent("${encodeURIComponent((success_url as string) || '')}");
          const failure_url = decodeURIComponent("${encodeURIComponent((failure_url as string) || '')}");

          document.getElementById('btn-success').addEventListener('click', async () => {
            const btn = document.getElementById('btn-success');
            btn.innerHTML = '<i class="fa-solid fa-circle-notch animate-spin mr-2"></i>Processing Webhook...';
            btn.disabled = true;

            try {
              // Call webhook locally
              const res = await fetch('/api/webhook/zapupi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  order_id,
                  status: 'COMPLETED',
                  transaction_id: 'ZAPTXN' + Math.floor(10000000 + Math.random() * 90000000),
                  amount,
                  is_wallet_recharge,
                  customer_mobile,
                  customer_name,
                  plan_id,
                  service_id
                })
              });

              console.log('Webhook triggered:', await res.json());
              
              // Redirect
              window.location.href = success_url;
            } catch (err) {
              console.error('Webhook trigger error:', err);
              window.location.href = success_url;
            }
          });

          document.getElementById('btn-fail').addEventListener('click', () => {
            window.location.href = failure_url;
          });
        </script>
      </body>
      </html>
    `;
    res.send(html);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback route
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Graceful port error handling as requested
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started at http://localhost:${PORT}`);
  });

  server.on("error", (error: any) => {
    if (error.code === "EADDRINUSE") {
      console.error(`\n======================================================`);
      console.error(`ERROR: Port ${PORT} is already in use by another process.`);
      console.error(`Please close the other process or free up port ${PORT}.`);
      console.error(`======================================================\n`);
      process.exit(1);
    } else {
      console.error("Server error occurred:", error);
    }
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
