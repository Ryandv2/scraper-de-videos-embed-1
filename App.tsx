import { useState, useEffect } from "react";
import {
  Globe,
  RefreshCw,
  Copy,
  Check,
  Play,
  Terminal,
  Layers,
  FileCode,
  ExternalLink,
  Zap,
  Info,
  Sliders,
  AlertCircle,
  Lock,
  Sparkles,
  X,
  CreditCard,
  CheckCircle2,
  TrendingUp,
  Coins
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// List of supported video servers for pattern matching
const ALL_SERVERS = [
  { id: "Streamwish", name: "Streamwish", color: "from-emerald-400 to-green-500", glow: "rgba(16,185,129,0.3)" },
  { id: "Vidhide", name: "Vidhide", color: "from-cyan-400 to-blue-500", glow: "rgba(6,182,212,0.3)" },
  { id: "Filemoon", name: "Filemoon", color: "from-purple-400 to-indigo-500", glow: "rgba(139,92,246,0.3)" },
  { id: "Streamtape", name: "Streamtape", color: "from-amber-400 to-orange-500", glow: "rgba(245,158,11,0.3)" },
  { id: "Vidoza", name: "Vidoza", color: "from-rose-400 to-pink-500", glow: "rgba(244,63,94,0.3)" },
  { id: "Doodstream", name: "Doodstream", color: "from-indigo-400 to-indigo-600", glow: "rgba(99,102,241,0.3)" },
  { id: "VOE", name: "VOE", color: "from-sky-400 to-sky-600", glow: "rgba(56,189,248,0.3)" },
  { id: "Mixdrop", name: "Mixdrop", color: "from-fuchsia-400 to-fuchsia-600", glow: "rgba(232,121,249,0.3)" }
];

interface PricingPlan {
  id: string;
  title: string;
  price: string;
  currency: string;
  badge: string;
  description: string;
  features: string[];
  type: "pack" | "annual" | "lifetime";
  popular?: boolean;
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: "pack_50",
    title: "Pack +50 Extracciones",
    price: "1.00",
    currency: "USD",
    badge: "Pago Único",
    description: "Ideal para usos rápidos o proyectos puntuales sin suscripciones.",
    features: [
      "+50 Extracciones adicionales inmediatas",
      "Soporte para enlaces encriptados/obfuscados",
      "Acceso ilimitado a todos los servidores",
      "Créditos acumulables sin fecha de vencimiento"
    ],
    type: "pack"
  },
  {
    id: "annual_unlimited",
    title: "Suscripción Anual Ilimitada",
    price: "8.00",
    currency: "USD",
    badge: "Ahorra 80%",
    description: "Extrae de forma masiva e ilimitada durante todo un año.",
    features: [
      "Extracciones 100% ILIMITADAS",
      "Acceso Prioritario al Servidor Stealth",
      "Playwright Headless Ultra-Rápido",
      "Decodificación encriptada premium activa",
      "Soporte prioritario durante 365 días"
    ],
    type: "annual",
    popular: true
  },
  {
    id: "lifetime_unlimited",
    title: "Acceso Permanente Ilimitado",
    price: "40.00",
    currency: "USD",
    badge: "De Por Vida",
    description: "Compra una vez y olvídate de límites para siempre.",
    features: [
      "Extracciones 100% ILIMITADAS PARA SIEMPRE",
      "Único pago sin cuotas de renovación",
      "Acceso de por vida a futuras actualizaciones",
      "Desofuscador de Packer & Base64 avanzado",
      "Soporte VIP inmediato de por vida"
    ],
    type: "lifetime"
  }
];

