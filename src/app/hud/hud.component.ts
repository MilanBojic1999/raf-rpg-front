import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {EventLogEntry, GameState} from '../models/data';
import {MATERIALS, materialImage, materialValue} from '../models/game-info';

interface BackpackRow {
  name: string;
  count: number;
  value: number;
  subtotal: number;
  image: string;
}

/** Event kind -> CSS class, so rewards and penalties are easy to tell apart in the log. */
const EVENT_CLASSES: { [kind: string]: string } = {
  LOOTED: 'ev-good',
  GIFTED: 'ev-good',
  SOLD: 'ev-gold',
  GATE_OPENED: 'ev-gold',
  ROBBED: 'ev-bad',
  OUT_OF_TIME: 'ev-bad',
  GATE_REFUSED: 'ev-warn',
  BLOCKED: 'ev-muted',
};

@Component({
  selector: 'app-hud',
  templateUrl: './hud.component.html',
  styleUrls: ['./hud.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HudComponent {
  @Input() state: GameState | null = null;
  @Input() mapNumber: number | null = null;
  @Input() log: EventLogEntry[] = [];

  get hasGate(): boolean {
    return !!this.state && this.state.gatePrice >= 0;
  }

  get goldPercent(): number {
    if (!this.state || this.state.gatePrice <= 0) {
      return this.state && this.state.gatePrice === 0 ? 100 : 0;
    }
    return Math.min(100, (100 * this.state.gold) / this.state.gatePrice);
  }

  get canOpenGate(): boolean {
    return this.hasGate && this.state!.gold >= this.state!.gatePrice;
  }

  get roundPercent(): number {
    if (!this.state || !this.state.maxRounds) {
      return 0;
    }
    return Math.min(100, (100 * this.state.round) / this.state.maxRounds);
  }

  get backpack(): BackpackRow[] {
    const inventory = this.state?.inventory || {};
    return Object.keys(inventory)
      .filter(name => inventory[name] > 0)
      .map(name => ({
        name,
        count: inventory[name],
        value: materialValue(name),
        subtotal: inventory[name] * materialValue(name),
        image: materialImage(name),
      }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  }

  get backpackValue(): number {
    return this.backpack.reduce((sum, row) => sum + row.subtotal, 0);
  }

  eventClass(event: string): string {
    return EVENT_CLASSES[event.split(' ')[0]] || '';
  }

  /** Material mentioned in an event, if any, so the log can show its icon. */
  eventMaterial(event: string): string | null {
    const word = event.split(' ').find(w => MATERIALS[w]);
    return word ? materialImage(word) : null;
  }

  trackByRound(_: number, entry: EventLogEntry): number {
    return entry.round;
  }

  trackByName(_: number, row: BackpackRow): string {
    return row.name;
  }
}
