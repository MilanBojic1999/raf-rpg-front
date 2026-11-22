import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {of} from 'rxjs';

import {GridComponent} from './grid.component';
import {ApiCallService} from '../service/api-call.service';
import {GameState} from '../models/data';

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    gameId: 'default',
    matrix: [['-', '-', '-'], ['-', 'P', '_'], ['-', 'M', '|']],
    inventory: {},
    gold: 0,
    round: 0,
    done: false,
    won: false,
    events: [],
    gatePrice: 50,
    merchantGold: 50,
    seed: 1,
    maxRounds: 500,
    ...overrides,
  };
}

describe('GridComponent', () => {
  let component: GridComponent;
  let fixture: ComponentFixture<GridComponent>;
  let api: jasmine.SpyObj<ApiCallService>;
  let dialog: MatDialog;

  beforeEach(async () => {
    api = jasmine.createSpyObj<ApiCallService>('ApiCallService',
      ['getState', 'move', 'step', 'restart', 'sessions', 'describeError']);
    api.getState.and.returnValue(of(state()));
    api.sessions.and.returnValue(of([]));
    api.move.and.returnValue(of(''));
    (api as any).apiUrl = 'http://test:8080';

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MatDialogModule, NoopAnimationsModule, FormsModule, MatCheckboxModule],
      declarations: [GridComponent],
      providers: [{provide: ApiCallService, useValue: api}],
      // Child components and Material widgets are not under test here.
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GridComponent);
    component = fixture.componentInstance;
    dialog = TestBed.inject(MatDialog);
    fixture.detectChanges();
  });

  // ngOnInit starts a poll; destroying the fixture unsubscribes it.
  afterEach(() => {
    dialog.closeAll();
    fixture.destroy();
  });

  it('should create and render the polled board', async () => {
    expect(component).toBeTruthy();
    // The poll's first tick is a real (async) timer.
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(api.getState).toHaveBeenCalledWith('default');
    expect(component.state).not.toBeNull();
    expect(component.cells.length).toBe(9);
    expect(component.cols).toBe(3);
  });

  describe('with a state', () => {
    beforeEach(() => (component as any).applyState(state()));

    it('fogs cells outside the agent view radius', () => {
      component.showView = true;
      component.viewRadius = 0;
      component.onViewChange();
      const fogged = component.cells.filter(c => c.fog).length;
      expect(fogged).toBe(8); // everything except the player's own cell
    });

    it('logs events once per round and clears the log on a new episode', () => {
      (component as any).applyState(state({round: 1, events: ['LOOTED Rice']}));
      (component as any).applyState(state({round: 1, events: ['LOOTED Rice']}));
      (component as any).applyState(state({round: 2, events: ['BLOCKED']}));
      expect(component.log.map(e => e.round)).toEqual([2, 1]);

      (component as any).applyState(state({round: 0, seed: 99, events: []}));
      expect(component.log).toEqual([]);
    });

    it('sends a move for arrow keys and ignores keys typed into inputs', () => {
      const arrow = new KeyboardEvent('keydown', {code: 'ArrowUp', cancelable: true});
      document.dispatchEvent(arrow);
      expect(api.move).toHaveBeenCalledWith('UP', 'default');
      expect(arrow.defaultPrevented).toBeTrue();

      api.move.calls.reset();
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.dispatchEvent(new KeyboardEvent('keydown', {code: 'ArrowUp', bubbles: true}));
      input.remove();
      expect(api.move).not.toHaveBeenCalled();
    });

    it('does not send moves once the episode is over', () => {
      (component as any).applyState(state({done: true, won: true, round: 10}));
      dialog.closeAll();
      component.act('LEFT');
      expect(api.move).not.toHaveBeenCalled();
    });

    it('opens the game-over dialog once per finished episode', () => {
      const open = spyOn(dialog, 'open').and.callThrough();
      (component as any).applyState(state({done: true, won: false, round: 500, events: ['OUT_OF_TIME']}));
      (component as any).applyState(state({done: true, won: false, round: 500, events: ['OUT_OF_TIME']}));
      expect(open).toHaveBeenCalledTimes(1);
      expect((open.calls.mostRecent().args[1] as any).data.outOfTime).toBeTrue();
    });
  });
});