export default function App() {
  // Direct Scraper States
  const [targetUrl, setTargetUrl] = useState<string>("");
  const [pastedHtml, setPastedHtml] = useState<string>("");

  const [extractedEmbeds, setExtractedEmbeds] = useState<Array<{ server: string; url: string; type: string; isEncrypted?: boolean; encryptionType?: string }>>([]);

  const [scanningStatus, setScanningStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStepText, setProgressStepText] = useState<string>("Inicializando...");
  const [scanResultNote, setScanResultNote] = useState<string>("");
  const [isSimulation, setIsSimulation] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  
  // Tab state for Input Mode
  const [inputMode, setInputMode] = useState<"url" | "html">("url");

  // Limits & Billing State
  const [scrapesLeft, setScrapesLeft] = useState<number>(() => {
    const saved = localStorage.getItem("scrapesLeft");
    return saved ? parseInt(saved, 10) : 50;
  });
  const [unlimitedType, setUnlimitedType] = useState<"none" | "annual" | "lifetime">(() => {
    return (localStorage.getItem("unlimitedType") as "none" | "annual" | "lifetime") || "none";
  });
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [checkoutPlan, setCheckoutPlan] = useState<PricingPlan | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [mercadopagoUrl, setMercadopagoUrl] = useState<string>("");
  const [preferenceError, setPreferenceError] = useState<string>("");

  // Process incoming MercadoPago payment confirmation from redirect back_urls
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment_status");
    const planId = params.get("plan_id");

    if (paymentStatus === "approved" && planId) {
      if (planId === "pack_50") {
        setScrapesLeft((prev) => {
          const next = prev + 50;
          localStorage.setItem("scrapesLeft", next.toString());
          return next;
        });
      } else if (planId === "annual_unlimited") {
        setUnlimitedType("annual");
        localStorage.setItem("unlimitedType", "annual");
      } else if (planId === "lifetime_unlimited") {
        setUnlimitedType("lifetime");
        localStorage.setItem("unlimitedType", "lifetime");
      }

      // Automatically open successful payment feedback
      const matchedPlan = PRICING_PLANS.find((p) => p.id === planId) || null;
      setCheckoutPlan(matchedPlan);
      setPaymentSuccess(true);
      setShowPaymentModal(false);

      // Clean parameters from the address bar to prevent double crediting on reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Dynamic status text animation
  useEffect(() => {
    if (scanningStatus === "loading") {
      setProgressPercent(0);
      setProgressStepText("🤖 [1/4] Iniciando navegador virtual invisible...");
      
      const steps = [
        { percent: 25, text: "📱 [2/4] Configurando User-Agent móvil premium y anti-detección..." },
        { percent: 60, text: "🌐 [3/4] Cargando DOM y resolviendo iframes dinámicos (networkidle)..." },
        { percent: 90, text: "🔍 [4/4] Buscando scripts y reproduciendo patrones regex de servidores..." },
        { percent: 100, text: "✨ [ÉXITO] Extracción terminada de forma segura." }
      ];

      let currentStep = 0;
      const interval = setInterval(() => {
        if (currentStep < steps.length) {
          setProgressPercent(steps[currentStep].percent);
          setProgressStepText(steps[currentStep].text);
          currentStep++;
        } else {
          clearInterval(interval);
        }
      }, 600);

      return () => clearInterval(interval);
    }
  }, [scanningStatus]);

  // Handle deduct credit logic
  const checkAndDeductScrape = (): boolean => {
    if (unlimitedType !== "none") {
      return true;
    }
    if (scrapesLeft <= 0) {
      setShowPaymentModal(true);
      return false;
    }
    const nextVal = scrapesLeft - 1;
    setScrapesLeft(nextVal);
    localStorage.setItem("scrapesLeft", nextVal.toString());
    return true;
  };

  // Execute Direct Scrape of URL
  const handleScrapeUrl = async () => {
    if (!targetUrl.trim()) return;
    
    // Check usage limits
    if (!checkAndDeductScrape()) {
      return;
    }

    setScanningStatus("loading");
    setIsSimulation(false);
    setScanResultNote("");
    
    // Artificial wait for satisfying loader animation
    await new Promise((resolve) => setTimeout(resolve, 2500));

    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await response.json();
      
      if (data.success) {
        setExtractedEmbeds(data.embeds);
        setScanningStatus("success");
        if (data.note) {
          setScanResultNote(data.note);
          setIsSimulation(true);
        } else {
          setScanResultNote("Extracción directa completada.");
        }
      } else {
        setScanningStatus("error");
      }
    } catch (err) {
      setScanningStatus("error");
    }
  };

  // Analyze pasted HTML content
  const handleAnalyzeHtml = async () => {
    if (!pastedHtml.trim()) return;

    // Check usage limits
    if (!checkAndDeductScrape()) {
      return;
    }

    setScanningStatus("loading");
    setScanResultNote("");
    setIsSimulation(false);

    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    try {
      const response = await fetch("/api/analyze-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: pastedHtml }),
      });
      const data = await response.json();
      
      if (data.success) {
        setExtractedEmbeds(data.embeds);
        setScanningStatus("success");
        setScanResultNote(`Se detectaron ${data.embeds.length} reproductores en el HTML provisto.`);
      } else {
        setScanningStatus("error");
      }
    } catch (err) {
      setScanningStatus("error");
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Monospaced progress bar generator
  const getProgressBarText = (percent: number) => {
    const totalBlocks = 12;
    const filled = Math.round((percent / 100) * totalBlocks);
    const empty = totalBlocks - filled;
    return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${percent}%`;
  };

  // Execute Simulated & Real MercadoPago checkout preference generation
  const handleOpenCheckout = async (plan: PricingPlan) => {
    setCheckoutPlan(plan);
    setPaymentSuccess(false);
    setMercadopagoUrl("");
    setPreferenceError("");
    setIsProcessingPayment(true);

    try {
      const response = await fetch("/api/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          title: plan.title,
          price: plan.price
        }),
      });
      const data = await response.json();
      if (data.success && data.initPoint) {
        setMercadopagoUrl(data.initPoint);
      } else {
        setPreferenceError(data.note || "No se pudo iniciar la pasarela de pagos.");
      }
    } catch (err) {
      setPreferenceError("Error de comunicación con el servidor de pagos.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleProcessCheckout = async () => {
    if (!checkoutPlan) return;
    setIsProcessingPayment(true);
    
    // Simulate API request fallback / instant sandbox unlock
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsProcessingPayment(false);
    setPaymentSuccess(true);
    
    // Unlock and update persistent states
    if (checkoutPlan.type === "pack") {
      const nextVal = scrapesLeft + 50;
      setScrapesLeft(nextVal);
      localStorage.setItem("scrapesLeft", nextVal.toString());
    } else if (checkoutPlan.type === "annual") {
      setUnlimitedType("annual");
      localStorage.setItem("unlimitedType", "annual");
    } else if (checkoutPlan.type === "lifetime") {
      setUnlimitedType("lifetime");
      localStorage.setItem("unlimitedType", "lifetime");
    }
  };

  const handleCloseCheckoutFlow = () => {
    setCheckoutPlan(null);
    setPaymentSuccess(false);
    setIsProcessingPayment(false);
  };

  // Fast reset credits helper (for easy testing/debugging)
  const handleResetForTesting = () => {
    setScrapesLeft(50);
    setUnlimitedType("none");
    localStorage.setItem("scrapesLeft", "50");
    localStorage.setItem("unlimitedType", "none");
  };

  return (
    <div className="min-h-screen bg-black text-[#F3F4F6] font-sans antialiased selection:bg-[#00FFCC]/20 selection:text-[#00FFCC] relative overflow-x-hidden flex flex-col justify-between">
      
      {/* Decorative Neon Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[450px] bg-gradient-to-b from-[#00FFCC]/8 via-transparent to-transparent pointer-events-none z-0" />
      <div className="absolute top-1/4 -left-1/4 w-[400px] h-[400px] bg-[#00FFCC]/3 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-1/4 w-[400px] h-[400px] bg-[#00E5FF]/3 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff02_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-10 border-b border-[#00FFCC]/10 bg-black/80 backdrop-blur-md sticky top-0">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#00FFCC] to-[#00E5FF] rounded-lg blur-md opacity-75 animate-pulse" />
              <div className="relative p-2 bg-black rounded-lg border border-[#00FFCC]/20">
                <Zap className="h-4.5 w-4.5 text-[#00FFCC]" />
              </div>
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest text-white flex items-center gap-1.5 uppercase">
                EMBED SCRAPER <span className="text-[8px] bg-[#00FFCC]/10 border border-[#00FFCC]/30 px-1.5 py-0.2 text-[#00FFCC] rounded font-mono">v2</span>
              </h1>
              <p className="text-[9px] text-gray-500 font-mono tracking-wider uppercase">Extractor de video de alta seguridad</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FFCC] animate-ping" />
            <span className="text-[9px] text-gray-400 font-mono uppercase tracking-wide">Stealth Engine Activo</span>
          </div>
        </div>
      </header>

      {/* Main Responsive Mobile-First Dashboard Container */}
      <main className="relative z-10 flex-1 max-w-3xl w-full mx-auto px-4 py-6 space-y-6">

        {/* Real-time Usage Status Badge Block */}
        <div className="bg-[#0D0D0E]/90 border border-gray-900 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-black rounded-xl border border-gray-800">
              <TrendingUp className="h-4 w-4 text-[#00FFCC]" />
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gray-400 font-mono">Estado de Crédito</h4>
              <div className="flex items-baseline space-x-2 mt-0.5">
                {unlimitedType !== "none" ? (
                  <span className="text-white text-sm font-bold tracking-tight flex items-center gap-1.5 uppercase">
                    <Sparkles className="h-3.5 w-3.5 text-[#00FFCC] fill-[#00FFCC]" /> ILIMITADO ({unlimitedType === "annual" ? "Anual" : "Permanente"})
                  </span>
                ) : (
                  <>
                    <span className={`text-base font-black font-mono tracking-tight ${scrapesLeft <= 0 ? "text-rose-400" : "text-[#00FFCC]"}`}>
                      {scrapesLeft} / 50
                    </span>
                    <span className="text-[9px] text-gray-500 uppercase font-mono tracking-wider">Consultas Disponibles</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="w-full sm:w-auto text-center py-2 px-6 bg-[#00FFCC]/10 hover:bg-[#00FFCC]/20 text-[#00FFCC] border border-[#00FFCC]/30 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all cursor-pointer"
            >
              Recargar o Upgrade
            </button>
          </div>
        </div>

        {/* Alert block if zero credits are left */}
        {unlimitedType === "none" && scrapesLeft <= 0 && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-5 bg-gradient-to-r from-rose-950/25 to-black border border-rose-500/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl"
          >
            <div className="flex items-start space-x-3.5">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400 mt-1 flex-shrink-0">
                <Lock className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase text-rose-300 tracking-wider">Has alcanzado el límite de 50 extracciones</h3>
                <p className="text-[10px] text-gray-400 leading-relaxed mt-1">
                  Tu cuota gratuita inicial ha finalizado. Desbloquea extracciones premium ilimitadas o recarga paquetes adicionales de inmediato usando MercadoPago de forma 100% segura.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="w-full md:w-auto px-5 py-2.5 bg-[#00FFCC] hover:bg-[#00FF99] text-black text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#00FFCC]/10 flex-shrink-0 cursor-pointer"
            >
              Comprar más con MercadoPago
            </button>
          </motion.div>
        )}

        {/* Input Card Container */}
        <div className="bg-[#0D0D0E] border border-gray-900 rounded-2xl shadow-xl overflow-hidden">
          
          {/* Tabs header */}
          <div className="flex border-b border-gray-900 bg-black/40">
            <button
              onClick={() => setInputMode("url")}
              className={`flex-1 py-3 text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${
                inputMode === "url"
                  ? "border-[#00FFCC] text-[#00FFCC] bg-white/[0.02]"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <Globe className="h-3.5 w-3.5" />
                Extraer desde URL
              </span>
            </button>
            <button
              onClick={() => setInputMode("html")}
              className={`flex-1 py-3 text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${
                inputMode === "html"
                  ? "border-[#00FFCC] text-[#00FFCC] bg-white/[0.02]"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <FileCode className="h-3.5 w-3.5" />
                Extraer desde HTML
              </span>
            </button>
          </div>

          <div className="p-5 space-y-4">
            {inputMode === "url" ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400 block">Dirección de la Película / Video</label>
                  {unlimitedType === "none" && (
                    <span className="text-[9px] font-mono text-gray-500 uppercase">Gasta: 1 crédito</span>
                  )}
                </div>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                  <input
                    type="url"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://ejemplo.com/pelicula/..."
                    className="w-full pl-10 pr-3 py-3 bg-black border border-gray-800 rounded-xl text-xs text-gray-200 font-mono focus:outline-none focus:border-[#00FFCC] focus:ring-1 focus:ring-[#00FFCC]/40 transition-all"
                  />
                </div>
                <button
                  onClick={handleScrapeUrl}
                  disabled={scanningStatus === "loading" || (unlimitedType === "none" && scrapesLeft <= 0)}
                  className="w-full py-3 bg-gradient-to-r from-[#00FFCC] to-[#00E5FF] hover:from-[#00FF99] hover:to-[#00E5FF] text-black font-extrabold rounded-xl text-xs tracking-wider uppercase shadow-lg shadow-[#00FFCC]/5 transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  {scanningStatus === "loading" ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Extrayendo...
                    </span>
                  ) : (unlimitedType === "none" && scrapesLeft <= 0) ? (
                    <span className="flex items-center justify-center gap-2">
                      <Lock className="h-3.5 w-3.5" />
                      Límite Alcanzado - Recarga para Continuar
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Play className="h-3.5 w-3.5 fill-black" />
                      Iniciar Extracción
                    </span>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400 block">Pega el Código Fuente (HTML)</label>
                  {unlimitedType === "none" && (
                    <span className="text-[9px] font-mono text-gray-500 uppercase">Gasta: 1 crédito</span>
                  )}
                </div>
                <textarea
                  value={pastedHtml}
                  onChange={(e) => setPastedHtml(e.target.value)}
                  rows={6}
                  placeholder="<iframe src='...' ></iframe>..."
                  className="w-full p-3 bg-black border border-gray-800 rounded-xl text-[11px] text-gray-300 font-mono leading-relaxed focus:outline-none focus:border-[#00FFCC] transition-all"
                />
                <button
                  onClick={handleAnalyzeHtml}
                  disabled={scanningStatus === "loading" || (unlimitedType === "none" && scrapesLeft <= 0)}
                  className="w-full py-3 bg-gradient-to-r from-[#00FFCC] to-[#00E5FF] hover:from-[#00FF99] hover:to-[#00E5FF] text-black font-extrabold rounded-xl text-xs tracking-wider uppercase shadow-lg shadow-[#00FFCC]/5 transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  {scanningStatus === "loading" ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Analizando...
                    </span>
                  ) : (unlimitedType === "none" && scrapesLeft <= 0) ? (
                    <span className="flex items-center justify-center gap-2">
                      <Lock className="h-3.5 w-3.5" />
                      Límite Alcanzado - Recarga para Continuar
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Terminal className="h-3.5 w-3.5" />
                      Analizar HTML
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Status Loader (Progress bar) */}
        <AnimatePresence>
          {scanningStatus === "loading" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-[#0D0D0E] border border-[#00FFCC]/20 rounded-2xl space-y-2.5 overflow-hidden"
            >
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-[#00FFCC] font-mono animate-pulse uppercase tracking-wider">{progressStepText}</span>
                <span className="text-[#00FFCC] font-mono font-bold">{progressPercent}%</span>
              </div>
              <div className="h-2.5 bg-gray-900 border border-gray-800 rounded-full overflow-hidden p-0.5">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#00FFCC] to-[#00E5FF] rounded-full shadow-[0_0_8px_#00FFCC]"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[9px] font-mono text-gray-500 text-center uppercase tracking-widest">{getProgressBarText(progressPercent)}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result Note badge */}
        {scanResultNote && scanningStatus !== "loading" && (
          <div className={`p-3 rounded-xl text-xs border flex items-start gap-2 ${
            isSimulation
              ? "bg-amber-500/5 border-amber-500/20 text-amber-300"
              : "bg-[#00FFCC]/5 border-[#00FFCC]/20 text-[#00FFCC]"
          }`}>
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span className="text-[10px] font-mono tracking-wide leading-relaxed uppercase">{scanResultNote}</span>
          </div>
        )}

        {/* Scraped / Extracted Results Area */}
        <div className="bg-[#0D0D0E] border border-gray-900 rounded-2xl shadow-xl overflow-hidden p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-950 pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">Enlaces Embed Encontrados</h2>
              <p className="text-[9px] text-gray-500 font-mono uppercase mt-0.5">Reproductores listados automáticamente</p>
            </div>
            <span className="text-[10px] bg-black border border-gray-800 px-2.5 py-0.5 rounded font-mono text-gray-400">
              {extractedEmbeds.length} detectados
            </span>
          </div>

          <div className="space-y-3">
            {scanningStatus === "loading" ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <RefreshCw className="h-8 w-8 text-[#00FFCC] animate-spin" />
                <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Buscando fuentes de video...</p>
              </div>
            ) : extractedEmbeds.length > 0 ? (
              extractedEmbeds.map((embed, idx) => {
                const matchedServer = ALL_SERVERS.find((s) => s.id === embed.server);
                const serverColor = matchedServer?.color || "from-gray-500 to-gray-700";
                const glowColor = matchedServer?.glow || "rgba(255,255,255,0.1)";

                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-black border border-gray-900 rounded-xl hover:border-gray-850 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start sm:items-center space-x-3 min-w-0">
                      {/* Glow color-matching host badge */}
                      <span
                        className={`px-2.5 py-1 text-[8px] font-black tracking-widest uppercase rounded-lg text-black bg-gradient-to-r ${serverColor} flex-shrink-0`}
                        style={{ boxShadow: `0 0 10px ${glowColor}` }}
                      >
                        {embed.server}
                      </span>
                      <div className="min-w-0">
                        <span className="font-mono text-[10.5px] text-gray-300 break-all block leading-tight">
                          {embed.url}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[8px] text-gray-500 font-mono uppercase flex items-center gap-1">
                            {embed.type === "iframe" ? (
                              <>
                                <Layers className="h-2.5 w-2.5 text-[#00FFCC]" /> iFrame incrustado
                              </>
                            ) : (
                              <>
                                <FileCode className="h-2.5 w-2.5 text-[#00E5FF]" /> Enlace Directo (Regex)
                              </>
                            )}
                          </span>
                          {embed.isEncrypted && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-extrabold uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded font-mono tracking-wider animate-pulse">
                              <Lock className="h-2 w-2" />
                              Cifrado Detectado ({embed.encryptionType || "General"})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 justify-end flex-shrink-0">
                      <button
                        onClick={() => handleCopyUrl(embed.url)}
                        className={`flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          copiedUrl === embed.url
                            ? "bg-[#00FFCC]/10 border-[#00FFCC] text-[#00FFCC]"
                            : "bg-[#0F0F0F] border-gray-850 hover:border-[#00FFCC] text-gray-400 hover:text-[#00FFCC]"
                        }`}
                      >
                        {copiedUrl === embed.url ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                      <a
                        href={embed.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center space-x-1 px-2.5 py-1.5 bg-[#0F0F0F] border border-gray-850 hover:border-[#00E5FF] text-gray-400 hover:text-[#00E5FF] rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Abrir</span>
                      </a>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                <AlertCircle className="h-8 w-8 text-gray-600" />
                <p className="text-[10px] text-gray-500 font-mono uppercase">Ningún enlace detectado</p>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-950 py-4 bg-black/40 text-center relative z-10 text-[9px] text-gray-600 font-mono uppercase tracking-widest">
        <span>Embed Scraper Tool © {new Date().getFullYear()} • Modo Ultra Premium</span>
      </footer>

      {/* PREMIUM PLANS / PAYMENT SELECTION MODAL */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-4xl w-full bg-[#0D0D0E] border border-gray-900 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl space-y-6"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-5 right-5 p-2 bg-black hover:bg-gray-900 rounded-full border border-gray-800 text-gray-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-center space-y-2 max-w-xl mx-auto">
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-[#00FFCC]/10 to-[#00E5FF]/10 border border-[#00FFCC]/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-[#00FFCC]">
                  <Sparkles className="h-3 w-3 animate-spin" />
                  <span>Planes Premium y Cuotas de Scraper</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">Planes de Pago con MercadoPago</h2>
                <p className="text-xs text-gray-400">
                  Desbloquea instantáneamente todo el potencial del extractor de reproductores. Elige la recarga o suscripción ilimitada que mejor se adapte a tus necesidades.
                </p>
              </div>

              {/* Grid of pricing cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                {PRICING_PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                      plan.popular
                        ? "bg-[#0F1C18] border-[#00FFCC]/30 shadow-[0_0_20px_rgba(0,255,204,0.06)]"
                        : "bg-black/50 border-gray-900"
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase bg-gradient-to-r from-[#00FFCC] to-[#00E5FF] text-black shadow-lg">
                        RECOMENDADO
                      </span>
                    )}

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black tracking-wider text-gray-500 uppercase bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">
                          {plan.badge}
                        </span>
                        <h3 className="text-sm font-extrabold text-white uppercase tracking-tight mt-2">{plan.title}</h3>
                        <p className="text-[10px] text-gray-400 leading-relaxed">{plan.description}</p>
                      </div>

                      <div className="flex items-baseline space-x-1.5 py-1 border-y border-gray-950/40">
                        <span className="text-[10px] text-gray-500 font-mono uppercase">{plan.currency}</span>
                        <span className="text-2xl font-black text-white tracking-tighter">${plan.price}</span>
                        <span className="text-[9px] text-gray-500 font-mono uppercase">
                          {plan.type === "annual" ? "/año" : plan.type === "lifetime" ? "/único" : "/pack"}
                        </span>
                      </div>

                      <ul className="space-y-2 text-[10px] text-gray-300">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start space-x-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#00FFCC] flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => handleOpenCheckout(plan)}
                      className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all mt-6 flex items-center justify-center space-x-2 border cursor-pointer ${
                        plan.popular
                          ? "bg-gradient-to-r from-[#00FFCC] to-[#00E5FF] text-black border-transparent hover:brightness-110"
                          : "bg-black border-gray-800 hover:border-[#00FFCC] text-white"
                      }`}
                    >
                      <Coins className="h-3.5 w-3.5" />
                      <span>Pagar con MercadoPago</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Secure payment banner */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-950 text-[10px] text-gray-500">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Conexión encriptada SSL de 256 bits
                </span>
                <span className="uppercase font-mono tracking-wider">
                  Procesado Oficialmente por MercadoPago S.A.
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILED MERCADOPAGO SIMULATOR PORTAL */}
      <AnimatePresence>
        {checkoutPlan && (
          <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-lg flex items-center justify-center p-4">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="max-w-md w-full bg-white text-gray-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              {/* MercadoPago Authentic Header Style */}
              <div className="bg-[#009EE3] p-5 text-white flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black tracking-widest uppercase opacity-75">Pasarela Oficial</span>
                    <h3 className="text-sm font-bold tracking-tight uppercase">Mercado Pago Checkout</h3>
                  </div>
                </div>
                <button
                  onClick={handleCloseCheckoutFlow}
                  className="p-1 bg-black/10 hover:bg-black/20 rounded-full text-white transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {!paymentSuccess ? (
                <div className="p-6 space-y-6">
                  {/* Purchase details */}
                  <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl space-y-2">
                    <span className="text-[8px] font-black tracking-widest uppercase text-gray-400">Detalle de tu Compra</span>
                    <h4 className="text-xs font-bold text-gray-800">{checkoutPlan.title}</h4>
                    <p className="text-[10px] text-gray-500">{checkoutPlan.description}</p>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200/60 mt-2">
                      <span className="text-[10px] text-gray-500 font-bold">Total a Transferir:</span>
                      <span className="text-base font-black text-[#009EE3]">${checkoutPlan.price} USD</span>
                    </div>
                  </div>

                  {/* MercadoPago Real Payment Link if generated */}
                  {isProcessingPayment ? (
                    <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <RefreshCw className="h-8 w-8 text-[#009EE3] animate-spin" />
                      <p className="text-xs font-bold text-gray-700">Generando pasarela de pago segura en MercadoPago...</p>
                      <p className="text-[10px] text-gray-400">Por favor, espera un momento...</p>
                    </div>
                  ) : mercadopagoUrl ? (
                    <div className="space-y-4">
                      <div className="p-5 bg-[#009EE3]/5 border border-[#009EE3]/20 rounded-2xl text-center space-y-3">
                        <span className="text-[9px] font-black tracking-widest uppercase text-[#009EE3] block">Transacción Segura de MercadoPago</span>
                        <p className="text-[11px] text-gray-600 leading-relaxed max-w-sm mx-auto">
                          Tu orden de pago ha sido generada exitosamente. Haz clic en el botón de abajo para completar el pago de forma segura en la plataforma de MercadoPago con tus tarjetas o saldo de cuenta.
                        </p>
                        
                        <a
                          href={mercadopagoUrl}
                          className="mt-3 inline-flex items-center gap-2.5 px-6 py-3.5 bg-[#009EE3] hover:bg-[#0089C4] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#009EE3]/20 transition-all w-full justify-center text-center cursor-pointer"
                        >
                          <CreditCard className="h-4 w-4" />
                          <span>Pagar con MercadoPago</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    preferenceError && (
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-[11px] leading-relaxed text-center space-y-2">
                        <p><strong>Error de Inicialización:</strong> {preferenceError}</p>
                        <p className="text-[10px] text-rose-600">Por favor, verifica la configuración de tus credenciales o inténtalo de nuevo en unos minutos.</p>
                      </div>
                    )
                  )}

                  <div className="space-y-3 text-center text-[10px] text-gray-500 max-w-xs mx-auto leading-normal">
                    <p>Una vez completado el pago en MercadoPago, serás redirigido de regreso automáticamente para activar tu recarga o plan.</p>
                  </div>

                  {/* Complete payment action */}
                  <div className="pt-2">
                    <button
                      onClick={handleCloseCheckoutFlow}
                      disabled={isProcessingPayment}
                      className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                    >
                      Cancelar y Volver
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center space-y-5">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                    <Check className="h-8 w-8 text-emerald-600" />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">¡Pago Aprobado por MercadoPago!</h3>
                    <p className="text-xs text-gray-500">
                      El pago se procesó de forma segura. Tus nuevos créditos o suscripción ilimitada han sido acreditados de inmediato en tu navegador.
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-1">
                    <span className="text-[8px] font-black tracking-widest text-gray-400 uppercase">Resumen de Cuenta Actualizado</span>
                    <div className="text-xs font-bold text-gray-800">
                      {checkoutPlan.type === "pack" ? (
                        <span>Nuevo saldo: {scrapesLeft} Extracciones</span>
                      ) : (
                        <span className="text-emerald-600 flex items-center justify-center gap-1.5 uppercase font-black">
                          <Sparkles className="h-4 w-4 fill-emerald-600" /> Acceso Ilimitado Activado ({checkoutPlan.title})
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleCloseCheckoutFlow}
                    className="w-full py-3 bg-[#009EE3] hover:bg-[#0089C4] text-white font-bold text-xs tracking-wider uppercase rounded-xl transition-all cursor-pointer"
                  >
                    Volver al Scraper
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
