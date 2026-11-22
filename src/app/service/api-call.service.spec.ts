import {TestBed} from '@angular/core/testing';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';

import {ApiCallService} from './api-call.service';
import {DEFAULT_CONFIG} from '../models/game-info';

describe('ApiCallService', () => {
  let service: ApiCallService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ApiCallService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('does not send game_id for the default session', () => {
    service.getState('default').subscribe();
    const req = http.expectOne(r => r.url.endsWith('/game/state'));
    expect(req.request.params.has('game_id')).toBeFalse();
    req.flush({});
  });

  it('sends game_id for other sessions', () => {
    service.move('UP', 'env_0').subscribe();
    const req = http.expectOne(r => r.url.endsWith('/player/up'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.params.get('game_id')).toBe('env_0');
    req.flush('');
  });

  it('steps with POST /game/step and the action', () => {
    service.step('WAIT', 'env_1').subscribe();
    const req = http.expectOne(r => r.url.endsWith('/game/step'));
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('action')).toBe('WAIT');
    expect(req.request.params.get('game_id')).toBe('env_1');
    req.flush({});
  });

  it('restart sends only map and seed unless config is overridden', () => {
    service.restart('default', {mapNumber: 5, seed: 42, overrideConfig: false, config: DEFAULT_CONFIG}).subscribe();
    const req = http.expectOne(r => r.url.endsWith('/map/restart'));
    expect(req.request.params.keys().sort()).toEqual(['map_number', 'seed']);
    expect(req.request.params.get('map_number')).toBe('5');
    expect(req.request.params.get('seed')).toBe('42');
    req.flush({});
  });

  it('restart omits a null seed and sends the overridden config', () => {
    const config = {...DEFAULT_CONFIG, barbarianEnabled: false, maxRounds: 200};
    service.restart('env_2', {mapNumber: 1, seed: null, overrideConfig: true, config}).subscribe();
    const req = http.expectOne(r => r.url.endsWith('/map/restart'));
    const p = req.request.params;
    expect(p.has('seed')).toBeFalse();
    expect(p.get('game_id')).toBe('env_2');
    expect(p.get('barbarian_enabled')).toBe('false');
    expect(p.get('max_rounds')).toBe('200');
    expect(p.get('merchant_refill_rounds')).toBe('4');
    req.flush({});
  });

  it('parses the different shapes /game/sessions may return', () => {
    expect(ApiCallService.parseSessionIds(['env_1', 'default', 'env_1'])).toEqual(['default', 'env_1']);
    expect(ApiCallService.parseSessionIds([{gameId: 'a'}, {game_id: 'b'}, {id: 'c'}])).toEqual(['a', 'b', 'c']);
    expect(ApiCallService.parseSessionIds({sessions: ['x']})).toEqual(['x']);
    expect(ApiCallService.parseSessionIds({env_0: {}, env_1: {}})).toEqual(['env_0', 'env_1']);
    expect(ApiCallService.parseSessionIds(null)).toEqual([]);
  });
});
