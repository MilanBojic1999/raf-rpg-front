import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {RestartDialogData, RestartOptions} from '../models/data';
import {DEFAULT_CONFIG, MAP_COUNT} from '../models/game-info';

@Component({
  selector: 'app-restart-dialog',
  templateUrl: './restart-dialog.component.html',
  styleUrls: ['./restart-dialog.component.css'],
})
export class RestartDialogComponent {

  readonly maps = Array.from({length: MAP_COUNT}, (_, i) => i);
  readonly gameId: string;
  options: RestartOptions;

  constructor(@Inject(MAT_DIALOG_DATA) data: RestartDialogData,
              private dialogRef: MatDialogRef<RestartDialogComponent, RestartOptions>) {
    this.gameId = data.gameId;
    // Work on a copy so "Cancel" leaves the caller's options untouched.
    this.options = {...data.options, config: {...data.options.config}};
  }

  randomizeSeed(): void {
    this.options.seed = null;
  }

  resetConfig(): void {
    this.options.config = {...DEFAULT_CONFIG};
  }

  /** The dialog submits on Enter too, so it is validated here rather than only via the disabled button. */
  get valid(): boolean {
    const c = this.options.config;
    const nonNegative = (n: number) => typeof n === 'number' && !isNaN(n) && n >= 0;
    return !this.options.overrideConfig ||
      (nonNegative(c.gatePrice) && nonNegative(c.merchantBudget) && c.merchantRefillRounds >= 1 && nonNegative(c.maxRounds));
  }

  start(): void {
    if (!this.valid) {
      return;
    }
    const seed = this.options.seed as unknown;
    // An emptied number input comes back as null or ''; both mean "random".
    this.options.seed = seed === '' || seed === null || seed === undefined ? null : Number(seed);
    this.dialogRef.close(this.options);
  }
}
