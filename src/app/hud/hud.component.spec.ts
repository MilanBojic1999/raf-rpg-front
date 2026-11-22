import {ComponentFixture, TestBed} from '@angular/core/testing';

import {HudComponent} from './hud.component';
import {GameState} from '../models/data';

describe('HudComponent', () => {
  let component: HudComponent;
  let fixture: ComponentFixture<HudComponent>;

  const state: GameState = {
    gameId: 'default', matrix: [['P']], inventory: {Rice: 5, Gem: 3, Grass: 2},
    gold: 30, round: 12, done: false, won: false, events: [], gatePrice: 50,
    merchantGold: 50, seed: 1, maxRounds: 500,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({declarations: [HudComponent]}).compileComponents();
    fixture = TestBed.createComponent(HudComponent);
    component = fixture.componentInstance;
    component.state = state;
    fixture.detectChanges();
  });

  it('sorts the backpack by value and sums it', () => {
    expect(component.backpack.map(r => r.name)).toEqual(['Gem', 'Rice', 'Grass']);
    expect(component.backpackValue).toBe(3 * 20 + 5 * 4);
  });

  it('tracks progress towards the gate price', () => {
    expect(component.goldPercent).toBe(60);
    expect(component.canOpenGate).toBeFalse();
  });

  it('classifies events', () => {
    expect(component.eventClass('ROBBED 3 Wood')).toBe('ev-bad');
    expect(component.eventClass('LOOTED Gem')).toBe('ev-good');
    expect(component.eventMaterial('SOLD 2 Gem 40')).toContain('Gem.png');
    expect(component.eventMaterial('BLOCKED')).toBeNull();
  });
});
