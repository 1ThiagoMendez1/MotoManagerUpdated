'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import { X, ChevronLeft, ChevronRight, CheckCheck, Sparkles } from 'lucide-react';

interface TourHandlerProps {
  role?: string;
}

interface Step {
  element: string;
  popover: {
    title: string;
    description: string;
    side?: string;
    align?: string;
  };
  requiredPermission?: string;
}

interface HighlightState {
  rect: DOMRect;
}

const ALL_STEPS: Step[] = [
  {
    element: '#tour-greeting',
    popover: {
      title: '¡Bienvenido a MotoManager! 🏍️',
      description: 'Este es tu panel principal. Desde aquí accedes a todos los módulos para gestionar tu taller. ¡Te damos un recorrido rápido!',
      side: 'bottom',
    },
  },
  {
    element: '#tour-work-orders',
    popover: {
      title: '📋 Órdenes de Trabajo',
      description: 'El corazón de tu taller. Crea, gestiona y da seguimiento a todas las reparaciones y servicios activos desde un solo lugar.',
      side: 'bottom',
    },
    requiredPermission: '/work-orders',
  },
  {
    element: '#tour-dashboard',
    popover: {
      title: '📊 Dashboard',
      description: 'Visualiza gráficamente el flujo de caja, repuestos más vendidos, alertas y recordatorios. Tu centro de análisis financiero.',
      side: 'bottom',
    },
    requiredPermission: '/dashboard',
  },
  {
    element: '#tour-customers',
    popover: {
      title: '👥 Clientes',
      description: 'Gestiona tu directorio de clientes, su historial de servicios y sus datos de contacto en un solo lugar.',
      side: 'right',
    },
    requiredPermission: '/customers',
  },
  {
    element: '#tour-motorcycles',
    popover: {
      title: '🏍️ Motocicletas',
      description: 'Lleva el historial vehicular completo de cada moto. Consulta servicios anteriores, repuestos usados y más.',
      side: 'left',
    },
    requiredPermission: '/motorcycles',
  },
  {
    element: '#tour-inventory',
    popover: {
      title: '📦 Inventario',
      description: 'Controla tu stock de repuestos y accesorios. Recibe alertas cuando algún artículo esté por agotarse.',
      side: 'top',
    },
    requiredPermission: '/inventory',
  },
  {
    element: '#tour-sales',
    popover: {
      title: '💰 Ventas',
      description: 'Registra ventas de repuestos y servicios, gestiona el punto de caja y consulta el historial de transacciones.',
      side: 'top',
    },
    requiredPermission: '/sales',
  },
  {
    element: '#tour-technicians',
    popover: {
      title: '🔧 Técnicos',
      description: 'Monitorea el desempeño y la carga de trabajo de cada técnico en tu taller.',
      side: 'top',
    },
    requiredPermission: '/technicians',
  },
  {
    element: '#tour-team',
    popover: {
      title: '🔑 Permisos',
      description: 'Administra los accesos al sistema. Añade colaboradores y define qué puede ver y hacer cada uno.',
      side: 'top',
    },
    requiredPermission: '/team',
  },
  {
    element: '#tour-tickets',
    popover: {
      title: '🆘 Soporte',
      description: 'Centro de ayuda y tickets. Si necesitas asistencia técnica, aquí puedes crear y hacer seguimiento a tus solicitudes.',
      side: 'top',
    },
    requiredPermission: '/tickets',
  },
];

const POPOVER_W = 350;
const POPOVER_H = 220;
const MARGIN = 16;
const PADDING = 12;

