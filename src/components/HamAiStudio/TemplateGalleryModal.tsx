 
// @ts-nocheck
import React from 'react';
import { X, Layout, ShoppingCart, Briefcase, FileText, Smartphone, Zap } from 'lucide-react';

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templatePrompt: string) => void;
}

export default function TemplateGalleryModal({ isOpen, onClose, onSelectTemplate }: TemplateGalleryModalProps) {
  if (!isOpen) return null;

  const templates = [
    {
      id: 'blank',
      name: 'Blank Project',
      icon: <FileText size={24} />,
      desc: 'Start from scratch with a minimal setup.',
      prompt: 'Create a blank project with minimal configuration.'
    },
    {
      id: 'ecommerce',
      name: 'E-Commerce App',
      icon: <ShoppingCart size={24} />,
      desc: 'Full store with product list, cart, and checkout UI.',
      prompt: 'Create a complete E-Commerce application with Product Listing, Shopping Cart, and Checkout pages. Implement real logic for cart management and data handling.'
    },
    {
      id: 'portfolio',
      name: 'Personal Portfolio',
      icon: <Briefcase size={24} />,
      desc: 'Showcase your work, skills, and contact info.',
      prompt: 'Create a professional Personal Portfolio website with Hero section, About Me, Projects Gallery, and Contact form.'
    },
    {
      id: 'blog',
      name: 'Blog / News App',
      icon: <Layout size={24} />,
      desc: 'Content-focused app with categories and reading mode.',
      prompt: 'Create a Blog application with a list of posts, categories, and a detailed article reading view.'
    },
    {
      id: 'social',
      name: 'Social Media Feed',
      icon: <Smartphone size={24} />,
      desc: 'Feed, profile, and post interactions.',
      prompt: 'Create a Social Media Feed application with user profiles, post creation, likes, and comments UI.'
    },
    {
      id: 'todo',
      name: 'Productivity / To-Do',
      icon: <Zap size={24} />,
      desc: 'Task management with categories and progress tracking.',
      prompt: 'Create a robust To-Do List application with task creation, editing, deletion, and completion status. Include local storage persistence.'
    },
  ];

  return (
    <div className="fixed inset-0 bg-[var(--bg-primary)]/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-[var(--border-color)] flex flex-col max-h-[80vh]">
        <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-tertiary)]">
          <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 text-sm">
            <Layout size={16} className="text-blue-400" />
            Project Templates
          </h3>
          <button onClick={onClose} className="p-1 text-[var(--text-secondary)] hover:text-blue-400 rounded-full hover:bg-[var(--bg-secondary)] transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => {
                onSelectTemplate(template.prompt);
                onClose();
              }}
              className="flex flex-col items-start p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] hover:border-blue-500/50 transition-all group text-left"
            >
              <div className="p-2.5 rounded-md bg-[var(--bg-tertiary)] text-blue-400 group-hover:bg-blue-500/20 mb-2 transition-colors">
                {React.cloneElement(template.icon as React.ReactElement, { size: 20 })}
              </div>
              <h4 className="font-medium text-[var(--text-primary)] mb-1 text-sm">{template.name}</h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{template.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
