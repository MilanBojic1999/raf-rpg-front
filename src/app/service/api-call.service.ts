import {Injectable} from '@angular/core';
import {HttpClient, HttpErrorResponse, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {environment} from '../../environments/environment';
import {Action, GameState, RestartOptions, RestartResponse} from '../models/data';

export const DEFAULT_GAME_ID = 'default';

/**
 * Where the game server lives, in order of priority:
 *  1. `?api=http://host:port` in the page URL (handy when the server runs on another machine),
 *  2. `environment.apiUrl`, if set,
 *  3. port 8080 on the same host the page was opened from. Using the page's host instead of a
 *     hard-coded `localhost` keeps the app working when it is opened from another device.
 */
export function resolveApiUrl(): string {
  const fromQuery = new URLSearchParams(window.location.search).get('api');
  const url = fromQuery || environment.apiUrl || `${window.location.protocol}//${window.location.hostname}:8080`;
  return url.replace(/\/+$/, '');
}

@Injectable({
  providedIn: 'root'
})
export class ApiCallService {

  readonly apiUrl = resolveApiUrl();

  constructor(private http: HttpClient) {
  }

  /** The server treats a missing game_id as the "default" session, so it is only sent for others. */
  private sessionParams(gameId: string): HttpParams {
    let params = new HttpParams();
    if (gameId && gameId !== DEFAULT_GAME_ID) {
      params = params.set('game_id', gameId);
    }
    return params;
  }

  /** Full observation without playing a round (GET /game/state). */
  getState(gameId: string): Observable<GameState> {
    return this.http.get<GameState>(`${this.apiUrl}/game/state`, {params: this.sessionParams(gameId)});
  }

  /** Asynchronous mode: queues the action, the session's thread plays it later (PUT /player/up, ...). */
  move(action: Action, gameId: string): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/player/${action.toLowerCase()}`, {}, {params: this.sessionParams(gameId)});
  }

  /**
   * Step mode: one call is one full environment transition (POST /game/step).
   * After the first call the session stays in step mode until the next restart.
   */
  step(action: Action, gameId: string): Observable<GameState> {
    const params = this.sessionParams(gameId).set('action', action);
    return this.http.post<GameState>(`${this.apiUrl}/game/step`, {}, {params});
  }

  /** Creates the session if it does not exist, otherwise resets it (PUT /map/restart). */
  restart(gameId: string, options: RestartOptions): Observable<RestartResponse> {
    let params = this.sessionParams(gameId).set('map_number', String(options.mapNumber));
    if (options.seed !== null && options.seed !== undefined && !isNaN(options.seed)) {
      params = params.set('seed', String(Math.trunc(options.seed)));
    }
    if (options.overrideConfig) {
      const c = options.config;
      params = params
        .set('gate_price', String(c.gatePrice))
        .set('merchant_budget', String(c.merchantBudget))
        .set('merchant_refill_rounds', String(c.merchantRefillRounds))
        .set('barbarian_enabled', String(c.barbarianEnabled))
        .set('villager_enabled', String(c.villagerEnabled))
        .set('max_rounds', String(c.maxRounds));
    }
    return this.http.put<RestartResponse>(`${this.apiUrl}/map/restart`, {}, {params});
  }

  /** Session ids on the server (GET /game/sessions). Accepts a list of ids or of objects with an id. */
  sessions(): Observable<string[]> {
    return this.http.get<unknown>(`${this.apiUrl}/game/sessions`).pipe(
      map(res => ApiCallService.parseSessionIds(res))
    );
  }

  static parseSessionIds(res: any): string[] {
    let list: any[] = [];
    if (Array.isArray(res)) {
      list = res;
    } else if (res && Array.isArray(res.sessions)) {
      list = res.sessions;
    } else if (res && typeof res === 'object') {
      list = Object.keys(res);
    }
    const ids = list
      .map(item => typeof item === 'string' ? item : (item?.gameId ?? item?.game_id ?? item?.id))
      .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);
    return Array.from(new Set(ids)).sort();
  }

  /** Human-readable explanation of a failed request. */
  describeError(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return `Cannot reach the game server at ${this.apiUrl}. Is it running?`;
    }
    const body = error.error;
    const serverMessage = typeof body === 'string' ? body : (body?.msg || body?.message || body?.error);
    return `${error.status} ${error.statusText || ''}${serverMessage ? ': ' + serverMessage : ''}`.trim();
  }
}
