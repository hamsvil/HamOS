import { useState } from 'react';

export interface Persona {
  id: string;
  name: string;
  avatar: string;
  description: string;
  systemPrompt: string;
}

export function useAIHubSession() {
  const [activePersona, setActivePersona] = useState<Persona>({
    id: 'default',
    name: 'General Assistant',
    avatar: '🤖',
    description: 'A helpful general-purpose AI assistant.',
    systemPrompt: 'You are a helpful AI assistant.'
  });

  const [personas] = useState<Persona[]>([
    {
      id: 'default',
      name: 'General Assistant',
      avatar: '🤖',
      description: 'A helpful general-purpose AI assistant.',
      systemPrompt: 'You are a helpful AI assistant.'
    },
    {
      id: 'coder',
      name: 'Code Expert',
      avatar: '💻',
      description: 'Specialized in programming and software architecture.',
      systemPrompt: 'You are an expert software engineer.'
    },
    {
      id: 'creative',
      name: 'Creative Writer',
      avatar: '✍️',
      description: 'Helps with creative writing and storytelling.',
      systemPrompt: 'You are a creative writer.'
    }
  ]);

  return {
    activePersona,
    setActivePersona,
    personas
  };
}
