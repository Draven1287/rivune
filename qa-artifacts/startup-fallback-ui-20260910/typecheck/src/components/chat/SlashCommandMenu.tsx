import { useEffect, useRef } from 'react';
import type { SlashCommand } from '../../types';

export interface SlashCommandMenuProps {
  commands: SlashCommand[];
  query: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export function filterSlashCommands(commands: SlashCommand[], query: string): SlashCommand[] {
  const search = query.replace(/^\//, '').trim().toLowerCase();
  return commands.filter(command => `${command.id} ${command.label} ${command.description}`.toLowerCase().includes(search));
}

export function slashCommandOptionId(command: SlashCommand): string {
  return `slash-command-option-${command.id}`;
}

/** ChatPanel keeps focus in its composer and routes keyboard navigation. */
export function SlashCommandMenu({ commands, query, activeIndex, onActiveIndexChange, onSelect, onClose }: SlashCommandMenuProps) {
  const options = filterSlashCommands(commands, query);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = options.length ? Math.max(0, Math.min(activeIndex, options.length - 1)) : -1;
  useEffect(() => {
    if (options.length && activeIndex !== selected) onActiveIndexChange(selected);
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [activeIndex, selected, query, options.length, onActiveIndexChange]);

  return <div className="overflow-hidden rounded-xl border border-white/15 bg-zinc-900 shadow-xl" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[11px] text-zinc-400"><span>Commands · demo directives</span><span aria-hidden="true">↑ ↓ select · Esc close</span></div>
    <div ref={listRef} id="slash-command-menu" role="listbox" aria-label="Slash commands" className="max-h-64 overflow-y-auto p-1">
      {options.map((command, index) => <div key={command.id} id={slashCommandOptionId(command)} role="option" aria-selected={index === selected} onPointerMove={() => onActiveIndexChange(index)} onMouseDown={event => event.preventDefault()} onClick={() => onSelect(command)} className={`cursor-pointer rounded-lg px-3 py-2 ${index === selected ? 'bg-white/10 text-white' : 'text-zinc-300'}`}>
        <p className="text-sm font-medium">{command.label}</p><p className="mt-0.5 text-xs text-zinc-400">{command.description}</p>
      </div>)}
    </div>
    {options.length === 0 && <p role="status" className="px-4 py-3 text-xs text-zinc-400">No matching commands. Press Escape to keep writing.</p>}
  </div>;
}
