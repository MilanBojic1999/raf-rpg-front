import {Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {EMPTY, Observable, Subscription, timer} from 'rxjs';
import {catchError, exhaustMap, finalize, map, tap} from 'rxjs/operators';
import {ApiCallService, DEFAULT_GAME_ID} from '../service/api-call.service';
import {OverScreenComponent} from '../over-screen/over-screen.component';
import {RestartDialogComponent} from '../restart-dialog/restart-dialog.component';
import {
  Action, ControlMode, EventLogEntry, GameOverChoice, GameOverData, GameState, RestartOptions, RestartResponse
} from '../models/data';
import {DEFAULT_CONFIG, KEY_ACTIONS, LEGEND_SYMBOLS, MAP_COUNT, SYMBOLS} from '../models/game-info';

const POLL_MS = 200;
/** While the server is unreachable, only every Nth poll tick actually sends a request. */
const OFFLINE_POLL_EVERY = 10;
const LOG_LIMIT = 300;
const STORAGE_PREFIX = 'raf-rpg:';

interface Cell {
  symbol: string;
  image: string | null;
  title: string;
  fog: boolean;
}

interface EpisodeMeta {
  seed: number;
  mapNumber: number;
}

type Connection = 'connecting' | 'online' | 'offline';

/** localStorage can be unavailable (private mode, blocked storage); the app must work without it. */
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

@Component({
  selector: 'app-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.css'],
})
export class GridComponent implements OnInit, OnDestroy {

  readonly legend = LEGEND_SYMBOLS.map(symbol => ({symbol, ...SYMBOLS[symbol]}));
  readonly apiUrl: string;

  gameId: string;
  gameIdInput: string;
  sessions: string[] = [];
  controlMode: ControlMode = load<ControlMode>('controlMode', 'async');
  showView = load<boolean>('showView', false);
  viewRadius = load<number>('viewRadius', 2);
  restartOptions: RestartOptions = load<RestartOptions>('restartOptions', {
    mapNumber: 0, seed: null, overrideConfig: false, config: {...DEFAULT_CONFIG},
  });

  state: GameState | null = null;
  cells: Cell[] = [];
  cols = 0;
  rows = 0;
  tileSize = 48;
  log: EventLogEntry[] = [];
  mapNumber: number | null = null;

  connection: Connection = 'connecting';
  error: string | null = null;
  notice: string | null = null;

  /** Bumped on restart and session switch; responses to requests from an older epoch are dropped. */
  private epoch = 0;
  private boardKey = '';
  private moveInFlight = false;
  private forceNewEpisode = false;
  private handledEpisodeEnd: string | null = null;
  private gameOverRef: MatDialogRef<OverScreenComponent, GameOverChoice> | null = null;
  private episodeMeta: { [gameId: string]: EpisodeMeta } = load('episodeMeta', {});
  private noticeTimer: any;
  private pollSub?: Subscription;

  constructor(private api: ApiCallService, private dialog: MatDialog) {
    this.apiUrl = api.apiUrl;
    const fromUrl = new URLSearchParams(window.location.search).get('game_id');
    this.gameId = (fromUrl || load<string>('gameId', DEFAULT_GAME_ID)).trim() || DEFAULT_GAME_ID;
    this.gameIdInput = this.gameId;
  }

  ngOnInit(): void {
    this.startPolling();
    this.refreshSessions();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    clearTimeout(this.noticeTimer);
  }

  // ---------------------------------------------------------------- state

  private startPolling(): void {
    this.pollSub = timer(0, POLL_MS).pipe(
      exhaustMap(tick => {
        if (this.connection === 'offline' && tick % OFFLINE_POLL_EVERY !== 0) {
          return EMPTY;
        }
        const gameId = this.gameId;
        const epoch = this.epoch;
        return this.api.getState(gameId).pipe(
          map(state => ({state, epoch})),
          catchError((err: HttpErrorResponse) => {
            if (epoch === this.epoch) {
              this.onPollError(gameId, err);
            }
            return EMPTY;
          }),
        );
      }),
    ).subscribe(({state, epoch}) => {
      if (epoch === this.epoch) {
        this.applyState(state);
      }
    });
  }

  private onPollError(gameId: string, err: HttpErrorResponse): void {
    this.connection = err.status === 0 ? 'offline' : 'online';
    if (err.status === 404) {
      this.error = `Session "${gameId}" does not exist on the server. Start it with "New episode", or pick another session.`;
      this.state = null;
      this.rebuildBoard();
    } else {
      this.error = this.api.describeError(err);
    }
  }

  private applyState(s: GameState): void {
    this.connection = 'online';
    this.error = null;

    const prev = this.state;
    const newEpisode = !prev || this.forceNewEpisode || s.seed !== prev.seed || s.round < prev.round;
    if (newEpisode) {
      this.log = [];
      this.handledEpisodeEnd = null;
      this.forceNewEpisode = false;
    }
    // In async mode the poll can miss rounds; in step mode every round is seen.
    if ((newEpisode || s.round !== prev!.round) && s.events && s.events.length) {
      this.log = [{round: s.round, events: [...s.events]}, ...this.log].slice(0, LOG_LIMIT);
    }

    const meta = this.episodeMeta[this.gameId];
    this.mapNumber = meta && meta.seed === s.seed ? meta.mapNumber : null;

    this.state = s;
    this.rebuildBoard();
    this.checkEpisodeEnd(s);
  }

