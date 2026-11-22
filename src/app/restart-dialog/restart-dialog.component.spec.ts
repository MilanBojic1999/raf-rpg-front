import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

import {RestartDialogComponent} from './restart-dialog.component';
import {DEFAULT_CONFIG} from '../models/game-info';
import {RestartDialogData} from '../models/data';

describe('RestartDialogComponent', () => {
  let component: RestartDialogComponent;
  let fixture: ComponentFixture<RestartDialogComponent>;
  let close: jasmine.Spy;
  const data: RestartDialogData = {
    gameId: 'env_0',
    options: {mapNumber: 3, seed: null, overrideConfig: false, config: {...DEFAULT_CONFIG}},
  };

  beforeEach(async () => {
    close = jasmine.createSpy('close');
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [RestartDialogComponent],
      providers: [
        {provide: MAT_DIALOG_DATA, useValue: data},
        {provide: MatDialogRef, useValue: {close}},
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(RestartDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('edits a copy of the options', () => {
    component.options.config.gatePrice = 10;
    expect(data.options.config.gatePrice).toBe(50);
  });

  it('turns an empty seed into null (random)', () => {
    (component.options as any).seed = '';
    component.start();
    expect(close).toHaveBeenCalledWith(jasmine.objectContaining({seed: null, mapNumber: 3}));
  });

  it('refuses an invalid config', () => {
    component.options.overrideConfig = true;
    component.options.config.merchantRefillRounds = 0;
    component.start();
    expect(close).not.toHaveBeenCalled();
  });
});