function computeLayout(rect: DOMRect, preferredSide: string) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  const spaceBottom = vh - rect.bottom;
  const spaceTop = rect.top;
  const spaceRight = vw - rect.right;
  const spaceLeft = rect.left;

  let side = preferredSide;

  // Auto-flip if preferred side has insufficient space
  if (side === 'bottom' && spaceBottom < POPOVER_H + MARGIN * 2) {
    side = spaceTop >= POPOVER_H + MARGIN * 2 ? 'top' : 'bottom';
  } else if (side === 'top' && spaceTop < POPOVER_H + MARGIN * 2) {
    side = spaceBottom >= POPOVER_H + MARGIN * 2 ? 'bottom' : 'top';
  } else if (side === 'right' && spaceRight < POPOVER_W + MARGIN * 2) {
    side = spaceLeft >= POPOVER_W + MARGIN * 2 ? 'left' : 'bottom';
  } else if (side === 'left' && spaceLeft < POPOVER_W + MARGIN * 2) {
    side = spaceRight >= POPOVER_W + MARGIN * 2 ? 'right' : 'bottom';
  }

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  let popTop = 0;
  let popLeft = 0;
  let arrowFrom = { x: 0, y: 0 };
  let arrowTo = { x: 0, y: 0 };

  if (side === 'bottom') {
    popTop = rect.bottom + MARGIN;
    popLeft = Math.max(PADDING, Math.min(cx - POPOVER_W / 2, vw - POPOVER_W - PADDING));
    const arrowX = cx - popLeft;
    const arrowXClamped = Math.max(24, Math.min(arrowX, POPOVER_W - 24));
    arrowFrom = { x: popLeft + arrowXClamped, y: rect.bottom + MARGIN - 2 };
    arrowTo = { x: cx, y: rect.bottom + 4 };
  } else if (side === 'top') {
    popTop = rect.top - POPOVER_H - MARGIN;
    popLeft = Math.max(PADDING, Math.min(cx - POPOVER_W / 2, vw - POPOVER_W - PADDING));
    const arrowX = cx - popLeft;
    const arrowXClamped = Math.max(24, Math.min(arrowX, POPOVER_W - 24));
    arrowFrom = { x: popLeft + arrowXClamped, y: rect.top - MARGIN + 2 };
    arrowTo = { x: cx, y: rect.top - 4 };
  } else if (side === 'right') {
    popTop = Math.max(PADDING, Math.min(cy - POPOVER_H / 2, vh - POPOVER_H - PADDING));
    popLeft = rect.right + MARGIN;
    arrowFrom = { x: rect.right + MARGIN - 2, y: cy };
    arrowTo = { x: rect.right + 4, y: cy };
  } else {
    // left
    popTop = Math.max(PADDING, Math.min(cy - POPOVER_H / 2, vh - POPOVER_H - PADDING));
    popLeft = rect.left - POPOVER_W - MARGIN;
    arrowFrom = { x: rect.left - MARGIN + 2, y: cy };
    arrowTo = { x: rect.left - 4, y: cy };
  }

  popTop = Math.max(PADDING, Math.min(popTop, vh - POPOVER_H - PADDING));
  popLeft = Math.max(PADDING, Math.min(popLeft, vw - POPOVER_W - PADDING));

  return { side, popTop, popLeft, arrowFrom, arrowTo };
}