  // ---------------------------------------------------------------- board

  rebuildBoard(): void {
    const matrix: ArrayLike<string>[] = this.state?.matrix || [];
    const gatePrice = this.state?.gatePrice ?? -1;
    const key = matrix.map(row => Array.prototype.join.call(row, '\u0001')).join('\n')
      + `|${this.showView}|${this.viewRadius}|${gatePrice}`;
    if (key === this.boardKey) {
      return;
    }
    this.boardKey = key;

    const rows = matrix.length;
    const cols = matrix.reduce((max, row) => Math.max(max, row.length), 0);
    const player = this.findPlayer(matrix);
    const radius = this.showView && player ? Math.max(0, this.viewRadius) : -1;

    const cells: Cell[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const symbol = matrix[r][c] ?? '-';
        const info = SYMBOLS[symbol];
        let title = info ? info.description : `Unknown symbol "${symbol}"`;
        if (symbol === '|' && gatePrice >= 0) {
          title += ` Price: ${gatePrice} gold.`;
        }
        cells.push({
          symbol,
          image: info ? info.image : null,
          title: `${title}\n[row ${r}, col ${c}]`,
          fog: radius >= 0 && (Math.abs(r - player!.r) > radius || Math.abs(c - player!.c) > radius),
        });
      }
    }
    this.cells = cells;
    if (rows !== this.rows || cols !== this.cols) {
      this.rows = rows;
      this.cols = cols;
      this.computeTileSize();
    }
  }

  private findPlayer(matrix: ArrayLike<string>[]): { r: number, c: number } | null {
    for (let r = 0; r < matrix.length; r++) {
      const c = Array.prototype.indexOf.call(matrix[r], 'P');
      if (c >= 0) {
        return {r, c};
      }
    }
    return null;
  }

  /** Fits the whole map on screen (no scrolling while playing), between 16 and 64 px per tile. */
  @HostListener('window:resize')
  computeTileSize(): void {
    if (!this.cols || !this.rows) {
      return;
    }
    const sideBySide = window.innerWidth >= 1100;
    const availableWidth = window.innerWidth - (sideBySide ? 380 : 0) - 40 - this.cols;
    const availableHeight = sideBySide ? window.innerHeight - 170 - this.rows : Number.POSITIVE_INFINITY;
    const size = Math.floor(Math.min(availableWidth / this.cols, availableHeight / this.rows));
    this.tileSize = Math.max(16, Math.min(64, size));
  }

  trackByIndex(index: number): number {
    return index;
  }

  get playerPosition(): string {
    const p = this.findPlayer(this.state?.matrix || []);
    return p ? `row ${p.r}, col ${p.c}` : '—';
  }

  // ---------------------------------------------------------------- input

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.dialog.openDialogs.length > 0 || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
      return;
    }

    const action = KEY_ACTIONS[event.code];
    if (action || event.code === 'KeyR' || event.code === 'KeyV') {
      event.preventDefault();
      // Otherwise Space/Enter would also "click" whichever button was focused last.
      if (tag === 'BUTTON') {
        target!.blur();
      }
    }
    if (action) {
      this.act(action);
    } else if (event.code === 'KeyR' && !event.repeat) {
      this.openRestartDialog();
    } else if (event.code === 'KeyV' && !event.repeat) {
      this.showView = !this.showView;
      this.onViewChange();
    }
  }

  act(action: Action): void {
    if (!this.state) {
      return;
    }
    if (this.state.done) {
      this.flash('The episode is over. Press R or "New episode" to start again.');
      return;
    }
    // One request at a time: holding a key must not flood the server's action queue.
    if (this.moveInFlight) {
      return;
    }
    this.moveInFlight = true;
    const gameId = this.gameId;
    const epoch = this.epoch;
    const request: Observable<unknown> = this.controlMode === 'step'
      ? this.api.step(action, gameId).pipe(tap(s => {
        if (epoch === this.epoch) {
          this.applyState(s);
        }
      }))
      : this.api.move(action, gameId);

    request.pipe(finalize(() => this.moveInFlight = false)).subscribe({
      error: (err: HttpErrorResponse) => {
        if (err.status === 409 && this.controlMode === 'async') {
          this.flash('This session is in step mode (probably driven by an agent through /game/step). '
            + 'Switch Controls to "Step" to play it from here, or start a new episode.', 8000);
        } else {
          this.flash(this.api.describeError(err));
        }
      },
    });
  }

  setControlMode(mode: ControlMode): void {
    this.controlMode = mode;
    save('controlMode', mode);
    if (mode === 'step') {
      this.flash('Step mode: each move is one POST /game/step, exactly like env.step(). '
        + 'The session stays in step mode until the next restart.', 7000);
    }
  }

  onViewChange(): void {
    this.viewRadius = Math.max(0, Math.min(12, Math.trunc(Number(this.viewRadius) || 0)));
    save('showView', this.showView);
    save('viewRadius', this.viewRadius);
    this.rebuildBoard();
  }

  // ---------------------------------------------------------------- sessions

  refreshSessions(): void {
    // Optional endpoint: if it fails the input still accepts any id.
    this.api.sessions().subscribe({
      next: ids => this.sessions = ids,
      error: () => {},
    });
  }

  switchSession(value: string): void {
    const gameId = (value || '').trim() || DEFAULT_GAME_ID;
    this.gameIdInput = gameId;
    if (gameId === this.gameId) {
      return;
    }
    this.gameId = gameId;
    this.epoch++;
    this.state = null;
    this.log = [];
    this.mapNumber = null;
    this.error = null;
    this.handledEpisodeEnd = null;
    this.connection = 'connecting';
    this.rebuildBoard();
    save('gameId', gameId);

    const url = new URL(window.location.href);
    if (gameId === DEFAULT_GAME_ID) {
      url.searchParams.delete('game_id');
    } else {
      url.searchParams.set('game_id', gameId);
    }
    window.history.replaceState(null, '', url.toString());
  }

  // ---------------------------------------------------------------- episodes

  openRestartDialog(): void {
    if (this.dialog.openDialogs.length > 0) {
      return;
    }
    const options = {...this.restartOptions, mapNumber: this.mapNumber ?? this.restartOptions.mapNumber};
    this.dialog.open<RestartDialogComponent, unknown, RestartOptions>(RestartDialogComponent, {
      width: '540px',
      maxWidth: '95vw',
      data: {gameId: this.gameId, options},
    }).afterClosed().subscribe(result => {
      if (result) {
        this.restartOptions = result;
        save('restartOptions', result);
        this.restart(result);
      }
    });
  }

  restart(options: RestartOptions): void {
    const gameId = this.gameId;
    this.epoch++;
    this.api.restart(gameId, options).subscribe({
      next: (res: RestartResponse) => {
        this.episodeMeta[res.gameId || gameId] = {seed: res.seed, mapNumber: res.mapNumber};
        save('episodeMeta', this.episodeMeta);
        this.refreshSessions();
        if (gameId !== this.gameId) {
          return;
        }
        this.epoch++;
        this.forceNewEpisode = true;
        this.mapNumber = res.mapNumber;
        this.flash(`Level ${res.mapNumber} started with seed ${res.seed}.`);
      },
      error: (err: HttpErrorResponse) => this.flash('Restart failed. ' + this.api.describeError(err), 8000),
    });
  }

  private checkEpisodeEnd(s: GameState): void {
    if (!s.done) {
      return;
    }
    const key = `${this.gameId}|${s.seed}|${s.round}`;
    if (this.handledEpisodeEnd === key || this.gameOverRef) {
      return;
    }
    this.handledEpisodeEnd = key;
    if (this.dialog.openDialogs.length > 0) {
      return; // e.g. the restart dialog is already open
    }

    const data: GameOverData = {
      gameId: this.gameId,
      won: s.won,
      outOfTime: !s.won && ((s.events || []).includes('OUT_OF_TIME') || (s.maxRounds > 0 && s.round >= s.maxRounds)),
      round: s.round,
      maxRounds: s.maxRounds,
      gold: s.gold,
      gatePrice: s.gatePrice,
      seed: s.seed,
      mapNumber: this.mapNumber,
    };
    this.gameOverRef = this.dialog.open<OverScreenComponent, GameOverData, GameOverChoice>(OverScreenComponent, {
      width: '600px',
      maxWidth: '95vw',
      data,
    });
    this.gameOverRef.afterClosed().subscribe(choice => {
      this.gameOverRef = null;
      this.onGameOverChoice(choice, data);
    });
  }

  private onGameOverChoice(choice: GameOverChoice | undefined, over: GameOverData): void {
    const mapNumber = over.mapNumber ?? this.restartOptions.mapNumber;
    switch (choice) {
      case 'replay':
        this.restart({...this.restartOptions, mapNumber, seed: over.seed});
        break;
      case 'new':
        this.restart({...this.restartOptions, mapNumber, seed: null});
        break;
      case 'next':
        this.restartOptions = {...this.restartOptions, mapNumber: (mapNumber + 1) % MAP_COUNT};
        save('restartOptions', this.restartOptions);
        this.restart({...this.restartOptions, seed: null});
        break;
      case 'configure':
        this.openRestartDialog();
        break;
    }
  }

  // ---------------------------------------------------------------- misc

  flash(message: string, ms = 5000): void {
    this.notice = message;
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => this.notice = null, ms);
  }

  get connectionLabel(): string {
    switch (this.connection) {
      case 'online': return 'Connected';
      case 'offline': return 'Offline';
      default: return 'Connecting…';
    }
  }
}
