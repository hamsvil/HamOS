import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, Terminal, Cpu, Settings, Sparkles, Brain, Zap, Shield, Activity, Eye, Key, Wifi, Glasses, X, Edit2, Check, Share2
} from 'lucide-react';
import { useAppDrawerStore, AppIconDefinition } from '../store/appDrawerStore';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface IconProps {
  size?: number | string;
  strokeWidth?: number;
  className?: string;
}

const iconMap: Record<string, React.FC<IconProps>> = {
  Globe: Globe as React.FC<IconProps>,
  Terminal: Terminal as React.FC<IconProps>,
  Cpu: Cpu as React.FC<IconProps>,
  Settings: Settings as React.FC<IconProps>,
  Sparkles: Sparkles as React.FC<IconProps>,
  Brain: Brain as React.FC<IconProps>,
  Zap: Zap as React.FC<IconProps>,
  Shield: Shield as React.FC<IconProps>,
  Activity: Activity as React.FC<IconProps>,
  Eye: Eye as React.FC<IconProps>,
  Key: Key as React.FC<IconProps>,
  Wifi: Wifi as React.FC<IconProps>,
  Glasses: Glasses as React.FC<IconProps>,
  Share2: Share2 as React.FC<IconProps>
};

interface SortableItemProps {
  app: AppIconDefinition;
  isActiveTab: boolean;
  isEditMode: boolean;
  onAppClick: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

function SortableAppIcon({ app, isActiveTab, isEditMode, onAppClick, onRename }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: app.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const IconComponent = iconMap[app.iconName] || Globe;
  const displayName = app.customName || app.originalName;
  const [isEditingName, setIsEditingName] = useState(false);
  const [editValue, setEditValue] = useState(displayName);

  const handleNameSubmit = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (editValue.trim() !== '') {
      onRename(app.id, editValue.trim());
    } else {
      setEditValue(displayName); // Revert if empty
    }
    setIsEditingName(false);
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="relative flex flex-col items-center justify-start gap-2 group w-full"
    >
      <button
        onClick={() => {
          if (!isEditMode) onAppClick(app.id);
        }}
        {...(isEditMode ? { ...attributes, ...listeners } : {})}
        className={`relative p-4 md:p-5 rounded-2xl md:rounded-[2rem] flex items-center justify-center transition-all duration-300 w-16 h-16 md:w-20 md:h-20 ${
          isActiveTab && !isEditMode
            ? 'bg-[#00ffcc]/20 text-[#00ffcc] shadow-[0_0_20px_rgba(0,255,204,0.3)] border border-[#00ffcc]/50 scale-105' 
            : 'bg-[var(--bg-tertiary)]/50 text-[var(--text-secondary)] border border-transparent hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-color)] hover:text-[var(--text-primary)]'
        } ${isEditMode ? 'cursor-grab active:cursor-grabbing hover:ring-2 ring-white/20' : 'hover:scale-105'}`}
      >
        <IconComponent size="2rem" strokeWidth={isActiveTab ? 2.5 : 2} />
        
        {/* Jiggle effect when in edit mode */}
        {isEditMode && (
          <div className="absolute inset-0 rounded-[inherit] animate-[wiggle_0.3s_ease-in-out_infinite_alternate]" />
        )}
      </button>

      {isEditingName && isEditMode ? (
        <form onSubmit={handleNameSubmit} className="absolute -bottom-6 z-20 bg-[var(--bg-secondary)] border border-[var(--border-color)] p-1 rounded-md flex items-center gap-1 shadow-xl">
           <input 
             autoFocus
             value={editValue}
             onChange={(e) => setEditValue(e.target.value)}
             onBlur={() => handleNameSubmit()}
             onKeyDown={(e) => { if (e.key === 'Escape') { setIsEditingName(false); setEditValue(displayName); } }}
             className="bg-transparent text-xs text-[var(--text-primary)] outline-none w-24 text-center"
           />
        </form>
      ) : (
        <div className="relative flex items-center justify-center w-full">
          <span 
            className={`text-xs md:text-sm font-medium text-center truncate w-full px-1 ${
              isActiveTab && !isEditMode ? 'text-[#00ffcc]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
            }`}
          >
            {displayName}
          </span>
          {isEditMode && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsEditingName(true); }}
              className="absolute -right-1 opacity-50 hover:opacity-100 text-[#00ffcc] p-1 bg-black/50 rounded-full"
            >
              <Edit2 size={10} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface AppDrawerProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function AppDrawer({ activeTab, setActiveTab }: AppDrawerProps) {
  const { apps, isOpen, setIsOpen, isEditMode, setIsEditMode, reorderApps, renameApp } = useAppDrawerStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requires 5px movement before dragging starts (helps allow clicking the edit button)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = apps.findIndex((app) => app.id === String(active.id));
      const newIndex = apps.findIndex((app) => app.id === String(over.id));
      reorderApps(arrayMove(apps, oldIndex, newIndex));
    }
  };

  const handleAppClick = (id: string) => {
    setActiveTab(id);
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90]"
          />
          
          {/* Drawer Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-20 bottom-24 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[600px] md:h-full max-h-[85vh] md:max-h-[70vh] md:top-auto bg-[var(--bg-secondary)]/90 backdrop-blur-2xl border border-[var(--border-color)] rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-[95] overflow-hidden flex flex-col pb-[env(safe-area-inset-bottom,20px)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-2 border-b border-white/5">
              <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                Applications
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isEditMode 
                      ? 'bg-[#00ffcc] text-black shadow-[0_0_10px_rgba(0,255,204,0.4)]' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {isEditMode ? <><Check size={14}/> Done</> : <><Edit2 size={14}/> Edit Layout</>}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin max-h-screen">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={apps.map(a => a.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 gap-y-8 gap-x-4">
                    {apps.map((app) => (
                      <SortableAppIcon 
                        key={app.id} 
                        app={app} 
                        isActiveTab={activeTab === app.id}
                        isEditMode={isEditMode}
                        onAppClick={handleAppClick}
                        onRename={renameApp}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
            
            {/* Interactive hint when editing */}
            <AnimatePresence>
              {isEditMode && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="text-center pb-4 text-xs text-[#00ffcc]"
                >
                  Drag to reorder. Click the edit icon to rename.
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