export function TourHandler({ role = 'owner' }: TourHandlerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasRunTour = useRef(false);

  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<Step[]>([]);
  const [highlight, setHighlight] = useState<HighlightState | null>(null);
  const [layout, setLayout] = useState<ReturnType<typeof computeLayout> | null>(null);
  const [popoverKey, setPopoverKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateHighlight = useCallback((step: Step) => {
    if (!step) return;

    const tryFind = (attempt: number) => {
      const el = document.querySelector(step.element);
      if (!el) {
        if (attempt < 5) {
          setTimeout(() => tryFind(attempt + 1), 120);
        }
        return;
      }

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        const fresh = document.querySelector(step.element);
        if (!fresh) return;
        const rect = fresh.getBoundingClientRect();
        const side = step.popover.side || 'bottom';
        setHighlight({ rect });
        setLayout(computeLayout(rect, side));
      }, 350);
    };

    tryFind(0);
  }, []);

  useEffect(() => {
    if (searchParams.get('tour') === 'true' && !hasRunTour.current) {
      hasRunTour.current = true;

      const filtered = ALL_STEPS.filter(s => {
        if (!s.requiredPermission) return true;
        return hasPermission(role, s.requiredPermission);
      });

      setSteps(filtered);

      setTimeout(() => {
        setActive(true);
        setCurrentStep(0);
        setPopoverKey(0);
        updateHighlight(filtered[0]);
      }, 700);
    }
  }, [searchParams, role, updateHighlight]);

  useEffect(() => {
    if (active && steps[currentStep]) {
      updateHighlight(steps[currentStep]);
    }
  }, [currentStep, active, steps, updateHighlight]);

  useEffect(() => {
    if (!active || !steps[currentStep]) return;
    const onResize = () => updateHighlight(steps[currentStep]);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active, currentStep, steps, updateHighlight]);

  const handleClose = () => {
    setActive(false);
    setHighlight(null);
    setLayout(null);
    router.replace('/');
  };

  const goToStep = (next: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setHighlight(null);
    setLayout(null);
    setPopoverKey(k => k + 1);
    setTimeout(() => {
      setCurrentStep(next);
      setIsTransitioning(false);
    }, 100);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  if (!active || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const progressPct = ((currentStep + 1) / steps.length) * 100;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  const r = highlight ? highlight.rect : null;
  const pad = 10;
  const rr = 14;

  const svgHole = r
    ? `M 0 0 L ${vw} 0 L ${vw} ${vh} L 0 ${vh} Z ` +
      `M ${r.left - pad + rr} ${r.top - pad} ` +
      `L ${r.right + pad - rr} ${r.top - pad} ` +
      `Q ${r.right + pad} ${r.top - pad} ${r.right + pad} ${r.top - pad + rr} ` +
      `L ${r.right + pad} ${r.bottom + pad - rr} ` +
      `Q ${r.right + pad} ${r.bottom + pad} ${r.right + pad - rr} ${r.bottom + pad} ` +
      `L ${r.left - pad + rr} ${r.bottom + pad} ` +
      `Q ${r.left - pad} ${r.bottom + pad} ${r.left - pad} ${r.bottom + pad - rr} ` +
      `L ${r.left - pad} ${r.top - pad + rr} ` +
      `Q ${r.left - pad} ${r.top - pad} ${r.left - pad + rr} ${r.top - pad} Z`
    : `M 0 0 L ${vw} 0 L ${vw} ${vh} L 0 ${vh} Z`;

  return (
    <>
      <style>{`
        @keyframes tourPopoverIn {
          from { opacity: 0; transform: scale(0.93) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes tourArrowBounce {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-5px); }
        }
        @keyframes tourSpotGlow {
          0%, 100% { box-shadow: 0 0 0 0px rgba(99,179,237,0.4), 0 0 24px 4px rgba(99,179,237,0.15); }
          50%       { box-shadow: 0 0 0 6px rgba(99,179,237,0.12), 0 0 32px 8px rgba(99,179,237,0.08); }
        }
        .tour-btn-next:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(59,130,246,0.55) !important;
        }
        .tour-btn-prev:hover {
          background: rgba(255,255,255,0.13) !important;
          color: #cbd5e1 !important;
        }
        .tour-dot:hover {
          transform: scale(1.3);
        }
      `}</style>

      {/* Dark overlay with cutout */}
      <svg
        className="fixed inset-0 z-[9998] pointer-events-auto"
        style={{ width: '100vw', height: '100vh' }}
        onClick={handleClose}
      >
        <path
          d={svgHole}
          fill="rgba(0,0,0,0.65)"
          fillRule="evenodd"
        />
      </svg>

      {/* Spotlight glow border */}
      {r && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: r.top - pad,
            left: r.left - pad,
            width: r.width + pad * 2,
            height: r.height + pad * 2,
            borderRadius: rr,
            border: '2px solid rgba(96,165,250,0.8)',
            animation: 'tourSpotGlow 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Animated Arrow pointing to element */}
      {layout && r && (
        <div
          className="fixed z-[10000] pointer-events-none"
          style={{ animation: 'tourArrowBounce 1.5s ease-in-out infinite', top: 0, left: 0 }}
        >
          <svg
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              pointerEvents: 'none',
              overflow: 'visible',
            }}
          >
            <defs>
              <marker id="arrowHead" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#60a5fa" />
              </marker>
              <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <line
              x1={layout.arrowFrom.x}
              y1={layout.arrowFrom.y}
              x2={layout.arrowTo.x}
              y2={layout.arrowTo.y}
              stroke="url(#arrowGrad)"
              strokeWidth="2.5"
              strokeDasharray="7 4"
              markerEnd="url(#arrowHead)"
              style={{ filter: 'drop-shadow(0 0 5px rgba(96,165,250,0.6))' }}
            />
          </svg>
        </div>
      )}

      {/* Popover Card */}
      {layout && (
        <div
          key={popoverKey}
          className="fixed z-[10000] pointer-events-auto"
          style={{
            top: layout.popTop,
            left: layout.popLeft,
            width: POPOVER_W,
            animation: 'tourPopoverIn 0.3s cubic-bezier(0.34,1.4,0.64,1) both',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(13,20,38,0.97) 0%, rgba(25,35,55,0.95) 100%)',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.11)',
              borderRadius: 22,
              boxShadow:
                '0 24px 64px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.07) inset, 0 0 0 1px rgba(99,179,237,0.12)',
              overflow: 'hidden',
            }}
          >
            {/* Top gradient accent */}
            <div
              style={{
                height: 3,
                background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
              }}
            />

            <div style={{ padding: '18px 20px 16px' }}>
              {/* Header row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(59,130,246,0.35), rgba(139,92,246,0.35))',
                      border: '1px solid rgba(99,179,237,0.3)',
                      borderRadius: 10,
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles size={13} style={{ color: '#93c5fd' }} />
                  </div>
                  <h3
                    style={{
                      color: '#f1f5f9',
                      fontWeight: 700,
                      fontSize: 14.5,
                      lineHeight: 1.3,
                      margin: 0,
                    }}
                  >
                    {step.popover.title}
                  </h3>
                </div>

                <button
                  onClick={handleClose}
                  title="Cerrar tour"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: 8,
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#64748b',
                    flexShrink: 0,
                    transition: 'all 0.18s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.13)';
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = '#64748b';
                  }}
                >
                  <X size={13} />
                </button>
              </div>

              {/* Description */}
              <p
                style={{
                  color: '#94a3b8',
                  fontSize: 13,
                  lineHeight: 1.65,
                  margin: '0 0 14px 0',
                }}
              >
                {step.popover.description}
              </p>

              {/* Step dots */}
              <div style={{ display: 'flex', gap: 5, marginBottom: 12, alignItems: 'center' }}>
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className="tour-dot"
                    onClick={() => !isTransitioning && goToStep(i)}
                    title={`Paso ${i + 1}`}
                    style={{
                      width: i === currentStep ? 22 : 6,
                      height: 6,
                      borderRadius: 99,
                      background:
                        i === currentStep
                          ? 'linear-gradient(90deg,#3b82f6,#8b5cf6)'
                          : i < currentStep
                          ? 'rgba(96,165,250,0.45)'
                          : 'rgba(255,255,255,0.10)',
                      transition: 'all 0.28s ease',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                ))}
                <span
                  style={{
                    color: '#475569',
                    fontSize: 11,
                    marginLeft: 'auto',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {currentStep + 1} / {steps.length}
                </span>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 99,
                  height: 3,
                  marginBottom: 14,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progressPct}%`,
                    background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)',
                    borderRadius: 99,
                    transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
                  }}
                />
              </div>

              {/* Footer buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div>
                  {currentStep > 0 && (
                    <button
                      className="tour-btn-prev"
                      onClick={handlePrev}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        borderRadius: 10,
                        padding: '7px 13px',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        fontSize: 12.5,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.18s',
                      }}
                    >
                      <ChevronLeft size={13} /> Anterior
                    </button>
                  )}
                </div>

                <button
                  className="tour-btn-next"
                  onClick={handleNext}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 20px',
                    cursor: 'pointer',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: '0 4px 18px rgba(59,130,246,0.4)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  {isLast ? (
                    <><CheckCheck size={14} /> ¡Entendido!</>
                  ) : (
                    <>Siguiente <ChevronRight size={14} /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
