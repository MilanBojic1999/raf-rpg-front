import {Component, HostListener, OnInit} from '@angular/core';
import {MatGridListModule} from '@angular/material/grid-list';
import {ApiCallService} from "../service/api-call.service";
import {interval} from "rxjs";

@Component({
  selector: 'app-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.css'],
})
export class GridComponent implements OnInit {

  constructor(private apiService:ApiCallService) { }

  tiles: string[] = [];
  tilesMap = new Map<string,string>([[">","Elevation_Tile"],["|","Gate_Tile"],["$","Mountain_Tile"],
                                            ["_","Pasture_Tile"],["-","Water_Tile"],["+","Wood_Tile"]]);


  charMap = new Map<string,string>([["B","Barbarian"],["V","Village"],["P","Player_model"], ["M","Merchant"]]);

  number_of_tiles = 4;
  sub: any;
  ngOnInit(): void {
    this.sub = interval(250).subscribe(() => { this.callGridAPI() });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  callGridAPI(): void {
    this.apiService.callGrid().subscribe((res: string[][]) => {
      this.tiles = res.reduce((acc,val) => acc.concat(val),[]);
      // console.log(this.tiles);
      // console.log(res.length);
      // console.log(res[0].length);
      this.number_of_tiles = res[0].length;
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const keyCode = event.code;
    console.log(keyCode);
    if (keyCode == "ArrowUp") {
      this.apiService.callUp().subscribe((res: string) => {});
    } else if (keyCode == "ArrowDown") {
      this.apiService.callDown().subscribe((res: string) => {});
    } else if (keyCode == "ArrowLeft") {
      this.apiService.callLeft().subscribe((res: string) => {});
    } else if(keyCode == "ArrowRight") {
      this.apiService.callRight().subscribe((res: string) => {});
    } else if(keyCode == "Space") {
      this.apiService.callWait().subscribe((res: string) => {});
    }

  }


  castToImage(inp: string): string {
    if (inp == " ") {
      return "assets/game tiles/Water_Tile.png";
    }
    if (this.tilesMap.has(inp)) {
      let out = this.tilesMap.get(inp)
      return `assets/game tiles/${out}.png`;
    } else {
      let out = this.charMap.get(inp)
      return `assets/game characters/${out}.png`;
    }
  }

  calculateWidth(): string {

    const tile_width = 65; // You can replace this with your actual height calculation
    return `${tile_width*this.number_of_tiles}px`;
  }

}
