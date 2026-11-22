import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {GameOverData} from '../models/data';

/**
 * Shown once when an episode ends. Closes with a GameOverChoice (or nothing, to keep looking at the
 * final board); the grid component does the actual restart so this dialog stays presentational.
 */
@Component({
  selector: 'app-over-screen',
  templateUrl: './over-screen.component.html',
  styleUrls: ['./over-screen.component.css']
})
export class OverScreenComponent {

  constructor(@Inject(MAT_DIALOG_DATA) public data: GameOverData) {
  }

  get title(): string {
    if (this.data.won) {
      return 'Gate opened!';
    }
    return this.data.outOfTime ? 'Out of time' : 'Episode over';
  }

  get subtitle(): string {
    if (this.data.won) {
      return `Won in ${this.data.round} rounds.`;
    }
    if (this.data.outOfTime) {
      return `The ${this.data.maxRounds}-round limit was reached before the gate was opened.`;
    }
    return 'The episode has finished.';
  }
}
