import { weaver } from './personas/weaver';
import { logicGate } from './personas/logicGate';
import { sentinel } from './personas/sentinel';
import { accelerator } from './personas/accelerator';
import { archivist } from './personas/archivist';
import { inquisitor } from './personas/inquisitor';
import { mechanic } from './personas/mechanic';
import { scribe } from './personas/scribe';
import { eternalMover } from './personas/eternalMover';
import { deepAgentic } from './personas/deepAgentic';
import { Persona } from '../core/types';

export const PERSONA_REGISTRY: Record<string, Persona> = {
  weaver,
  logic: logicGate,
  sentinel,
  accelerator,
  archivist,
  inquisitor,
  mechanic,
  scribe,
  'eternal-mover': eternalMover,
  'deep-agentic': deepAgentic
};

export function getPersona(id: string): Persona | undefined {
  return PERSONA_REGISTRY[id];
}
