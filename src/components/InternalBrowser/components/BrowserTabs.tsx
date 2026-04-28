 
import React, { useMemo } from 'react';
import { X, Pin, Plus } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TabProps {
  tab: any;
  isActive: boolean;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onTogglePin: (id: string) => void;
}

const SortableTab = ({ tab, isActive, onTabClick, onTabClose, onTogglePin }: TabProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const faviconUrl = useMemo(() => {
    try {
      const urlObj = new URL(tab.url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
    } catch (e) {
      return '';
    }
  }, [tab.url]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onTabClick(tab.id)}
      onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onTabClose(tab.id); } }}
      onDoubleClick={() => onTogglePin(tab.id)}
      className={`group relative flex items-center gap-2 px-4 py-2.5 text-[10px] cursor-pointer select-none border-r border-[var(--border-color)] transition-all duration-500 ${
        isActive 
          ? 'bg-[var(--bg-tertiary)] text-violet-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' 
          : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
      } ${tab.isPinned ? 'w-12 justify-center' : 'w-40'}`}
      title={tab.isPinned ? tab.title : undefined}
    >
      {isActive && (
        <>
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-50" />
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-violet-500 shadow-[0_0_15px_rgba(167,139,250,0.6)]" />
        </>
      )}
      {tab.isPinned ? (
        <div className={`p-1 rounded-lg ${isActive ? 'bg-violet-500/10 border border-violet-500/20' : ''}`}>
          {faviconUrl ? (
            <img src={faviconUrl} alt="favicon" className="w-3 h-3 rounded-sm" referrerPolicy="no-referrer" />
          ) : (
            <Pin size={12} className={`${isActive ? 'text-violet-400' : 'text-amber-500/50'} transform rotate-45 transition-transform duration-500 group-hover:scale-110`} />
          )}
        </div>
      ) : (
        <>
          {faviconUrl ? (
            <img src={faviconUrl} alt="favicon" className="w-3.5 h-3.5 rounded-sm shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-500 ${isActive ? 'bg-violet-500 shadow-[0_0_8px_rgba(167,139,250,0.8)] scale-110' : 'bg-[var(--text-secondary)]/30 group-hover:bg-violet-500/50'}`} />
          )}
          <span className={`truncate flex-1 font-black uppercase tracking-widest transition-colors duration-300 ${isActive ? 'text-violet-400' : 'opacity-70 group-hover:opacity-100'}`}>{tab.title}</span>
          <button 
            onClick={(e) => { e.stopPropagation(); onTabClose(tab.id); }} 
            className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all opacity-0 group-hover:opacity-100 active:scale-90"
          >
            <X size={10} />
          </button>
        </>
      )}
    </div>
  );
};

export const BrowserTabs = ({ tabs, activeTabId, onTabClick, onTabClose, onNewTab, onReorder, onTogglePin }: any) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((t: any) => t.id === active.id);
      const newIndex = tabs.findIndex((t: any) => t.id === over.id);
      onReorder(arrayMove(tabs, oldIndex, newIndex));
    }
  };

  return (
    <div className="flex items-center bg-[var(--bg-secondary)] border-b border-[var(--border-color)] overflow-x-auto scrollbar-none">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tabs.map((t: any) => t.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex items-center">
            {tabs.map((tab: any) => (
              <SortableTab 
                key={tab.id} 
                tab={tab} 
                isActive={tab.id === activeTabId} 
                onTabClick={onTabClick} 
                onTabClose={onTabClose}
                onTogglePin={onTogglePin}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button 
        onClick={onNewTab} 
        className="p-3 hover:bg-violet-500/10 text-[var(--text-secondary)] hover:text-violet-400 transition-all duration-300 active:scale-90 group"
        title="New Tab"
      >
        <Plus size={14} className="group-hover:rotate-90 transition-transform duration-500" />
      </button>
    </div>
  );
};
