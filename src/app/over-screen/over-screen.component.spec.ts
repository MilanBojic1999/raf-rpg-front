import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatButtonModule} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';

import {OverScreenComponent} from './over-screen.component';
import {GameOverData} from '../models/data';

describe('OverScreenComponent', () => {
  const base: GameOverData = {
    gameId: 'default', won: true, outOfTime: false, round: 84, maxRounds: 500,
    gold: 55, gatePrice: 50, seed: 7, mapNumber: 2,
  };

  function create(data: GameOverData): ComponentFixture<OverScreenComponent> {
    TestBed.configureTestingModule({
      imports: [MatButtonModule, MatDialogModule, MatIconModule],
      declarations: [OverScreenComponent],
      providers: [
        {provide: MAT_DIALOG_DATA, useValue: data},
        {provide: MatDialogRef, useValue: {close: () => {}}},
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(OverScreenComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows a win', () => {
    const fixture = create(base);
    expect(fixture.componentInstance.title).toBe('Gate opened!');
    expect(fixture.nativeElement.textContent).toContain('Won in 84 rounds');
  });

  it('shows running out of time', () => {
    const fixture = create({...base, won: false, outOfTime: true, round: 500});
    expect(fixture.componentInstance.title).toBe('Out of time');
  });
});
