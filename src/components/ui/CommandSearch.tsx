import {
  useState,
  useMemo,
  useEffect,
  useRef,
  type KeyboardEvent,
  type FC,
} from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  User,
  Bell,
  HelpCircle,
  ArrowRight,
  Ship,
  Compass,
  Layers,
  MapPin,
  TrendingUp,
  Sliders,
  FileText,
  Anchor,
  Calendar,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  section: 'Navigation' | 'Fleet Flagships' | 'Settings & Help';
  icon: ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandSearchProps {
  items?: CommandItem[];
  onSelectTab?: (tab: any) => void;
  onOpenProfile?: () => void;
  onOpenAbout?: () => void;
  onOpenNotifications?: () => void;
}

export const CommandSearch: FC<CommandSearchProps> = ({
  items,
  onSelectTab,
  onOpenProfile,
  onOpenAbout,
  onOpenNotifications,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Default maritime navigation & command items
  const defaultItems: CommandItem[] = useMemo(() => [
    {
      id: 'nav-overview',
      title: 'Fleet Overview',
      subtitle: 'Command matrix & telemetry metrics',
      section: 'Navigation',
      icon: <Layers size={16} />,
      shortcut: '⌘ 1',
      action: () => onSelectTab?.('overview'),
    },
    {
      id: 'nav-orders',
      title: 'Orders Flow & Logistics',
      subtitle: 'Commercial consignments & vessel scoring',
      section: 'Navigation',
      icon: <FileText size={16} />,
      shortcut: '⌘ 2',
      action: () => onSelectTab?.('orders'),
    },
    {
      id: 'nav-schedule',
      title: 'Fleet Schedule',
      subtitle: 'Gantt timeline & operational berthing matrix',
      section: 'Navigation',
      icon: <Calendar size={16} />,
      shortcut: '⌘ S',
      action: () => onSelectTab?.('schedule'),
    },
    {
      id: 'nav-routes',
      title: 'Route Optimization',
      subtitle: 'Quantum pathfinding & sea weather',
      section: 'Navigation',
      icon: <TrendingUp size={16} />,
      shortcut: '⌘ 3',
      action: () => onSelectTab?.('routes'),
    },
    {
      id: 'nav-layout',
      title: 'Cargo & 2D Trim Drag',
      subtitle: 'Hold hydrodynamics & metacentric equilibrium',
      section: 'Navigation',
      icon: <Sliders size={16} />,
      action: () => onSelectTab?.('layout'),
    },
    {
      id: 'nav-map',
      title: 'Live Map (Global AIS)',
      subtitle: 'Real-time positioning & radar telemetry',
      section: 'Navigation',
      icon: <MapPin size={16} />,
      action: () => onSelectTab?.('map'),
    },
    {
      id: 'nav-whatif',
      title: 'What-If Risk Simulation',
      subtitle: 'Monte Carlo disruption & cost impact',
      section: 'Navigation',
      icon: <Compass size={16} />,
      action: () => onSelectTab?.('whatif'),
    },
    {
      id: 'nav-captains',
      title: 'Captains Bridge Dispatch',
      subtitle: 'Satellite communications & assignments',
      section: 'Navigation',
      icon: <Anchor size={16} />,
      action: () => onSelectTab?.('captains'),
    },
    {
      id: 'vessel-green-horizon',
      title: 'MV Green Horizon',
      subtitle: 'LNG Carrier · Arabian Sea · 98% Fit',
      section: 'Fleet Flagships',
      icon: <Ship size={16} />,
      action: () => onSelectTab?.('vessel'),
    },
    {
      id: 'vessel-neptune-pride',
      title: 'MV Neptune Pride',
      subtitle: 'Container Ship · Indian Ocean · 63% Fit',
      section: 'Fleet Flagships',
      icon: <Ship size={16} />,
      action: () => onSelectTab?.('vessel'),
    },
    {
      id: 'vessel-aurora-breeze',
      title: 'MV Aurora Breeze',
      subtitle: 'Ro-Ro Multipurpose · Port of Rotterdam · 43% Fit',
      section: 'Fleet Flagships',
      icon: <Ship size={16} />,
      action: () => onSelectTab?.('vessel'),
    },
    {
      id: 'vessel-quantum-star',
      title: 'MV Quantum Star',
      subtitle: 'Chemical Tanker · Gulf of Oman · 42% Fit',
      section: 'Fleet Flagships',
      icon: <Ship size={16} />,
      action: () => onSelectTab?.('vessel'),
    },
    {
      id: 'settings-profile',
      title: 'Edit Operator Profile',
      subtitle: 'Manage credentials & working hours',
      section: 'Settings & Help',
      icon: <User size={16} />,
      shortcut: '⌘ P',
      action: () => onOpenProfile?.(),
    },
    {
      id: 'settings-notifications',
      title: 'Storm & CII Advisories',
      subtitle: 'Active fleet alerts & telemetry logs',
      section: 'Settings & Help',
      icon: <Bell size={16} />,
      action: () => onOpenNotifications?.(),
    },
    {
      id: 'settings-about',
      title: 'About GreenFleet OS',
      subtitle: 'SIH 2026 flagship architecture details',
      section: 'Settings & Help',
      icon: <HelpCircle size={16} />,
      action: () => onOpenAbout?.(),
    },
  ], [onSelectTab, onOpenProfile, onOpenAbout, onOpenNotifications]);

  const activeItems = items || defaultItems;

  useEffect(() => {
    if (isOpen) {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: any) => {
      // Support 'f' or 'Ctrl+K' / 'Cmd+K' to open
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      const isF =
        e.key.toLowerCase() === 'f' &&
        !isOpen &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA';

      if (isCmdK || isF) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return activeItems;
    const q = query.toLowerCase();
    return activeItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );
  }, [query, activeItems]);

  useEffect(() => {
    requestAnimationFrame(() => setActiveIndex(0));
  }, [query]);

  const sections = useMemo(() => {
    const groups: { [key: string]: CommandItem[] } = {};
    filteredItems.forEach((item) => {
      if (!groups[item.section]) groups[item.section] = [];
      groups[item.section].push(item);
    });

    return Object.entries(groups).map(([name, groupItems]) => ({
      name,
      items: groupItems,
    }));
  }, [filteredItems]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(
        (prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1)
      );
    } else if (e.key === 'Enter') {
      const selectedItem = filteredItems[activeIndex];
      if (selectedItem) {
        selectedItem.action();
        setIsOpen(false);
      }
    }
  };

  const sharedTransition = {
    type: 'tween' as const,
    ease: 'easeOut' as const,
    duration: 0.15,
  };

  return (
    <>
      <AnimatePresence mode="popLayout">
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="relative z-50 h-9 w-36 sm:w-52 md:w-60">
        <AnimatePresence mode="popLayout">
          {!isOpen ? (
            <motion.button
              key="trigger"
              layoutId="command-pallete"
              onClick={() => setIsOpen(true)}
              className="group flex h-9 w-full items-center gap-2 overflow-hidden rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-white/80 shadow-xs hover:bg-white/15 hover:text-white transition-all cursor-pointer"
              transition={sharedTransition}
              title="Search vessels, routes, orders, or profile (Press 'F')"
            >
              <motion.div layoutId="search-icon" transition={sharedTransition}>
                <Search size={14} className="text-[#AFD2FA]" />
              </motion.div>
              <motion.span
                layoutId="search-text"
                transition={sharedTransition}
                className="text-xs font-medium truncate font-sans"
              >
                Find module or ship...
              </motion.span>
              <motion.kbd
                layoutId="search-shortcut"
                transition={sharedTransition}
                className="ml-auto rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#AFD2FA] group-hover:border-[#AFD2FA] transition-colors"
              >
                F
              </motion.kbd>
            </motion.button>
          ) : (
            <motion.div
              layoutId="command-pallete"
              transition={sharedTransition}
              className="absolute -top-1 -right-2 sm:-right-8 z-50 flex h-96 w-[340px] sm:w-[440px] flex-col overflow-hidden rounded-2xl border border-[#182350] bg-white shadow-2xl text-[#182350]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Header */}
              <div className="flex items-center border-b border-[#ECE8DF] px-4 py-3 bg-[#FAFAF5]">
                <motion.div layoutId="search-icon" transition={sharedTransition}>
                  <Search
                    size={16}
                    className="mr-3 text-[#182350]"
                    strokeWidth={2.5}
                  />
                </motion.div>
                <div className="relative flex flex-1 items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    className="w-full bg-transparent text-sm font-semibold text-[#182350] outline-none placeholder:text-[#737985]"
                    placeholder="Search routes, ships, orders, or actions..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                <div className="ml-2 flex items-center gap-1.5">
                  <motion.span
                    layoutId="search-shortcut"
                    transition={sharedTransition}
                    className="rounded border border-[#D1D5DB] bg-white px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#737985]"
                  >
                    Esc
                  </motion.span>
                </div>
              </div>

              {/* Results Body */}
              <div className="flex-1 overflow-y-auto p-2 divide-y divide-[#ECE8DF]/50">
                {filteredItems.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#737985] font-sans">
                    No results found for "{query}"
                  </div>
                ) : (
                  <div className="space-y-3 py-1">
                    {sections.map((section) => (
                      <div key={section.name} className="space-y-1">
                        <h3 className="px-3 py-1 text-[10px] font-extrabold tracking-wider text-[#737985] uppercase font-mono">
                          {section.name}
                        </h3>
                        <div className="space-y-0.5">
                          {section.items.map((item) => {
                            const globalIndex = filteredItems.findIndex(
                              (fi) => fi.id === item.id
                            );
                            const isActive = globalIndex === activeIndex;

                            return (
                              <button
                                key={item.id}
                                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-all cursor-pointer ${
                                  isActive
                                    ? 'bg-[#EAF4FE] text-[#182350] shadow-xs'
                                    : 'text-[#3F4654] hover:bg-[#FAFAF5] hover:text-[#182350]'
                                }`}
                                onMouseEnter={() => setActiveIndex(globalIndex)}
                                onClick={() => {
                                  item.action();
                                  setIsOpen(false);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`p-1 rounded-lg ${
                                      isActive
                                        ? 'bg-[#182350] text-white'
                                        : 'bg-[#FAFAF5] text-[#737985] group-hover:text-[#182350]'
                                    }`}
                                  >
                                    {item.icon}
                                  </span>
                                  <div>
                                    <div className="text-xs font-bold leading-snug">
                                      {item.title}
                                    </div>
                                    {item.subtitle && (
                                      <div className="text-[11px] text-[#737985] font-sans">
                                        {item.subtitle}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {item.shortcut ? (
                                  <kbd
                                    className={`rounded border px-1.5 py-0.5 text-[9px] font-mono font-bold ${
                                      isActive
                                        ? 'border-[#AFD2FA] bg-white text-[#182350]'
                                        : 'border-transparent bg-transparent text-[#737985]'
                                    }`}
                                  >
                                    {item.shortcut}
                                  </kbd>
                                ) : (
                                  <ArrowRight
                                    size={12}
                                    className={`opacity-0 transition-opacity ${
                                      isActive ? 'opacity-100 text-[#182350]' : ''
                                    }`}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer hint */}
              <div className="px-4 py-2 border-t border-[#ECE8DF] bg-[#FAFAF5] text-[10px] text-[#737985] flex items-center justify-between font-mono">
                <span>Navigate with ↑ ↓ · Press Enter to jump</span>
                <span>Press Esc to close</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default CommandSearch;
